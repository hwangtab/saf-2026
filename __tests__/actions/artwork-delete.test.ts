const mockRequireArtistActive = jest.fn();
const mockCreateSupabaseServerClient = jest.fn();
const mockCreateSupabaseAdminClient = jest.fn();
const mockHasActiveOrdersForArtworks = jest.fn();

jest.mock('@/lib/auth/guards', () => ({
  requireArtistActive: (...args: unknown[]) => mockRequireArtistActive(...args),
}));

jest.mock('@/lib/auth/server', () => ({
  createSupabaseServerClient: (...args: unknown[]) => mockCreateSupabaseServerClient(...args),
  createSupabaseAdminClient: (...args: unknown[]) => mockCreateSupabaseAdminClient(...args),
}));

jest.mock('@/lib/orders/active-order-guard', () => ({
  hasActiveOrdersForArtworks: (...args: unknown[]) => mockHasActiveOrdersForArtworks(...args),
}));

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));
jest.mock('next/navigation', () => ({ redirect: jest.fn() }));
jest.mock('@/app/actions/activity-log-writer', () => ({
  logArtistAction: jest.fn(async () => {}),
}));

function createSingleQuery(data: unknown) {
  const query = {
    select: jest.fn(() => query),
    eq: jest.fn(() => query),
    single: jest.fn(() => Promise.resolve({ data, error: null })),
  };
  return query;
}

describe('artist artwork deletion active-order guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireArtistActive.mockResolvedValue({ id: 'user-1' });
    mockHasActiveOrdersForArtworks.mockResolvedValue(true);
  });

  it('blocks deletion after ownership is confirmed when active order_items orders exist', async () => {
    const adminSupabase = { from: jest.fn() };
    const artistQuery = createSingleQuery({ id: 'artist-1', name_ko: '김작가' });
    const artworkQuery = createSingleQuery({
      id: 'art-1',
      title: '봄의 정원',
      artist_id: 'artist-1',
      images: [],
    });
    const deleteMock = jest.fn();
    const serverSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'artists') return artistQuery;
        if (table === 'artworks') {
          return {
            select: artworkQuery.select,
            delete: deleteMock,
          };
        }
        return createSingleQuery(null);
      }),
    };
    mockCreateSupabaseServerClient.mockResolvedValue(serverSupabase);
    mockCreateSupabaseAdminClient.mockReturnValue(adminSupabase);

    const { deleteArtwork } = await import('@/app/actions/artwork');
    const result = await deleteArtwork('art-1');

    expect(result).toEqual({
      message: '진행 중인 주문이 있어 삭제할 수 없습니다.',
      error: true,
    });
    expect(artworkQuery.eq).toHaveBeenCalledWith('artist_id', 'artist-1');
    expect(mockHasActiveOrdersForArtworks).toHaveBeenCalledWith(adminSupabase, ['art-1']);
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
