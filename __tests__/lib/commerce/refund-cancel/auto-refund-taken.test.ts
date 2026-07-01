const mockAfter = jest.fn((callback: () => unknown) => callback());
const mockCancelPayment = jest.fn();
const mockReleaseReservedArtworksIfUnowned = jest.fn();
const mockRevalidatePath = jest.fn();
const mockRevalidatePublicArtworkSurfaces = jest.fn();
const mockNotifyEmail = jest.fn();
const mockSendBuyerEmail = jest.fn();
const mockSendBuyerSms = jest.fn();
const mockRunAllSettled = jest.fn(async (_label: string, tasks: Array<() => unknown>) => {
  for (const task of tasks) await task();
});

jest.mock('next/server', () => ({
  after: (callback: () => unknown) => mockAfter(callback),
}));

jest.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

jest.mock('@/lib/integrations/toss/cancel', () => ({
  cancelPayment: (...args: unknown[]) => mockCancelPayment(...args),
}));

jest.mock('@/lib/orders/reservations', () => ({
  releaseReservedArtworksIfUnowned: (...args: unknown[]) =>
    mockReleaseReservedArtworksIfUnowned(...args),
}));

jest.mock('@/lib/utils/revalidate', () => ({
  revalidatePublicArtworkSurfaces: (...args: unknown[]) =>
    mockRevalidatePublicArtworkSurfaces(...args),
}));

jest.mock('@/lib/notify', () => ({
  notifyEmail: (...args: unknown[]) => mockNotifyEmail(...args),
  sendBuyerEmail: (...args: unknown[]) => mockSendBuyerEmail(...args),
}));

jest.mock('@/lib/sms/buyer-sms', () => ({
  sendBuyerSms: (...args: unknown[]) => mockSendBuyerSms(...args),
}));

jest.mock('@/lib/server/after-response', () => ({
  runAllSettled: (...args: unknown[]) => mockRunAllSettled(...args),
}));

function buildSupabaseMock() {
  const orderEqStatus = jest.fn(async () => ({ error: null }));
  const orderEqId = jest.fn(() => ({ eq: orderEqStatus }));
  const orderUpdate = jest.fn(() => ({ eq: orderEqId }));
  const paymentEq = jest.fn(async () => ({ error: null }));
  const paymentUpdate = jest.fn(() => ({ eq: paymentEq }));

  const supabase = {
    from: jest.fn((table: string) => {
      if (table === 'orders') return { update: orderUpdate };
      if (table === 'payments') return { update: paymentUpdate };
      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return { supabase, orderUpdate, orderEqId, orderEqStatus, paymentUpdate, paymentEq };
}

async function flushAfterCallbacks() {
  await Promise.resolve();
  await Promise.resolve();
}

const baseInput = {
  paymentKey: 'pk_test',
  orderId: 'ord-1',
  orderNo: 'SAF-001',
  provider: 'domestic' as const,
  salesLines: [
    { artwork_id: 'art-1', quantity: 1, unit_price: 100000 },
    { artwork_id: 'art-2', quantity: 1, unit_price: 200000 },
  ],
  buyerEmail: 'buyer@example.com',
  buyerName: '홍길동',
  buyerPhone: '010-0000-0000',
  amount: 300000,
  locale: 'ko' as const,
  now: '2026-06-30T05:00:00.000Z',
  context: {
    logPrefix: '[test]',
    successRunLabel: 'test.autoRefund.success',
    failureRunLabel: 'test.autoRefund.failure',
    successAdminTitle: '동시 구매 경합 — 자동 환불 완료',
    failureAdminTitle: '동시 구매 경합 자동 환불 실패 — 즉시 수동 환불 필요',
    successReference: '자동 환불 완료',
    failureReference: '수동 환불 필요',
  },
};

describe('handleArtworkTakenAutoRefund', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockCancelPayment.mockResolvedValue({ success: true });
    mockReleaseReservedArtworksIfUnowned.mockResolvedValue({
      releasedArtworkIds: ['art-1', 'art-2'],
      skippedArtworkIds: [],
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('marks the order refunded, releases reservations, cancels Toss, syncs payment, and notifies buyer on success', async () => {
    const { handleArtworkTakenAutoRefund } = await import(
      '@/lib/commerce/refund-cancel/auto-refund-taken'
    );
    const { supabase, orderUpdate, orderEqId, orderEqStatus, paymentUpdate, paymentEq } =
      buildSupabaseMock();

    await handleArtworkTakenAutoRefund({ supabase: supabase as never, ...baseInput });
    await flushAfterCallbacks();

    expect(orderUpdate).toHaveBeenCalledWith({
      status: 'refunded',
      refunded_at: '2026-06-30T05:00:00.000Z',
    });
    expect(orderEqId).toHaveBeenCalledWith('id', 'ord-1');
    expect(orderEqStatus).toHaveBeenCalledWith('status', 'paid');
    expect(mockReleaseReservedArtworksIfUnowned).toHaveBeenCalledWith(
      supabase,
      ['art-1', 'art-2'],
      '2026-06-30T05:00:00.000Z'
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith('/artworks/art-1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/en/artworks/art-1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/artworks/art-2');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/en/artworks/art-2');
    expect(mockRevalidatePublicArtworkSurfaces).toHaveBeenCalledTimes(1);
    expect(mockCancelPayment).toHaveBeenCalledWith(
      'pk_test',
      { cancelReason: '동시 구매 경합으로 작품이 이미 판매되어 자동 환불' },
      'auto-refund-taken-SAF-001',
      'domestic'
    );
    expect(paymentUpdate).toHaveBeenCalledWith({
      status: 'CANCELED',
      cancelled_at: '2026-06-30T05:00:00.000Z',
    });
    expect(paymentEq).toHaveBeenCalledWith('order_id', 'ord-1');
    expect(mockRunAllSettled).toHaveBeenCalledWith('test.autoRefund.success', expect.any(Array));
    expect(mockNotifyEmail).toHaveBeenCalledWith(
      'info',
      '동시 구매 경합 — 자동 환불 완료',
      expect.objectContaining({ 주문번호: 'SAF-001', paymentKey: 'pk_test' })
    );
    expect(mockSendBuyerEmail).toHaveBeenCalledWith(
      'buyer@example.com',
      'refunded',
      expect.objectContaining({ orderNo: 'SAF-001', amount: 300000 }),
      'ko'
    );
    expect(mockSendBuyerSms).toHaveBeenCalledWith(
      '010-0000-0000',
      'refunded',
      expect.objectContaining({ amount: 300000 }),
      'ko',
      'SAF-001'
    );
  });

  it('alerts operators only when Toss cancel fails', async () => {
    const { handleArtworkTakenAutoRefund } = await import(
      '@/lib/commerce/refund-cancel/auto-refund-taken'
    );
    const { supabase, paymentUpdate } = buildSupabaseMock();
    mockCancelPayment.mockResolvedValue({ success: false, error: { message: 'refund denied' } });

    await handleArtworkTakenAutoRefund({ supabase: supabase as never, ...baseInput });
    await flushAfterCallbacks();

    expect(paymentUpdate).not.toHaveBeenCalled();
    expect(mockRunAllSettled).toHaveBeenCalledWith('test.autoRefund.failure', expect.any(Array));
    expect(mockNotifyEmail).toHaveBeenCalledWith(
      'error',
      '동시 구매 경합 자동 환불 실패 — 즉시 수동 환불 필요',
      expect.objectContaining({
        주문번호: 'SAF-001',
        금액: '₩300,000',
        참고: '수동 환불 필요',
      })
    );
    expect(mockSendBuyerEmail).not.toHaveBeenCalled();
    expect(mockSendBuyerSms).not.toHaveBeenCalled();
  });
});
