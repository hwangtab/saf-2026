import { CustomerAudienceResolver } from '@/lib/email/audiences/customer';

const mockSelect = jest.fn();
const mockFrom = jest.fn(() => ({ select: mockSelect }));

jest.mock('@/lib/auth/server', () => ({
  createSupabaseAdminClient: jest.fn(() => ({ from: mockFrom })),
}));

describe('CustomerAudienceResolver', () => {
  beforeEach(() => jest.clearAllMocks());

  it('marketing_consent=true인 고객을 반환한다', async () => {
    mockSelect
      // profiles(marketing_consent=true)
      .mockResolvedValueOnce({
        data: [{ id: 'u1', email: 'optin@example.com', name: '동의자', marketing_consent: true }],
        error: null,
      })
      // 6개월 거래고객 (orders)
      .mockResolvedValueOnce({ data: [], error: null })
      // suppressions
      .mockResolvedValueOnce({ data: [], error: null });

    const resolver = new CustomerAudienceResolver();
    const recipients = await resolver.resolve();

    expect(recipients).toHaveLength(1);
    expect(recipients[0].email).toBe('optin@example.com');
  });

  it('6개월 이내 구매자를 동의 없이도 포함한다', async () => {
    mockSelect
      // profiles(marketing_consent=true) → 없음
      .mockResolvedValueOnce({ data: [], error: null })
      // 6개월 거래고객
      .mockResolvedValueOnce({
        data: [{ buyer_email: 'buyer@example.com', buyer_name: '구매자' }],
        error: null,
      })
      // suppressions
      .mockResolvedValueOnce({ data: [], error: null });

    const resolver = new CustomerAudienceResolver();
    const recipients = await resolver.resolve();

    expect(recipients).toHaveLength(1);
    expect(recipients[0].email).toBe('buyer@example.com');
  });

  it('suppression 목록에 있는 이메일을 제외한다', async () => {
    const { hashEmail } = jest.requireActual('@/lib/email/email-hash') as {
      hashEmail: (e: string) => string;
    };
    mockSelect
      .mockResolvedValueOnce({
        data: [{ id: 'u1', email: 'suppressed@example.com', name: null, marketing_consent: true }],
        error: null,
      })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({
        data: [{ email_hash: hashEmail('suppressed@example.com') }],
        error: null,
      });

    const resolver = new CustomerAudienceResolver();
    const recipients = await resolver.resolve();
    expect(recipients).toHaveLength(0);
  });
});
