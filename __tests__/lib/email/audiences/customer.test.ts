import { CustomerAudienceResolver } from '@/lib/email/audiences/customer';

type QueryResult = { data: unknown[]; error: null };

// Creates a chainable Supabase query builder mock that can be awaited
function createQueryBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  const methods = ['select', 'eq', 'not', 'in', 'gte'];
  methods.forEach((m) => {
    builder[m] = jest.fn().mockReturnValue(builder);
  });
  // Make it thenable so `await supabase.from(...).select(...).eq(...)` works
  builder['then'] = jest.fn((resolve: (v: QueryResult) => unknown) =>
    Promise.resolve(result).then(resolve)
  );
  return builder;
}

const mockFrom = jest.fn();

jest.mock('@/lib/auth/server', () => ({
  createSupabaseAdminClient: jest.fn(() => ({ from: mockFrom })),
}));

describe('CustomerAudienceResolver', () => {
  beforeEach(() => jest.clearAllMocks());

  it('marketing_consent=true인 고객을 반환한다', async () => {
    mockFrom
      // profiles query
      .mockReturnValueOnce(
        createQueryBuilder({
          data: [{ id: 'u1', email: 'optin@example.com', name: '동의자' }],
          error: null,
        })
      )
      // orders query
      .mockReturnValueOnce(createQueryBuilder({ data: [], error: null }))
      // suppressions query
      .mockReturnValueOnce(createQueryBuilder({ data: [], error: null }));

    const resolver = new CustomerAudienceResolver();
    const recipients = await resolver.resolve();

    expect(recipients).toHaveLength(1);
    expect(recipients[0].email).toBe('optin@example.com');
  });

  it('6개월 이내 구매자를 동의 없이도 포함한다', async () => {
    mockFrom
      // profiles query → empty
      .mockReturnValueOnce(createQueryBuilder({ data: [], error: null }))
      // orders query
      .mockReturnValueOnce(
        createQueryBuilder({
          data: [{ buyer_email: 'buyer@example.com', buyer_name: '구매자' }],
          error: null,
        })
      )
      // suppressions query
      .mockReturnValueOnce(createQueryBuilder({ data: [], error: null }));

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
        createQueryBuilder({
          data: [{ id: 'u1', email: 'suppressed@example.com', name: null }],
          error: null,
        })
      )
      .mockReturnValueOnce(createQueryBuilder({ data: [], error: null }))
      .mockReturnValueOnce(
        createQueryBuilder({
          data: [{ email_hash: hashEmail('suppressed@example.com') }],
          error: null,
        })
      );

    const resolver = new CustomerAudienceResolver();
    const recipients = await resolver.resolve();
    expect(recipients).toHaveLength(0);
  });
});
