function buildShippingSupabaseMock(options: {
  order: Record<string, unknown> | null;
  orderError?: unknown;
  updateError?: unknown;
}) {
  const updates: Array<Record<string, unknown>> = [];
  const inMock = jest.fn(async () => ({ error: options.updateError ?? null }));
  const supabase = {
    from: jest.fn((table: string) => {
      if (table !== 'orders') throw new Error(`Unexpected table: ${table}`);
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn(async () => ({
              data: options.order,
              error: options.orderError ?? null,
            })),
          })),
        })),
        update: jest.fn((patch: Record<string, unknown>) => {
          updates.push(patch);
          return {
            eq: jest.fn(() => ({ in: inMock })),
          };
        }),
      };
    }),
  };
  return { supabase, updates, inMock };
}

describe('buyer order mutations', () => {
  it('updates shipping after trimming input and allows paid/preparing only', async () => {
    const { updateBuyerShippingMutation } = await import('@/lib/orders/buyer-mutations');
    const { supabase, updates, inMock } = buildShippingSupabaseMock({
      order: {
        id: 'ord-1',
        status: 'paid',
        buyer_email: 'buyer@example.com',
        buyer_user_id: null,
      },
    });

    const result = await updateBuyerShippingMutation(supabase as never, {
      orderNo: ' SAF-001 ',
      buyerEmail: ' BUYER@EXAMPLE.COM ',
      sessionUserId: null,
      shipping: {
        shippingName: ' 홍길동 ',
        shippingPhone: ' 01012345678 ',
        shippingPostalCode: ' 12345 ',
        shippingAddress: ' 서울시 ',
        shippingAddressDetail: ' 201호 ',
        shippingMemo: ' 경비실 ',
      },
    });

    expect(result).toEqual({ success: true });
    expect(updates[0]).toEqual({
      shipping_name: '홍길동',
      shipping_phone: '01012345678',
      shipping_address: '서울시',
      shipping_address_detail: '201호',
      shipping_memo: '경비실',
      shipping_postal_code: '12345',
    });
    expect(inMock).toHaveBeenCalledWith('status', ['paid', 'preparing']);
  });

  it('rejects blank required shipping fields before querying the order', async () => {
    const { updateBuyerShippingMutation } = await import('@/lib/orders/buyer-mutations');
    const { supabase } = buildShippingSupabaseMock({ order: null });

    const result = await updateBuyerShippingMutation(supabase as never, {
      orderNo: 'SAF-001',
      buyerEmail: 'buyer@example.com',
      sessionUserId: null,
      shipping: {
        shippingName: ' ',
        shippingPhone: '01012345678',
        shippingAddress: '서울시',
      },
    });

    expect(result).toEqual({ success: false, error: 'INVALID_INPUT' });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('allows a signed-in owner without requiring buyer email', async () => {
    const { updateBuyerShippingMutation } = await import('@/lib/orders/buyer-mutations');
    const { supabase } = buildShippingSupabaseMock({
      order: {
        id: 'ord-1',
        status: 'preparing',
        buyer_email: 'buyer@example.com',
        buyer_user_id: 'user-1',
      },
    });

    const result = await updateBuyerShippingMutation(supabase as never, {
      orderNo: 'SAF-001',
      buyerEmail: '',
      sessionUserId: 'user-1',
      shipping: {
        shippingName: '홍길동',
        shippingPhone: '01012345678',
        shippingAddress: '서울시',
      },
    });

    expect(result).toEqual({ success: true });
  });

  it('rejects non-owner email access as not found', async () => {
    const { updateBuyerShippingMutation } = await import('@/lib/orders/buyer-mutations');
    const { supabase } = buildShippingSupabaseMock({
      order: {
        id: 'ord-1',
        status: 'paid',
        buyer_email: 'other@example.com',
        buyer_user_id: null,
      },
    });

    const result = await updateBuyerShippingMutation(supabase as never, {
      orderNo: 'SAF-001',
      buyerEmail: 'buyer@example.com',
      sessionUserId: null,
      shipping: {
        shippingName: '홍길동',
        shippingPhone: '01012345678',
        shippingAddress: '서울시',
      },
    });

    expect(result).toEqual({ success: false, error: 'NOT_FOUND' });
  });

  it('rejects shipping updates after shipping has already started', async () => {
    const { updateBuyerShippingMutation } = await import('@/lib/orders/buyer-mutations');
    const { supabase } = buildShippingSupabaseMock({
      order: {
        id: 'ord-1',
        status: 'shipped',
        buyer_email: 'buyer@example.com',
        buyer_user_id: null,
      },
    });

    const result = await updateBuyerShippingMutation(supabase as never, {
      orderNo: 'SAF-001',
      buyerEmail: 'buyer@example.com',
      sessionUserId: null,
      shipping: {
        shippingName: '홍길동',
        shippingPhone: '01012345678',
        shippingAddress: '서울시',
      },
    });

    expect(result).toEqual({ success: false, error: 'INVALID_STATUS' });
  });

  it('maps order update errors to UPDATE_FAILED', async () => {
    const { updateBuyerShippingMutation } = await import('@/lib/orders/buyer-mutations');
    const { supabase } = buildShippingSupabaseMock({
      order: {
        id: 'ord-1',
        status: 'paid',
        buyer_email: 'buyer@example.com',
        buyer_user_id: null,
      },
      updateError: { message: 'update failed' },
    });

    const result = await updateBuyerShippingMutation(supabase as never, {
      orderNo: 'SAF-001',
      buyerEmail: 'buyer@example.com',
      sessionUserId: null,
      shipping: {
        shippingName: '홍길동',
        shippingPhone: '01012345678',
        shippingAddress: '서울시',
      },
    });

    expect(result).toEqual({ success: false, error: 'UPDATE_FAILED' });
  });
});
