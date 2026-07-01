const mockAfter = jest.fn((callback: () => unknown) => callback());
const mockMarkOrderPaidWithOutcome = jest.fn();
const mockHandleArtworkTakenAutoRefund = jest.fn();
const mockCancelPayment = jest.fn();
const mockNotifyEmail = jest.fn();
const mockRunAllSettled = jest.fn(async (_label: string, tasks: Array<() => unknown>) => {
  for (const task of tasks) await task();
});
const mockLogOrderStatusSyncFailure = jest.fn();

jest.mock('next/server', () => ({
  after: (callback: () => unknown) => mockAfter(callback),
}));

jest.mock('@/lib/commerce/payment-lifecycle/mark-order-paid', () => ({
  markOrderPaidWithOutcome: (...args: unknown[]) => mockMarkOrderPaidWithOutcome(...args),
}));

jest.mock('@/lib/commerce/refund-cancel/auto-refund-taken', () => ({
  handleArtworkTakenAutoRefund: (...args: unknown[]) => mockHandleArtworkTakenAutoRefund(...args),
}));

jest.mock('@/lib/integrations/toss/cancel', () => ({
  cancelPayment: (...args: unknown[]) => mockCancelPayment(...args),
}));

jest.mock('@/lib/notify', () => ({
  notifyEmail: (...args: unknown[]) => mockNotifyEmail(...args),
}));

jest.mock('@/lib/server/after-response', () => ({
  runAllSettled: (...args: unknown[]) => mockRunAllSettled(...args),
}));

const baseOrder = {
  id: 'order-1',
  order_no: 'SAF-001',
  artwork_id: 'art-1',
  total_amount: 100000,
  buyer_name: '구매자',
  buyer_phone: '01012345678',
  buyer_email: 'buyer@example.com',
  metadata: { locale: 'ko' },
  order_items: [{ artwork_id: 'art-1', quantity: 1, unit_price: 100000 }],
};

const baseTossPayment = {
  paymentKey: 'pay-key',
  orderId: 'SAF-001',
  orderName: 'SAF artwork',
  status: 'DONE',
  method: '카드',
  totalAmount: 100000,
  balanceAmount: 100000,
  currency: 'KRW',
  approvedAt: '2026-07-01T05:30:00.000Z',
  requestedAt: '2026-07-01T05:29:00.000Z',
};

const baseInput = {
  order: baseOrder,
  orderNo: 'SAF-001',
  paymentKey: 'pay-key',
  tossPayment: baseTossPayment,
  provider: 'api_v1',
  buyerLocale: 'ko',
  idempotencyKey: 'confirm-SAF-001',
  now: '2026-07-01T05:30:10.000Z',
  logOrderStatusSyncFailure: mockLogOrderStatusSyncFailure,
};

function createSupabaseMock(latestStatus = 'cancelled') {
  const single = jest.fn(async () => ({
    data: { id: 'order-1', status: latestStatus },
    error: null,
  }));
  const eq = jest.fn(() => ({ single }));
  const select = jest.fn(() => ({ eq }));
  const supabase = {
    from: jest.fn((table: string) => {
      if (table === 'orders') return { select };
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
  return { supabase, select, eq, single };
}

async function flushAfterCallbacks() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('promoteTossConfirmPaidOrder', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockMarkOrderPaidWithOutcome.mockResolvedValue({
      ok: true,
      salesLines: [{ artwork_id: 'art-1', quantity: 1, unit_price: 100000 }],
      warnings: [],
    });
    mockCancelPayment.mockResolvedValue({ success: true, data: { status: 'CANCELED' } });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('promotes a Toss DONE payment through markOrderPaidWithOutcome using confirm-specific options', async () => {
    const { promoteTossConfirmPaidOrder } = await import(
      '@/lib/commerce/payment-lifecycle/toss-confirm-paid-promotion'
    );
    const { supabase } = createSupabaseMock();

    const result = await promoteTossConfirmPaidOrder({
      supabase: supabase as never,
      ...baseInput,
      provider: 'api_v1' as never,
      buyerLocale: 'ko' as const,
      tossPayment: baseTossPayment as never,
    });

    expect(result).toEqual({ ok: true, status: 'promoted' });
    expect(mockMarkOrderPaidWithOutcome).toHaveBeenCalledWith({
      supabase,
      order: baseOrder,
      tossPayment: baseTossPayment,
      provider: 'api_v1',
      now: '2026-07-01T05:30:10.000Z',
      sourceStatuses: ['pending_payment'],
      idempotencyKey: 'confirm-SAF-001',
      errors: [],
      continueOnSalesRecordFailure: true,
      metadataPatch: { payment_method: '카드' },
    });
    expect(mockNotifyEmail).not.toHaveBeenCalled();
  });

  it('returns a fatal payment-record failure before scheduling success-side notifications', async () => {
    const { promoteTossConfirmPaidOrder } = await import(
      '@/lib/commerce/payment-lifecycle/toss-confirm-paid-promotion'
    );
    const { supabase } = createSupabaseMock();
    mockMarkOrderPaidWithOutcome.mockResolvedValue({
      ok: false,
      code: 'PAYMENT_RECORD_FAILED',
      error: 'payment insert failed',
    });

    const result = await promoteTossConfirmPaidOrder({
      supabase: supabase as never,
      ...baseInput,
      provider: 'api_v1' as never,
      buyerLocale: 'ko' as const,
      tossPayment: baseTossPayment as never,
    });

    expect(result).toEqual({
      ok: false,
      code: 'PAYMENT_RECORD_FAILED',
      error: 'payment insert failed',
    });
    expect(mockRunAllSettled).not.toHaveBeenCalled();
  });

  it('returns already_promoted when a state mismatch finds the order already paid', async () => {
    const { promoteTossConfirmPaidOrder } = await import(
      '@/lib/commerce/payment-lifecycle/toss-confirm-paid-promotion'
    );
    const { supabase, select, eq } = createSupabaseMock('paid');
    mockMarkOrderPaidWithOutcome.mockResolvedValue({
      ok: false,
      code: 'ORDER_STATE_MISMATCH',
    });

    const result = await promoteTossConfirmPaidOrder({
      supabase: supabase as never,
      ...baseInput,
      provider: 'api_v1' as never,
      buyerLocale: 'ko' as const,
      tossPayment: baseTossPayment as never,
    });

    expect(result).toEqual({ ok: true, status: 'already_promoted' });
    expect(select).toHaveBeenCalledWith('id,status');
    expect(eq).toHaveBeenCalledWith('id', 'order-1');
    expect(mockCancelPayment).not.toHaveBeenCalled();
    expect(mockRunAllSettled).not.toHaveBeenCalled();
  });

  it('schedules automatic cancel and operator notifications when a state mismatch finds a cancelled order', async () => {
    const { promoteTossConfirmPaidOrder } = await import(
      '@/lib/commerce/payment-lifecycle/toss-confirm-paid-promotion'
    );
    const { supabase } = createSupabaseMock('cancelled');
    mockMarkOrderPaidWithOutcome.mockResolvedValue({
      ok: false,
      code: 'ORDER_STATE_MISMATCH',
    });

    const result = await promoteTossConfirmPaidOrder({
      supabase: supabase as never,
      ...baseInput,
      provider: 'api_v1' as never,
      buyerLocale: 'ko' as const,
      tossPayment: baseTossPayment as never,
    });
    await flushAfterCallbacks();

    expect(result).toEqual({
      ok: false,
      code: 'ORDER_STATUS_SYNC_FAILED',
      statusCode: 409,
      latestStatus: 'cancelled',
      error: 'orders update affected 0 rows',
    });
    expect(mockCancelPayment).toHaveBeenCalledWith(
      'pay-key',
      { cancelReason: '주문 취소 후 결제 승인 — 자동 환불' },
      'auto-refund-SAF-001',
      'api_v1'
    );
    expect(mockRunAllSettled).toHaveBeenCalledWith(
      'toss-confirm.cancelled-order-refund.notification',
      expect.any(Array)
    );
    expect(mockRunAllSettled).toHaveBeenCalledWith(
      'tossConfirm.orderStatusSyncFailed.notifications',
      expect.any(Array)
    );
    expect(mockLogOrderStatusSyncFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'order-1',
        orderNo: 'SAF-001',
        targetStatus: 'paid',
        latestStatus: 'cancelled',
        error: 'orders update affected 0 rows',
      })
    );
  });

  it('returns an order-status sync failure without Toss cancel when the order update itself errors', async () => {
    const { promoteTossConfirmPaidOrder } = await import(
      '@/lib/commerce/payment-lifecycle/toss-confirm-paid-promotion'
    );
    const { supabase } = createSupabaseMock('pending_payment');
    mockMarkOrderPaidWithOutcome.mockResolvedValue({
      ok: false,
      code: 'ORDER_UPDATE_FAILED',
      error: 'orders update failed',
    });

    const result = await promoteTossConfirmPaidOrder({
      supabase: supabase as never,
      ...baseInput,
      provider: 'api_v1' as never,
      buyerLocale: 'ko' as const,
      tossPayment: baseTossPayment as never,
    });
    await flushAfterCallbacks();

    expect(result).toEqual({
      ok: false,
      code: 'ORDER_STATUS_SYNC_FAILED',
      statusCode: 500,
      latestStatus: 'pending_payment',
      error: 'orders update failed',
    });
    expect(mockCancelPayment).not.toHaveBeenCalled();
    expect(mockRunAllSettled).toHaveBeenCalledWith(
      'tossConfirm.orderStatusSyncFailed.notifications',
      expect.any(Array)
    );
  });

  it('delegates artwork-taken contests to the shared auto-refund helper', async () => {
    const { promoteTossConfirmPaidOrder } = await import(
      '@/lib/commerce/payment-lifecycle/toss-confirm-paid-promotion'
    );
    const { supabase } = createSupabaseMock();
    const salesLines = [{ artwork_id: 'art-1', quantity: 1, unit_price: 100000 }];
    mockMarkOrderPaidWithOutcome.mockResolvedValue({
      ok: false,
      code: 'ARTWORK_TAKEN',
      salesLines,
    });

    const result = await promoteTossConfirmPaidOrder({
      supabase: supabase as never,
      ...baseInput,
      provider: 'api_v1' as never,
      buyerLocale: 'ko' as const,
      tossPayment: baseTossPayment as never,
    });

    expect(result).toEqual({ ok: true, status: 'contest_lost' });
    expect(mockHandleArtworkTakenAutoRefund).toHaveBeenCalledWith({
      supabase,
      paymentKey: 'pay-key',
      orderId: 'order-1',
      orderNo: 'SAF-001',
      provider: 'api_v1',
      salesLines,
      buyerEmail: 'buyer@example.com',
      buyerName: '구매자',
      buyerPhone: '01012345678',
      amount: 100000,
      locale: 'ko',
      now: '2026-07-01T05:30:10.000Z',
      context: expect.objectContaining({
        logPrefix: '[confirm]',
        successRunLabel: 'toss-confirm.artwork-taken-refund.successNotifications',
        failureRunLabel: 'toss-confirm.artwork-taken-refund.failureNotifications',
      }),
    });
  });

  it('schedules operator notifications for sales-record and no-line-item warnings without failing the payment', async () => {
    const { promoteTossConfirmPaidOrder } = await import(
      '@/lib/commerce/payment-lifecycle/toss-confirm-paid-promotion'
    );
    const { supabase } = createSupabaseMock();
    mockMarkOrderPaidWithOutcome.mockResolvedValue({
      ok: true,
      salesLines: [],
      warnings: [
        { code: 'ARTWORK_SALES_FAILED', error: 'sales db down' },
        { code: 'NO_LINE_ITEMS' },
      ],
    });

    const result = await promoteTossConfirmPaidOrder({
      supabase: supabase as never,
      ...baseInput,
      provider: 'api_v1' as never,
      buyerLocale: 'ko' as const,
      tossPayment: baseTossPayment as never,
    });
    await flushAfterCallbacks();

    expect(result).toEqual({ ok: true, status: 'promoted' });
    expect(mockNotifyEmail).toHaveBeenCalledWith('error', '결제 후 판매 기록 생성 실패', {
      주문번호: 'SAF-001',
      에러: 'sales db down',
      참고: '결제+주문 완료, 판매 기록 누락 — reconciliation cron 보정 예정',
    });
    expect(mockNotifyEmail).toHaveBeenCalledWith(
      'error',
      '결제 완료 주문에 품목 없음 — 판매 기록 누락',
      {
        주문번호: 'SAF-001',
        참고: '결제+주문 완료이나 order_items가 비어 매출 미기록 — 수동 확인 필요',
      }
    );
  });
});
