/** @jest-environment node */
import { CustomerSmsAudienceResolver } from '@/lib/sms/audiences/customer';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { hashPhone } from '@/lib/sms/phone-hash';

jest.mock('@/lib/auth/server', () => ({ createSupabaseAdminClient: jest.fn() }));

function tableStub(rows: unknown[]) {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'not', 'order', 'in', 'gte']) {
    builder[m] = jest.fn(() => builder);
  }
  builder.range = jest.fn((from: number) =>
    Promise.resolve({ data: from === 0 ? rows : [], error: null, count: rows.length })
  );
  return builder;
}
function adminStub(tables: Record<string, unknown[]>) {
  return { from: (t: string) => tableStub(tables[t] ?? []) };
}
const mockAdmin = createSupabaseAdminClient as jest.MockedFunction<
  typeof createSupabaseAdminClient
>;

describe('CustomerSmsAudienceResolver', () => {
  beforeEach(() => jest.clearAllMocks());

  it('동의자.phone ∪ 거래고객.buyer_phone 합집합·중복제거', async () => {
    mockAdmin.mockReturnValue(
      adminStub({
        profiles: [{ id: 'u1', phone: '010-1111-2222', name: '동의' }],
        orders: [
          { buyer_phone: '01033334444', buyer_name: '구매' },
          { buyer_phone: '010-1111-2222', buyer_name: '중복' }, // 동의자와 중복
        ],
        sms_suppressions: [],
      }) as unknown as ReturnType<typeof createSupabaseAdminClient>
    );
    const r = await new CustomerSmsAudienceResolver().resolve();
    expect(r.map((x) => x.phone).sort()).toEqual(['01011112222', '01033334444']);
  });

  it('sms_suppressions(customer)는 차감', async () => {
    mockAdmin.mockReturnValue(
      adminStub({
        profiles: [{ id: 'u1', phone: '01011112222', name: '동의' }],
        orders: [],
        sms_suppressions: [{ phone_hash: hashPhone('01011112222') }],
      }) as unknown as ReturnType<typeof createSupabaseAdminClient>
    );
    const r = await new CustomerSmsAudienceResolver().resolve();
    expect(r).toHaveLength(0);
  });
});
