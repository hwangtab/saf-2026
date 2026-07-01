const mockMarkOrderRefundedAfterCancel = jest.fn();
const mockCancelPayment = jest.fn();
const mockResolveOrderProvider = jest.fn(() => 'domestic');

jest.mock('@/lib/commerce/refund-cancel/mark-order-refunded', () => ({
  markOrderRefundedAfterCancel: (...args: unknown[]) => mockMarkOrderRefundedAfterCancel(...args),
}));

jest.mock('@/lib/integrations/toss/cancel', () => ({
  cancelPayment: (...args: unknown[]) => mockCancelPayment(...args),
}));

jest.mock('@/lib/integrations/toss/config', () => ({
  resolveOrderProvider: (...args: unknown[]) => mockResolveOrderProvider(...args),
}));

function buildAdminRefundSupabaseMock(options: {
  order: Record<string, unknown> | null;
  orderError?: unknown;
  payment?: Record<string, unknown> | null;
  paymentError?: unknown;
}) {
  const orderEq = jest.fn(() => ({
    single: jest.fn(async () => ({
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
  buyer_name: '홍길동',
  buyer_phone: '010-0000-0000',
  buyer_email: 'buyer@example.com',
  metadata: { payment_provider: 'domestic' },
  order_items: [{ artwork_id: 'art-1', quantity: 1, unit_price: 500000 }],
};

const paidPayment = {
  id: 'pay-1',
  payment_key: 'pk_test',
  method: '카드',
  status: 'DONE',
};

describe('admin refund mutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMarkOrderRefundedAfterCancel.mockResolvedValue({ ok: true, warnings: [] });
    mockCancelPayment.mockResolvedValue({ success: true });
    mockResolveOrderProvider.mockReturnValue('domestic');
  });

  it('cancels a paid Toss payment before running the shared refunded lifecycle', async () => {
    const { refundOrderMutation } = await import('@/lib/orders/admin-refund');
    const { supabase, orderEq } = buildAdminRefundSupabaseMock({
      order: paidOrder,
      payment: paidPayment,
    });

    const refundReceiveAccount = {
      bank: '국민',
      accountNumber: '123-456',
      holderName: '홍길동',
    };
    const result = await refundOrderMutation(supabase as never, {
      orderId: 'ord-1',
      cancelReason: ' 관리자 환불 ',
      refundReceiveAccount,
      now: '2026-06-30T05:00:00.000Z',
    });

    expect(result).toEqual({
      success: true,
      order: paidOrder,
      payment: paidPayment,
      hasTossPayment: true,
      warnings: [],
    });
    expect(orderEq).toHaveBeenCalledWith('id', 'ord-1');
    expect(mockResolveOrderProvider).toHaveBeenCalledWith(paidOrder.metadata);
    expect(mockCancelPayment).toHaveBeenCalledWith(
      'pk_test',
      {
        cancelReason: '관리자 환불',
        refundReceiveAccount,
      },
      'refund-SAF-001',
      'domestic'
    );
    expect(mockMarkOrderRefundedAfterCancel).toHaveBeenCalledWith({
      supabase,
      order: paidOrder,
      payment: paidPayment,
      now: '2026-06-30T05:00:00.000Z',
      sourceStatuses: ['paid', 'preparing', 'refund_requested'],
      voidReason: '관리자 환불',
    });
  });

  it('skips Toss cancel when the latest payment is already canceled', async () => {
    const { refundOrderMutation } = await import('@/lib/orders/admin-refund');
    const alreadyCanceledPayment = { ...paidPayment, status: 'CANCELED' };
    const { supabase } = buildAdminRefundSupabaseMock({
      order: paidOrder,
      payment: alreadyCanceledPayment,
    });

    const result = await refundOrderMutation(supabase as never, {
      orderId: 'ord-1',
      cancelReason: '관리자 환불',
      now: '2026-06-30T05:00:00.000Z',
    });

    expect(result).toEqual({
      success: true,
      order: paidOrder,
      payment: alreadyCanceledPayment,
      hasTossPayment: true,
      warnings: [],
    });
    expect(mockCancelPayment).not.toHaveBeenCalled();
    expect(mockMarkOrderRefundedAfterCancel).toHaveBeenCalledWith(
      expect.objectContaining({
        payment: alreadyCanceledPayment,
        sourceStatuses: ['paid', 'preparing', 'refund_requested'],
      })
    );
  });

  it('runs the refunded lifecycle without Toss cancel for payments without a payment key', async () => {
    const { refundOrderMutation } = await import('@/lib/orders/admin-refund');
    const bankPayment = {
      id: 'pay-bank',
      payment_key: null,
      method: 'BANK_TRANSFER',
      status: 'DONE',
    };
    const { supabase, paymentEq } = buildAdminRefundSupabaseMock({
      order: { ...paidOrder, status: 'preparing' },
      payment: bankPayment,
    });

    const result = await refundOrderMutation(supabase as never, {
      orderId: 'ord-1',
      cancelReason: '계좌이체 환불',
      now: '2026-06-30T05:00:00.000Z',
    });

    expect(result).toEqual({
      success: true,
      order: { ...paidOrder, status: 'preparing' },
      payment: bankPayment,
      hasTossPayment: false,
      warnings: [],
    });
    expect(paymentEq).toHaveBeenCalledWith('order_id', 'ord-1');
    expect(mockCancelPayment).not.toHaveBeenCalled();
    expect(mockMarkOrderRefundedAfterCancel).toHaveBeenCalledWith(
      expect.objectContaining({
        payment: bankPayment,
        sourceStatuses: ['paid', 'preparing', 'refund_requested'],
        voidReason: '계좌이체 환불',
      })
    );
  });

  it('processes refund for refund_requested order with Toss cancel and lifecycle sync', async () => {
    const { refundOrderMutation } = await import('@/lib/orders/admin-refund');
    const refundRequestedOrder = { ...paidOrder, status: 'refund_requested' };
    const { supabase } = buildAdminRefundSupabaseMock({
      order: refundRequestedOrder,
      payment: paidPayment,
    });

    const result = await refundOrderMutation(supabase as never, {
      orderId: 'ord-1',
      cancelReason: '관리자 환불',
      now: '2026-06-30T05:00:00.000Z',
    });

    expect(result).toEqual({
      success: true,
      order: refundRequestedOrder,
      payment: paidPayment,
      hasTossPayment: true,
      warnings: [],
    });
    expect(mockCancelPayment).toHaveBeenCalledWith(
      'pk_test',
      { cancelReason: '관리자 환불' },
      'refund-SAF-001',
      'domestic'
    );
    expect(mockMarkOrderRefundedAfterCancel).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceStatuses: ['paid', 'preparing', 'refund_requested'],
      })
    );
  });

  it('rejects statuses outside paid, preparing, refund_requested before touching payments', async () => {
    const { refundOrderMutation } = await import('@/lib/orders/admin-refund');
    const { supabase, paymentEq } = buildAdminRefundSupabaseMock({
      order: { ...paidOrder, status: 'shipped' },
    });

    await expect(
      refundOrderMutation(supabase as never, {
        orderId: 'ord-1',
        cancelReason: '관리자 환불',
        now: '2026-06-30T05:00:00.000Z',
      })
    ).rejects.toThrow('환불 가능한 상태가 아닙니다. (현재 상태: shipped)');

    expect(paymentEq).not.toHaveBeenCalled();
    expect(mockCancelPayment).not.toHaveBeenCalled();
    expect(mockMarkOrderRefundedAfterCancel).not.toHaveBeenCalled();
  });

  it('throws the existing TossPayments failure message and stops before lifecycle sync', async () => {
    const { refundOrderMutation } = await import('@/lib/orders/admin-refund');
    const { supabase } = buildAdminRefundSupabaseMock({
      order: paidOrder,
      payment: paidPayment,
    });
    mockCancelPayment.mockResolvedValue({ success: false, error: { message: 'cancel failed' } });

    await expect(
      refundOrderMutation(supabase as never, {
        orderId: 'ord-1',
        cancelReason: '관리자 환불',
        now: '2026-06-30T05:00:00.000Z',
      })
    ).rejects.toThrow('TossPayments 취소 실패: cancel failed');

    expect(mockMarkOrderRefundedAfterCancel).not.toHaveBeenCalled();
  });

  it('returns a structured sync failure when the internal refunded lifecycle cannot update the order', async () => {
    const { refundOrderMutation } = await import('@/lib/orders/admin-refund');
    const { supabase } = buildAdminRefundSupabaseMock({
      order: paidOrder,
      payment: paidPayment,
    });
    mockMarkOrderRefundedAfterCancel.mockResolvedValue({
      ok: false,
      code: 'ORDER_UPDATE_FAILED',
      error: 'update failed',
    });

    const result = await refundOrderMutation(supabase as never, {
      orderId: 'ord-1',
      cancelReason: ' 관리자 환불 ',
      now: '2026-06-30T05:00:00.000Z',
    });

    expect(result).toEqual({
      success: false,
      error: 'ORDER_REFUND_SYNC_FAILED',
      syncFailure: {
        order: paidOrder,
        payment: paidPayment,
        code: 'ORDER_UPDATE_FAILED',
        syncError: 'update failed',
        hasTossPayment: true,
        cancelReason: '관리자 환불',
      },
    });
  });
});
