const mockHasActiveOrdersForArtworks = jest.fn();

jest.mock('@/lib/orders/active-order-guard', () => ({
  hasActiveOrdersForArtworks: (...args: unknown[]) => mockHasActiveOrdersForArtworks(...args),
}));

function buildVisibilitySupabaseMock(beforeRows: Array<Record<string, unknown>>) {
  const updates: Array<Record<string, unknown>> = [];
  let selectCallCount = 0;

  const supabase = {
    from: jest.fn((table: string) => {
      if (table !== 'artworks') throw new Error(`Unexpected table: ${table}`);

      return {
        select: jest.fn(() => ({
          in: jest.fn(async () => {
            selectCallCount += 1;
            const mergedPatch = updates.reduce(
              (merged, patch) => ({ ...merged, ...patch }),
              {} as Record<string, unknown>
            );
            return {
              data:
                selectCallCount === 1
                  ? beforeRows
                  : beforeRows.map((row) => ({ ...row, ...mergedPatch })),
              error: null,
            };
          }),
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

function buildDeleteSupabaseMock(options: {
  rows: Array<Record<string, unknown>>;
  fetchError?: unknown;
  deleteError?: unknown;
}) {
  const deleteInMock = jest.fn(async () => ({ error: options.deleteError ?? null }));
  const supabase = {
    from: jest.fn((table: string) => {
      if (table !== 'artworks') throw new Error(`Unexpected table: ${table}`);

      return {
        select: jest.fn(() => ({
          in: jest.fn(async () => ({
            data: options.rows,
            error: options.fetchError ?? null,
          })),
        })),
        delete: jest.fn(() => ({ in: deleteInMock })),
      };
    }),
  };

  return { supabase, deleteInMock };
}

describe('artwork batch mutations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasActiveOrdersForArtworks.mockResolvedValue(false);
  });

  it('deletes a single artwork and returns its artist name for revalidation', async () => {
    const { deleteArtworkMutation } = await import('@/lib/artworks/batch-mutations');
    const deleteEqMock = jest.fn(async () => ({ error: null }));
    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'artworks') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(async () => ({
                  data: {
                    id: 'art-1',
                    title: '칼노래',
                    artist_id: 'artist-1',
                    updated_at: '2026-06-01T00:00:00.000Z',
                  },
                  error: null,
                })),
              })),
            })),
            delete: jest.fn(() => ({ eq: deleteEqMock })),
          };
        }

        if (table === 'artists') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(async () => ({ data: { name_ko: '홍길동' }, error: null })),
              })),
            })),
          };
        }

        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    const result = await deleteArtworkMutation(supabase as never, { id: 'art-1' });

    expect(mockHasActiveOrdersForArtworks).toHaveBeenCalledWith(supabase, ['art-1']);
    expect(deleteEqMock).toHaveBeenCalledWith('id', 'art-1');
    expect(result.artwork).toEqual(expect.objectContaining({ id: 'art-1', title: '칼노래' }));
    expect(result.artistName).toBe('홍길동');
  });

  it('toggles artwork visibility and returns audit snapshots', async () => {
    const { batchToggleArtworkHiddenMutation } = await import('@/lib/artworks/batch-mutations');
    const { supabase, updates } = buildVisibilitySupabaseMock([
      {
        id: 'art-1',
        title: '칼노래',
        is_hidden: false,
        updated_at: '2026-06-01T00:00:00.000Z',
      },
    ]);

    const result = await batchToggleArtworkHiddenMutation(supabase as never, {
      ids: ['art-1'],
      isHidden: true,
      now: '2026-06-30T05:00:00.000Z',
    });

    expect(updates[0]).toEqual({
      is_hidden: true,
      updated_at: '2026-06-30T05:00:00.000Z',
    });
    expect(result.beforeArtworks).toEqual([
      expect.objectContaining({ id: 'art-1', is_hidden: false }),
    ]);
    expect(result.afterArtworks).toEqual([
      expect.objectContaining({ id: 'art-1', is_hidden: true }),
    ]);
  });

  it('deletes only existing artwork ids and reports missing ids as partial failures', async () => {
    const { batchDeleteArtworksMutation } = await import('@/lib/artworks/batch-mutations');
    const { supabase, deleteInMock } = buildDeleteSupabaseMock({
      rows: [{ id: 'art-1', title: '칼노래' }],
    });

    const result = await batchDeleteArtworksMutation(supabase as never, {
      ids: ['art-1', 'missing-art'],
    });

    expect(mockHasActiveOrdersForArtworks).toHaveBeenCalledWith(supabase, ['art-1', 'missing-art']);
    expect(deleteInMock).toHaveBeenCalledWith('id', ['art-1']);
    expect(result.batchResult).toMatchObject({
      success: true,
      partial: true,
      count: 1,
      succeededIds: ['art-1'],
      failedIds: ['missing-art'],
    });
    expect(result.artworks).toEqual([expect.objectContaining({ id: 'art-1' })]);
  });

  it('blocks batch deletion when any target artwork has an active order', async () => {
    const { batchDeleteArtworksMutation } = await import('@/lib/artworks/batch-mutations');
    mockHasActiveOrdersForArtworks.mockResolvedValue(true);
    const { supabase, deleteInMock } = buildDeleteSupabaseMock({
      rows: [{ id: 'art-1', title: '칼노래' }],
    });

    await expect(
      batchDeleteArtworksMutation(supabase as never, { ids: ['art-1'] })
    ).rejects.toThrow('진행 중인 주문이 있는 작품이 포함되어 삭제할 수 없습니다.');
    expect(deleteInMock).not.toHaveBeenCalled();
  });

  it('translates batch FK delete failures into an operator-facing hide guidance', async () => {
    const { batchDeleteArtworksMutation } = await import('@/lib/artworks/batch-mutations');
    const { supabase } = buildDeleteSupabaseMock({
      rows: [{ id: 'art-1', title: '칼노래' }],
      deleteError: { code: '23503' },
    });

    await expect(
      batchDeleteArtworksMutation(supabase as never, { ids: ['art-1'] })
    ).rejects.toThrow(
      '선택한 작품 중 주문·판매 이력이 연결된 작품이 있어 삭제할 수 없습니다. 해당 작품은 "숨김" 처리해 주세요.'
    );
  });
});
