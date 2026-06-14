/** @jest-environment node */

import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/webhooks/resend/route';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { notifyInboundEmail, processInboundEmail } from '@/lib/email/inbound';

jest.mock('@/lib/auth/server', () => ({
  createSupabaseAdminClient: jest.fn(),
}));

jest.mock('@/lib/email/inbound', () => ({
  processInboundEmail: jest.fn(),
  notifyInboundEmail: jest.fn(),
}));

const mockCreateSupabaseAdminClient = jest.mocked(createSupabaseAdminClient);
const mockProcessInboundEmail = jest.mocked(processInboundEmail);
const mockNotifyInboundEmail = jest.mocked(notifyInboundEmail);

const secret = 'whsec_' + Buffer.from('test-secret-key-1234567890').toString('base64');

function sign(secretValue: string, id: string, ts: string, body: string): string {
  const key = Buffer.from(secretValue.replace(/^whsec_/, ''), 'base64');
  const sig = crypto.createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest('base64');
  return `v1,${sig}`;
}

function request(body: unknown, signed = true) {
  const raw = JSON.stringify(body);
  const ts = String(Math.floor(Date.now() / 1000));
  return new NextRequest('https://example.com/api/webhooks/resend', {
    method: 'POST',
    headers: signed
      ? {
          'content-type': 'application/json',
          'svix-id': 'msg_123',
          'svix-timestamp': ts,
          'svix-signature': sign(secret, 'msg_123', ts, raw),
        }
      : { 'content-type': 'application/json' },
    body: raw,
  });
}

describe('Resend webhook route', () => {
  beforeEach(() => {
    process.env.RESEND_WEBHOOK_SECRET = secret;
    jest.clearAllMocks();
    mockCreateSupabaseAdminClient.mockReturnValue({ from: jest.fn() } as any);
    mockProcessInboundEmail.mockResolvedValue({ id: 'inbound-1', isNew: true });
    mockNotifyInboundEmail.mockResolvedValue(undefined);
  });

  it('rejects unsigned requests', async () => {
    const response = await POST(request({ type: 'email.received', data: {} }, false));

    expect(response.status).toBe(401);
    expect(mockProcessInboundEmail).not.toHaveBeenCalled();
  });

  it('processes email.received events and sends an operator notification', async () => {
    const event = {
      type: 'email.received',
      data: {
        email_id: 'recv_123',
        from: 'sender@example.com',
        to: ['reply@saf2026.com'],
        message_id: '<msg@example.com>',
        subject: '문의',
      },
    };

    const response = await POST(request(event));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json).toEqual({ ok: true, inbound_id: 'inbound-1' });
    expect(mockCreateSupabaseAdminClient).toHaveBeenCalledTimes(1);
    expect(mockProcessInboundEmail).toHaveBeenCalledWith(event, expect.anything());
    expect(mockNotifyInboundEmail).toHaveBeenCalledWith(event, 'inbound-1');
  });

  it('재처리(isNew=false)면 중복 알림을 보내지 않는다 (M3)', async () => {
    mockProcessInboundEmail.mockResolvedValue({ id: 'inbound-1', isNew: false });

    const response = await POST(
      request({
        type: 'email.received',
        data: { email_id: 'recv_123', from: 'sender@example.com', to: ['reply@saf2026.com'] },
      })
    );

    expect(response.status).toBe(200);
    expect(mockProcessInboundEmail).toHaveBeenCalled();
    expect(mockNotifyInboundEmail).not.toHaveBeenCalled();
  });

  it('returns 500 for email.received processing failures so Resend can retry', async () => {
    mockProcessInboundEmail.mockRejectedValue(new Error('Resend 500'));

    const response = await POST(
      request({ type: 'email.received', data: { email_id: 'recv_123' } })
    );

    expect(response.status).toBe(500);
  });
});
