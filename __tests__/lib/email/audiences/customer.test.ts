import { CustomerAudienceResolver } from '@/lib/email/audiences/customer';
import { createSupabaseQueryMock } from '@/lib/test-utils/email-audience-mock';

const mockFrom = jest.fn();

jest.mock('@/lib/auth/server', () => ({
  createSupabaseAdminClient: jest.fn(() => ({ from: mockFrom })),
}));

describe('CustomerAudienceResolver', () => {
  beforeEach(() => jest.clearAllMocks());

  it('marketing_consent=true인 고객을 반환한다', async () => {
    mockFrom
      // profiles query (consent users)
      .mockReturnValueOnce(
        createSupabaseQueryMock({
          data: [{ id: 'u1', email: 'optin@example.com', name: '동의자' }],
          error: null,
        })
      )
      // orders query (recent buyers)
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null }))
      // suppressions query
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null }));

    const resolver = new CustomerAudienceResolver();
    const recipients = await resolver.resolve();

    expect(recipients).toHaveLength(1);
    expect(recipients[0].email).toBe('optin@example.com');
  });

  it('6개월 이내 구매자를 동의 없이도 포함한다', async () => {
    mockFrom
      // profiles query → empty
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null }))
      // orders query
      .mockReturnValueOnce(
        createSupabaseQueryMock({
          data: [{ buyer_email: 'buyer@example.com', buyer_name: '구매자' }],
          error: null,
        })
      )
      // suppressions query
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null }));

    const resolver = new CustomerAudienceResolver();
    const recipients = await resolver.resolve();

    expect(recipients).toHaveLength(1);
    expect(recipients[0].email).toBe('buyer@example.com');
  });

  it('suppression 목록에 있는 이메일을 제외한다', async () => {
    const { hashEmail } = jest.requireActual('@/lib/email/email-hash') as {
      hashEmail: (e: string) => string;
    };

    mockFrom
      .mockReturnValueOnce(
        createSupabaseQueryMock({
          data: [{ id: 'u1', email: 'suppressed@example.com', name: null }],
          error: null,
        })
      )
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null }))
      .mockReturnValueOnce(
        createSupabaseQueryMock({
          data: [{ email_hash: hashEmail('suppressed@example.com') }],
          error: null,
        })
      );

    const resolver = new CustomerAudienceResolver();
    const recipients = await resolver.resolve();
    expect(recipients).toHaveLength(0);
  });
});
