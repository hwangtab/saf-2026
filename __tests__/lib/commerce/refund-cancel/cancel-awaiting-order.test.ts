const mockExtractLineItems = jest.fn();
const mockReleaseReservedArtworksIfUnowned = jest.fn();
const mockRevalidatePublicArtworkSurfaces = jest.fn();
const mockRevalidatePath = jest.fn();

jest.mock('@/lib/orders/record-artwork-sales', () => ({
  extractLineItems: (...args: unknown[]) => mockExtractLineItems(...args),
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

function createSupabase(
  orderUpdateResult: QueryResult = { data: [{ id: 'order-1' }], error: null }
) {
  const orderUpdateBuilder = {
    eq: jest.fn(() => orderUpdateBuilder),
    select: jest.fn(async () => orderUpdateResult),
  };
  const ordersBuilder = {
    update: jest.fn(() => ({
      eq: jest.fn(() => orderUpdateBuilder),
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
    orderUpdateBuilder,
  };
}

const baseOrder = {
  id: 'order-1',
  order_no: 'SAF-001',
  artwork_id: null,
  order_items: [
    { artwork_id: 'art-1', quantity: 1, unit_price: 5000000 },
    { artwork_id: 'art-2', quantity: 1, unit_price: 3000000 },
  ],
};

describe('cancelAwaitingDepositOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExtractLineItems.mockReturnValue([
      { artwork_id: 'art-1', quantity: 1, unit_price: 5000000 },
      { artwork_id: 'art-2', quantity: 1, unit_price: 3000000 },
    ]);
    mockReleaseReservedArtworksIfUnowned.mockResolvedValue({
      releasedArtworkIds: ['art-1', 'art-2'],
      skippedArtworkIds: [],
    });
  });

  it('cancels an awaiting-deposit order, releases reservations, and revalidates public artwork surfaces', async () => {
    const { cancelAwaitingDepositOrder } = await import(
      '@/lib/commerce/refund-cancel/cancel-awaiting-order'
    );
    const supabase = createSupabase();
    const now = '2026-06-30T00:00:00.000Z';

    const result = await cancelAwaitingDepositOrder({
      supabase: supabase.client as never,
      order: baseOrder,
      now,
    });

    expect(result).toEqual({ ok: true, artworkIds: ['art-1', 'art-2'], warnings: [] });
    expect(supabase.ordersBuilder.update).toHaveBeenCalledWith({
      status: 'cancelled',
      cancelled_at: now,
      updated_at: now,
    });
    expect(supabase.orderUpdateBuilder.eq).toHaveBeenCalledWith('status', 'awaiting_deposit');
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

  it('stops before reservation and cache side effects when the order update affects zero rows', async () => {
    const { cancelAwaitingDepositOrder } = await import(
      '@/lib/commerce/refund-cancel/cancel-awaiting-order'
    );
    const supabase = createSupabase({ data: [], error: null });

    const result = await cancelAwaitingDepositOrder({
      supabase: supabase.client as never,
      order: baseOrder,
      now: '2026-06-30T00:00:00.000Z',
    });

    expect(result).toEqual({ ok: false, code: 'ORDER_STATE_MISMATCH' });
    expect(mockReleaseReservedArtworksIfUnowned).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
    expect(mockRevalidatePublicArtworkSurfaces).not.toHaveBeenCalled();
  });
});
