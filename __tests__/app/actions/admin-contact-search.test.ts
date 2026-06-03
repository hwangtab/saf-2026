import { searchContacts } from '@/app/actions/admin-contact-search';
import { createSupabaseQueryMock } from '@/lib/test-utils/email-audience-mock';

const mockFrom = jest.fn();
jest.mock('@/lib/auth/guards', () => ({
  requireAdmin: jest.fn(async () => ({ id: 'admin-1' })),
  requireAdminClient: jest.fn(async () => ({ from: mockFrom })),
}));

describe('searchContacts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('여러 출처를 합치고 이메일로 중복제거하며 출처 라벨을 병합한다', async () => {
    mockFrom
      .mockReturnValueOnce(
        createSupabaseQueryMock({
          data: [{ buyer_email: 'a@x.com', buyer_name: '구매자A' }],
          error: null,
        })
      ) // orders
      .mockReturnValueOnce(
        createSupabaseQueryMock({ data: [{ email: 'a@x.com', full_name: '서명A' }], error: null })
      ) // petition_signatures
      .mockReturnValueOnce(
        createSupabaseQueryMock({
          data: [{ contact_email: 'b@x.com', name_ko: '작가B', name_en: null }],
          error: null,
        })
      ) // artists
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null })) // profiles
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null })); // suppressions

    const { results } = await searchContacts('x');
    const a = results.find((r) => r.email === 'a@x.com')!;
    expect(a.sources.sort()).toEqual(['구매자', '서명자']);
    expect(results.map((r) => r.email).sort()).toEqual(['a@x.com', 'b@x.com']);
  });

  it('suppression된 연락처에 suppressed=true 플래그를 단다', async () => {
    const { hashEmail } = jest.requireActual('@/lib/email/email-hash') as {
      hashEmail: (e: string) => string;
    };
    mockFrom
      .mockReturnValueOnce(
        createSupabaseQueryMock({
          data: [{ buyer_email: 'block@x.com', buyer_name: '차단' }],
          error: null,
        })
      )
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null }))
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null }))
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null }))
      .mockReturnValueOnce(
        createSupabaseQueryMock({ data: [{ email_hash: hashEmail('block@x.com') }], error: null })
      );

    const { results } = await searchContacts('block');
    expect(results[0]).toMatchObject({ email: 'block@x.com', suppressed: true });
  });

  it('빈 쿼리는 빈 결과를 반환한다', async () => {
    const { results } = await searchContacts('   ');
    expect(results).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
