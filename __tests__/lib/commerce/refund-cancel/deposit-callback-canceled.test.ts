const mockAfter = jest.fn((callback: () => unknown) => callback());
const mockCancelAwaitingDepositOrder = jest.fn();
const mockNotifyEmail = jest.fn();

jest.mock('next/server', () => ({
  after: (callback: () => unknown) => mockAfter(callback),
}));

jest.mock('@/lib/commerce/refund-cancel/cancel-awaiting-order', () => ({
  cancelAwaitingDepositOrder: (...args: unknown[]) => mockCancelAwaitingDepositOrder(...args),
}));

jest.mock('@/lib/notify', () => ({
  notifyEmail: (...args: unknown[]) => mockNotifyEmail(...args),
}));

const awaitingOrder = {
  id: 'order-1',
  order_no: 'SAF-DEPOSIT-CANCEL-001',
  artwork_id: 'art-1',
  order_items: [{ artwork_id: 'art-1', quantity: 1, unit_price: 100000 }],
};

function buildSupabaseMock(order: typeof awaitingOrder | null = awaitingOrder) {
  const orderSingle = jest.fn(async () => ({ data: order, error: null }));
  const orderEq = jest.fn(() => ({ single: orderSingle }));
  const orderSelect = jest.fn(() => ({ eq: orderEq }));
  const supabase = {
    from: jest.fn((table: string) => {
      if (table === 'orders') {
        return { select: orderSelect };
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
  return { supabase, orderSelect, orderEq, orderSingle };
}

async function flushAfterCallbacks() {
  await Promise.resolve();
  await Promise.resolve();
}

const baseInput = {
  paymentOrderId: 'order-1',
  paymentKey: 'pay-key',
  webhookOrderId: 'SAF-DEPOSIT-CANCEL-001',
  now: '2026-07-01T05:20:00.000Z',
};

describe('handleDepositCallbackCanceled', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockCancelAwaitingDepositOrder.mockResolvedValue({
      ok: true,
      artworkIds: ['art-1'],
      warnings: [],
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('cancels the awaiting-deposit order through the shared lifecycle and schedules warning notification', async () => {
    const { handleDepositCallbackCanceled } = await import(
      '@/lib/commerce/refund-cancel/deposit-callback-canceled'
    );
    const { supabase, orderSelect, orderEq } = buildSupabaseMock();

    const result = await handleDepositCallbackCanceled({
      supabase: supabase as never,
      ...baseInput,
    });
    await flushAfterCallbacks();

    expect(result).toEqual({ ok: true, status: 'cancelled' });
    expect(orderSelect).toHaveBeenCalledWith(
      'id, order_no, artwork_id, order_items(artwork_id, quantity, unit_price)'
    );
    expect(orderEq).toHaveBeenCalledWith('id', 'order-1');
    expect(mockCancelAwaitingDepositOrder).toHaveBeenCalledWith({
      supabase,
      order: awaitingOrder,
      now: '2026-07-01T05:20:00.000Z',
    });
    expect(mockNotifyEmail).toHaveBeenCalledWith('warning', '가상계좌 입금 취소/만료', {
      paymentKey: 'pay-key',
      주문ID: 'SAF-DEPOSIT-CANCEL-001',
    });
  });

  it('skips lifecycle when payment row is missing but still schedules warning notification', async () => {
    const { handleDepositCallbackCanceled } = await import(
      '@/lib/commerce/refund-cancel/deposit-callback-canceled'
    );
    const { supabase, orderSelect } = buildSupabaseMock();

    const result = await handleDepositCallbackCanceled({
      supabase: supabase as never,
      ...baseInput,
      paymentOrderId: null,
    });
    await flushAfterCallbacks();

    expect(result).toEqual({ ok: true, status: 'skipped_no_payment' });
    expect(orderSelect).not.toHaveBeenCalled();
    expect(mockCancelAwaitingDepositOrder).not.toHaveBeenCalled();
    expect(mockNotifyEmail).toHaveBeenCalledWith('warning', '가상계좌 입금 취소/만료', {
      paymentKey: 'pay-key',
      주문ID: 'SAF-DEPOSIT-CANCEL-001',
    });
  });

  it('logs reservation release warnings without turning them into Toss retry failures', async () => {
    const { handleDepositCallbackCanceled } = await import(
      '@/lib/commerce/refund-cancel/deposit-callback-canceled'
    );
    const { supabase } = buildSupabaseMock();
    mockCancelAwaitingDepositOrder.mockResolvedValue({
      ok: true,
      artworkIds: ['art-1'],
      warnings: [{ code: 'RESERVATION_RELEASE_FAILED', errors: [{ artworkId: 'art-1' }] }],
    });

    const result = await handleDepositCallbackCanceled({
      supabase: supabase as never,
      ...baseInput,
    });
    await flushAfterCallbacks();

    expect(result).toEqual({ ok: true, status: 'cancelled' });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[toss-webhook] artwork reserved→available failed:',
      [{ artworkId: 'art-1' }]
    );
    expect(mockNotifyEmail).toHaveBeenCalledTimes(1);
  });
});
