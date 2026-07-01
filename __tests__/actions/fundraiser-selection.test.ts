const mockRequireArtistActive = jest.fn();
const mockCreateSupabaseServerClient = jest.fn();

jest.mock('@/lib/auth/guards', () => ({
  requireArtistActive: (...a: unknown[]) => mockRequireArtistActive(...a),
}));
jest.mock('@/lib/auth/server', () => ({
  createSupabaseServerClient: (...a: unknown[]) => mockCreateSupabaseServerClient(...a),
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn(), revalidateTag: jest.fn() }));

type Row = {
  id: string;
  status: string | null;
  manual_sold_override: boolean;
  exhibition: string | null;
};

function buildSupabase(artworks: Row[], updateSpy: jest.Mock) {
  const artistQuery = {
    select: jest.fn(() => artistQuery),
    eq: jest.fn(() => artistQuery),
    single: jest.fn(() =>
      Promise.resolve({ data: { id: 'artist-1', name_ko: '김작가' }, error: null })
    ),
  };
  const listQuery = {
    select: jest.fn(() => listQuery),
    eq: jest.fn(() => Promise.resolve({ data: artworks, error: null })),
  };
  const updateChain = {
    update: updateSpy,
  };
  return {
    from: jest.fn((table: string) => {
      if (table === 'artists') return artistQuery;
      // 첫 artworks 접근 = 목록 조회, 이후 = update
      if (table === 'artworks') {
        return {
          select: listQuery.select,
          update: (payload: unknown) => {
            updateSpy(payload);
            const chain = {
              eq: jest.fn(() => chain),
              in: jest.fn(() => Promise.resolve({ error: null })),
            };
            return chain;
          },
        };
      }
      return artistQuery;
    }),
  };
}

describe('setFundraiserSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    mockRequireArtistActive.mockResolvedValue({ id: 'user-1' });
  });

  it('본인 소유가 아닌 작품이 선택되면 거부한다', async () => {
    const updateSpy = jest.fn();
    mockCreateSupabaseServerClient.mockResolvedValue(
      buildSupabase(
        [{ id: 'a1', status: 'available', manual_sold_override: false, exhibition: null }],
        updateSpy
      )
    );
    const { setFundraiserSelection } = await import('@/app/actions/fundraiser');
    const res = await setFundraiserSelection(['a1', 'not-mine']);
    expect(res.error).toBe(true);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('판매된 출품작을 선택에서 빼면 거부한다', async () => {
    const updateSpy = jest.fn();
    mockCreateSupabaseServerClient.mockResolvedValue(
      buildSupabase(
        [
          {
            id: 'sold1',
            status: 'sold',
            manual_sold_override: false,
            exhibition: 'oh-yoon-terracotta',
          },
        ],
        updateSpy
      )
    );
    const { setFundraiserSelection } = await import('@/app/actions/fundraiser');
    const res = await setFundraiserSelection([]); // sold1을 빼려 시도
    expect(res.error).toBe(true);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('4점 선택 시 한도 초과로 거부한다', async () => {
    const updateSpy = jest.fn();
    const rows: Row[] = ['a1', 'a2', 'a3', 'a4'].map((id) => ({
      id,
      status: 'available',
      manual_sold_override: false,
      exhibition: null,
    }));
    mockCreateSupabaseServerClient.mockResolvedValue(buildSupabase(rows, updateSpy));
    const { setFundraiserSelection } = await import('@/app/actions/fundraiser');
    const res = await setFundraiserSelection(['a1', 'a2', 'a3', 'a4']);
    expect(res.error).toBe(true);
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('유효한 선택은 태그를 적용한다', async () => {
    const updateSpy = jest.fn();
    const rows: Row[] = [
      { id: 'a1', status: 'available', manual_sold_override: false, exhibition: null },
      {
        id: 'a2',
        status: 'available',
        manual_sold_override: false,
        exhibition: 'oh-yoon-terracotta',
      },
    ];
    mockCreateSupabaseServerClient.mockResolvedValue(buildSupabase(rows, updateSpy));
    const { setFundraiserSelection } = await import('@/app/actions/fundraiser');
    const res = await setFundraiserSelection(['a1']); // a1 태그, a2 해제
    expect(res.error).toBe(false);
    // 태그 적용(slug) + 해제(null) 각각 1회
    expect(updateSpy).toHaveBeenCalledWith({ exhibition: 'oh-yoon-terracotta' });
    expect(updateSpy).toHaveBeenCalledWith({ exhibition: null });
  });
});
