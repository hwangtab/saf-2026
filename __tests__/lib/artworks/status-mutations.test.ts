function buildBatchSupabaseMock(beforeRows: Array<Record<string, unknown>>) {
  const updates: Array<Record<string, unknown>> = [];
  const selectRows = [
    beforeRows,
    beforeRows.map((row) => ({
      ...row,
      ...updates.reduce((merged, patch) => ({ ...merged, ...patch }), {}),
    })),
  ];

  const supabase = {
    from: jest.fn((table: string) => {
      if (table !== 'artworks') throw new Error(`Unexpected table: ${table}`);

      return {
        select: jest.fn(() => ({
          in: jest.fn(async () => ({ data: selectRows.shift() ?? [], error: null })),
        })),
        update: jest.fn((patch: Record<string, unknown>) => {
          updates.push(patch);
          return { in: jest.fn(async () => ({ data: null, error: null })) };
        }),
      };
    }),
  };

  return { supabase, updates };
}

describe('batchUpdateArtworkStatusMutation', () => {
  it('marks admin sold updates as manual override and only fills missing sold_at', async () => {
    const { batchUpdateArtworkStatusMutation } = await import('@/lib/artworks/status-mutations');
    const { supabase, updates } = buildBatchSupabaseMock([
      {
        id: 'art-1',
        title: '칼노래',
        status: 'available',
        sold_at: null,
        manual_sold_override: false,
        updated_at: '2026-06-09T04:23:22.360Z',
      },
      {
        id: 'art-2',
        title: '춤2',
        status: 'sold',
        sold_at: '2026-06-01T00:00:00.000Z',
        manual_sold_override: false,
        updated_at: '2026-06-09T04:23:22.360Z',
      },
    ]);

    const result = await batchUpdateArtworkStatusMutation(supabase as never, {
      ids: ['art-1', 'art-2'],
      status: 'sold',
      now: '2026-06-30T00:00:00.000Z',
    });

    expect(result.beforeArtworks).toHaveLength(2);
    expect(result.afterArtworks).toHaveLength(2);
    expect(updates[0]).toMatchObject({
      status: 'sold',
      manual_sold_override: true,
      updated_at: '2026-06-30T00:00:00.000Z',
    });
    expect(updates[1]).toMatchObject({
      sold_at: '2026-06-30T00:00:00.000Z',
      updated_at: '2026-06-30T00:00:00.000Z',
    });
  });

  it('clears manual override and sold_at when setting artworks available', async () => {
    const { batchUpdateArtworkStatusMutation } = await import('@/lib/artworks/status-mutations');
    const { supabase, updates } = buildBatchSupabaseMock([
      {
        id: 'art-1',
        title: '칼노래',
        status: 'sold',
        sold_at: '2026-06-01T00:00:00.000Z',
        manual_sold_override: true,
        updated_at: '2026-06-09T04:23:22.360Z',
      },
    ]);

    await batchUpdateArtworkStatusMutation(supabase as never, {
      ids: ['art-1'],
      status: 'available',
      now: '2026-06-30T00:00:00.000Z',
    });

    expect(updates[0]).toMatchObject({
      status: 'available',
      sold_at: null,
      manual_sold_override: false,
      updated_at: '2026-06-30T00:00:00.000Z',
    });
  });
});
