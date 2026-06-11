import { selectAutopostArtworks, type SelectableCandidate } from '@/lib/social/select-autopost';

const c = (o: Partial<SelectableCandidate> & { id: string }): SelectableCandidate => ({
  artistName: o.artistName ?? `artist-${o.id}`,
  careerTier: o.careerTier ?? '신진',
  image: o.image === undefined ? 'https://x/i.jpg' : o.image,
  postCount: o.postCount ?? 0,
  id: o.id,
});

describe('selectAutopostArtworks', () => {
  it('미게시 + 이미지 있는 것만 후보', () => {
    const list = [
      c({ id: 'a', postCount: 1 }), // 이미 게시 → 제외
      c({ id: 'b', image: null }), // 이미지 없음 → 제외
      c({ id: 'd' }),
    ];
    const out = selectAutopostArtworks(list, { count: 5, showingArtistNames: [] });
    expect(out.map((x) => x.id)).toEqual(['d']);
  });

  it('거장·특별전 작가를 우선 선정', () => {
    const list = [
      c({ id: 'rookie', careerTier: '신진', artistName: '신진가' }),
      c({ id: 'master', careerTier: '거장', artistName: '거장가' }),
      c({ id: 'special', careerTier: '신진', artistName: '오윤' }),
    ];
    const out = selectAutopostArtworks(list, { count: 2, showingArtistNames: ['오윤'] });
    expect(out.map((x) => x.id)).toEqual(['master', 'special']); // 둘 다 +2, 입력순
  });

  it('같은 작가 연속 회피(작가 다양성)', () => {
    const list = [
      c({ id: 'a1', artistName: '김작가' }),
      c({ id: 'a2', artistName: '김작가' }),
      c({ id: 'b1', artistName: '이작가' }),
    ];
    const out = selectAutopostArtworks(list, { count: 2, showingArtistNames: [] });
    expect(out.map((x) => x.artistName)).toEqual(['김작가', '이작가']);
  });

  it('작가 종류가 부족하면 중복 허용해 count 채움', () => {
    const list = [c({ id: 'a1', artistName: '김작가' }), c({ id: 'a2', artistName: '김작가' })];
    const out = selectAutopostArtworks(list, { count: 2, showingArtistNames: [] });
    expect(out.map((x) => x.id)).toEqual(['a1', 'a2']);
  });

  it('count 0이면 빈 배열', () => {
    expect(selectAutopostArtworks([c({ id: 'a' })], { count: 0, showingArtistNames: [] })).toEqual([]);
  });
});
