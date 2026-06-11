/** @jest-environment node */
import { PetitionSmsAudienceResolver } from '@/lib/sms/audiences/petition';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { hashPhone } from '@/lib/sms/phone-hash';

jest.mock('@/lib/auth/server', () => ({ createSupabaseAdminClient: jest.fn() }));

// fetchAllInBatches는 .range(from,to)를 호출하므로 range가 thenable을 반환하도록 한다.
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

describe('PetitionSmsAudienceResolver', () => {
  beforeEach(() => jest.clearAllMocks());

  it('petition_slug 없이 resolve 시 빈 배열 반환', async () => {
    const resolver = new PetitionSmsAudienceResolver('');
    const recipients = await resolver.resolve();
    expect(recipients).toHaveLength(0);
  });

  it('petition_slug로 필터링하고 is_masked=false·phone NOT NULL 서명자만 반환한다', async () => {
    mockAdmin.mockReturnValue(
      adminStub({
        petition_signatures: [{ phone: '01012345678', full_name: '서명자' }],
        sms_suppressions: [],
      }) as unknown as ReturnType<typeof createSupabaseAdminClient>
    );
    const resolver = new PetitionSmsAudienceResolver('oh-yoon');
    const recipients = await resolver.resolve();

    expect(recipients).toHaveLength(1);
    expect(recipients[0].phone).toBe('01012345678');
    expect(recipients[0].name).toBe('서명자');
    expect(recipients[0].phoneHash).toBe(hashPhone('01012345678'));
  });

  it('비-010 번호(유선·국제)는 제외', async () => {
    mockAdmin.mockReturnValue(
      adminStub({
        petition_signatures: [
          { phone: '02-123-4567', full_name: '유선' },
          { phone: '+1-555-000-0000', full_name: '해외' },
        ],
        sms_suppressions: [],
      }) as unknown as ReturnType<typeof createSupabaseAdminClient>
    );
    const resolver = new PetitionSmsAudienceResolver('oh-yoon');
    const recipients = await resolver.resolve();
    expect(recipients).toHaveLength(0);
  });

  it('같은 번호가 여러 번 나오면 중복 제거', async () => {
    mockAdmin.mockReturnValue(
      adminStub({
        petition_signatures: [
          { phone: '010-1111-2222', full_name: '첫번째' },
          { phone: '01011112222', full_name: '두번째 (중복)' },
        ],
        sms_suppressions: [],
      }) as unknown as ReturnType<typeof createSupabaseAdminClient>
    );
    const resolver = new PetitionSmsAudienceResolver('oh-yoon');
    const recipients = await resolver.resolve();
    expect(recipients).toHaveLength(1);
    expect(recipients[0].phone).toBe('01011112222');
  });

  it('sms_suppressions(petition + all) 해시는 차감', async () => {
    mockAdmin.mockReturnValue(
      adminStub({
        petition_signatures: [
          { phone: '01011112222', full_name: '차단됨' },
          { phone: '01033334444', full_name: '정상' },
        ],
        sms_suppressions: [{ phone_hash: hashPhone('01011112222') }],
      }) as unknown as ReturnType<typeof createSupabaseAdminClient>
    );
    const resolver = new PetitionSmsAudienceResolver('oh-yoon');
    const recipients = await resolver.resolve();

    expect(recipients).toHaveLength(1);
    expect(recipients[0].phone).toBe('01033334444');
  });

  it('수신거부 조회 실패 시 hard throw (발송 중단)', async () => {
    const mockFromFn = jest
      .fn()
      // petition_signatures query
      .mockReturnValueOnce(tableStub([{ phone: '01011112222', full_name: '서명자' }]))
      // sms_suppressions query — error
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
      });

    mockAdmin.mockReturnValue({ from: mockFromFn } as unknown as ReturnType<
      typeof createSupabaseAdminClient
    >);

    const resolver = new PetitionSmsAudienceResolver('oh-yoon');
    await expect(resolver.resolve()).rejects.toThrow('수신거부 목록 조회 실패');
  });

  it('반환된 SmsRecipient에 phone·name·phoneHash가 모두 포함됨', async () => {
    mockAdmin.mockReturnValue(
      adminStub({
        petition_signatures: [{ phone: '010-9876-5432', full_name: '홍길동' }],
        sms_suppressions: [],
      }) as unknown as ReturnType<typeof createSupabaseAdminClient>
    );
    const resolver = new PetitionSmsAudienceResolver('oh-yoon');
    const recipients = await resolver.resolve();

    expect(recipients[0]).toMatchObject({
      phone: '01098765432',
      name: '홍길동',
      phoneHash: hashPhone('01098765432'),
    });
  });
});
