import crypto from 'crypto';
import {
  verifyResendWebhook,
  parseResendEvent,
  extractRecipientEmail,
} from '@/lib/email/resend-webhook';

// 테스트용 서명 생성기 (Svix 스킴과 동일)
function sign(secret: string, id: string, ts: string, body: string): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const sig = crypto.createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest('base64');
  return `v1,${sig}`;
}

const SECRET = 'whsec_' + Buffer.from('test-secret-key-1234567890').toString('base64');
const ID = 'msg_2abc';
const BODY = JSON.stringify({ type: 'email.bounced', data: { to: ['x@y.com'] } });
const now = () => String(Math.floor(Date.now() / 1000));

describe('verifyResendWebhook', () => {
  it('accepts a valid signature', () => {
    const ts = now();
    const h = { svixId: ID, svixTimestamp: ts, svixSignature: sign(SECRET, ID, ts, BODY) };
    expect(verifyResendWebhook(BODY, h, SECRET)).toBe(true);
  });

  it('rejects a tampered body', () => {
    const ts = now();
    const h = { svixId: ID, svixTimestamp: ts, svixSignature: sign(SECRET, ID, ts, BODY) };
    expect(verifyResendWebhook('{"type":"hacked"}', h, SECRET)).toBe(false);
  });

  it('rejects a stale timestamp (replay)', () => {
    const ts = String(Math.floor(Date.now() / 1000) - 10 * 60);
    const h = { svixId: ID, svixTimestamp: ts, svixSignature: sign(SECRET, ID, ts, BODY) };
    expect(verifyResendWebhook(BODY, h, SECRET)).toBe(false);
  });

  it('rejects when secret is undefined', () => {
    const ts = now();
    const h = { svixId: ID, svixTimestamp: ts, svixSignature: sign(SECRET, ID, ts, BODY) };
    expect(verifyResendWebhook(BODY, h, undefined)).toBe(false);
  });

  it('rejects when any header is missing', () => {
    const ts = now();
    const h = { svixId: null, svixTimestamp: ts, svixSignature: sign(SECRET, ID, ts, BODY) };
    expect(verifyResendWebhook(BODY, h, SECRET)).toBe(false);
  });

  it('accepts when one of multiple space-delimited signatures matches', () => {
    const ts = now();
    const multi = `v1,AAAAwrongAAAA ${sign(SECRET, ID, ts, BODY)}`;
    const h = { svixId: ID, svixTimestamp: ts, svixSignature: multi };
    expect(verifyResendWebhook(BODY, h, SECRET)).toBe(true);
  });
});

describe('parseResendEvent', () => {
  it('parses a valid event', () => {
    const e = parseResendEvent({ type: 'email.bounced', data: { to: ['a@b.com'] } });
    expect(e?.type).toBe('email.bounced');
  });
  it('returns null for non-object', () => {
    expect(parseResendEvent('nope')).toBeNull();
    expect(parseResendEvent(null)).toBeNull();
  });
  it('returns null when type or data missing', () => {
    expect(parseResendEvent({ data: {} })).toBeNull();
    expect(parseResendEvent({ type: 'email.bounced' })).toBeNull();
  });
});

describe('extractRecipientEmail', () => {
  it('handles array to', () => {
    expect(extractRecipientEmail({ type: 'email.bounced', data: { to: ['a@b.com'] } })).toBe(
      'a@b.com'
    );
  });
  it('handles string to', () => {
    expect(extractRecipientEmail({ type: 'email.bounced', data: { to: 'a@b.com' } })).toBe(
      'a@b.com'
    );
  });
  it('returns null when to is missing', () => {
    expect(extractRecipientEmail({ type: 'email.bounced', data: {} })).toBeNull();
  });
});
