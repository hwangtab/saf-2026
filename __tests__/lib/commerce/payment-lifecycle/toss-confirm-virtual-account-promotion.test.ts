const mockAfter = jest.fn((callback: () => unknown) => callback());
const mockEnsureTossPaymentRecord = jest.fn();
const mockReserveUniqueArtworksOrRollback = jest.fn();
const mockReleaseReservedArtworksIfUnowned = jest.fn();
const mockCancelPayment = jest.fn();
const mockNotifyEmail = jest.fn();
const mockLogOrderStatusSyncFailure = jest.fn();
const mockRunAllSettled = jest.fn(async (_label: string, tasks: Array<() => unknown>) => {
  for (const task of tasks) await task();
});
const mockRevalidatePath = jest.fn();
const mockRevalidatePublicArtworkSurfaces = jest.fn();

jest.mock('next/server', () => ({
  after: (callback: () => unknown) => mockAfter(callback),
}));

jest.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

jest.mock('@/lib/payments/toss-payment-record', () => ({
  ensureTossPaymentRecord: (...args: unknown[]) => mockEnsureTossPaymentRecord(...args),
}));

jest.mock('@/lib/orders/reservations', () => ({
  reserveUniqueArtworksOrRollback: (...args: unknown[]) =>
    mockReserveUniqueArtworksOrRollback(...args),
  releaseReservedArtworksIfUnowned: (...args: unknown[]) =>
    mockReleaseReservedArtworksIfUnowned(...args),
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

jest.mock('@/lib/utils/revalidate', () => ({
  revalidatePublicArtworkSurfaces: (...args: unknown[]) =>
    mockRevalidatePublicArtworkSurfaces(...args),
}));

const baseOrder = {
  id: 'order-1',
  order_no: 'SAF-001',
  status: 'pending_payment',
  metadata: { checkout_token_hash: 'hash', locale: 'ko' },
};

const baseTossPayment = {
  paymentKey: 'pay-key',
  orderId: 'SAF-001',
  orderName: 'SAF artwork',
  status: 'WAITING_FOR_DEPOSIT',
  method: '가상계좌',
  totalAmount: 100000,
  balanceAmount: 100000,
  currency: 'KRW',
  approvedAt: null,
  requestedAt: '2026-07-01T05:00:00.000Z',
  virtualAccount: {
    bankName: '테스트은행',
    accountNumber: '123-456',
    dueDate: '2026-07-02T05:00:00.000Z',
    bankCode: '001',
    expired: false,
    settlementStatus: 'INCOMPLETED',
    accountType: 'NORMAL',
  },
};

const baseInput = {
  order: baseOrder,
  orderNo: 'SAF-001',
  paymentKey: 'pay-key',
  tossPayment: baseTossPayment,
  provider: 'api_v1',
  lineItems: [{ artwork_id: 'art-1', quantity: 1, unit_price: 100000 }],
  idempotencyKey: 'confirm-SAF-001',
  now: '2026-07-01T05:30:00.000Z',
  logOrderStatusSyncFailure: mockLogOrderStatusSyncFailure,
};

function createSupabaseMock(
  options: {
    orderUpdateRows?: unknown[];
    orderUpdateError?: { message: string } | null;
    latestStatus?: string;
  } = {}
) {
  const {
    orderUpdateRows = [{ id: 'order-1' }],
    orderUpdateError = null,
    latestStatus = 'pending_payment',
  } = options;
  const updates: Array<{ table: string; patch: Record<string, unknown> }> = [];

  const makeBuilder = (table: string) => {
    const builder = {
      patch: undefined as Record<string, unknown> | undefined,
      selectedColumns: undefined as string | undefined,
      select: jest.fn((columns?: string) => {
        builder.selectedColumns = columns;
        return builder;
      }),
      update: jest.fn((patch: Record<string, unknown>) => {
        builder.patch = patch;
        updates.push({ table, patch });
        return builder;
      }),
      eq: jest.fn(() => builder),
      single: jest.fn(async () => ({
        data: table === 'orders' ? { id: 'order-1', status: latestStatus } : null,
        error: null,
      })),
      then: (
        resolve: (value: { data: unknown[] | null; error: { message: string } | null }) => unknown
      ) =>
        resolve({
          data: table === 'orders' && builder.patch ? orderUpdateRows : [],
          error: table === 'orders' && builder.patch ? orderUpdateError : null,
        }),
    };
    return builder;
  };

  return {
    updates,
    client: {
      from: jest.fn((table: string) => makeBuilder(table)),
    },
  };
}

async function flushAfterCallbacks() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('promoteTossConfirmVirtualAccount', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockEnsureTossPaymentRecord.mockResolvedValue({
      ok: true,
      paymentId: 'payment-1',
      created: true,
    });
    mockReserveUniqueArtworksOrRollback.mockResolvedValue({
      ok: true,
      reservedArtworkIds: ['art-1'],
    });
    mockReleaseReservedArtworksIfUnowned.mockResolvedValue({ released: 1 });
    mockCancelPayment.mockResolvedValue({ success: true, data: { status: 'CANCELED' } });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('creates the payment row, reserves unique artworks, promotes the order, and revalidates public artwork surfaces', async () => {
    const { promoteTossConfirmVirtualAccount } = await import(
      '@/lib/commerce/payment-lifecycle/toss-confirm-virtual-account-promotion'
    );
    const supabase = createSupabaseMock();

    const result = await promoteTossConfirmVirtualAccount({
      supabase: supabase.client as never,
      ...baseInput,
      provider: 'api_v1' as never,
      tossPayment: baseTossPayment as never,
    });

    expect(result).toEqual({ ok: true, status: 'promoted', reservedArtworkIds: ['art-1'] });
    expect(mockEnsureTossPaymentRecord).toHaveBeenCalledWith({
      supabase: supabase.client,
      orderId: 'order-1',
      tossPayment: baseTossPayment,
      idempotencyKey: 'confirm-SAF-001',
    });
    expect(mockReserveUniqueArtworksOrRollback).toHaveBeenCalledWith(
      supabase.client,
      ['art-1'],
      '2026-07-01T05:30:00.000Z'
    );
    expect(supabase.updates).toContainEqual({
      table: 'orders',
      patch: {
        status: 'awaiting_deposit',
        paid_at: null,
        metadata: { checkout_token_hash: 'hash', locale: 'ko', payment_method: '가상계좌' },
      },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/artworks/art-1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/en/artworks/art-1');
    expect(mockRevalidatePublicArtworkSurfaces).toHaveBeenCalledTimes(1);
    expect(mockCancelPayment).not.toHaveBeenCalled();
  });

  it('returns a fatal payment-record failure before reserving artworks or promoting the order', async () => {
    const { promoteTossConfirmVirtualAccount } = await import(
      '@/lib/commerce/payment-lifecycle/toss-confirm-virtual-account-promotion'
    );
    const supabase = createSupabaseMock();
    mockEnsureTossPaymentRecord.mockResolvedValue({ ok: false, error: 'payment insert failed' });

    const result = await promoteTossConfirmVirtualAccount({
      supabase: supabase.client as never,
      ...baseInput,
      provider: 'api_v1' as never,
      tossPayment: baseTossPayment as never,
    });

    expect(result).toEqual({
      ok: false,
      code: 'PAYMENT_RECORD_FAILED',
      error: 'payment insert failed',
    });
    expect(mockReserveUniqueArtworksOrRollback).not.toHaveBeenCalled();
    expect(supabase.updates).toEqual([]);
  });

  it('cancels the Toss virtual account, cancels the order, syncs payment status, and notifies operators when reservation fails', async () => {
    const { promoteTossConfirmVirtualAccount } = await import(
      '@/lib/commerce/payment-lifecycle/toss-confirm-virtual-account-promotion'
    );
    const supabase = createSupabaseMock();
    mockReserveUniqueArtworksOrRollback.mockResolvedValue({
      ok: false,
      failedArtworkId: 'art-1',
      reservedArtworkIds: [],
    });

    const result = await promoteTossConfirmVirtualAccount({
      supabase: supabase.client as never,
      ...baseInput,
      provider: 'api_v1' as never,
      tossPayment: baseTossPayment as never,
    });
    await flushAfterCallbacks();

    expect(result).toEqual({
      ok: false,
      code: 'RESERVATION_FAILED',
      failedArtworkId: 'art-1',
    });
    expect(mockCancelPayment).toHaveBeenCalledWith(
      'pay-key',
      { cancelReason: '작품 예약 실패로 가상계좌 주문 자동 취소' },
      'auto-cancel-reservation-SAF-001',
      'api_v1'
    );
    expect(supabase.updates).toContainEqual(
      expect.objectContaining({
        table: 'orders',
        patch: expect.objectContaining({ status: 'cancelled' }),
      })
    );
    expect(supabase.updates).toContainEqual(
      expect.objectContaining({
        table: 'payments',
        patch: expect.objectContaining({ status: 'CANCELED' }),
      })
    );
    expect(mockRunAllSettled).toHaveBeenCalledWith(
      'toss-confirm.virtual-account-reservation-failed.notifications',
      expect.any(Array)
    );
    expect(mockNotifyEmail).toHaveBeenCalledWith(
      'warning',
      '가상계좌 주문 작품 예약 실패 — 자동 취소',
      expect.objectContaining({ 주문번호: 'SAF-001', 작품ID: 'art-1', Toss취소: '성공' })
    );
  });

  it('releases reservations, schedules Toss cancel, syncs payment status, and returns a 409 when order promotion loses a race', async () => {
    const { promoteTossConfirmVirtualAccount } = await import(
      '@/lib/commerce/payment-lifecycle/toss-confirm-virtual-account-promotion'
    );
    const supabase = createSupabaseMock({
      orderUpdateRows: [],
      latestStatus: 'cancelled',
    });

    const result = await promoteTossConfirmVirtualAccount({
      supabase: supabase.client as never,
      ...baseInput,
      provider: 'api_v1' as never,
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
    expect(mockReleaseReservedArtworksIfUnowned).toHaveBeenCalledWith(
      supabase.client,
      ['art-1'],
      '2026-07-01T05:30:00.000Z'
    );
    expect(mockCancelPayment).toHaveBeenCalledWith(
      'pay-key',
      { cancelReason: '주문 상태 경합으로 가상계좌 주문 자동 취소' },
      'auto-cancel-race-SAF-001',
      'api_v1'
    );
    expect(supabase.updates).toContainEqual(
      expect.objectContaining({
        table: 'payments',
        patch: expect.objectContaining({ status: 'CANCELED' }),
      })
    );
    expect(mockRunAllSettled).toHaveBeenCalledWith(
      'toss-confirm.virtual-account-race-cancel.notification',
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
        targetStatus: 'awaiting_deposit',
        latestStatus: 'cancelled',
        error: 'orders update affected 0 rows',
      })
    );
  });
});
