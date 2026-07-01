const mockAfter = jest.fn((callback: () => unknown) => callback());
const mockExtractLineItems = jest.fn();
const mockDeriveAndSyncArtworkStatus = jest.fn();
const mockReleaseReservedArtworksIfUnowned = jest.fn();
const mockRevalidatePath = jest.fn();
const mockRevalidatePublicArtworkSurfaces = jest.fn();
const mockGetOrderNotificationInfo = jest.fn();
const mockBuildAdminNotificationFields = jest.fn((_info: unknown, fields: unknown) => fields);
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

jest.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

jest.mock('@/lib/orders/record-artwork-sales', () => ({
  extractLineItems: (...args: unknown[]) => mockExtractLineItems(...args),
}));

jest.mock('@/lib/artworks/status', () => ({
  deriveAndSyncArtworkStatus: (...args: unknown[]) => mockDeriveAndSyncArtworkStatus(...args),
}));

jest.mock('@/lib/orders/reservations', () => ({
  releaseReservedArtworksIfUnowned: (...args: unknown[]) =>
    mockReleaseReservedArtworksIfUnowned(...args),
}));

jest.mock('@/lib/utils/revalidate', () => ({
  revalidatePublicArtworkSurfaces: (...args: unknown[]) =>
    mockRevalidatePublicArtworkSurfaces(...args),
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

const activeOrder = {
  status: 'paid',
  artwork_id: 'legacy-art',
  order_no: 'SAF-CANCEL-001',
  buyer_email: 'buyer@example.com',
  buyer_name: '구매자',
  buyer_phone: '010-0000-0000',
  total_amount: 300000,
  metadata: { locale: 'ko' },
  order_items: [
    { artwork_id: 'art-1', quantity: 1, unit_price: 100000 },
    { artwork_id: 'art-2', quantity: 1, unit_price: 200000 },
  ],
};

function buildSupabaseMock(order = activeOrder) {
  const orderSingle = jest.fn(async () => ({ data: order, error: null }));
  const orderSelectEq = jest.fn(() => ({ single: orderSingle }));
  const orderSelect = jest.fn(() => ({ eq: orderSelectEq }));
  const orderNot = jest.fn(async () => ({ error: null }));
  const orderUpdateEq = jest.fn(() => ({ not: orderNot }));
  const orderUpdate = jest.fn(() => ({ eq: orderUpdateEq }));
  const salesIs = jest.fn(async () => ({ error: null }));
  const salesEq = jest.fn(() => ({ is: salesIs }));
  const salesUpdate = jest.fn(() => ({ eq: salesEq }));

  const supabase = {
    from: jest.fn((table: string) => {
      if (table === 'orders') {
        return { select: orderSelect, update: orderUpdate };
      }
      if (table === 'artwork_sales') {
        return { update: salesUpdate };
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return {
    supabase,
    orderSelect,
    orderSelectEq,
    orderSingle,
    orderUpdate,
    orderUpdateEq,
    orderNot,
    salesUpdate,
    salesEq,
    salesIs,
  };
}

async function flushAfterCallbacks() {
  await Promise.resolve();
  await Promise.resolve();
}

const baseInput = {
  paymentOrderId: 'order-1',
  paymentKey: 'pay-key',
  newStatus: 'CANCELED',
  now: '2026-07-01T05:00:00.000Z',
};

describe('handleTossCanceledPaymentCascade', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockExtractLineItems.mockReturnValue([
      { artwork_id: 'art-1', quantity: 1, unit_price: 100000 },
      { artwork_id: 'art-2', quantity: 1, unit_price: 200000 },
    ]);
    mockDeriveAndSyncArtworkStatus.mockResolvedValue('available');
    mockReleaseReservedArtworksIfUnowned.mockResolvedValue({
      releasedArtworkIds: ['art-1', 'art-2'],
      skippedArtworkIds: [],
    });
    mockGetOrderNotificationInfo.mockResolvedValue({
      orderNo: 'SAF-CANCEL-001',
      artworkTitle: '작품',
      artistName: '작가',
      itemAmount: 300000,
      shippingAmount: 0,
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('cascades a Toss canceled webhook to order refund, sales void, artwork recovery, and notifications', async () => {
    const { handleTossCanceledPaymentCascade } = await import(
      '@/lib/commerce/refund-cancel/toss-canceled-cascade'
    );
    const {
      supabase,
      orderSelect,
      orderSelectEq,
      orderUpdate,
      orderUpdateEq,
      orderNot,
      salesUpdate,
      salesEq,
      salesIs,
    } = buildSupabaseMock();

    const result = await handleTossCanceledPaymentCascade({
      supabase: supabase as never,
      ...baseInput,
    });
    await flushAfterCallbacks();

    expect(result).toEqual({ ok: true, skipped: false, artworkIds: ['art-1', 'art-2'] });
    expect(orderSelect).toHaveBeenCalledWith(
      'status, artwork_id, order_no, buyer_email, buyer_name, buyer_phone, total_amount, metadata, order_items(artwork_id, quantity, unit_price)'
    );
    expect(orderSelectEq).toHaveBeenCalledWith('id', 'order-1');
    expect(orderUpdate).toHaveBeenCalledWith({
      status: 'refunded',
      refunded_at: '2026-07-01T05:00:00.000Z',
    });
    expect(orderUpdateEq).toHaveBeenCalledWith('id', 'order-1');
    expect(orderNot).toHaveBeenCalledWith('status', 'in', '(refunded,cancelled)');
    expect(salesUpdate).toHaveBeenCalledWith({
      voided_at: '2026-07-01T05:00:00.000Z',
      void_reason: 'Toss 웹훅 취소 자동 처리',
    });
    expect(salesEq).toHaveBeenCalledWith('order_id', 'order-1');
    expect(salesIs).toHaveBeenCalledWith('voided_at', null);
    expect(mockDeriveAndSyncArtworkStatus).toHaveBeenCalledWith(supabase, 'art-1');
    expect(mockDeriveAndSyncArtworkStatus).toHaveBeenCalledWith(supabase, 'art-2');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/artworks/art-1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/en/artworks/art-1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/artworks/art-2');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/en/artworks/art-2');
    expect(mockReleaseReservedArtworksIfUnowned).toHaveBeenCalledWith(
      supabase,
      ['art-1', 'art-2'],
      '2026-07-01T05:00:00.000Z'
    );
    expect(mockRevalidatePublicArtworkSurfaces).toHaveBeenCalledTimes(1);
    expect(mockGetOrderNotificationInfo).toHaveBeenCalledWith(supabase, { id: 'order-1' });
    expect(mockRunAllSettled).toHaveBeenCalledWith(
      'tossWebhook.canceled.notifications',
      expect.any(Array)
    );
    expect(mockNotifyEmail).toHaveBeenCalledWith(
      'warning',
      'Toss 결제 취소 수신',
      expect.objectContaining({ 상태: 'CANCELED', paymentKey: 'pay-key' })
    );
    expect(mockSendBuyerEmail).toHaveBeenCalledWith(
      'buyer@example.com',
      'refunded',
      expect.objectContaining({ orderNo: 'SAF-CANCEL-001', amount: 300000 }),
      'ko'
    );
    expect(mockSendBuyerSms).toHaveBeenCalledWith(
      '010-0000-0000',
      'refunded',
      expect.objectContaining({ amount: 300000 }),
      'ko',
      'SAF-CANCEL-001'
    );
  });

  it('skips terminal refunded or cancelled orders without mutations or notifications', async () => {
    const { handleTossCanceledPaymentCascade } = await import(
      '@/lib/commerce/refund-cancel/toss-canceled-cascade'
    );
    const { supabase, orderUpdate, salesUpdate } = buildSupabaseMock({
      ...activeOrder,
      status: 'refunded',
    });

    const result = await handleTossCanceledPaymentCascade({
      supabase: supabase as never,
      ...baseInput,
    });
    await flushAfterCallbacks();

    expect(result).toEqual({ ok: true, skipped: true, artworkIds: [] });
    expect(orderUpdate).not.toHaveBeenCalled();
    expect(salesUpdate).not.toHaveBeenCalled();
    expect(mockDeriveAndSyncArtworkStatus).not.toHaveBeenCalled();
    expect(mockReleaseReservedArtworksIfUnowned).not.toHaveBeenCalled();
    expect(mockRunAllSettled).not.toHaveBeenCalled();
  });
});
