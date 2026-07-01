const mockAfter = jest.fn((callback: () => unknown) => callback());
const mockMarkOrderPaidWithOutcome = jest.fn();
const mockHandleArtworkTakenAutoRefund = jest.fn();
const mockHandleCancelledOrderDoneRefund = jest.fn();
const mockGetOrderNotificationInfo = jest.fn();
const mockBuildAdminNotificationFields = jest.fn(
  (info: unknown, fields?: unknown) => fields ?? info
);
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
  buildAdminNotificationFields: (...args: unknown[]) => mockBuildAdminNotificationFields(...args),
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

const awaitingOrder = {
  status: 'awaiting_deposit',
  artwork_id: 'art-1',
  order_no: 'SAF-DEPOSIT-DONE-001',
  buyer_email: 'buyer@example.com',
  buyer_name: '구매자',
  buyer_phone: '010-0000-0000',
  total_amount: 100000,
  metadata: { locale: 'ko' },
  order_items: [{ artwork_id: 'art-1', quantity: 1, unit_price: 100000 }],
};

const paymentRecord = {
  id: 'payment-1',
  order_id: 'order-1',
  webhook_responses: [{ eventType: 'OLD' }],
  confirm_response: null,
};

const verifiedPayment = {
  paymentKey: 'pay-key',
  orderId: 'SAF-DEPOSIT-DONE-001',
  orderName: 'SAF artwork',
  status: 'DONE',
  method: '가상계좌',
  totalAmount: 100000,
  balanceAmount: 100000,
  currency: 'KRW',
  approvedAt: '2026-07-01T05:30:00.000Z',
  requestedAt: '2026-07-01T05:00:00.000Z',
};

const webhookBody = {
  eventType: 'DEPOSIT_CALLBACK',
  data: { paymentKey: 'pay-key', orderId: 'SAF-DEPOSIT-DONE-001', paymentStatus: 'DONE' },
};

const baseInput = {
  paymentRecord,
  paymentKey: 'pay-key',
  webhookOrderId: 'SAF-DEPOSIT-DONE-001',
  verifiedPayment,
  provider: 'api_v1',
  webhookBody,
  now: '2026-07-01T05:30:10.000Z',
};

function buildSupabaseMock(order = awaitingOrder) {
  const orderSingle = jest.fn(async () => ({ data: order, error: null }));
  const orderEq = jest.fn(() => ({ single: orderSingle }));
  const orderSelect = jest.fn(() => ({ eq: orderEq }));
  const paymentEq = jest.fn(async () => ({ error: null }));
  const paymentUpdate = jest.fn(() => ({ eq: paymentEq }));
  const supabase = {
    from: jest.fn((table: string) => {
      if (table === 'orders') {
        return { select: orderSelect };
      }
      if (table === 'payments') {
        return { update: paymentUpdate };
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
  return { supabase, orderSelect, orderEq, orderSingle, paymentUpdate, paymentEq };
}

async function flushAfterCallbacks() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('handleDepositCallbackDonePromotion', () => {
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
      orderNo: 'SAF-DEPOSIT-DONE-001',
      artworkTitle: '작품',
      artistName: '작가',
      itemAmount: 100000,
      shippingAmount: 0,
      shippingName: '수령인',
      shippingPhone: '010-1111-1111',
      shippingAddress: '서울',
      shippingMemo: '',
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('promotes an awaiting-deposit DONE callback and schedules deposit-paid notifications', async () => {
    const { handleDepositCallbackDonePromotion } = await import(
      '@/lib/commerce/payment-lifecycle/deposit-callback-done-promotion'
    );
    const { supabase, orderSelect, orderEq, paymentUpdate, paymentEq } = buildSupabaseMock();

    const result = await handleDepositCallbackDonePromotion({
      supabase: supabase as never,
      ...baseInput,
      provider: 'api_v1' as never,
      verifiedPayment: verifiedPayment as never,
      webhookBody: webhookBody as never,
    });
    await flushAfterCallbacks();

    expect(result).toEqual({ ok: true, status: 'promoted' });
    expect(orderSelect).toHaveBeenCalledWith(
      'status, artwork_id, total_amount, order_no, buyer_name, buyer_phone, buyer_email, metadata, order_items(artwork_id, quantity, unit_price)'
    );
    expect(orderEq).toHaveBeenCalledWith('id', 'order-1');
    expect(paymentUpdate).toHaveBeenCalledWith({
      status: 'DONE',
      approved_at: '2026-07-01T05:30:10.000Z',
      webhook_responses: [{ eventType: 'OLD' }, webhookBody],
    });
    expect(paymentEq).toHaveBeenCalledWith('id', 'payment-1');
    expect(mockMarkOrderPaidWithOutcome).toHaveBeenCalledWith({
      supabase,
      order: {
        id: 'order-1',
        order_no: 'SAF-DEPOSIT-DONE-001',
        artwork_id: 'art-1',
        total_amount: 100000,
        buyer_name: '구매자',
        buyer_phone: '010-0000-0000',
        metadata: { locale: 'ko' },
        order_items: awaitingOrder.order_items,
      },
      tossPayment: verifiedPayment,
      provider: 'api_v1',
      now: '2026-07-01T05:30:10.000Z',
      sourceStatuses: ['awaiting_deposit'],
      idempotencyKey: 'webhook-deposit-pay-key',
      errors: [],
      continueOnSalesRecordFailure: true,
      metadataPatch: { payment_method: '가상계좌', webhook_repaired: true },
    });
    expect(mockRunAllSettled).toHaveBeenCalledWith(
      'tossWebhook.depositPaid.notifications',
      expect.any(Array)
    );
    expect(mockNotifyEmail).toHaveBeenCalledWith(
      'payment',
      '가상계좌 입금 확인',
      expect.anything()
    );
    expect(mockSendBuyerEmail).toHaveBeenCalledWith(
      'buyer@example.com',
      'deposit_confirmed',
      expect.objectContaining({ orderNo: 'SAF-DEPOSIT-DONE-001', amount: 100000 }),
      'ko'
    );
    expect(mockSendBuyerSms).toHaveBeenCalledWith(
      '010-0000-0000',
      'deposit_confirmed',
      expect.objectContaining({ amount: 100000 }),
      'ko',
      'SAF-DEPOSIT-DONE-001'
    );
  });

  it('schedules automatic Toss cancel instead of promoting an already cancelled order', async () => {
    const { handleDepositCallbackDonePromotion } = await import(
      '@/lib/commerce/payment-lifecycle/deposit-callback-done-promotion'
    );
    const { supabase, paymentUpdate } = buildSupabaseMock({
      ...awaitingOrder,
      status: 'cancelled',
    });

    const result = await handleDepositCallbackDonePromotion({
      supabase: supabase as never,
      ...baseInput,
      provider: 'api_v1' as never,
      verifiedPayment: verifiedPayment as never,
      webhookBody: webhookBody as never,
    });

    expect(result).toEqual({ ok: true, status: 'cancelled_order_done_refund_scheduled' });
    expect(mockHandleCancelledOrderDoneRefund).toHaveBeenCalledWith({
      supabase,
      paymentKey: 'pay-key',
      paymentId: 'payment-1',
      orderNo: 'SAF-DEPOSIT-DONE-001',
      provider: 'api_v1',
    });
    expect(paymentUpdate).not.toHaveBeenCalled();
    expect(mockMarkOrderPaidWithOutcome).not.toHaveBeenCalled();
  });

  it('returns a fatal result and notifies operators when DONE arrives without a payment row', async () => {
    const { handleDepositCallbackDonePromotion } = await import(
      '@/lib/commerce/payment-lifecycle/deposit-callback-done-promotion'
    );
    const { supabase } = buildSupabaseMock();

    const result = await handleDepositCallbackDonePromotion({
      supabase: supabase as never,
      ...baseInput,
      paymentRecord: null,
      provider: 'api_v1' as never,
      verifiedPayment: verifiedPayment as never,
      webhookBody: webhookBody as never,
    });
    await flushAfterCallbacks();

    expect(result).toEqual({ ok: false, code: 'PAYMENT_RECORD_NOT_FOUND' });
    expect(mockNotifyEmail).toHaveBeenCalledWith('error', '웹훅 수신: 결제 기록 없이 입금 완료', {
      paymentKey: 'pay-key',
      주문ID: 'SAF-DEPOSIT-DONE-001',
      참고: 'payments 테이블에 해당 paymentKey 미존재 — reconciliation 또는 수동 확인 필요',
    });
    expect(mockMarkOrderPaidWithOutcome).not.toHaveBeenCalled();
  });

  it('returns a fatal result when payment record ensure fails during promotion', async () => {
    const { handleDepositCallbackDonePromotion } = await import(
      '@/lib/commerce/payment-lifecycle/deposit-callback-done-promotion'
    );
    const { supabase } = buildSupabaseMock();
    mockMarkOrderPaidWithOutcome.mockResolvedValue({
      ok: false,
      code: 'PAYMENT_RECORD_FAILED',
      error: 'payment insert failed',
    });

    const result = await handleDepositCallbackDonePromotion({
      supabase: supabase as never,
      ...baseInput,
      provider: 'api_v1' as never,
      verifiedPayment: verifiedPayment as never,
      webhookBody: webhookBody as never,
    });

    expect(result).toEqual({
      ok: false,
      code: 'PAYMENT_RECORD_FAILED',
      error: 'payment insert failed',
    });
    expect(mockRunAllSettled).not.toHaveBeenCalled();
  });
});
