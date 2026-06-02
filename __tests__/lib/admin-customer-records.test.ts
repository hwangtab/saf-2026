import {
  buildAdminArtworkHref,
  buildCustomerRecords,
  buildMemberUserManagementHref,
  customerTypeLabel,
  formatPurchaseQuantityLabel,
} from '@/lib/admin/customer-records';

describe('buildCustomerRecords', () => {
  it('merges member profiles and purchase customers by exact trimmed name', () => {
    const records = buildCustomerRecords({
      profiles: [
        {
          id: 'profile-1',
          name: '이승미',
          email: 'member@example.com',
          status: 'active',
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      sales: [
        {
          id: 'sale-1',
          artwork_id: 'artwork-1',
          buyer_name: ' 이승미 ',
          buyer_phone: '010-1234-5678',
          sale_price: 1000000,
          quantity: 1,
          sold_at: '2026-01-13T03:00:00.000Z',
          source: 'manual',
          source_detail: 'manual_csv',
          artworks: {
            title: '봄의소리',
            artists: { name_ko: '오윤' },
          },
          exhibition_sale_details: {
            purchase_channel: '현장',
            delivery_status: '배송완료',
            shipping_required: '배송해야 함',
          },
        },
      ],
    });

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      customerName: '이승미',
      customerType: 'member_buyer',
      email: 'member@example.com',
      phone: '010-1234-5678',
      purchaseCount: 1,
      artworkCount: 1,
      totalRevenue: 1000000,
      channels: ['현장'],
      deliverySummary: '배송완료 1건',
    });
    expect(records[0].sales[0]).toMatchObject({
      artworkId: 'artwork-1',
      artworkTitle: '봄의소리',
      artistName: '오윤',
      quantity: 1,
      salePrice: 1000000,
      channel: '현장',
    });
  });

  it('creates non-member customer records for purchase-only names', () => {
    const records = buildCustomerRecords({
      profiles: [],
      sales: [
        {
          id: 'sale-2',
          artwork_id: 'artwork-2',
          buyer_name: '박영윤',
          buyer_phone: null,
          sale_price: 2000000,
          quantity: 2,
          sold_at: '2026-01-14T03:00:00.000Z',
          source: 'manual',
          source_detail: 'manual_csv',
          artworks: {
            title: '달을 든 여인',
            artists: { name_ko: '한애규' },
          },
          exhibition_sale_details: {
            purchase_channel: '온라인',
            delivery_status: null,
            shipping_required: null,
          },
        },
      ],
    });

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      customerName: '박영윤',
      customerType: 'buyer_only',
      purchaseCount: 2,
      artworkCount: 1,
      totalRevenue: 4000000,
      channels: ['온라인'],
      deliverySummary: '확인 중',
    });
  });

  it('counts only exhibition purchase sales and ignores legacy sale rows', () => {
    const records = buildCustomerRecords({
      profiles: [],
      sales: [
        {
          id: 'sale-exhibition',
          artwork_id: 'artwork-1',
          buyer_name: '이승미',
          buyer_phone: '010-1234-5678',
          sale_price: 1000000,
          quantity: 1,
          sold_at: '2026-01-13T03:00:00.000Z',
          source: 'manual',
          source_detail: 'manual_csv',
          artworks: {
            title: '봄의소리',
            artists: { name_ko: '오윤' },
          },
          exhibition_sale_details: {
            purchase_channel: '현장',
            delivery_status: '배송완료',
            shipping_required: '배송해야 함',
          },
        },
        {
          id: 'sale-legacy',
          artwork_id: 'artwork-1',
          buyer_name: '이승미',
          buyer_phone: '010-1234-5678',
          sale_price: 1000000,
          quantity: 1,
          sold_at: '2026-01-13T03:00:00.000Z',
          source: 'manual',
          source_detail: 'manual',
          artworks: {
            title: '봄의소리',
            artists: { name_ko: '오윤' },
          },
          exhibition_sale_details: null,
        },
      ],
    });

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      customerName: '이승미',
      purchaseCount: 1,
      totalRevenue: 1000000,
    });
    expect(records[0].sales).toHaveLength(1);
    expect(records[0].sales[0].saleId).toBe('sale-exhibition');
  });

  it('uses customer contact overrides before profile or sale fallback contacts', () => {
    const records = buildCustomerRecords({
      profiles: [
        {
          id: 'profile-1',
          name: '이승미',
          email: 'member@example.com',
          status: 'active',
          created_at: '2026-01-01T00:00:00.000Z',
        },
      ],
      sales: [
        {
          id: 'sale-1',
          artwork_id: 'artwork-1',
          buyer_name: '이승미',
          buyer_phone: '010-1234-5678',
          sale_price: 1000000,
          quantity: 1,
          sold_at: '2026-01-13T03:00:00.000Z',
          source: 'manual',
          source_detail: 'manual_csv',
          artworks: {
            title: '봄의소리',
            artists: { name_ko: '오윤' },
          },
          exhibition_sale_details: null,
        },
      ],
      contactOverrides: [
        {
          customer_key: 'profile:profile-1',
          phone: '010-9999-0000',
          email: 'override@example.com',
        },
      ],
    });

    expect(records[0]).toMatchObject({
      id: 'profile:profile-1',
      phone: '010-9999-0000',
      email: 'override@example.com',
    });
    expect(records[0].searchText).toContain('override@example.com');
    expect(records[0].searchText).toContain('010-9999-0000');
  });

  it('labels purchase-only customers as non-members', () => {
    expect(customerTypeLabel('buyer_only')).toBe('비회원');
    expect(customerTypeLabel('member_only')).toBe('회원');
    expect(customerTypeLabel('member_buyer')).toBe('회원+구매');
  });

  it('builds user management href only for member customers', () => {
    expect(
      buildMemberUserManagementHref({
        profileId: 'profile-1',
        customerName: '이승미',
        email: 'member@example.com',
      })
    ).toBe('/admin/users?q=member%40example.com');

    expect(
      buildMemberUserManagementHref({
        profileId: 'profile-2',
        customerName: '김회원',
        email: null,
      })
    ).toBe('/admin/users?q=%EA%B9%80%ED%9A%8C%EC%9B%90');

    expect(
      buildMemberUserManagementHref({
        profileId: null,
        customerName: '박비회원',
        email: 'buyer@example.com',
      })
    ).toBeNull();
  });

  it('builds admin artwork detail hrefs from sale artwork ids', () => {
    expect(buildAdminArtworkHref('artwork-1')).toBe('/admin/artworks/artwork-1');
    expect(buildAdminArtworkHref('')).toBeNull();
  });

  it('labels purchase quantity as artwork pieces, not order counts', () => {
    expect(formatPurchaseQuantityLabel(2)).toBe('2점');
  });
});
