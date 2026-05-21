import { cache } from 'react';
import { getSupabaseArtworks } from '@/lib/supabase-data';
import { shuffleArray } from '@/lib/utils';
import type { Artwork } from '@/types';

/**
 * 매뉴얼 9.2 컬렉션 3 — 신진 작가 발견.
 *
 * 페르소나 B의 "내가 먼저 발견했다" 자긍심 자극. career_tier='신진'인 작가의 작품만
 * 긍정 큐레이션으로 노출. 거장·중견·미지정 작가는 자동 배제. 작가별 1점 dedupe로
 * 다양성 확보. 분기 갱신 권장(매뉴얼 9.4) — 신진 지정은 admin /admin/artists/{id}/edit에서.
 *
 * 거장 명단은 artists.career_tier='거장' DB 컬럼이 단일 출처 (Phase 25, 매뉴얼 9.2).
 * 코드에 이름 하드코딩 없음.
 */

const getEmergingArtworksUncached = async (limit: number): Promise<Artwork[]> => {
  const all = await getSupabaseArtworks();

  const candidates = all.filter((artwork) => {
    if (artwork.sold || artwork.reserved) return false;
    return artwork.artistTier === '신진'; // 긍정 큐레이션 — 거장/중견/null 자동 배제
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
