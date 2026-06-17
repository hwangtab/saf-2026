import { hasActiveOrdersForArtworks } from '@/lib/orders/active-order-guard';

type QueryResult = { count: number | null; error: unknown };

function createCountQuery(result: QueryResult) {
  const query = {
    select: jest.fn(() => query),
    in: jest.fn(() => query),
    then: (resolve: (value: QueryResult) => unknown) => resolve(result),
  };
  return query;
}

describe('hasActiveOrdersForArtworks', () => {
  it('detects active orders through order_items before checking legacy orders.artwork_id', async () => {
    const orderItemsQuery = createCountQuery({ count: 1, error: null });
    const ordersQuery = createCountQuery({ count: 0, error: null });
    const supabase = {
      from: jest.fn((table: string) => (table === 'order_items' ? orderItemsQuery : ordersQuery)),
    };

    await expect(hasActiveOrdersForArtworks(supabase, ['art-1'])).resolves.toBe(true);

    expect(supabase.from).toHaveBeenCalledWith('order_items');
    expect(supabase.from).not.toHaveBeenCalledWith('orders');
    expect(orderItemsQuery.select).toHaveBeenCalledWith('order_id, orders!inner(status)', {
      count: 'exact',
      head: true,
    });
    expect(orderItemsQuery.in).toHaveBeenCalledWith('artwork_id', ['art-1']);
    expect(orderItemsQuery.in).toHaveBeenCalledWith('orders.status', [
      'paid',
      'preparing',
      'awaiting_deposit',
      'shipped',
    ]);
  });

  it('falls back to legacy orders.artwork_id when order_items has no active rows', async () => {
    const orderItemsQuery = createCountQuery({ count: 0, error: null });
    const ordersQuery = createCountQuery({ count: 1, error: null });
    const supabase = {
      from: jest.fn((table: string) => (table === 'order_items' ? orderItemsQuery : ordersQuery)),
    };

    await expect(hasActiveOrdersForArtworks(supabase, ['art-1', 'art-2'])).resolves.toBe(true);

    expect(supabase.from).toHaveBeenCalledWith('orders');
    expect(ordersQuery.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(ordersQuery.in).toHaveBeenCalledWith('artwork_id', ['art-1', 'art-2']);
    expect(ordersQuery.in).toHaveBeenCalledWith('status', [
      'paid',
      'preparing',
      'awaiting_deposit',
      'shipped',
    ]);
  });
});
