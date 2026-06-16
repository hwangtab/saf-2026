import { selectAutopostArtworks, type SelectableCandidate } from '@/lib/social/select-autopost';

const c = (o: Partial<SelectableCandidate> & { id: string }): SelectableCandidate => ({
  artistName: o.artistName ?? `art-${o.id}`,
  image: o.image === undefined ? 'https://x/i.jpg' : o.image,
  postCount: o.postCount ?? 0,
  lastPublishedAt: o.lastPublishedAt ?? null,
  id: o.id,
});

describe('selectAutopostArtworks', () => {
  it('미게시 + 이미지 있는 것만 후보', () => {
    const out = selectAutopostArtworks(
      [c({ id: 'posted', postCount: 1, lastPublishedAt: '2026-06-10' }), c({ id: 'noimg', image: null }), c({ id: 'ok' })],
      { count: 5 }
    );
    expect(out.map((x) => x.id)).toEqual(['ok']);
  });

  it('한 번도 안 올라간 작가를 먼저 선정', () => {
    const list = [
      c({ id: 'A-posted', artistName: 'A', postCount: 1, lastPublishedAt: '2026-06-10' }),
      c({ id: 'A-new', artistName: 'A', postCount: 0 }),
      c({ id: 'B-new', artistName: 'B', postCount: 0 }), // 작가 B는 게시 이력 없음
    ];
    const out = selectAutopostArtworks(list, { count: 1 });
    expect(out[0].artistName).toBe('B');
  });

  it('게시 이력 있는 작가끼리는 가장 오래전 올라간 작가 먼저(순환)', () => {
    const list = [
      c({ id: 'A-p', artistName: 'A', postCount: 1, lastPublishedAt: '2026-06-10' }),
      c({ id: 'A-n', artistName: 'A', postCount: 0 }),
      c({ id: 'B-p', artistName: 'B', postCount: 1, lastPublishedAt: '2026-06-05' }), // 더 오래전
      c({ id: 'B-n', artistName: 'B', postCount: 0 }),
    ];
    const out = selectAutopostArtworks(list, { count: 1 });
    expect(out[0].artistName).toBe('B');
  });

  it('동률(둘 다 미게시 작가)이면 보유 작품 많은 작가 우선', () => {
    const list = [
      c({ id: 'A1', artistName: 'A' }),
      c({ id: 'B1', artistName: 'B' }),
      c({ id: 'B2', artistName: 'B' }),
      c({ id: 'B3', artistName: 'B' }), // B가 자료 많음
    ];
    const out = selectAutopostArtworks(list, { count: 1 });
    expect(out[0].artistName).toBe('B');
  });

  it('한 번에 서로 다른 작가로 count개 선정', () => {
    const list = [
      c({ id: 'A1', artistName: 'A' }),
      c({ id: 'A2', artistName: 'A' }),
      c({ id: 'B1', artistName: 'B' }),
    ];
    const out = selectAutopostArtworks(list, { count: 2 });
    expect(out.map((x) => x.artistName)).toEqual(['A', 'B']); // A 자료 많아 먼저, 그다음 다른 작가 B
  });

  it('count 0이면 빈 배열', () => {
    expect(selectAutopostArtworks([c({ id: 'a' })], { count: 0 })).toEqual([]);
  });
});
