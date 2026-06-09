import { getInboundMessages, replyToInboundMessage } from '@/app/actions/admin-email-inbound';
import { sendInboundReply } from '@/lib/email/inbound';
import { logAdminAction } from '@/app/actions/activity-log-writer';

const mockSupabase = { from: jest.fn() };

jest.mock('@/lib/auth/guards', () => ({
  requireAdmin: jest.fn(async () => ({ id: 'admin-1' })),
  requireAdminClient: jest.fn(async () => mockSupabase),
}));

jest.mock('@/lib/email/inbound', () => ({
  sendInboundReply: jest.fn(),
}));

jest.mock('@/app/actions/activity-log-writer', () => ({
  logAdminAction: jest.fn(async () => {}),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

const mockSendInboundReply = jest.mocked(sendInboundReply);
const mockLogAdminAction = jest.mocked(logAdminAction);

describe('replyToInboundMessage', () => {
  const originalKey = process.env.RESEND_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RESEND_API_KEY = 're_test';
  });

  afterEach(() => {
    process.env.RESEND_API_KEY = originalKey;
  });

  it('requires RESEND_API_KEY before sending a reply', async () => {
    delete process.env.RESEND_API_KEY;

    const result = await replyToInboundMessage({ inboundId: 'inbound-1', body: '답변' });

    expect(result).toEqual({ message: 'RESEND_API_KEY가 설정되지 않았습니다.', error: true });
    expect(mockSendInboundReply).not.toHaveBeenCalled();
  });

  it('delegates threaded reply sending and writes an admin log on success', async () => {
    mockSendInboundReply.mockResolvedValue({ message: '답장을 발송했습니다.' });

    const result = await replyToInboundMessage({ inboundId: 'inbound-1', body: '답변' });

    expect(result).toEqual({ message: '답장을 발송했습니다.' });
    expect(mockSendInboundReply).toHaveBeenCalledWith({
      supabase: mockSupabase,
      inboundId: 'inbound-1',
      body: '답변',
      apiKey: 're_test',
      adminId: 'admin-1',
    });
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      'email_inbound_replied',
      'email_inbound_message',
      'inbound-1',
      { inbound_id: 'inbound-1' }
    );
  });
});

describe('getInboundMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a counted page of inbound replies', async () => {
    const query = {
      select: jest.fn(() => query),
      order: jest.fn(() => query),
      range: jest.fn(async () => ({
        data: [
          {
            id: 'inbound-26',
            resend_email_id: 'recv_26',
            message_id: '<msg-26@example.com>',
            from_email: 'customer@example.com',
            to_emails: ['hello@saf2026.com'],
            cc_emails: [],
            subject: 'Re: 문의',
            text_body: '확인했습니다.',
            html_body: null,
            headers: {},
            attachments: [],
            status: 'new',
            matched_broadcast_recipient_id: null,
            received_at: '2026-06-09T00:00:00.000Z',
            replied_at: null,
            reply_resend_id: null,
          },
        ],
        error: null,
        count: 61,
      })),
    };
    mockSupabase.from.mockReturnValue(query);

    const result = await getInboundMessages({ page: 2, pageSize: 25 });

    expect(query.select).toHaveBeenCalledWith(
      'id, resend_email_id, message_id, from_email, to_emails, cc_emails, subject, text_body, html_body, headers, attachments, status, matched_broadcast_recipient_id, received_at, replied_at, reply_resend_id',
      { count: 'exact' }
    );
    expect(query.range).toHaveBeenCalledWith(25, 49);
    expect(result.total).toBe(61);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(25);
    expect(result.rows).toHaveLength(1);
  });
});
