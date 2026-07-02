const mockRequireArtistActive = jest.fn();
const mockCreateSupabaseServerClient = jest.fn();

jest.mock('@/lib/auth/guards', () => ({
  requireArtistActive: (...a: unknown[]) => mockRequireArtistActive(...a),
}));
jest.mock('@/lib/auth/server', () => ({
  createSupabaseServerClient: (...a: unknown[]) => mockCreateSupabaseServerClient(...a),
  createSupabaseAdminClient: () => ({ from: jest.fn() }),
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn(), revalidateTag: jest.fn() }));
jest.mock('next/navigation', () => ({ redirect: jest.fn() }));
jest.mock('@/app/actions/activity-log-writer', () => ({
  logArtistAction: jest.fn(async () => {}),
}));

// A valid Supabase storage URL owned by artist-1
const ARTIST_1_IMAGE_URL =
  'https://khtunrybrzntlnowlahb.supabase.co/storage/v1/object/public/artworks/artist-1/test-image__card.webp';

function fd(entries: Record<string, string>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

describe('createArtwork exhibition 태그', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireArtistActive.mockResolvedValue({ id: 'user-1' });
  });

  it('이미 3점 출품한 작가가 태그된 새 작품을 만들면 거부한다', async () => {
    const artistQuery = {
      select: jest.fn(() => artistQuery),
      eq: jest.fn(() => artistQuery),
      single: jest.fn(() =>
        Promise.resolve({ data: { id: 'artist-1', name_ko: '김작가' }, error: null })
      ),
    };

    // count 쿼리: .select(...).eq('artist_id', ...).eq('exhibition', ...) → { count: 3 }
    // mockImplementation으로 첫 번째 .eq()는 체인, 두 번째는 Promise 반환
    const countEqMock = jest.fn();
    let countEqCalls = 0;
    countEqMock.mockImplementation(() => {
      countEqCalls += 1;
      if (countEqCalls < 2) return countQuery; // first .eq() → chain
      return Promise.resolve({ count: 3, error: null }); // second .eq() → resolves
    });
    const countQuery = {
      select: jest.fn(() => countQuery),
      eq: countEqMock,
    };

    const supabase = {
      from: jest.fn((table: string) => {
        if (table === 'artists') return artistQuery;
        if (table === 'artworks') return countQuery;
        return artistQuery;
      }),
    };
    mockCreateSupabaseServerClient.mockResolvedValue(supabase);

    const { createArtwork } = await import('@/app/actions/artwork');
    const res = await createArtwork(
      { message: '', error: false },
      fd({
        title: '새 작품',
        price: '1000000',
        images: JSON.stringify([ARTIST_1_IMAGE_URL]),
        new_uploads: JSON.stringify([]),
        exhibition: 'oh-yoon-terracotta',
      })
    );
    expect(res.error).toBe(true);
    expect(res.message).toContain('3점');
  });
});
