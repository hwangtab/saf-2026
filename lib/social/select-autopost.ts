// 자동게시 작품 선정 — 거장·특별전 가중 + 미게시 우선 + 작가 중복 회피 (순수 함수, 테스트 용이).

export interface SelectableCandidate {
  id: string;
  artistName: string | null;
  careerTier: string | null;
  image: string | null;
  postCount: number;
}

export interface SelectAutopostOptions {
  count: number;
  /** 진행 중 특별전 작가 한글명 집합. */
  showingArtistNames: string[];
}

/**
 * 입력 candidates는 신선도(미게시→신착) 순으로 정렬돼 있다고 가정.
 * - 미게시(postCount===0) + 이미지 있는 것만 후보
 * - 거장(careerTier==='거장') +2, 진행 중 특별전 작가 +2 가중
 * - 같은 작가 연속 노출 회피(가능하면 서로 다른 작가). 부족하면 중복 허용해 count 채움.
 * 안정 정렬이라 동점이면 입력 순서(신선도) 유지.
 */
export function selectAutopostArtworks<T extends SelectableCandidate>(
  candidates: T[],
  { count, showingArtistNames }: SelectAutopostOptions
): T[] {
  if (count <= 0) return [];
  const showing = new Set(showingArtistNames);

  const pool = candidates.filter((c) => c.postCount === 0 && Boolean(c.image));
  const score = (c: T) =>
    (c.careerTier === '거장' ? 2 : 0) + (c.artistName && showing.has(c.artistName) ? 2 : 0);

  const ranked = pool
    .map((c, i) => ({ c, i, s: score(c) }))
    .sort((a, b) => b.s - a.s || a.i - b.i) // 점수 내림차순, 동점은 원래(신선도) 순
    .map((x) => x.c);

  const picked: T[] = [];
  const usedArtists = new Set<string>();
  for (const c of ranked) {
    const key = c.artistName ?? c.id;
    if (usedArtists.has(key)) continue;
    picked.push(c);
    usedArtists.add(key);
    if (picked.length >= count) return picked;
  }
  // 작가 종류가 부족하면 중복 허용해 채움
  for (const c of ranked) {
    if (picked.includes(c)) continue;
    picked.push(c);
    if (picked.length >= count) break;
  }
  return picked;
}
