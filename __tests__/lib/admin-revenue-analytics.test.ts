import {
  buildRevenueAnalyticsFromRows,
  type RevenueSalesRecordRow,
} from '@/lib/admin/revenue-analytics';

function sale(overrides: Partial<RevenueSalesRecordRow>): RevenueSalesRecordRow {
  return {
    id: 'sale-default',
    artwork_id: 'art-default',
    order_id: null,
    external_order_id: null,
    buyer_name: null,
    buyer_phone: null,
    sale_price: 100000,
    quantity: 1,
    sold_at: '2026-05-01T00:00:00.000Z',
    source: 'manual',
    source_detail: null,
    artworks: {
      title: '기본 작품',
      artist_id: 'artist-default',
      artists: { name_ko: '기본 작가' },
    },
    orders: null,
    ...overrides,
  };
}

describe('buildRevenueAnalyticsFromRows', () => {
  const rows: RevenueSalesRecordRow[] = [
    sale({
      id: 'sale-may-lee-1',
      artwork_id: 'art-oh-1',
      order_id: 'order-1',
      external_order_id: 'EXT-1',
      buyer_name: '이승미',
      buyer_phone: '010-1111-2222',
      sale_price: 200000,
      quantity: 1,
      sold_at: '2026-05-03T03:00:00.000Z',
      source: 'toss',
      source_detail: 'widget',
      artworks: {
        title: '오윤 1',
        artist_id: 'artist-oh',
        artists: { name_ko: '오윤' },
      },
      orders: { order_no: 'SAF-001' },
    }),
    sale({
      id: 'sale-may-lee-2',
      artwork_id: 'art-oh-2',
      order_id: 'order-2',
      buyer_name: '이승미',
      buyer_phone: '010-1111-2222',
      sale_price: 300000,
      quantity: 2,
      sold_at: '2026-05-04T03:00:00.000Z',
      artworks: {
        title: '오윤 2',
        artist_id: 'artist-oh',
        artists: [{ name_ko: '오윤' }],
      },
      orders: { order_no: 'SAF-002' },
    }),
    sale({
      id: 'sale-may-lee-same-name',
      artwork_id: 'art-kim-1',
      buyer_name: '이승미',
      buyer_phone: '010-9999-0000',
      sale_price: 400000,
      quantity: 1,
      sold_at: '2026-05-05T03:00:00.000Z',
      artworks: {
        title: '김작가 1',
        artist_id: 'artist-kim',
        artists: { name_ko: '김작가' },
      },
    }),
    sale({
      id: 'sale-may-no-phone',
      artwork_id: 'art-no-phone',
      buyer_name: '연락처없음',
      buyer_phone: null,
      sale_price: 500000,
      quantity: 1,
      sold_at: '2026-05-06T03:00:00.000Z',
      artworks: {
        title: '작가 미상 작품',
        artist_id: null,
        artists: { name_ko: '작가 미상' },
      },
    }),
    sale({
      id: 'sale-june',
      artwork_id: 'art-june',
      buyer_name: '이승미',
      buyer_phone: '010-1111-2222',
      sale_price: 900000,
      quantity: 1,
      sold_at: '2026-06-01T03:00:00.000Z',
      artworks: {
        title: '6월 작품',
        artist_id: 'artist-oh',
        artists: { name_ko: '오윤' },
      },
    }),
  ];

  it('selected month entries contain only that month and preserve order evidence fields', () => {
    const analytics = buildRevenueAnalyticsFromRows({
      rows,
      selectedYear: 2026,
      selectedMonth: 5,
      availableYears: [2026],
      soldWithoutSoldAtCount: 0,
    });

    expect(analytics.entries.map((entry) => entry.saleId)).toEqual([
      'sale-may-lee-1',
      'sale-may-lee-2',
      'sale-may-lee-same-name',
      'sale-may-no-phone',
    ]);
    expect(analytics.entries[0]).toMatchObject({
      saleId: 'sale-may-lee-1',
      orderId: 'order-1',
      orderNo: 'SAF-001',
      externalOrderId: 'EXT-1',
      buyerName: '이승미',
      buyerPhone: '010-1111-2222',
      artistId: 'artist-oh',
      artistName: '오윤',
      quantity: 1,
      unitPrice: 200000,
      revenue: 200000,
      source: 'toss',
      sourceDetail: 'widget',
      channel: 'online',
    });
  });

  it('groups buyers by name and phone, falling back to name when phone is missing', () => {
    const analytics = buildRevenueAnalyticsFromRows({
      rows,
      selectedYear: 2026,
      selectedMonth: 5,
      availableYears: [2026],
      soldWithoutSoldAtCount: 0,
    });

    expect(analytics.topBuyers).toEqual([
      expect.objectContaining({
        buyerName: '이승미',
        buyerPhone: '010-1111-2222',
        revenue: 800000,
        soldCount: 3,
        purchaseCount: 2,
      }),
      expect.objectContaining({
        buyerName: '연락처없음',
        buyerPhone: null,
        revenue: 500000,
        soldCount: 1,
        purchaseCount: 1,
      }),
      expect.objectContaining({
        buyerName: '이승미',
        buyerPhone: '010-9999-0000',
        revenue: 400000,
        soldCount: 1,
        purchaseCount: 1,
      }),
    ]);
  });

  it('filters detail entries by buyer name and phone', () => {
    const analytics = buildRevenueAnalyticsFromRows({
      rows,
      selectedYear: 2026,
      selectedMonth: 5,
      availableYears: [2026],
      soldWithoutSoldAtCount: 0,
      drilldown: {
        buyerName: '이승미',
        buyerPhone: '010-1111-2222',
        artistId: null,
      },
    });

    expect(analytics.entries.map((entry) => entry.saleId)).toEqual([
      'sale-may-lee-1',
      'sale-may-lee-2',
    ]);
  });

  it('filters detail entries by artist id when available and by artist name fallback otherwise', () => {
    const artistIdAnalytics = buildRevenueAnalyticsFromRows({
      rows,
      selectedYear: 2026,
      selectedMonth: 5,
      availableYears: [2026],
      soldWithoutSoldAtCount: 0,
      drilldown: {
        buyerName: null,
        buyerPhone: null,
        artistId: 'artist-oh',
      },
    });

    expect(artistIdAnalytics.entries.map((entry) => entry.saleId)).toEqual([
      'sale-may-lee-1',
      'sale-may-lee-2',
    ]);

    const artistNameAnalytics = buildRevenueAnalyticsFromRows({
      rows,
      selectedYear: 2026,
      selectedMonth: 5,
      availableYears: [2026],
      soldWithoutSoldAtCount: 0,
      drilldown: {
        buyerName: null,
        buyerPhone: null,
        artistId: 'name:작가 미상',
      },
    });

    expect(artistNameAnalytics.entries.map((entry) => entry.saleId)).toEqual([
      'sale-may-no-phone',
    ]);
  });
});
