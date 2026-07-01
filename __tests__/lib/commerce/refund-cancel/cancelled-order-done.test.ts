const mockAfter = jest.fn((callback: () => unknown) => callback());
const mockCancelPayment = jest.fn();
const mockNotifyEmail = jest.fn();
const mockRunAllSettled = jest.fn(async (_label: string, tasks: Array<() => unknown>) => {
  for (const task of tasks) await task();
});

jest.mock('next/server', () => ({
  after: (callback: () => unknown) => mockAfter(callback),
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

function buildSupabaseMock() {
  const paymentEq = jest.fn(async () => ({ error: null }));
  const paymentUpdate = jest.fn(() => ({ eq: paymentEq }));

  const supabase = {
    from: jest.fn((table: string) => {
      if (table === 'payments') return { update: paymentUpdate };
      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return { supabase, paymentUpdate, paymentEq };
}

async function flushAfterCallbacks() {
  await Promise.resolve();
  await Promise.resolve();
}

const baseInput = {
  paymentKey: 'pk_cancelled_done',
  paymentId: 'pay-1',
  orderNo: 'SAF-CANCELLED-001',
  provider: 'domestic' as const,
  now: '2026-07-01T01:23:45.000Z',
};

describe('handleCancelledOrderDoneRefund', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockCancelPayment.mockResolvedValue({ success: true });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('schedules Toss cancel, syncs the payment row, and warns operators when cancel succeeds', async () => {
    const { handleCancelledOrderDoneRefund } = await import(
      '@/lib/commerce/refund-cancel/cancelled-order-done'
    );
    const { supabase, paymentUpdate, paymentEq } = buildSupabaseMock();

    handleCancelledOrderDoneRefund({ supabase: supabase as never, ...baseInput });
    await flushAfterCallbacks();

    expect(mockAfter).toHaveBeenCalledTimes(1);
    expect(mockCancelPayment).toHaveBeenCalledWith(
      'pk_cancelled_done',
      { cancelReason: '이미 취소된 주문에 결제 완료 웹훅 수신 — 자동 취소' },
      'auto-refund-cancelled-SAF-CANCELLED-001',
      'domestic'
    );
    expect(paymentUpdate).toHaveBeenCalledWith({
      status: 'CANCELED',
      cancelled_at: '2026-07-01T01:23:45.000Z',
    });
    expect(paymentEq).toHaveBeenCalledWith('id', 'pay-1');
    expect(mockRunAllSettled).toHaveBeenCalledWith(
      'toss-webhook.cancelled-order-done-refund.notification',
      expect.any(Array)
    );
    expect(mockNotifyEmail).toHaveBeenCalledWith(
      'warning',
      '취소 주문에 결제 완료 웹훅 수신',
      expect.objectContaining({
        주문번호: 'SAF-CANCELLED-001',
        paymentKey: 'pk_cancelled_done',
        Toss취소: '성공',
        참고: '이미 취소된 주문에 결제 완료 웹훅이 도착해 자동 취소 처리했습니다.',
      })
    );
  });

  it('does not sync payment and alerts operators when Toss cancel fails', async () => {
    const { handleCancelledOrderDoneRefund } = await import(
      '@/lib/commerce/refund-cancel/cancelled-order-done'
    );
    const { supabase, paymentUpdate } = buildSupabaseMock();
    mockCancelPayment.mockResolvedValue({ success: false, error: { message: 'cancel denied' } });

    handleCancelledOrderDoneRefund({ supabase: supabase as never, ...baseInput });
    await flushAfterCallbacks();

    expect(paymentUpdate).not.toHaveBeenCalled();
    expect(mockNotifyEmail).toHaveBeenCalledWith(
      'error',
      '취소 주문에 결제 완료 웹훅 수신',
      expect.objectContaining({
        주문번호: 'SAF-CANCELLED-001',
        paymentKey: 'pk_cancelled_done',
        Toss취소: '실패',
        에러: JSON.stringify({ message: 'cancel denied' }),
        참고: '이미 취소된 주문에 결제 완료 웹훅이 도착했지만 Toss 취소가 실패했습니다. 수동 확인이 필요합니다.',
      })
    );
  });
});
