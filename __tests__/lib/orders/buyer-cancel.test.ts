const mockCancelAwaitingDepositOrder = jest.fn();
const mockMarkOrderRefundedAfterCancel = jest.fn();
const mockCancelPayment = jest.fn();
const mockResolveOrderProvider = jest.fn(() => 'domestic');

jest.mock('@/lib/commerce/refund-cancel/cancel-awaiting-order', () => ({
  cancelAwaitingDepositOrder: (...args: unknown[]) => mockCancelAwaitingDepositOrder(...args),
}));

jest.mock('@/lib/commerce/refund-cancel/mark-order-refunded', () => ({
  markOrderRefundedAfterCancel: (...args: unknown[]) => mockMarkOrderRefundedAfterCancel(...args),
}));

jest.mock('@/lib/integrations/toss/cancel', () => ({
  cancelPayment: (...args: unknown[]) => mockCancelPayment(...args),
}));

jest.mock('@/lib/integrations/toss/config', () => ({
  resolveOrderProvider: (...args: unknown[]) => mockResolveOrderProvider(...args),
}));

function buildBuyerCancelSupabaseMock(options: {
  order: Record<string, unknown> | null;
  orderError?: unknown;
  payment?: Record<string, unknown> | null;
  paymentError?: unknown;
}) {
  const orderEq = jest.fn(() => ({
    maybeSingle: jest.fn(async () => ({
      data: options.order,
      error: options.orderError ?? null,
    })),
  }));
  const paymentMaybeSingle = jest.fn(async () => ({
    data: options.payment ?? null,
    error: options.paymentError ?? null,
  }));
  const paymentLimit = jest.fn(() => ({ maybeSingle: paymentMaybeSingle }));
  const paymentOrder = jest.fn(() => ({ limit: paymentLimit }));
  const paymentEq = jest.fn(() => ({ order: paymentOrder }));

  const supabase = {
    from: jest.fn((table: string) => {
      if (table === 'orders') {
        return {
          select: jest.fn(() => ({
            eq: orderEq,
          })),
        };
      }
      if (table === 'payments') {
        return {
          select: jest.fn(() => ({
            eq: paymentEq,
          })),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return { supabase, orderEq, paymentEq };
}

const paidOrder = {
  id: 'ord-1',
  order_no: 'SAF-001',
  status: 'paid',
  total_amount: 500000,
  artwork_id: 'art-1',
  buyer_email: 'buyer@example.com',
  buyer_user_id: null,
  buyer_name: '홍길동',
  metadata: { payment_provider: 'toss' },
  order_items: [{ artwork_id: 'art-1', quantity: 1, unit_price: 500000 }],
};

const awaitingOrder = {
  ...paidOrder,
  status: 'awaiting_deposit',
};

describe('buyer order cancel mutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCancelAwaitingDepositOrder.mockResolvedValue({ ok: true, warnings: [] });
    mockMarkOrderRefundedAfterCancel.mockResolvedValue({ ok: true, warnings: [] });
    mockCancelPayment.mockResolvedValue({ success: true });
    mockResolveOrderProvider.mockReturnValue('domestic');
  });

  it('cancels awaiting_deposit orders through the shared awaiting lifecycle without Toss cancel', async () => {
    const { cancelBuyerOrderMutation } = await import('@/lib/orders/buyer-cancel');
    const { supabase, orderEq } = buildBuyerCancelSupabaseMock({ order: awaitingOrder });

    const result = await cancelBuyerOrderMutation(supabase as never, {
      orderNo: ' SAF-001 ',
      buyerEmail: ' BUYER@EXAMPLE.COM ',
      sessionUserId: null,
      cancelReason: ' 단순변심 ',
      now: '2026-06-30T05:00:00.000Z',
    });

    expect(result).toEqual({
      success: true,
      kind: 'awaiting_deposit',
      order: awaitingOrder,
      warnings: [],
    });
    expect(orderEq).toHaveBeenCalledWith('order_no', 'SAF-001');
    expect(mockCancelAwaitingDepositOrder).toHaveBeenCalledWith({
      supabase,
      order: awaitingOrder,
      now: '2026-06-30T05:00:00.000Z',
    });
    expect(mockCancelPayment).not.toHaveBeenCalled();
    expect(mockMarkOrderRefundedAfterCancel).not.toHaveBeenCalled();
  });

  it('allows a signed-in owner to cancel a paid order without buyer email', async () => {
    const { cancelBuyerOrderMutation } = await import('@/lib/orders/buyer-cancel');
    const ownerOrder = { ...paidOrder, buyer_user_id: 'user-1' };
    const payment = { id: 'pay-1', payment_key: 'pk_test', method: '카드' };
    const { supabase } = buildBuyerCancelSupabaseMock({ order: ownerOrder, payment });

    const result = await cancelBuyerOrderMutation(supabase as never, {
      orderNo: 'SAF-001',
      buyerEmail: '',
      sessionUserId: 'user-1',
      cancelReason: '단순변심',
      now: '2026-06-30T05:00:00.000Z',
    });

    expect(result).toEqual({
      success: true,
      kind: 'paid',
      order: ownerOrder,
      payment,
      warnings: [],
    });
    expect(mockResolveOrderProvider).toHaveBeenCalledWith(ownerOrder.metadata);
    expect(mockCancelPayment).toHaveBeenCalledWith(
      'pk_test',
      { cancelReason: '단순변심' },
      'buyer-cancel-SAF-001',
      'domestic'
    );
    expect(mockMarkOrderRefundedAfterCancel).toHaveBeenCalledWith({
      supabase,
      order: ownerOrder,
      payment,
      now: '2026-06-30T05:00:00.000Z',
      sourceStatuses: ['paid'],
      voidReason: '단순변심',
    });
  });

  it('rejects non-owner email access as not found before touching payments', async () => {
    const { cancelBuyerOrderMutation } = await import('@/lib/orders/buyer-cancel');
    const { supabase, paymentEq } = buildBuyerCancelSupabaseMock({ order: paidOrder });

    const result = await cancelBuyerOrderMutation(supabase as never, {
      orderNo: 'SAF-001',
      buyerEmail: 'other@example.com',
      sessionUserId: null,
      cancelReason: '단순변심',
      now: '2026-06-30T05:00:00.000Z',
    });

    expect(result).toEqual({ success: false, error: 'NOT_FOUND' });
    expect(paymentEq).not.toHaveBeenCalled();
    expect(mockCancelPayment).not.toHaveBeenCalled();
  });

  it('rejects statuses outside paid and awaiting_deposit', async () => {
    const { cancelBuyerOrderMutation } = await import('@/lib/orders/buyer-cancel');
    const { supabase } = buildBuyerCancelSupabaseMock({
      order: { ...paidOrder, status: 'preparing' },
    });

    const result = await cancelBuyerOrderMutation(supabase as never, {
      orderNo: 'SAF-001',
      buyerEmail: 'buyer@example.com',
      sessionUserId: null,
      cancelReason: '단순변심',
      now: '2026-06-30T05:00:00.000Z',
    });

    expect(result).toEqual({ success: false, error: 'INVALID_STATUS' });
  });

  it('returns NO_PAYMENT when a paid order has no Toss payment key', async () => {
    const { cancelBuyerOrderMutation } = await import('@/lib/orders/buyer-cancel');
    const { supabase } = buildBuyerCancelSupabaseMock({
      order: paidOrder,
      payment: { id: 'pay-1', payment_key: null, method: '카드' },
    });

    const result = await cancelBuyerOrderMutation(supabase as never, {
      orderNo: 'SAF-001',
      buyerEmail: 'buyer@example.com',
      sessionUserId: null,
      cancelReason: '단순변심',
      now: '2026-06-30T05:00:00.000Z',
    });

    expect(result).toEqual({ success: false, error: 'NO_PAYMENT' });
  });

  it('returns a Toss failure without running the refund lifecycle', async () => {
    const { cancelBuyerOrderMutation } = await import('@/lib/orders/buyer-cancel');
    const { supabase } = buildBuyerCancelSupabaseMock({
      order: paidOrder,
      payment: { id: 'pay-1', payment_key: 'pk_test', method: '카드' },
    });
    mockCancelPayment.mockResolvedValue({ success: false, error: { message: 'cancel failed' } });

    const result = await cancelBuyerOrderMutation(supabase as never, {
      orderNo: 'SAF-001',
      buyerEmail: 'buyer@example.com',
      sessionUserId: null,
      cancelReason: '단순변심',
      now: '2026-06-30T05:00:00.000Z',
    });

    expect(result).toEqual({
      success: false,
      error: 'TOSS_CANCEL_FAILED: cancel failed',
    });
    expect(mockMarkOrderRefundedAfterCancel).not.toHaveBeenCalled();
  });

  it('returns structured sync failure after Toss cancel succeeds but internal refund sync fails', async () => {
    const { cancelBuyerOrderMutation } = await import('@/lib/orders/buyer-cancel');
    const payment = { id: 'pay-1', payment_key: 'pk_test', method: '카드' };
    const { supabase } = buildBuyerCancelSupabaseMock({ order: paidOrder, payment });
    mockMarkOrderRefundedAfterCancel.mockResolvedValue({
      ok: false,
      code: 'ORDER_UPDATE_FAILED',
      error: 'update failed',
    });

    const result = await cancelBuyerOrderMutation(supabase as never, {
      orderNo: 'SAF-001',
      buyerEmail: 'buyer@example.com',
      sessionUserId: null,
      cancelReason: '단순변심',
      now: '2026-06-30T05:00:00.000Z',
    });

    expect(result).toEqual({
      success: false,
      error: 'ORDER_CANCEL_FAILED',
      syncFailure: {
        order: paidOrder,
        payment,
        code: 'ORDER_UPDATE_FAILED',
        syncError: 'update failed',
      },
    });
  });
});
