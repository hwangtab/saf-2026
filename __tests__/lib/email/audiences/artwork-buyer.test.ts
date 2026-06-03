import { ArtworkBuyerAudienceResolver } from '@/lib/email/audiences/artwork-buyer';
import { createSupabaseQueryMock } from '@/lib/test-utils/email-audience-mock';

const mockFrom = jest.fn();
jest.mock('@/lib/auth/server', () => ({
  createSupabaseAdminClient: jest.fn(() => ({ from: mockFrom })),
}));

describe('ArtworkBuyerAudienceResolver', () => {
  beforeEach(() => jest.clearAllMocks());

  it('해당 작품 구매자 이메일을 정규화·중복제거해 반환한다', async () => {
    mockFrom
      .mockReturnValueOnce(
        createSupabaseQueryMock({
          data: [
            { buyer_email: 'Buyer@X.com', buyer_name: '구매자' },
            { buyer_email: 'buyer@x.com', buyer_name: '중복' },
          ],
          error: null,
        })
      ) // orders
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null })); // suppressions

    const recipients = await new ArtworkBuyerAudienceResolver('artwork-uuid').resolve();

    expect(recipients).toHaveLength(1);
    expect(recipients[0].email).toBe('buyer@x.com');
    expect(recipients[0].name).toBe('구매자');
  });

  it('customer+all suppression 이메일을 제외한다', async () => {
    const { hashEmail } = jest.requireActual('@/lib/email/email-hash') as {
      hashEmail: (e: string) => string;
    };
    mockFrom
      .mockReturnValueOnce(
        createSupabaseQueryMock({
          data: [
            { buyer_email: 'blocked@x.com', buyer_name: '차단' },
            { buyer_email: 'ok@x.com', buyer_name: '정상' },
          ],
          error: null,
        })
      )
      .mockReturnValueOnce(
        createSupabaseQueryMock({
          data: [{ email_hash: hashEmail('blocked@x.com') }],
          error: null,
        })
      );

    const recipients = await new ArtworkBuyerAudienceResolver('artwork-uuid').resolve();
    expect(recipients.map((r) => r.email)).toEqual(['ok@x.com']);
  });
});
