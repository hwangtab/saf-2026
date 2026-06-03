import { MemberAudienceResolver } from '@/lib/email/audiences/member';
import { createSupabaseQueryMock } from '@/lib/test-utils/email-audience-mock';

const mockFrom = jest.fn();
jest.mock('@/lib/auth/server', () => ({
  createSupabaseAdminClient: jest.fn(() => ({ from: mockFrom })),
}));

describe('MemberAudienceResolver subset 필터', () => {
  beforeEach(() => jest.clearAllMocks());

  it("subset='artist'면 작가만 반환하고 출품자 쿼리를 하지 않는다", async () => {
    mockFrom
      .mockReturnValueOnce(
        createSupabaseQueryMock({
          data: [{ contact_email: 'a@x.com', name_ko: '작가', name_en: null }],
          error: null,
        })
      ) // artists
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null })); // suppressions (출품자 쿼리 없음)

    const recipients = await new MemberAudienceResolver().resolve({ subset: 'artist' });

    expect(recipients).toHaveLength(1);
    expect(recipients[0].email).toBe('a@x.com');
    expect(mockFrom).toHaveBeenCalledTimes(2); // artists + suppressions만
  });

  it("subset='exhibitor'면 출품자만 반환하고 작가 쿼리를 하지 않는다", async () => {
    mockFrom
      .mockReturnValueOnce(
        createSupabaseQueryMock({ data: [{ email: 'e@x.com', name: '출품자' }], error: null })
      ) // exhibitors
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null })); // suppressions

    const recipients = await new MemberAudienceResolver().resolve({ subset: 'exhibitor' });

    expect(recipients).toHaveLength(1);
    expect(recipients[0].email).toBe('e@x.com');
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });

  it('subset 미지정이면 작가+출품자+suppressions 3쿼리(기존 동작)', async () => {
    mockFrom
      .mockReturnValueOnce(
        createSupabaseQueryMock({
          data: [{ contact_email: 'a@x.com', name_ko: '작가', name_en: null }],
          error: null,
        })
      )
      .mockReturnValueOnce(
        createSupabaseQueryMock({ data: [{ email: 'e@x.com', name: '출품자' }], error: null })
      )
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null }));

    const recipients = await new MemberAudienceResolver().resolve();

    expect(recipients).toHaveLength(2);
    expect(mockFrom).toHaveBeenCalledTimes(3);
  });
});
