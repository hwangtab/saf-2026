import { cache } from 'react';
import { parsePrice } from '@/lib/parsePrice';
import { getAvailableArtworksLight } from '@/lib/supabase-data';
import { shuffleArray } from '@/lib/utils';
import type { Artwork } from '@/types';

/**
 * 매뉴얼 9.2 컬렉션 4 — 30만원 이하 첫 그림.
 *
 * 페르소나 A·1단 첫 구매자의 진입 동선. 가격대 ₩100,000~₩300,000.
 * price 컬럼이 text("₩200,000")라 DB 숫자 필터 불가 — JS parsePrice로 범위 필터 유지.
 * getAvailableArtworksLight()는 status='available' + 경량 컬럼만 fetch + unstable_cache.
 */
const MIN_PRICE = 100_000;
const MAX_PRICE = 300_000;

export const getEntryLevelArtworks = cache(async (limit = 8): Promise<Artwork[]> => {
  const available = await getAvailableArtworksLight();

  const candidates = available.filter((artwork) => {
    const price = parsePrice(artwork.price);
    return price >= MIN_PRICE && price <= MAX_PRICE;
  });

  // 작가 단위 dedupe — 한 작가가 가격대를 점유하지 않도록 작가별 첫 항목만.
  const seenArtists = new Set<string>();
  const dedupedByArtist: Artwork[] = [];
  for (const artwork of shuffleArray(candidates)) {
    if (seenArtists.has(artwork.artist)) continue;
    seenArtists.add(artwork.artist);
    dedupedByArtist.push(artwork);
  }

  return dedupedByArtist.slice(0, limit);
});
