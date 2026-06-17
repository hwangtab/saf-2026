const mockRequireAdmin = jest.fn();
const mockRequireAdminClient = jest.fn();
const mockHasActiveOrdersForArtworks = jest.fn();
const mockRevalidatePath = jest.fn();

jest.mock('@/lib/auth/guards', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
  requireAdminClient: (...args: unknown[]) => mockRequireAdminClient(...args),
}));

jest.mock('@/lib/orders/active-order-guard', () => ({
  hasActiveOrdersForArtworks: (...args: unknown[]) => mockHasActiveOrdersForArtworks(...args),
}));

jest.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

jest.mock('@/app/actions/activity-log-writer', () => ({
  logAdminAction: jest.fn(async () => {}),
}));

function createArtworkQueryResult(data: unknown) {
  const query = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    in: jest.fn(() => Promise.resolve({ data, error: null })),
    single: jest.fn(() => Promise.resolve({ data, error: null })),
  };
  return query;
}

describe('admin artwork deletion active-order guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAdmin.mockResolvedValue({ id: 'admin-1' });
    mockHasActiveOrdersForArtworks.mockResolvedValue(true);
  });

  it('blocks single delete when the artwork has active order_items orders', async () => {
    const artworkQuery = createArtworkQueryResult({
      id: 'art-1',
      title: '봄의 정원',
      artist_id: 'artist-1',
    });
    const deleteMock = jest.fn();
    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'artworks') {
          return {
            select: artworkQuery.select,
            delete: deleteMock,
          };
        }
        return createArtworkQueryResult(null);
      }),
    };
    mockRequireAdminClient.mockResolvedValue(supabase);

    const { deleteAdminArtwork } = await import('@/app/actions/admin-artworks');

    await expect(deleteAdminArtwork('art-1')).rejects.toThrow(
      '진행 중인 주문이 있어 삭제할 수 없습니다.'
    );
    expect(mockHasActiveOrdersForArtworks).toHaveBeenCalledWith(supabase, ['art-1']);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('blocks batch delete when any artwork has active order_items orders', async () => {
    const artworkQuery = createArtworkQueryResult([{ id: 'art-1', title: '봄의 정원' }]);
    const deleteMock = jest.fn();
    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'artworks') {
          return {
            select: artworkQuery.select,
            delete: deleteMock,
          };
        }
        return createArtworkQueryResult([]);
      }),
    };
    mockRequireAdminClient.mockResolvedValue(supabase);

    const { batchDeleteArtworks } = await import('@/app/actions/admin-artworks');

    await expect(batchDeleteArtworks(['art-1', 'art-2'])).rejects.toThrow(
      '진행 중인 주문이 있는 작품이 포함되어 삭제할 수 없습니다.'
    );
    expect(mockHasActiveOrdersForArtworks).toHaveBeenCalledWith(supabase, ['art-1', 'art-2']);
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
