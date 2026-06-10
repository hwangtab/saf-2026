/** @jest-environment node */
import { MemberSmsAudienceResolver } from '@/lib/sms/audiences/member';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { hashPhone } from '@/lib/sms/phone-hash';

jest.mock('@/lib/auth/server', () => ({ createSupabaseAdminClient: jest.fn() }));

// fetchAllInBatches는 .range(from,to)를 호출하므로, range가 thenable을 반환하도록 한다.
function tableStub(rows: unknown[]) {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'not', 'order', 'in']) {
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

describe('MemberSmsAudienceResolver', () => {
  beforeEach(() => jest.clearAllMocks());

  it('artists.contact_phone ∪ exhibitor.phone 합집합·정규화·중복제거', async () => {
    mockAdmin.mockReturnValue(
      adminStub({
        artists: [{ contact_phone: '010-1111-2222', name_ko: '작가', name_en: null }],
        profiles: [{ phone: '01033334444', name: '출품자' }],
        sms_suppressions: [],
      }) as unknown as ReturnType<typeof createSupabaseAdminClient>
    );
    const r = await new MemberSmsAudienceResolver().resolve();
    expect(r.map((x) => x.phone).sort()).toEqual(['01011112222', '01033334444']);
    expect(r.find((x) => x.phone === '01011112222')?.name).toBe('작가');
  });

  it('비-010 번호는 제외', async () => {
    mockAdmin.mockReturnValue(
      adminStub({
        artists: [{ contact_phone: '02-123-4567', name_ko: '유선', name_en: null }],
        profiles: [],
        sms_suppressions: [],
      }) as unknown as ReturnType<typeof createSupabaseAdminClient>
    );
    const r = await new MemberSmsAudienceResolver().resolve();
    expect(r).toHaveLength(0);
  });

  it('sms_suppressions(member) 해시는 차감', async () => {
    mockAdmin.mockReturnValue(
      adminStub({
        artists: [{ contact_phone: '01011112222', name_ko: '작가', name_en: null }],
        profiles: [],
        sms_suppressions: [{ phone_hash: hashPhone('01011112222') }],
      }) as unknown as ReturnType<typeof createSupabaseAdminClient>
    );
    const r = await new MemberSmsAudienceResolver().resolve();
    expect(r).toHaveLength(0);
  });
});
