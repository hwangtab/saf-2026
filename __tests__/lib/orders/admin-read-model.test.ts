type MockResult = { data: unknown; error: unknown };

function buildThenableQuery(
  table: string,
  result: MockResult,
  calls: Array<{ table: string; method: string; args: unknown[] }>
) {
  const query = {
    order: jest.fn((...args: unknown[]) => {
      calls.push({ table, method: 'order', args });
      return query;
    }),
    limit: jest.fn((...args: unknown[]) => {
      calls.push({ table, method: 'limit', args });
      return query;
    }),
    eq: jest.fn((...args: unknown[]) => {
      calls.push({ table, method: 'eq', args });
      return query;
    }),
    or: jest.fn((...args: unknown[]) => {
      calls.push({ table, method: 'or', args });
      return query;
    }),
    maybeSingle: jest.fn(async () => result),
    then: (resolve: (value: MockResult) => unknown) => resolve(result),
  };
  return query;
}

function buildAdminReadSupabaseMock(options: {
  ordersList?: MockResult;
  orderDetail?: MockResult;
  payment?: MockResult;
  sale?: MockResult;
}) {
  const calls: Array<{ table: string; method: string; args: unknown[] }> = [];
  const supabase = {
    from: jest.fn((table: string) => ({
      select: jest.fn((...selectArgs: unknown[]) => {
        calls.push({ table, method: 'select', args: selectArgs });
        if (table === 'orders') {
          return buildThenableQuery(
            table,
            options.orderDetail ?? options.ordersList ?? { data: null, error: null },
            calls
          );
        }
        if (table === 'payments') {
          return buildThenableQuery(table, options.payment ?? { data: null, error: null }, calls);
        }
        if (table === 'artwork_sales') {
          return buildThenableQuery(table, options.sale ?? { data: null, error: null }, calls);
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
    })),
  };
  return { supabase, calls };
}

describe('admin order read model', () => {
  it('lists orders with sanitized search, SLA flag, and representative multi-item artwork', async () => {
    const { getAdminOrdersReadModel } = await import('@/lib/orders/admin-read-model');
    const { supabase, calls } = buildAdminReadSupabaseMock({
      ordersList: {
        data: [
          {
            id: 'ord-1',
            order_no: 'SAF-001',
            status: 'paid',
            total_amount: 800000,
            buyer_name: '홍길동',
            buyer_phone: '010-0000-0000',
            created_at: '2026-06-29T05:00:00.000Z',
            paid_at: '2026-06-25T05:00:00.000Z',
            escalated_at: '2026-06-30T01:00:00.000Z',
            artwork_id: null,
            artworks: null,
            order_items: [
              {
                artworks: {
                  title: '봄의 정원',
                  images: ['spring.jpg'],
                  artists: { name_ko: '김작가' },
                },
              },
              {
                artworks: {
                  title: '여름 바다',
                  images: ['summer.jpg'],
                  artists: { name_ko: '이작가' },
                },
              },
            ],
          },
        ],
        error: null,
      },
    });

    const result = await getAdminOrdersReadModel(
      supabase as never,
      { status: 'sla_overdue', q: ' SAF,(001)%_ ' },
      { now: new Date('2026-06-30T05:00:00.000Z') }
    );

    expect(result).toEqual([
      {
        id: 'ord-1',
        order_no: 'SAF-001',
        status: 'paid',
        total_amount: 800000,
        buyer_name: '홍길동',
        buyer_phone: '010-0000-0000',
        created_at: '2026-06-29T05:00:00.000Z',
        paid_at: '2026-06-25T05:00:00.000Z',
        artwork_id: null,
        artwork_title: '봄의 정원 외 1건',
        artwork_image: 'spring.jpg',
        artist_name: '김작가',
        payment_method: null,
        escalated_at: '2026-06-30T01:00:00.000Z',
        sla_overdue: true,
      },
    ]);
    expect(calls).not.toContainEqual({
      table: 'orders',
      method: 'eq',
      args: ['status', 'sla_overdue'],
    });
    expect(calls).toContainEqual({
      table: 'orders',
      method: 'or',
      args: [
        'order_no.ilike.%SAF001%,buyer_name.ilike.%SAF001%,buyer_phone.ilike.%SAF001%,buyer_email.ilike.%SAF001%',
      ],
    });
  });

  it('builds order detail with line items, payment metadata, virtual account, and sale state', async () => {
    const { getAdminOrderDetailReadModel } = await import('@/lib/orders/admin-read-model');
    const { supabase } = buildAdminReadSupabaseMock({
      orderDetail: {
        data: {
          id: 'ord-1',
          order_no: 'SAF-001',
          status: 'awaiting_deposit',
          total_amount: 800000,
          item_amount: 800000,
          shipping_amount: 0,
          buyer_name: '홍길동',
          buyer_phone: '010-0000-0000',
          shipping_name: '수령인',
          shipping_phone: '010-1111-1111',
          shipping_address: '서울',
          shipping_address_detail: '101호',
          shipping_memo: '문 앞',
          shipping_carrier: null,
          tracking_number: null,
          created_at: '2026-06-30T05:00:00.000Z',
          paid_at: null,
          cancelled_at: null,
          refunded_at: null,
          escalated_at: null,
          artwork_id: null,
          metadata: { payment_provider: 'widget' },
          deposit_auto_cancel_paused: true,
          artworks: null,
          order_items: [
            {
              quantity: 1,
              unit_price: 500000,
              artwork_id: 'art-1',
              artworks: {
                title: '봄의 정원',
                images: ['spring.jpg'],
                artists: { name_ko: '김작가' },
              },
            },
            {
              quantity: 2,
              unit_price: 150000,
              artwork_id: 'art-2',
              artworks: {
                title: '여름 바다',
                images: ['summer.jpg'],
                artists: { name_ko: '이작가' },
              },
            },
          ],
        },
        error: null,
      },
      payment: {
        data: {
          payment_key: 'pk_test',
          status: 'WAITING_FOR_DEPOSIT',
          method: '가상계좌',
          approved_at: null,
          confirm_response: {
            virtualAccount: {
              accountNumber: '123-456',
              bankName: '테스트은행',
              dueDate: '2026-07-01T05:00:00Z',
            },
            easyPay: { provider: '토스페이' },
          },
        },
        error: null,
      },
      sale: {
        data: { id: 'sale-1', voided_at: '2026-06-30T06:00:00.000Z' },
        error: null,
      },
    });

    const result = await getAdminOrderDetailReadModel(supabase as never, 'ord-1', {
      now: new Date('2026-06-30T05:00:00.000Z'),
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: 'ord-1',
        order_no: 'SAF-001',
        status: 'awaiting_deposit',
        artwork_title: '봄의 정원 외 1건',
        artwork_image: 'spring.jpg',
        artist_name: '김작가',
        payment_key: 'pk_test',
        payment_status: 'WAITING_FOR_DEPOSIT',
        payment_method: '가상계좌',
        payment_method_detail: '가상계좌',
        payment_provider: 'widget',
        payment_easypay_provider: '토스페이',
        deposit_auto_cancel_paused: true,
        virtual_account_number: '123-456',
        virtual_account_bank: '테스트은행',
        virtual_account_due_date: '2026-07-01T05:00:00Z',
        sale_id: 'sale-1',
        sale_voided: true,
      })
    );
    expect(result?.line_items).toEqual([
      {
        artwork_id: 'art-1',
        artwork_title: '봄의 정원',
        artist_name: '김작가',
        quantity: 1,
        unit_price: 500000,
      },
      {
        artwork_id: 'art-2',
        artwork_title: '여름 바다',
        artist_name: '이작가',
        quantity: 2,
        unit_price: 150000,
      },
    ]);
  });
});
