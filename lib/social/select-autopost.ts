// 자동게시 작품 선정 — 작가별로 골고루 순환(최근 안 올라간 작가 우선) + 자료(작품 수) 많은 작가 가중.
// 순수 함수(테스트 용이). 입력 candidates는 신선도(미게시→신착) 순으로 정렬돼 있다고 가정.

export interface SelectableCandidate {
  id: string;
  artistName: string | null;
  image: string | null;
  postCount: number; // 이 작품의 게시 횟수
  lastPublishedAt: string | null; // 이 작품의 마지막 게시 시각(없으면 null)
}

export interface SelectAutopostOptions {
  count: number;
}

interface ArtistBucket<T> {
  /** 작가의 어느 작품이든 마지막으로 게시된 시각(없으면 null=한 번도 안 올림). */
  lastFeatured: string | null;
  /** 미게시 + 이미지 있는 작품들(입력 순서=신선도 유지). */
  unposted: T[];
  totalCount: number; // 작가의 available 작품 총수(자료량 가늠)
}

/**
 * 작가 단위로 골고루 순환:
 * 1) 한 번도 안 올라간 작가 먼저 → 가장 오래전 올라간 작가 순(=골고루 rotation)
 * 2) 동률이면 보유 작품(자료) 많은 작가 우선
 * 한 번 실행에 서로 다른 작가에서 1점씩 count개.
 */
export function selectAutopostArtworks<T extends SelectableCandidate>(
  candidates: T[],
  { count }: SelectAutopostOptions
): T[] {
  if (count <= 0) return [];

  const byArtist = new Map<string, ArtistBucket<T>>();
  for (const c of candidates) {
    // 작가 미상은 작품별로 분리(서로 다른 '작가'로 취급).
    const key = c.artistName ?? `__solo_${c.id}`;
    let b = byArtist.get(key);
    if (!b) {
      b = { lastFeatured: null, unposted: [], totalCount: 0 };
      byArtist.set(key, b);
    }
    b.totalCount += 1;
    if (c.lastPublishedAt && (!b.lastFeatured || c.lastPublishedAt > b.lastFeatured)) {
      b.lastFeatured = c.lastPublishedAt;
    }
    if (c.postCount === 0 && c.image) b.unposted.push(c);
  }

  const artists = [...byArtist.values()].filter((b) => b.unposted.length > 0);
  artists.sort((a, b) => {
    // 한 번도 안 올라간 작가(null) 최우선
    if ((a.lastFeatured === null) !== (b.lastFeatured === null)) {
      return a.lastFeatured === null ? -1 : 1;
    }
    // 둘 다 게시 이력 있으면 가장 오래전(작은 값) 먼저 = 순환
    if (a.lastFeatured && b.lastFeatured && a.lastFeatured !== b.lastFeatured) {
      return a.lastFeatured.localeCompare(b.lastFeatured);
    }
    // 동률(둘 다 null 등)이면 자료 많은 작가 우선
    return b.totalCount - a.totalCount;
  });

  const picked: T[] = [];
  for (const b of artists) {
    picked.push(b.unposted[0]);
    if (picked.length >= count) break;
  }
  return picked;
}
