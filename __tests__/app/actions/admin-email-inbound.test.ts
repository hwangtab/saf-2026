import { replyToInboundMessage } from '@/app/actions/admin-email-inbound';
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
