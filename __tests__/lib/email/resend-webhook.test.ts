import crypto from 'crypto';
import {
  verifyResendWebhook,
  parseResendEvent,
  extractRecipientEmail,
  isSuppressibleBounce,
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
    const realSig = sign(SECRET, ID, ts, BODY);
    // craft a wrong sig of the same length — same format, wrong value
    const wrongSig = 'v1,' + 'A'.repeat(realSig.length - 3);
    const multi = `${wrongSig} ${realSig}`;
    const h = { svixId: ID, svixTimestamp: ts, svixSignature: multi };
    expect(verifyResendWebhook(BODY, h, SECRET)).toBe(true);
  });

  it('rejects a future timestamp (replay)', () => {
    const ts = String(Math.floor(Date.now() / 1000) + 10 * 60);
    const h = { svixId: ID, svixTimestamp: ts, svixSignature: sign(SECRET, ID, ts, BODY) };
    expect(verifyResendWebhook(BODY, h, SECRET)).toBe(false);
  });
});

describe('parseResendEvent', () => {
  it('parses a valid event', () => {
    const e = parseResendEvent({ type: 'email.bounced', data: { to: ['a@b.com'] } });
    expect(e?.type).toBe('email.bounced');
  });
  it('preserves received email metadata', () => {
    const e = parseResendEvent({
      type: 'email.received',
      created_at: '2026-06-09T01:02:03.000Z',
      data: {
        email_id: 'recv_123',
        from: 'sender@example.com',
        to: ['reply@saf2026.com'],
        cc: ['ops@saf2026.com'],
        message_id: '<msg-1@example.com>',
        subject: 'Re: 작품 문의',
        attachments: [
          {
            id: 'att_1',
            filename: 'image.png',
            content_type: 'image/png',
            content_disposition: 'attachment',
            content_id: null,
          },
        ],
      },
    });

    expect(e?.type).toBe('email.received');
    expect(e?.data.email_id).toBe('recv_123');
    expect(e?.data.message_id).toBe('<msg-1@example.com>');
    expect(e?.data.cc).toEqual(['ops@saf2026.com']);
    expect(e?.data.attachments?.[0]?.filename).toBe('image.png');
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
  it('returns null for empty array', () => {
    expect(extractRecipientEmail({ type: 'email.bounced', data: { to: [] } })).toBeNull();
  });
});

describe('isSuppressibleBounce', () => {
  const bounced = (type?: string) => ({
    type: 'email.bounced',
    data: { to: ['x@y.com'], ...(type ? { bounce: { type } } : {}) },
  });

  it('suppresses permanent bounces (case-insensitive)', () => {
    expect(isSuppressibleBounce(bounced('Permanent'))).toBe(true);
    expect(isSuppressibleBounce(bounced('permanent'))).toBe(true);
    expect(isSuppressibleBounce(bounced('PERMANENT'))).toBe(true);
  });

  it('suppresses when bounce.type is missing (fail-safe)', () => {
    expect(isSuppressibleBounce(bounced(undefined))).toBe(true);
  });

  it('does not suppress explicit transient bounces', () => {
    expect(isSuppressibleBounce(bounced('Transient'))).toBe(false);
    expect(isSuppressibleBounce(bounced('transient'))).toBe(false);
  });

  it('only applies to email.bounced events', () => {
    expect(isSuppressibleBounce({ type: 'email.complained', data: { to: ['x@y.com'] } })).toBe(
      false
    );
  });
});
