import {
  buildReplyHeaders,
  buildReplyFromAddress,
  buildReplyToAddress,
  fetchReceivedEmail,
  processInboundEmail,
  sendInboundReply,
} from '@/lib/email/inbound';
import type { ResendWebhookEvent } from '@/lib/email/resend-webhook';

function createQueryMock(result: unknown = { error: null }) {
  const query: Record<string, jest.Mock> = {};
  query.select = jest.fn(() => query);
  query.eq = jest.fn(() => query);
  query.or = jest.fn(() => query);
  query.limit = jest.fn(() => query);
  query.maybeSingle = jest.fn(async () => ({ data: null, error: null }));
  query.single = jest.fn(async () => result);
  query.upsert = jest.fn(() => query);
  query.update = jest.fn(() => query);
  return query;
}

function createSupabaseMock() {
  const inbound = createQueryMock({ data: { id: 'inbound-1' }, error: null });
  const recipients = createQueryMock({ data: { id: 'recipient-1' }, error: null });
  recipients.maybeSingle = jest.fn(async () => ({ data: { id: 'recipient-1' }, error: null }));

  return {
    inbound,
    recipients,
    client: {
      from: jest.fn((table: string) => {
        if (table === 'email_inbound_messages') return inbound;
        if (table === 'email_broadcast_recipients') return recipients;
        throw new Error(`Unexpected table ${table}`);
      }),
    },
  };
}

function jsonResponse(body: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    json: jest.fn(async () => body),
    text: jest.fn(async () => (typeof body === 'string' ? body : JSON.stringify(body))),
  } as any;
}

const receivedEvent: ResendWebhookEvent = {
  type: 'email.received',
  created_at: '2026-06-09T01:02:03.000Z',
  data: {
    email_id: 'recv_123',
    from: 'sender@example.com',
    to: ['hello+recipient-1@saf2026.com'],
    cc: ['ops@saf2026.com'],
    message_id: '<msg-1@example.com>',
    subject: 'Re: 작품 문의',
    attachments: [{ id: 'att_1', filename: 'file.pdf', content_type: 'application/pdf' }],
  },
};

describe('fetchReceivedEmail', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('calls Resend Receiving API for full content', async () => {
    global.fetch = jest.fn(async () =>
      jsonResponse({
        id: 'recv_123',
        html: '<p>안녕하세요</p>',
        text: '안녕하세요',
        headers: { 'in-reply-to': '<original@example.com>' },
      })
    ) as jest.Mock;

    const result = await fetchReceivedEmail('recv_123', 're_test');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails/receiving/recv_123?html_format=cid',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer re_test' }),
      })
    );
    expect(result.text).toBe('안녕하세요');
    expect(result.headers?.['in-reply-to']).toBe('<original@example.com>');
  });

  it('throws when Resend Receiving API fails', async () => {
    global.fetch = jest.fn(async () => jsonResponse('nope', false, 500)) as jest.Mock;

    await expect(fetchReceivedEmail('recv_123', 're_test')).rejects.toThrow('Resend 500');
  });
});

describe('inbound helpers', () => {
  it('builds tagged reply-to address from a correlation id', () => {
    expect(buildReplyToAddress('recipient-1')).toBe('hello+recipient-1@saf2026.com');
  });

  it('builds the default sender address from the receiving domain', () => {
    expect(buildReplyFromAddress()).toBe('씨앗페 <hello@saf2026.com>');
  });

  it('builds thread reply headers from the inbound message', () => {
    expect(
      buildReplyHeaders('<reply@example.com>', '<root@example.com> <parent@example.com>')
    ).toEqual({
      'In-Reply-To': '<reply@example.com>',
      References: '<root@example.com> <parent@example.com> <reply@example.com>',
    });
  });
});

describe('processInboundEmail', () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env.RESEND_API_KEY;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.RESEND_API_KEY = originalEnv;
  });

  it('upserts metadata, retrieves content, and updates the inbound row', async () => {
    process.env.RESEND_API_KEY = 're_test';
    const db = createSupabaseMock();
    global.fetch = jest.fn(async () =>
      jsonResponse({
        id: 'recv_123',
        html: '<p>본문</p>',
        text: '본문',
        headers: { 'in-reply-to': '<sent@example.com>', references: '<root@example.com>' },
        attachments: receivedEvent.data.attachments,
      })
    ) as jest.Mock;

    const result = await processInboundEmail(receivedEvent, db.client);

    expect(result.id).toBe('inbound-1');
    expect(db.inbound.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        resend_email_id: 'recv_123',
        from_email: 'sender@example.com',
        to_emails: ['hello+recipient-1@saf2026.com'],
        status: 'new',
      }),
      expect.objectContaining({ onConflict: 'resend_email_id' })
    );
    expect(db.inbound.update).toHaveBeenCalledWith(
      expect.objectContaining({
        text_body: '본문',
        html_body: '<p>본문</p>',
        in_reply_to: '<sent@example.com>',
        references_header: '<root@example.com>',
        matched_broadcast_recipient_id: 'recipient-1',
        status: 'new',
      })
    );
  });
});

describe('sendInboundReply', () => {
  const originalFetch = global.fetch;
  const originalFrom = process.env.RESEND_FROM_EMAIL;

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.RESEND_FROM_EMAIL = originalFrom;
  });

  it('sends a threaded reply and marks the inbound message replied', async () => {
    process.env.RESEND_FROM_EMAIL = '씨앗페 <reply@saf2026.com>';
    const inbound = createQueryMock({ data: { id: 'inbound-1' }, error: null });
    inbound.maybeSingle = jest.fn(async () => ({
      data: {
        id: 'inbound-1',
        from_email: 'sender@example.com',
        subject: 'Re: 문의',
        message_id: '<reply@example.com>',
        references_header: '<root@example.com>',
      },
      error: null,
    }));
    const client = { from: jest.fn(() => inbound) };
    global.fetch = jest.fn(async () => jsonResponse({ id: 'sent_1' })) as jest.Mock;

    const result = await sendInboundReply({
      supabase: client,
      inboundId: 'inbound-1',
      body: '확인했습니다.',
      apiKey: 're_test',
      adminId: 'admin-1',
    });

    expect(result).toEqual({ message: '답장을 발송했습니다.' });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        body: expect.stringContaining('"In-Reply-To":"<reply@example.com>"'),
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        body: expect.stringContaining('"References":"<root@example.com> <reply@example.com>"'),
      })
    );
    expect(inbound.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'replied', replied_by: 'admin-1' })
    );
  });
});
