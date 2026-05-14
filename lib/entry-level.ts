import { cache } from 'react';
import { parsePrice } from '@/lib/parsePrice';
import { getSupabaseArtworks } from '@/lib/supabase-data';
import { shuffleArray } from '@/lib/utils';
import type { Artwork } from '@/types';

/**
 * 매뉴얼 9.2 컬렉션 4 — 30만원 이하 첫 그림.
 *
 * 페르소나 A·1단 첫 구매자의 진입 동선. 가격대 ₩100,000~₩300,000.
 * 매체 다양성(판화·아트프린트·드로잉·작은 회화) 자동 — 단일 매체 쏠림 회피를 위해 작가 단위 dedupe.
 *
 * 데이터 소스: getSupabaseArtworks() (전체 풀에서 가격 필터). 365점 전체 fetch는 이미 다른 페이지에서
 * 캐시되어 있어 추가 비용 없음. parsePrice로 텍스트 가격("₩200,000") 정수화 후 filter.
 *
 * sold/reserved 작품은 자동 제외 (판매 동선 의미 없음).
 */
const MIN_PRICE = 100_000;
const MAX_PRICE = 300_000;

const getEntryLevelArtworksUncached = async (limit: number): Promise<Artwork[]> => {
  const all = await getSupabaseArtworks();

  const candidates = all.filter((artwork) => {
    if (artwork.sold || artwork.reserved) return false;
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
};

export const getEntryLevelArtworks = cache(
  async (limit = 8): Promise<Artwork[]> => getEntryLevelArtworksUncached(limit)
);
