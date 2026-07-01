const mockCancelAwaitingDepositOrder = jest.fn();

jest.mock('@/lib/commerce/refund-cancel/cancel-awaiting-order', () => ({
  cancelAwaitingDepositOrder: (...args: unknown[]) => mockCancelAwaitingDepositOrder(...args),
}));

function buildAdminAwaitingCancelSupabaseMock(options: {
  order: Record<string, unknown> | null;
  orderError?: unknown;
}) {
  const orderEq = jest.fn(() => ({
    single: jest.fn(async () => ({
      data: options.order,
      error: options.orderError ?? null,
    })),
  }));

  const supabase = {
    from: jest.fn((table: string) => {
      if (table === 'orders') {
        return {
          select: jest.fn(() => ({
            eq: orderEq,
          })),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return { supabase, orderEq };
}

const awaitingOrder = {
  id: 'ord-1',
  order_no: 'SAF-001',
  status: 'awaiting_deposit',
  artwork_id: 'art-1',
  buyer_name: '홍길동',
  buyer_phone: '010-0000-0000',
  buyer_email: 'buyer@example.com',
  total_amount: 500000,
  metadata: { locale: 'ko' },
  order_items: [{ artwork_id: 'art-1', quantity: 1, unit_price: 500000 }],
};

describe('admin awaiting cancel mutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCancelAwaitingDepositOrder.mockResolvedValue({
      ok: true,
      artworkIds: ['art-1'],
      warnings: [],
    });
  });

  it('fetches an awaiting-deposit order and delegates cancellation to the shared lifecycle', async () => {
    const { cancelAwaitingOrderMutation } = await import('@/lib/orders/admin-awaiting-cancel');
    const { supabase, orderEq } = buildAdminAwaitingCancelSupabaseMock({ order: awaitingOrder });

    const result = await cancelAwaitingOrderMutation(supabase as never, {
      orderId: 'ord-1',
      now: '2026-06-30T05:00:00.000Z',
    });

    expect(result).toEqual({
      order: awaitingOrder,
      warnings: [],
    });
    expect(orderEq).toHaveBeenCalledWith('id', 'ord-1');
    expect(mockCancelAwaitingDepositOrder).toHaveBeenCalledWith({
      supabase,
      order: awaitingOrder,
      now: '2026-06-30T05:00:00.000Z',
    });
  });

  it('rejects non-awaiting statuses before running the shared lifecycle', async () => {
    const { cancelAwaitingOrderMutation } = await import('@/lib/orders/admin-awaiting-cancel');
    const { supabase } = buildAdminAwaitingCancelSupabaseMock({
      order: { ...awaitingOrder, status: 'paid' },
    });

    await expect(
      cancelAwaitingOrderMutation(supabase as never, {
        orderId: 'ord-1',
        now: '2026-06-30T05:00:00.000Z',
      })
    ).rejects.toThrow('입금 대기 상태에서만 취소할 수 있습니다. (현재 상태: paid)');

    expect(mockCancelAwaitingDepositOrder).not.toHaveBeenCalled();
  });

  it('preserves lifecycle update failures as thrown errors', async () => {
    const { cancelAwaitingOrderMutation } = await import('@/lib/orders/admin-awaiting-cancel');
    const { supabase } = buildAdminAwaitingCancelSupabaseMock({ order: awaitingOrder });
    mockCancelAwaitingDepositOrder.mockResolvedValue({
      ok: false,
      code: 'ORDER_UPDATE_FAILED',
      error: 'update failed',
    });

    await expect(
      cancelAwaitingOrderMutation(supabase as never, {
        orderId: 'ord-1',
        now: '2026-06-30T05:00:00.000Z',
      })
    ).rejects.toThrow('update failed');
  });

  it('maps lifecycle state mismatches to the existing operator-facing message', async () => {
    const { cancelAwaitingOrderMutation } = await import('@/lib/orders/admin-awaiting-cancel');
    const { supabase } = buildAdminAwaitingCancelSupabaseMock({ order: awaitingOrder });
    mockCancelAwaitingDepositOrder.mockResolvedValue({
      ok: false,
      code: 'ORDER_STATE_MISMATCH',
    });

    await expect(
      cancelAwaitingOrderMutation(supabase as never, {
        orderId: 'ord-1',
        now: '2026-06-30T05:00:00.000Z',
      })
    ).rejects.toThrow('주문 상태가 변경되었습니다. 새로고침한 뒤 다시 시도해 주세요.');
  });
});
