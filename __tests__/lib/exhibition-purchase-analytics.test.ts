import { buildExhibitionPurchaseAnalytics } from '@/lib/admin/exhibition-purchase-analytics';

describe('buildExhibitionPurchaseAnalytics', () => {
  it('summarizes only sales with exhibition sale details', () => {
    const analytics = buildExhibitionPurchaseAnalytics([
      {
        id: 'sale-1',
        artwork_id: 'artwork-1',
        buyer_name: '김구매',
        buyer_phone: '010-1111-2222',
        sale_price: 100000,
        quantity: 1,
        sold_at: '2026-01-24T01:00:00.000Z',
        exhibition_sale_details: {
          purchase_channel: '현장',
          delivery_status: '배송완료',
          shipping_required: '배송',
          paid_status: '입금완료',
          release_status: '반출완료',
        },
      },
      {
        id: 'sale-2',
        artwork_id: 'artwork-2',
        buyer_name: '김구매',
        buyer_phone: null,
        sale_price: 200000,
        quantity: 2,
        sold_at: '2026-01-25T01:00:00.000Z',
        exhibition_sale_details: [
          {
            purchase_channel: '온라인문의',
            delivery_status: '',
            shipping_required: '',
            paid_status: '',
            release_status: null,
          },
        ],
      },
      {
        id: 'sale-3',
        artwork_id: 'artwork-3',
        buyer_name: '분석제외',
        buyer_phone: '010-9999-9999',
        sale_price: 999999,
        quantity: 1,
        sold_at: '2026-02-01T01:00:00.000Z',
        exhibition_sale_details: null,
      },
    ]);

    expect(analytics.summary).toMatchObject({
      totalRevenue: 500000,
      saleQuantity: 3,
      uniqueBuyerCount: 1,
      averageCustomerRevenue: 500000,
      repeatBuyerCount: 1,
      twoPlusArtworkBuyerCount: 1,
    });
    expect(analytics.operational).toMatchObject({
      shippingRequiredCount: 1,
      shippingCompletedCount: 1,
      shippingUnknownCount: 2,
    });
    expect(analytics.purchaseChannels).toEqual([
      { label: '온라인문의', revenue: 400000, quantity: 2, buyerCount: 1 },
      { label: '현장', revenue: 100000, quantity: 1, buyerCount: 1 },
    ]);
    expect(analytics.deliveryStatuses).toEqual([
      { label: '확인 중', count: 2 },
      { label: '배송완료', count: 1 },
    ]);
    expect(analytics.paidStatuses).toEqual([
      { label: '확인 중', count: 2 },
      { label: '입금완료', count: 1 },
    ]);
    expect(analytics.releaseStatuses).toEqual([
      { label: '확인 중', count: 2 },
      { label: '반출완료', count: 1 },
    ]);
    expect(analytics.purchaseBuckets).toEqual([
      { label: '2점 이상', buyerCount: 1 },
      { label: '1점', buyerCount: 0 },
    ]);
    expect(analytics.buyers[0]).toMatchObject({
      buyerName: '김구매',
      buyerPhone: '010-1111-2222',
      purchaseCount: 3,
      artworkCount: 2,
      revenue: 500000,
      averagePurchaseAmount: 166667,
      lastPurchaseDate: '2026-01-25T01:00:00.000Z',
      channels: ['온라인문의', '현장'],
      deliverySummary: '확인 중 2건 · 배송완료 1건',
      paidSummary: '확인 중 2건 · 입금완료 1건',
      releaseSummary: '확인 중 2건 · 반출완료 1건',
    });
  });
});
