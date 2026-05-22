import { cache } from 'react';
import { getEmergingArtworksFromDB } from '@/lib/supabase-data';
import { shuffleArray } from '@/lib/utils';
import type { Artwork } from '@/types';

/**
 * 매뉴얼 9.2 컬렉션 3 — 신진 작가 발견.
 *
 * DB에서 career_tier='신진' + status='available' 필터 후 경량 컬럼만 가져옴.
 * 이전 getSupabaseArtworks() 365행 전체 fetch → 신진 작가 작품만으로 대폭 축소.
 */
export const getEmergingArtworks = cache(async (limit = 6): Promise<Artwork[]> => {
  const all = await getEmergingArtworksFromDB();

  // 작가 단위 dedupe — 매뉴얼 9.2 "작가별 1~2점만, 다양성".
  const seenArtists = new Set<string>();
  const dedupedByArtist: Artwork[] = [];
  for (const artwork of shuffleArray(all)) {
    if (seenArtists.has(artwork.artist)) continue;
    seenArtists.add(artwork.artist);
    dedupedByArtist.push(artwork);
  }

  return dedupedByArtist.slice(0, limit);
});
