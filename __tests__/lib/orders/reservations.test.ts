import {
  releaseReservedArtworksIfUnowned,
  reserveUniqueArtworksOrRollback,
} from '@/lib/orders/reservations';

type QueryResult<T> = { data: T; error: unknown };

function createThenable<T>(result: QueryResult<T>) {
  const query = {
    select: jest.fn(() => query),
    update: jest.fn(() => query),
    eq: jest.fn(() => query),
    in: jest.fn(() => query),
    maybeSingle: jest.fn(() => Promise.resolve(result)),
    then: (resolve: (value: QueryResult<T>) => unknown) => resolve(result),
  };
  return query;
}

describe('reserveUniqueArtworksOrRollback', () => {
  it('reserves unique artworks with an available-status guard', async () => {
    const editionQuery = createThenable({ data: { edition_type: 'unique' }, error: null });
    const reserveQuery = createThenable({ data: [{ id: 'art-1' }], error: null });
    const supabase = {
      from: jest.fn().mockReturnValueOnce(editionQuery).mockReturnValueOnce(reserveQuery),
    };

    const result = await reserveUniqueArtworksOrRollback(
      supabase,
      ['art-1'],
      '2026-06-19T00:00:00.000Z'
    );

    expect(result).toEqual({ ok: true, reservedArtworkIds: ['art-1'] });
    expect(reserveQuery.update).toHaveBeenCalledWith({ status: 'reserved' });
    expect(reserveQuery.eq).toHaveBeenCalledWith('id', 'art-1');
    expect(reserveQuery.eq).toHaveBeenCalledWith('status', 'available');
    expect(reserveQuery.select).toHaveBeenCalledWith('id');
  });

  it('does not reserve limited or open edition artworks', async () => {
    const limitedQuery = createThenable({ data: { edition_type: 'limited' }, error: null });
    const openQuery = createThenable({ data: { edition_type: 'open' }, error: null });
    const supabase = {
      from: jest.fn().mockReturnValueOnce(limitedQuery).mockReturnValueOnce(openQuery),
    };

    const result = await reserveUniqueArtworksOrRollback(
      supabase,
      ['art-limited', 'art-open'],
      '2026-06-19T00:00:00.000Z'
    );

    expect(result).toEqual({ ok: true, reservedArtworkIds: [] });
    expect(supabase.from).toHaveBeenCalledTimes(2);
  });

  it('rolls back earlier unique reservations when a later unique reservation loses the race', async () => {
    const editionOne = createThenable({ data: { edition_type: 'unique' }, error: null });
    const reserveOne = createThenable({ data: [{ id: 'art-1' }], error: null });
    const editionTwo = createThenable({ data: { edition_type: 'unique' }, error: null });
    const reserveTwo = createThenable({ data: [], error: null });
    const rollbackOne = createThenable({ data: [{ id: 'art-1' }], error: null });
    const supabase = {
      from: jest
        .fn()
        .mockReturnValueOnce(editionOne)
        .mockReturnValueOnce(reserveOne)
        .mockReturnValueOnce(editionTwo)
        .mockReturnValueOnce(reserveTwo)
        .mockReturnValueOnce(rollbackOne),
    };

    const result = await reserveUniqueArtworksOrRollback(
      supabase,
      ['art-1', 'art-2'],
      '2026-06-19T00:00:00.000Z'
    );

    expect(result.ok).toBe(false);
    expect(result).toMatchObject({ failedArtworkId: 'art-2', reservedArtworkIds: ['art-1'] });
    expect(rollbackOne.update).toHaveBeenCalledWith({
      status: 'available',
      updated_at: '2026-06-19T00:00:00.000Z',
    });
    expect(rollbackOne.eq).toHaveBeenCalledWith('id', 'art-1');
    expect(rollbackOne.eq).toHaveBeenCalledWith('status', 'reserved');
  });
});

describe('releaseReservedArtworksIfUnowned', () => {
  it('does not release a reserved artwork while another active order references it', async () => {
    const orderItemsActiveQuery = createThenable({ count: 1, error: null });
    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'order_items') return orderItemsActiveQuery;
        throw new Error(`unexpected table ${table}`);
      }),
    };

    const result = await releaseReservedArtworksIfUnowned(
      supabase,
      ['art-1'],
      '2026-06-19T00:00:00.000Z'
    );

    expect(result).toEqual({ releasedArtworkIds: [], skippedArtworkIds: ['art-1'] });
    expect(supabase.from).not.toHaveBeenCalledWith('artworks');
  });

  it('releases a reserved artwork when no active order owns it', async () => {
    const orderItemsQuery = createThenable({ count: 0, error: null });
    const legacyOrdersQuery = createThenable({ count: 0, error: null });
    const releaseQuery = createThenable({ data: [{ id: 'art-1' }], error: null });
    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'order_items') return orderItemsQuery;
        if (table === 'orders') return legacyOrdersQuery;
        if (table === 'artworks') return releaseQuery;
        throw new Error(`unexpected table ${table}`);
      }),
    };

    const result = await releaseReservedArtworksIfUnowned(
      supabase,
      ['art-1'],
      '2026-06-19T00:00:00.000Z'
    );

    expect(result).toEqual({ releasedArtworkIds: ['art-1'], skippedArtworkIds: [] });
    expect(releaseQuery.update).toHaveBeenCalledWith({
      status: 'available',
      updated_at: '2026-06-19T00:00:00.000Z',
    });
    expect(releaseQuery.eq).toHaveBeenCalledWith('id', 'art-1');
    expect(releaseQuery.eq).toHaveBeenCalledWith('status', 'reserved');
    expect(releaseQuery.select).toHaveBeenCalledWith('id');
  });
});
