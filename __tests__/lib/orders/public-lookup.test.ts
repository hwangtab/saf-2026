type MockResult = { data: unknown; error: unknown };

function buildPublicLookupSupabaseMock(options: {
  ordersList?: MockResult;
  phoneRows?: MockResult;
  orderDetail?: MockResult;
  payment?: MockResult;
}) {
  let ordersSelectCallCount = 0;
  const supabase = {
    from: jest.fn((table: string) => {
      if (table === 'orders') {
        return {
          select: jest.fn(() => {
            ordersSelectCallCount++;
            const currentResult =
              ordersSelectCallCount === 1
                ? (options.ordersList ?? options.orderDetail ?? { data: null, error: null })
                : (options.phoneRows ?? { data: null, error: null });

            const neq = jest.fn(() => ({
              order: jest.fn(() => currentResult),
              ...currentResult,
            }));
            const eq: jest.Mock = jest.fn(() => ({
              eq,
              neq,
              maybeSingle: jest.fn(() => options.orderDetail ?? { data: null, error: null }),
            }));
            return {
              eq,
              maybeSingle: jest.fn(() => options.orderDetail ?? { data: null, error: null }),
            };
          }),
        };
      }
      if (table === 'payments') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              maybeSingle: jest.fn(() => options.payment ?? { data: null, error: null }),
            })),
          })),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return { supabase };
}

describe('public order lookup read model', () => {
  it('returns only phone-verified orders and formats multi-item titles by locale', async () => {
    const { lookupPublicOrdersByBuyer } = await import('@/lib/orders/public-lookup');
    const { supabase } = buildPublicLookupSupabaseMock({
      ordersList: {
        data: [
          {
            order_no: 'SAF-CART',
            status: 'paid',
            total_amount: 800000,
            created_at: '2026-06-30T05:00:00.000Z',
            metadata: { locale: 'en' },
            artworks: null,
            order_items: [
              {
                artworks: {
                  id: 'art-1',
                  title: 'Spring Garden',
                  images: ['spring.jpg'],
                  artists: { name_ko: 'Kim' },
                },
              },
              {
                artworks: {
                  id: 'art-2',
                  title: 'Summer Sea',
                  images: ['summer.jpg'],
                  artists: { name_ko: 'Lee' },
                },
              },
            ],
          },
          {
            order_no: 'SAF-NO-PHONE',
            status: 'paid',
            total_amount: 500000,
            created_at: '2026-06-30T05:01:00.000Z',
            metadata: { locale: 'ko' },
            artworks: { id: 'art-3', title: '가을', images: ['fall.jpg'] },
            order_items: [],
          },
        ],
        error: null,
      },
      phoneRows: {
        data: [{ order_no: 'SAF-CART', buyer_phone: '+821012345678' }],
        error: null,
      },
    });

    const result = await lookupPublicOrdersByBuyer(supabase as never, {
      name: '홍길동',
      email: 'buyer@example.com',
      phone: '010-1234-5678',
    });

    expect(result).toEqual({
      success: true,
      orders: [
        {
          orderNo: 'SAF-CART',
          status: 'paid',
          artworkTitle: 'Spring Garden and 1 more',
          artworkImage: 'spring.jpg',
          artworkId: 'art-1',
          totalAmount: 800000,
          createdAt: '2026-06-30T05:00:00.000Z',
        },
      ],
    });
  });

  it('builds manual bank transfer detail from metadata instead of Toss virtual account', async () => {
    const { fetchPublicOrderDetailRow } = await import('@/lib/orders/public-lookup');
    const { supabase } = buildPublicLookupSupabaseMock({
      orderDetail: {
        data: {
          id: 'ord-bank',
          order_no: 'SAF-BANK',
          status: 'awaiting_deposit',
          buyer_email: 'buyer@example.com',
          buyer_user_id: null,
          item_amount: 500000,
          shipping_amount: 0,
          total_amount: 500000,
          paid_at: null,
          created_at: '2026-06-30T05:00:00.000Z',
          shipping_name: '홍길동',
          shipping_phone: '01012345678',
          shipping_postal_code: '12345',
          shipping_address: '서울',
          shipping_address_detail: null,
          shipping_memo: null,
          shipping_carrier: null,
          tracking_number: null,
          metadata: {
            locale: 'ko',
            payment_provider: 'manual_bank_transfer',
            bank_transfer: {
              bankName: '메타은행',
              accountNumber: '999-111',
              holderName: '메타 예금주',
              dueDate: '2026. 7. 1. 오후 2:00:00',
            },
          },
          artworks: {
            id: 'art-1',
            title: '봄의 정원',
            images: ['spring.jpg'],
            artists: { name_ko: '김작가' },
          },
          order_items: [],
        },
        error: null,
      },
      payment: {
        data: {
          method: '가상계좌',
          confirm_response: {
            virtualAccount: {
              bankName: 'Toss은행',
              accountNumber: '123-456',
              dueDate: '2026-07-01T05:00:00Z',
            },
          },
        },
        error: null,
      },
    });

    const row = await fetchPublicOrderDetailRow(supabase as never, 'SAF-BANK');

    expect(row?.buyerEmail).toBe('buyer@example.com');
    expect(row?.info.virtualAccount).toBeNull();
    expect(row?.info.bankTransfer).toEqual({
      bankName: '메타은행',
      accountNumber: '999-111',
      holderName: '메타 예금주',
      dueDate: '2026. 7. 1. 오후 2:00:00',
    });
    expect(row?.info.artworkTitle).toBe('봄의 정원');
    expect(row?.info.artistName).toBe('김작가');
  });
});
