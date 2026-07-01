const mockAfter = jest.fn((callback: () => unknown) => callback());
const mockMarkOrderPaidWithOutcome = jest.fn();
const mockHandleArtworkTakenAutoRefund = jest.fn();
const mockHandleCancelledOrderDoneRefund = jest.fn();
const mockGetOrderNotificationInfo = jest.fn();
const mockNotifyEmail = jest.fn();
const mockSendBuyerEmail = jest.fn();
const mockSendBuyerSms = jest.fn();
const mockExtractBuyerLocale = jest.fn(() => 'ko');
const mockRunAllSettled = jest.fn(async (_label: string, tasks: Array<() => unknown>) => {
  for (const task of tasks) await task();
});

jest.mock('next/server', () => ({
  after: (callback: () => unknown) => mockAfter(callback),
}));

jest.mock('@/lib/commerce/payment-lifecycle/mark-order-paid', () => ({
  markOrderPaidWithOutcome: (...args: unknown[]) => mockMarkOrderPaidWithOutcome(...args),
}));

jest.mock('@/lib/commerce/refund-cancel/auto-refund-taken', () => ({
  handleArtworkTakenAutoRefund: (...args: unknown[]) => mockHandleArtworkTakenAutoRefund(...args),
}));

jest.mock('@/lib/commerce/refund-cancel/cancelled-order-done', () => ({
  handleCancelledOrderDoneRefund: (...args: unknown[]) =>
    mockHandleCancelledOrderDoneRefund(...args),
}));

jest.mock('@/lib/utils/get-order-notification-info', () => ({
  getOrderNotificationInfo: (...args: unknown[]) => mockGetOrderNotificationInfo(...args),
}));

jest.mock('@/lib/notify', () => ({
  notifyEmail: (...args: unknown[]) => mockNotifyEmail(...args),
  sendBuyerEmail: (...args: unknown[]) => mockSendBuyerEmail(...args),
  extractBuyerLocale: (...args: unknown[]) => mockExtractBuyerLocale(...args),
}));

jest.mock('@/lib/sms/buyer-sms', () => ({
  sendBuyerSms: (...args: unknown[]) => mockSendBuyerSms(...args),
}));

jest.mock('@/lib/server/after-response', () => ({
  runAllSettled: (...args: unknown[]) => mockRunAllSettled(...args),
}));

const pendingOrder = {
  status: 'pending_payment',
  artwork_id: 'art-1',
  order_no: 'SAF-STATUS-001',
  buyer_email: 'buyer@example.com',
  buyer_name: '구매자',
  buyer_phone: '010-0000-0000',
  total_amount: 100000,
  metadata: { locale: 'ko' },
  order_items: [{ artwork_id: 'art-1', quantity: 1, unit_price: 100000 }],
};

const verifiedPayment = {
  paymentKey: 'pay-key',
  orderId: 'SAF-STATUS-001',
  orderName: 'SAF artwork',
  status: 'DONE',
  method: '카드',
  totalAmount: 100000,
  balanceAmount: 100000,
  currency: 'KRW',
  approvedAt: '2026-07-01T05:00:00.000Z',
  requestedAt: '2026-07-01T04:59:00.000Z',
};

const baseInput = {
  paymentOrderId: 'order-1',
  paymentId: 'payment-1',
  paymentKey: 'pay-key',
  newStatus: 'DONE',
  provider: 'api_v1',
  verifiedPayment,
  now: '2026-07-01T05:00:10.000Z',
};

function buildSupabaseMock(order = pendingOrder) {
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

describe('handleStatusChangedDonePromotion', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockMarkOrderPaidWithOutcome.mockResolvedValue({
      ok: true,
      salesLines: [{ artwork_id: 'art-1', quantity: 1, unit_price: 100000 }],
      warnings: [],
    });
    mockGetOrderNotificationInfo.mockResolvedValue({
      artworkTitle: '작품',
      artistName: '작가',
      itemAmount: 100000,
      shippingAmount: 0,
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('promotes a pending STATUS_CHANGED DONE order and schedules recovery notifications', async () => {
    const { handleStatusChangedDonePromotion } = await import(
      '@/lib/commerce/payment-lifecycle/status-changed-done-promotion'
    );
    const { supabase, orderSelect, orderEq } = buildSupabaseMock();

    const result = await handleStatusChangedDonePromotion({
      supabase: supabase as never,
      ...baseInput,
      provider: 'api_v1' as never,
      verifiedPayment: verifiedPayment as never,
    });
    await flushAfterCallbacks();

    expect(result).toEqual({ ok: true, status: 'promoted' });
    expect(orderSelect).toHaveBeenCalledWith(
      'status, artwork_id, order_no, buyer_email, buyer_name, buyer_phone, total_amount, metadata, order_items(artwork_id, quantity, unit_price)'
    );
    expect(orderEq).toHaveBeenCalledWith('id', 'order-1');
    expect(mockMarkOrderPaidWithOutcome).toHaveBeenCalledWith({
      supabase,
      order: { ...pendingOrder, id: 'order-1' },
      tossPayment: verifiedPayment,
      provider: 'api_v1',
      now: '2026-07-01T05:00:10.000Z',
      sourceStatuses: ['pending_payment', 'awaiting_deposit'],
      idempotencyKey: 'webhook-status-pay-key',
      errors: [],
      continueOnSalesRecordFailure: true,
      metadataPatch: { payment_method: '카드', webhook_repaired: true },
    });
    expect(mockGetOrderNotificationInfo).toHaveBeenCalledWith(supabase, { id: 'order-1' });
    expect(mockRunAllSettled).toHaveBeenCalledWith(
      'tossWebhook.statusChangedDone.notifications',
      expect.any(Array)
    );
    expect(mockNotifyEmail).toHaveBeenCalledWith(
      'warning',
      '결제 webhook 보정 — confirm route 실패 추정',
      expect.objectContaining({ 주문번호: 'SAF-STATUS-001', paymentKey: 'pay-key', 상태: 'DONE' })
    );
    expect(mockSendBuyerEmail).toHaveBeenCalledWith(
      'buyer@example.com',
      'payment_confirmed',
      expect.objectContaining({ orderNo: 'SAF-STATUS-001', amount: 100000 }),
      'ko'
    );
    expect(mockSendBuyerSms).toHaveBeenCalledWith(
      '010-0000-0000',
      'payment_confirmed',
      expect.objectContaining({ amount: 100000 }),
      'ko',
      'SAF-STATUS-001'
    );
  });

  it('schedules automatic Toss cancel instead of promoting an already cancelled order', async () => {
    const { handleStatusChangedDonePromotion } = await import(
      '@/lib/commerce/payment-lifecycle/status-changed-done-promotion'
    );
    const { supabase } = buildSupabaseMock({ ...pendingOrder, status: 'cancelled' });

    const result = await handleStatusChangedDonePromotion({
      supabase: supabase as never,
      ...baseInput,
      provider: 'api_v1' as never,
      verifiedPayment: verifiedPayment as never,
    });

    expect(result).toEqual({ ok: true, status: 'cancelled_order_done_refund_scheduled' });
    expect(mockHandleCancelledOrderDoneRefund).toHaveBeenCalledWith({
      supabase,
      paymentKey: 'pay-key',
      paymentId: 'payment-1',
      orderNo: 'SAF-STATUS-001',
      provider: 'api_v1',
    });
    expect(mockMarkOrderPaidWithOutcome).not.toHaveBeenCalled();
    expect(mockRunAllSettled).not.toHaveBeenCalled();
  });

  it('returns a fatal result when payment record repair inside promotion fails', async () => {
    const { handleStatusChangedDonePromotion } = await import(
      '@/lib/commerce/payment-lifecycle/status-changed-done-promotion'
    );
    const { supabase } = buildSupabaseMock();
    mockMarkOrderPaidWithOutcome.mockResolvedValue({
      ok: false,
      code: 'PAYMENT_RECORD_FAILED',
      error: 'payment insert failed',
    });

    const result = await handleStatusChangedDonePromotion({
      supabase: supabase as never,
      ...baseInput,
      provider: 'api_v1' as never,
      verifiedPayment: verifiedPayment as never,
    });
    await flushAfterCallbacks();

    expect(result).toEqual({
      ok: false,
      code: 'PAYMENT_RECORD_FAILED',
      orderNo: 'SAF-STATUS-001',
      error: 'payment insert failed',
    });
    expect(mockRunAllSettled).not.toHaveBeenCalled();
    expect(mockHandleArtworkTakenAutoRefund).not.toHaveBeenCalled();
  });
});
