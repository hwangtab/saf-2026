import { ArtworkBuyerAudienceResolver } from '@/lib/email/audiences/artwork-buyer';
import { createSupabaseQueryMock } from '@/lib/test-utils/email-audience-mock';

const mockFrom = jest.fn();
jest.mock('@/lib/auth/server', () => ({
  createSupabaseAdminClient: jest.fn(() => ({ from: mockFrom })),
}));

describe('ArtworkBuyerAudienceResolver', () => {
  beforeEach(() => jest.clearAllMocks());

  it('order_items 기준 해당 작품 구매자 이메일을 정규화·중복제거해 반환한다', async () => {
    mockFrom
      .mockReturnValueOnce(
        createSupabaseQueryMock({
          data: [
            { orders: { buyer_email: 'Buyer@X.com', buyer_name: '구매자' } },
            { orders: { buyer_email: 'buyer@x.com', buyer_name: '중복' } },
          ],
          error: null,
        })
      ) // orders
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null })); // suppressions

    const recipients = await new ArtworkBuyerAudienceResolver('artwork-uuid').resolve();

    expect(mockFrom).toHaveBeenNthCalledWith(1, 'order_items');
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
            { orders: { buyer_email: 'blocked@x.com', buyer_name: '차단' } },
            { orders: { buyer_email: 'ok@x.com', buyer_name: '정상' } },
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

  it('광고성 작품 구매자 조회는 주문 생성일 6개월 필터를 order_items 조인에 적용한다', async () => {
    const buyersQuery = createSupabaseQueryMock({
      data: [{ orders: { buyer_email: 'recent@x.com', buyer_name: '최근' } }],
      error: null,
    });
    mockFrom
      .mockReturnValueOnce(buyersQuery)
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null }));

    const recipients = await new ArtworkBuyerAudienceResolver('artwork-uuid', {
      advertising: true,
    }).resolve();

    expect(mockFrom).toHaveBeenNthCalledWith(1, 'order_items');
    expect((buyersQuery as unknown as { eq: jest.Mock }).eq).toHaveBeenCalledWith(
      'artwork_id',
      'artwork-uuid'
    );
    expect((buyersQuery as unknown as { in: jest.Mock }).in).toHaveBeenCalledWith('orders.status', [
      'paid',
      'preparing',
      'shipped',
      'delivered',
    ]);
    expect((buyersQuery as unknown as { gte: jest.Mock }).gte).toHaveBeenCalledWith(
      'orders.created_at',
      expect.any(String)
    );
    expect(recipients.map((r) => r.email)).toEqual(['recent@x.com']);
  });
});
