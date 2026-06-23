const mockEnsureTossPaymentRecord = jest.fn();
const mockExtractLineItems = jest.fn();
const mockRecordOrderArtworkSales = jest.fn();
const mockDeriveAndSyncArtworkStatus = jest.fn();
const mockRevalidatePublicArtworkSurfaces = jest.fn();
const mockRevalidatePath = jest.fn();

jest.mock('@/lib/payments/toss-payment-record', () => ({
  ensureTossPaymentRecord: (...args: unknown[]) => mockEnsureTossPaymentRecord(...args),
}));

jest.mock('@/lib/orders/record-artwork-sales', () => ({
  extractLineItems: (...args: unknown[]) => mockExtractLineItems(...args),
  recordOrderArtworkSales: (...args: unknown[]) => mockRecordOrderArtworkSales(...args),
}));

jest.mock('@/app/actions/admin-artworks', () => ({
  deriveAndSyncArtworkStatus: (...args: unknown[]) => mockDeriveAndSyncArtworkStatus(...args),
}));

jest.mock('@/lib/utils/revalidate', () => ({
  revalidatePublicArtworkSurfaces: (...args: unknown[]) =>
    mockRevalidatePublicArtworkSurfaces(...args),
}));

jest.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

type QueryResult = { data: unknown; error: { message: string } | null };

function createSupabase(updateResult: QueryResult = { data: [{ id: 'order-1' }], error: null }) {
  const updateBuilder = {
    in: jest.fn(() => updateBuilder),
    select: jest.fn(async () => updateResult),
  };
  const ordersBuilder = {
    update: jest.fn(() => ({
      eq: jest.fn(() => updateBuilder),
    })),
  };

  return {
    client: {
      from: jest.fn((table: string) => {
        if (table === 'orders') return ordersBuilder;
        return {};
      }),
    },
    ordersBuilder,
    updateBuilder,
  };
}

const basePayment = {
  paymentKey: 'pay-1',
  orderId: 'SAF-001',
  orderName: 'SAF artwork',
  status: 'DONE',
  method: '카드',
  totalAmount: 100000,
  balanceAmount: 100000,
  currency: 'KRW',
  approvedAt: '2026-06-23T10:00:00+09:00',
  requestedAt: '2026-06-23T09:59:00+09:00',
};

const baseOrder = {
  id: 'order-1',
  order_no: 'SAF-001',
  artwork_id: 'art-legacy',
  total_amount: 100000,
  buyer_name: '구매자',
  buyer_phone: '01012345678',
  metadata: { locale: 'ko' },
};

describe('markOrderPaid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnsureTossPaymentRecord.mockResolvedValue({
      ok: true,
      paymentId: 'pay-row',
      created: true,
    });
    mockExtractLineItems.mockReturnValue([
      { artwork_id: 'art-1', quantity: 1, unit_price: 100000 },
    ]);
    mockRecordOrderArtworkSales.mockResolvedValue({ inserted: true, rows: 1 });
  });

  it('returns false and records an error when payment row creation fails', async () => {
    const { markOrderPaid } = await import('@/lib/commerce/payment-lifecycle/mark-order-paid');
    const supabase = createSupabase();
    const errors: string[] = [];
    mockEnsureTossPaymentRecord.mockResolvedValue({ ok: false, error: 'db down' });

    const result = await markOrderPaid({
      supabase: supabase.client as never,
      order: baseOrder,
      tossPayment: basePayment,
      provider: 'api_v1',
      now: '2026-06-23T00:00:00.000Z',
      sourceStatuses: ['pending_payment'],
      idempotencyKey: 'reconcile-SAF-001',
      errors,
    });

    expect(result).toBe(false);
    expect(errors).toEqual(['SAF-001: payment insert failed: db down']);
    expect(supabase.ordersBuilder.update).not.toHaveBeenCalled();
  });

  it('promotes the order, records sales, syncs artwork status, and revalidates public surfaces', async () => {
    const { markOrderPaid } = await import('@/lib/commerce/payment-lifecycle/mark-order-paid');
    const supabase = createSupabase();
    const errors: string[] = [];

    const result = await markOrderPaid({
      supabase: supabase.client as never,
      order: baseOrder,
      tossPayment: basePayment,
      provider: 'api_v1',
      now: '2026-06-23T00:00:00.000Z',
      sourceStatuses: ['pending_payment', 'awaiting_deposit'],
      idempotencyKey: 'reconcile-SAF-001',
      errors,
    });

    expect(result).toBe(true);
    expect(errors).toEqual([]);
    expect(supabase.ordersBuilder.update).toHaveBeenCalledWith({
      status: 'paid',
      paid_at: basePayment.approvedAt,
      metadata: {
        locale: 'ko',
        payment_method: '카드',
        reconciled: true,
      },
    });
    expect(supabase.updateBuilder.in).toHaveBeenCalledWith('status', [
      'pending_payment',
      'awaiting_deposit',
    ]);
    expect(mockRecordOrderArtworkSales).toHaveBeenCalledWith(
      supabase.client,
      expect.objectContaining({
        orderId: 'order-1',
        orderNo: 'SAF-001',
        source: 'toss',
        sourceDetail: 'toss_api',
      })
    );
    expect(mockDeriveAndSyncArtworkStatus).toHaveBeenCalledWith(supabase.client, 'art-1');
    expect(mockRevalidatePublicArtworkSurfaces).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith('/artworks/art-1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/en/artworks/art-1');
  });

  it('falls back to legacy order.artwork_id when order_items are missing', async () => {
    const { markOrderPaid } = await import('@/lib/commerce/payment-lifecycle/mark-order-paid');
    const supabase = createSupabase();
    mockExtractLineItems.mockReturnValue([]);

    await markOrderPaid({
      supabase: supabase.client as never,
      order: baseOrder,
      tossPayment: basePayment,
      provider: 'widget',
      now: '2026-06-23T00:00:00.000Z',
      sourceStatuses: ['pending_payment'],
      idempotencyKey: 'reconcile-SAF-001',
      errors: [],
    });

    expect(mockRecordOrderArtworkSales).toHaveBeenCalledWith(
      supabase.client,
      expect.objectContaining({
        lineItems: [{ artwork_id: 'art-legacy', quantity: 1, unit_price: 100000 }],
        sourceDetail: 'toss_widget',
      })
    );
  });

  it('returns false when the order update affects zero rows', async () => {
    const { markOrderPaid } = await import('@/lib/commerce/payment-lifecycle/mark-order-paid');
    const supabase = createSupabase({ data: [], error: null });
    const errors: string[] = [];

    const result = await markOrderPaid({
      supabase: supabase.client as never,
      order: baseOrder,
      tossPayment: basePayment,
      provider: 'api_v1',
      now: '2026-06-23T00:00:00.000Z',
      sourceStatuses: ['pending_payment'],
      idempotencyKey: 'reconcile-SAF-001',
      errors,
    });

    expect(result).toBe(false);
    expect(errors).toEqual([]);
    expect(mockRecordOrderArtworkSales).not.toHaveBeenCalled();
  });

  it('returns an ARTWORK_TAKEN outcome with sales lines for caller-specific refund handling', async () => {
    const { markOrderPaidWithOutcome } = await import(
      '@/lib/commerce/payment-lifecycle/mark-order-paid'
    );
    const supabase = createSupabase();
    mockRecordOrderArtworkSales.mockResolvedValue({ inserted: false, reason: 'artwork_taken' });

    const result = await markOrderPaidWithOutcome({
      supabase: supabase.client as never,
      order: baseOrder,
      tossPayment: basePayment,
      provider: 'api_v1',
      now: '2026-06-23T00:00:00.000Z',
      sourceStatuses: ['pending_payment'],
      idempotencyKey: 'confirm-SAF-001',
      errors: [],
    });

    expect(result).toEqual({
      ok: false,
      code: 'ARTWORK_TAKEN',
      salesLines: [{ artwork_id: 'art-1', quantity: 1, unit_price: 100000 }],
    });
  });

  it('can continue after a sales-record failure while preserving a caller-visible warning', async () => {
    const { markOrderPaidWithOutcome } = await import(
      '@/lib/commerce/payment-lifecycle/mark-order-paid'
    );
    const supabase = createSupabase();
    mockRecordOrderArtworkSales.mockResolvedValue({
      inserted: false,
      reason: 'error',
      error: 'sales db down',
    });

    const result = await markOrderPaidWithOutcome({
      supabase: supabase.client as never,
      order: baseOrder,
      tossPayment: basePayment,
      provider: 'api_v1',
      now: '2026-06-23T00:00:00.000Z',
      sourceStatuses: ['pending_payment'],
      idempotencyKey: 'confirm-SAF-001',
      errors: [],
      continueOnSalesRecordFailure: true,
    });

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        warnings: [{ code: 'ARTWORK_SALES_FAILED', error: 'sales db down' }],
      })
    );
    expect(mockDeriveAndSyncArtworkStatus).toHaveBeenCalledWith(supabase.client, 'art-1');
  });
});
