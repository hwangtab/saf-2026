import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { hasSupabaseConfig, supabase } from './supabase';
import { ARTWORK_COUNT, ARTIST_COUNT } from './site-stats';

export interface LiveStats {
  artistCount: number;
  artworkCount: number;
  availableCount: number;
}

// is_hidden=false 필터 — /artworks 페이지 가시성 정의와 동일.
// artworks 테이블에서 artist_id·status만 select해 payload를 최소화 (정수 3개만 필요).
// Vercel Data Cache 2MB 한도와 무관한 소형 페이로드.
const fetchLiveStats = async (): Promise<LiveStats> => {
  if (!hasSupabaseConfig || !supabase) {
    return { artistCount: ARTIST_COUNT, artworkCount: ARTWORK_COUNT, availableCount: 0 };
  }
  const { data, error } = await supabase
    .from('artworks')
    .select('artist_id, status')
    .eq('is_hidden', false);

  if (error || !data) {
    return { artistCount: ARTIST_COUNT, artworkCount: ARTWORK_COUNT, availableCount: 0 };
  }

  return {
    artworkCount: data.length,
    artistCount: new Set(data.map((a) => a.artist_id).filter(Boolean)).size,
    // status 'sold' → 판매 완료. /artworks body L121 `!a.sold`와 동일 의미.
    availableCount: data.filter((a) => a.status !== 'sold').length,
  };
};

// unstable_cache: Vercel Data Cache에 300s 보관 + 'artworks' 태그로 admin 작품 변경 시 자동 무효화.
// 기존 supabase-data.ts의 ARTWORK_DATA_REVALIDATE_SECONDS=300 컨벤션 일치.
const getLiveStatsCached = unstable_cache(fetchLiveStats, ['live-site-stats'], {
  revalidate: 300,
  tags: ['artworks'],
});

// React.cache: 동일 요청 내 중복 fetch 방지 (generateMetadata + page body 각각 호출해도 1회만 fetch).
export const getLiveStats = cache(getLiveStatsCached);
