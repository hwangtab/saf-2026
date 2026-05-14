import { cache } from 'react';
import { getSupabaseArtworks } from '@/lib/supabase-data';
import { shuffleArray } from '@/lib/utils';
import type { Artwork } from '@/types';

/**
 * 매뉴얼 9.2 컬렉션 3 — 신진 작가 발견.
 *
 * 페르소나 B의 "내가 먼저 발견했다" 자긍심 자극. 매스미디어 노출 적은 신진·중견 작가
 * 작품을 작가별 1점씩 dedupe하여 다양성 확보. 분기 갱신 권장(매뉴얼 9.4) — 지금은
 * shuffle로 매 revalidate 주기마다 다른 조합 노출.
 *
 * 정의: MASTER_ARTIST_NAMES(거장 6명) 제외. Sprint 4a PR(#38)에서 lib/master-artists.ts가
 * main에 들어오면 그쪽을 import해서 중복 정의 제거. 지금은 conflict 회피 목적의 local 정의.
 */

// 매뉴얼 4.8.2 + 9.2 컬렉션 2 — 거장 라인업과 정확히 일치해야 의미 분리됨.
// Sprint 4a PR #38 merge 후 `import { MASTER_ARTISTS } from '@/lib/master-artists'`로 통합 예정.
const MASTER_ARTIST_NAMES = new Set(['오윤', '박생광', '신학철', '민정기', '이철수', '박불똥']);

const getEmergingArtworksUncached = async (limit: number): Promise<Artwork[]> => {
  const all = await getSupabaseArtworks();

  const candidates = all.filter((artwork) => {
    if (artwork.sold || artwork.reserved) return false;
    if (MASTER_ARTIST_NAMES.has(artwork.artist)) return false;
    return true;
  });

  // 작가 단위 dedupe — 매뉴얼 9.2 "작가별 1~2점만, 다양성".
  const seenArtists = new Set<string>();
  const dedupedByArtist: Artwork[] = [];
  for (const artwork of shuffleArray(candidates)) {
    if (seenArtists.has(artwork.artist)) continue;
    seenArtists.add(artwork.artist);
    dedupedByArtist.push(artwork);
  }

  return dedupedByArtist.slice(0, limit);
};

export const getEmergingArtworks = cache(
  async (limit = 6): Promise<Artwork[]> => getEmergingArtworksUncached(limit)
);
