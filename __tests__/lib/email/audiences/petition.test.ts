import { PetitionAudienceResolver } from '@/lib/email/audiences/petition';
import { createSupabaseQueryMock } from '@/lib/test-utils/email-audience-mock';

const mockFrom = jest.fn();

jest.mock('@/lib/auth/server', () => ({
  createSupabaseAdminClient: jest.fn(() => ({ from: mockFrom })),
}));

describe('PetitionAudienceResolver', () => {
  beforeEach(() => jest.clearAllMocks());

  it('petition_slug로 필터링하고 is_masked=false 서명자만 반환한다', async () => {
    mockFrom
      // petition_signatures query
      .mockReturnValueOnce(
        createSupabaseQueryMock({
          data: [{ email: 'signer@example.com', full_name: '서명자' }],
          error: null,
        })
      )
      // suppressions query
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null }));

    const resolver = new PetitionAudienceResolver('oh-yoon');
    const recipients = await resolver.resolve();

    expect(recipients).toHaveLength(1);
    expect(recipients[0].email).toBe('signer@example.com');
  });

  it('petition_slug 없이 resolve 시 빈 배열 반환', async () => {
    const resolver = new PetitionAudienceResolver('');
    const recipients = await resolver.resolve();
    expect(recipients).toHaveLength(0);
  });

  it('petition/all 채널 수신거부를 차감한다', async () => {
    const { hashEmail } = jest.requireActual('@/lib/email/email-hash') as {
      hashEmail: (e: string) => string;
    };

    mockFrom
      // petition_signatures query
      .mockReturnValueOnce(
        createSupabaseQueryMock({
          data: [
            { email: 'suppressed@example.com', full_name: '차단됨' },
            { email: 'ok@example.com', full_name: '정상' },
          ],
          error: null,
        })
      )
      // suppressions query
      .mockReturnValueOnce(
        createSupabaseQueryMock({
          data: [{ email_hash: hashEmail('suppressed@example.com') }],
          error: null,
        })
      );

    const resolver = new PetitionAudienceResolver('oh-yoon');
    const recipients = await resolver.resolve();

    expect(recipients).toHaveLength(1);
    expect(recipients[0].email).toBe('ok@example.com');
  });
});
