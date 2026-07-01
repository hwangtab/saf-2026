const mockExtractLineItems = jest.fn();
const mockDeriveAndSyncArtworkStatus = jest.fn();
const mockReleaseReservedArtworksIfUnowned = jest.fn();
const mockRevalidatePublicArtworkSurfaces = jest.fn();
const mockRevalidatePath = jest.fn();

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

jest.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

type QueryResult = { data: unknown; error: { message: string } | null };

function createSupabase({
  orderUpdateResult = { data: [{ id: 'order-1' }], error: null },
  paymentUpdateError = null,
  salesVoidError = null,
}: {
  orderUpdateResult?: QueryResult;
  paymentUpdateError?: { message: string } | null;
  salesVoidError?: { message: string } | null;
} = {}) {
  const paymentUpdateBuilder = {
    eq: jest.fn(() => ({ error: paymentUpdateError })),
  };
  const paymentsBuilder = {
    update: jest.fn(() => paymentUpdateBuilder),
  };

  const orderUpdateBuilder = {
    in: jest.fn(() => orderUpdateBuilder),
    select: jest.fn(async () => orderUpdateResult),
  };
  const ordersBuilder = {
    update: jest.fn(() => ({
      eq: jest.fn(() => orderUpdateBuilder),
    })),
  };

  const salesUpdateBuilder = {
    eq: jest.fn(() => salesUpdateBuilder),
    is: jest.fn(() => ({ error: salesVoidError })),
  };
  const artworkSalesBuilder = {
    update: jest.fn(() => salesUpdateBuilder),
  };

  return {
    client: {
      from: jest.fn((table: string) => {
        if (table === 'payments') return paymentsBuilder;
        if (table === 'orders') return ordersBuilder;
        if (table === 'artwork_sales') return artworkSalesBuilder;
        return {};
      }),
    },
    paymentsBuilder,
    paymentUpdateBuilder,
    ordersBuilder,
    orderUpdateBuilder,
    artworkSalesBuilder,
    salesUpdateBuilder,
  };
}

const baseOrder = {
  id: 'order-1',
  order_no: 'SAF-001',
  artwork_id: 'legacy-art',
  total_amount: 8000000,
  buyer_name: '구매자',
  buyer_phone: '010-0000-0000',
  metadata: { locale: 'ko' },
  order_items: [
    { artwork_id: 'art-1', quantity: 1, unit_price: 5000000 },
    { artwork_id: 'art-2', quantity: 1, unit_price: 3000000 },
  ],
};

describe('markOrderRefundedAfterCancel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExtractLineItems.mockReturnValue([
      { artwork_id: 'art-1', quantity: 1, unit_price: 5000000 },
      { artwork_id: 'art-2', quantity: 1, unit_price: 3000000 },
    ]);
    mockDeriveAndSyncArtworkStatus.mockResolvedValue('available');
    mockReleaseReservedArtworksIfUnowned.mockResolvedValue({
      releasedArtworkIds: [],
      skippedArtworkIds: ['art-1', 'art-2'],
    });
  });

  it('syncs payment, order, sales, artwork status, reservations, and public surfaces after provider cancel succeeds', async () => {
    const { markOrderRefundedAfterCancel } = await import(
      '@/lib/commerce/refund-cancel/mark-order-refunded'
    );
    const supabase = createSupabase();
    const now = '2026-06-30T00:00:00.000Z';

    const result = await markOrderRefundedAfterCancel({
      supabase: supabase.client as never,
      order: baseOrder,
      payment: { id: 'payment-1', payment_key: 'pk_test', status: 'DONE' },
      now,
      sourceStatuses: ['paid', 'preparing'],
      voidReason: '관리자 환불',
    });

    expect(result).toEqual({ ok: true, artworkIds: ['art-1', 'art-2'], warnings: [] });
    expect(supabase.paymentsBuilder.update).toHaveBeenCalledWith({
      status: 'CANCELED',
      cancelled_at: now,
    });
    expect(supabase.paymentUpdateBuilder.eq).toHaveBeenCalledWith('id', 'payment-1');
    expect(supabase.ordersBuilder.update).toHaveBeenCalledWith({
      status: 'refunded',
      refunded_at: now,
    });
    expect(supabase.orderUpdateBuilder.in).toHaveBeenCalledWith('status', ['paid', 'preparing']);
    expect(supabase.artworkSalesBuilder.update).toHaveBeenCalledWith({
      voided_at: now,
      void_reason: '관리자 환불',
    });
    expect(supabase.salesUpdateBuilder.eq).toHaveBeenCalledWith('order_id', 'order-1');
    expect(supabase.salesUpdateBuilder.is).toHaveBeenCalledWith('voided_at', null);
    expect(mockDeriveAndSyncArtworkStatus).toHaveBeenCalledWith(supabase.client, 'art-1');
    expect(mockDeriveAndSyncArtworkStatus).toHaveBeenCalledWith(supabase.client, 'art-2');
    expect(mockReleaseReservedArtworksIfUnowned).toHaveBeenCalledWith(
      supabase.client,
      ['art-1', 'art-2'],
      now
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith('/artworks/art-1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/en/artworks/art-1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/artworks/art-2');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/en/artworks/art-2');
    expect(mockRevalidatePublicArtworkSurfaces).toHaveBeenCalledTimes(1);
  });

  it('stops before sales, artwork, reservation, and cache side effects when the order update affects zero rows', async () => {
    const { markOrderRefundedAfterCancel } = await import(
      '@/lib/commerce/refund-cancel/mark-order-refunded'
    );
    const supabase = createSupabase({ orderUpdateResult: { data: [], error: null } });

    const result = await markOrderRefundedAfterCancel({
      supabase: supabase.client as never,
      order: baseOrder,
      payment: { id: 'payment-1', payment_key: 'pk_test', status: 'DONE' },
      now: '2026-06-30T00:00:00.000Z',
      sourceStatuses: ['paid'],
      voidReason: '구매자 취소',
    });

    expect(result).toEqual({ ok: false, code: 'ORDER_STATE_MISMATCH' });
    expect(supabase.artworkSalesBuilder.update).not.toHaveBeenCalled();
    expect(mockDeriveAndSyncArtworkStatus).not.toHaveBeenCalled();
    expect(mockReleaseReservedArtworksIfUnowned).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
    expect(mockRevalidatePublicArtworkSurfaces).not.toHaveBeenCalled();
  });
});
