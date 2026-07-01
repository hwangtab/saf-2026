const mockDeriveAndSyncArtworkStatus = jest.fn();
const mockReleaseReservedArtworksIfUnowned = jest.fn();

jest.mock('@/lib/artworks/status', () => ({
  deriveAndSyncArtworkStatus: (...args: unknown[]) => mockDeriveAndSyncArtworkStatus(...args),
}));

jest.mock('@/lib/orders/reservations', () => ({
  releaseReservedArtworksIfUnowned: (...args: unknown[]) =>
    mockReleaseReservedArtworksIfUnowned(...args),
}));

function buildStatusTransitionSupabaseMock(options: {
  order: Record<string, unknown> | null;
  orderError?: unknown;
  updatedRows?: Array<Record<string, unknown>> | null;
  updateError?: unknown;
  saleVoidError?: unknown;
}) {
  const orderUpdates: Array<Record<string, unknown>> = [];
  const saleUpdates: Array<Record<string, unknown>> = [];
  const orderUpdateFilters: Array<{ column: string; value: unknown }> = [];

  const supabase = {
    from: jest.fn((table: string) => {
      if (table === 'orders') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(async () => ({
                data: options.order,
                error: options.orderError ?? null,
              })),
            })),
          })),
          update: jest.fn((patch: Record<string, unknown>) => {
            orderUpdates.push(patch);
            const eq: jest.Mock = jest.fn((column: string, value: unknown) => {
              orderUpdateFilters.push({ column, value });
              return {
                eq,
                select: jest.fn(async () => ({
                  data: options.updatedRows ?? [{ id: 'ord-1' }],
                  error: options.updateError ?? null,
                })),
              };
            });
            return { eq };
          }),
        };
      }
      if (table === 'artwork_sales') {
        return {
          update: jest.fn((patch: Record<string, unknown>) => {
            saleUpdates.push(patch);
            return {
              eq: jest.fn(() => ({
                is: jest.fn(async () => ({ error: options.saleVoidError ?? null })),
              })),
            };
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  return { supabase, orderUpdates, orderUpdateFilters, saleUpdates };
}

describe('admin order status transition mutation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeriveAndSyncArtworkStatus.mockResolvedValue(undefined);
    mockReleaseReservedArtworksIfUnowned.mockResolvedValue({
      releasedArtworkIds: [],
      skippedArtworkIds: [],
    });
  });

  it('updates preparing to shipped with tracking info and optimistic status locking', async () => {
    const { updateOrderStatusMutation } = await import('@/lib/orders/status-transition');
    const { supabase, orderUpdates, orderUpdateFilters } = buildStatusTransitionSupabaseMock({
      order: {
        id: 'ord-1',
        order_no: 'SAF-001',
        status: 'preparing',
        buyer_email: 'buyer@example.com',
        buyer_name: '홍길동',
        buyer_phone: '010-0000-0000',
        artwork_id: 'art-1',
        metadata: { locale: 'ko' },
        order_items: [],
      },
    });

    const result = await updateOrderStatusMutation(supabase as never, {
      orderId: 'ord-1',
      newStatus: 'shipped',
      trackingInfo: { carrier: 'CJ', trackingNumber: '1234' },
      now: '2026-06-30T05:00:00.000Z',
    });

    expect(orderUpdates[0]).toEqual({
      status: 'shipped',
      updated_at: '2026-06-30T05:00:00.000Z',
      shipping_carrier: 'CJ',
      tracking_number: '1234',
    });
    expect(orderUpdateFilters).toEqual([
      { column: 'id', value: 'ord-1' },
      { column: 'status', value: 'preparing' },
    ]);
    expect(result).toEqual({
      order: expect.objectContaining({ order_no: 'SAF-001', status: 'preparing' }),
      fromStatus: 'preparing',
      toStatus: 'shipped',
      artworkIds: [],
      warnings: [],
    });
  });

  it('rejects disallowed transitions before issuing an update', async () => {
    const { updateOrderStatusMutation } = await import('@/lib/orders/status-transition');
    const { supabase, orderUpdates } = buildStatusTransitionSupabaseMock({
      order: {
        id: 'ord-1',
        order_no: 'SAF-001',
        status: 'paid',
        buyer_email: 'buyer@example.com',
      },
    });

    await expect(
      updateOrderStatusMutation(supabase as never, {
        orderId: 'ord-1',
        newStatus: 'shipped',
        now: '2026-06-30T05:00:00.000Z',
      })
    ).rejects.toThrow('paid → shipped 전환은 허용되지 않습니다.');
    expect(orderUpdates).toHaveLength(0);
  });

  it('fails when optimistic status update touches no rows', async () => {
    const { updateOrderStatusMutation } = await import('@/lib/orders/status-transition');
    const { supabase } = buildStatusTransitionSupabaseMock({
      order: {
        id: 'ord-1',
        order_no: 'SAF-001',
        status: 'shipped',
        buyer_email: 'buyer@example.com',
      },
      updatedRows: [],
    });

    await expect(
      updateOrderStatusMutation(supabase as never, {
        orderId: 'ord-1',
        newStatus: 'delivered',
        now: '2026-06-30T05:00:00.000Z',
      })
    ).rejects.toThrow('주문 상태가 변경되었습니다. 새로고침한 뒤 다시 시도해 주세요.');
  });

  it('releases reserved artworks when awaiting_deposit is cancelled', async () => {
    const { updateOrderStatusMutation } = await import('@/lib/orders/status-transition');
    const order = {
      id: 'ord-1',
      order_no: 'SAF-001',
      status: 'awaiting_deposit',
      buyer_email: 'buyer@example.com',
      buyer_name: '홍길동',
      buyer_phone: '010-0000-0000',
      artwork_id: null,
      metadata: { locale: 'ko' },
      order_items: [
        { artwork_id: 'art-1', quantity: 1, unit_price: 500000 },
        { artwork_id: 'art-2', quantity: 1, unit_price: 300000 },
      ],
    };
    const { supabase, orderUpdates } = buildStatusTransitionSupabaseMock({ order });
    mockReleaseReservedArtworksIfUnowned.mockResolvedValue({
      releasedArtworkIds: ['art-1'],
      skippedArtworkIds: ['art-2'],
    });

    const result = await updateOrderStatusMutation(supabase as never, {
      orderId: 'ord-1',
      newStatus: 'cancelled',
      now: '2026-06-30T05:00:00.000Z',
    });

    expect(orderUpdates[0]).toEqual({
      status: 'cancelled',
      updated_at: '2026-06-30T05:00:00.000Z',
      cancelled_at: '2026-06-30T05:00:00.000Z',
    });
    expect(mockReleaseReservedArtworksIfUnowned).toHaveBeenCalledWith(
      supabase,
      ['art-1', 'art-2'],
      '2026-06-30T05:00:00.000Z'
    );
    expect(mockDeriveAndSyncArtworkStatus).not.toHaveBeenCalled();
    expect(result.artworkIds).toEqual(['art-1', 'art-2']);
    expect(result.warnings).toEqual([]);
  });
});
