import { MemberAudienceResolver } from '@/lib/email/audiences/member';
import { createSupabaseQueryMock } from '@/lib/test-utils/email-audience-mock';

const mockFrom = jest.fn();

jest.mock('@/lib/auth/server', () => ({
  createSupabaseAdminClient: jest.fn(() => ({ from: mockFrom })),
}));

describe('MemberAudienceResolver', () => {
  beforeEach(() => jest.clearAllMocks());

  it('artists.contact_email을 수신자로 반환한다', async () => {
    mockFrom
      // artists query
      .mockReturnValueOnce(
        createSupabaseQueryMock({
          data: [{ contact_email: 'artist@example.com', name_ko: '홍길동', name_en: 'Gildong' }],
          error: null,
        })
      )
      // exhibitors query (profiles role=exhibitor)
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null }))
      // suppressions query
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null }));

    const resolver = new MemberAudienceResolver();
    const recipients = await resolver.resolve();

    expect(recipients).toHaveLength(1);
    expect(recipients[0].email).toBe('artist@example.com');
    expect(recipients[0].name).toBe('홍길동');
  });

  it('suppression 목록에 있는 이메일을 제외한다', async () => {
    const { hashEmail } = jest.requireActual('@/lib/email/email-hash') as {
      hashEmail: (e: string) => string;
    };

    mockFrom
      // artists query
      .mockReturnValueOnce(
        createSupabaseQueryMock({
          data: [
            { contact_email: 'suppressed@example.com', name_ko: '차단됨', name_en: null },
            { contact_email: 'ok@example.com', name_ko: '정상', name_en: null },
          ],
          error: null,
        })
      )
      // exhibitors query
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null }))
      // suppressions query
      .mockReturnValueOnce(
        createSupabaseQueryMock({
          data: [{ email_hash: hashEmail('suppressed@example.com') }],
          error: null,
        })
      );

    const resolver = new MemberAudienceResolver();
    const recipients = await resolver.resolve();

    expect(recipients).toHaveLength(1);
    expect(recipients[0].email).toBe('ok@example.com');
  });

  it('contact_email이 null인 작가를 제외한다', async () => {
    mockFrom
      // artists query
      .mockReturnValueOnce(
        createSupabaseQueryMock({
          data: [
            { contact_email: null, name_ko: '이메일없음', name_en: null },
            { contact_email: 'valid@example.com', name_ko: '정상', name_en: null },
          ],
          error: null,
        })
      )
      // exhibitors query
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null }))
      // suppressions query
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null }));

    const resolver = new MemberAudienceResolver();
    const recipients = await resolver.resolve();

    expect(recipients).toHaveLength(1);
    expect(recipients[0].email).toBe('valid@example.com');
  });
});
