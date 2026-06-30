import { NextResponse } from 'next/server';
import {
  getSupabaseArtworks,
  getAvailableArtworksLight,
  pickRandomItems,
} from '@/lib/supabase-data';
import { matchesAnySearch } from '@/lib/search-utils';
import type { Artwork } from '@/types';

export const revalidate = 300;

export interface SearchResultArtwork {
  id: string;
  title: string;
  title_en?: string;
  artist: string;
  artist_en?: string;
  price: string;
  image: string;
  sold?: boolean;
  reserved?: boolean;
  category?: string;
}

export interface SearchResultArtist {
  name: string;
  name_en?: string;
  artworkCount: number;
  sampleImage: string;
}

export interface SearchResponse {
  artworks: SearchResultArtwork[];
  artists: SearchResultArtist[];
  totalArtworkMatches: number;
  query: string;
}

function normalizeSearchLimit(value: string | null) {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 8;
  return Math.min(parsed, 20);
}

function toSearchResultArtwork(a: Artwork): SearchResultArtwork {
  return {
    id: a.id,
    title: a.title,
    title_en: a.title_en,
    artist: a.artist,
    artist_en: a.artist_en,
    price: a.price,
    image: a.images?.[0] ?? '',
    sold: a.sold,
    reserved: a.reserved,
    category: a.category,
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q')?.trim() ?? '').slice(0, 200);
  const limit = normalizeSearchLimit(searchParams.get('limit'));
  const recommend = searchParams.get('recommend') === '1';

  if (!query) {
    // 검색어가 없을 때, recommend=1이면 빈 검색 화면을 채울 추천 작품(판매가능 무작위)을 반환
    if (recommend) {
      try {
        const available = await getAvailableArtworksLight();
        // 매 요청마다 균등 무작위로 섞어 '발견의 재미'를 준다 (원본 캐시 배열은 변경하지 않음).
        // sort(() => Math.random() - 0.5)는 V8에서 편향되므로 Fisher-Yates 헬퍼를 사용.
        const recommended = pickRandomItems(available, limit).map(toSearchResultArtwork);

        return NextResponse.json<SearchResponse>(
          { artworks: recommended, artists: [], totalArtworkMatches: 0, query: '' },
          { headers: { 'Cache-Control': 'no-store' } }
        );
      } catch (error) {
        console.error('Search recommendations error:', error);
        // 추천 실패는 치명적이지 않으므로 빈 결과로 폴백
        return NextResponse.json<SearchResponse>(
          { artworks: [], artists: [], totalArtworkMatches: 0, query: '' },
          { headers: { 'Cache-Control': 'no-store' } }
        );
      }
    }

    return NextResponse.json<SearchResponse>(
      { artworks: [], artists: [], totalArtworkMatches: 0, query: '' },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    const allArtworks = await getSupabaseArtworks();

    // 작품 필터링
    const matchedArtworks = allArtworks.filter((artwork) =>
      matchesAnySearch(query, [
        artwork.title,
        artwork.title_en,
        artwork.artist,
        artwork.artist_en,
        artwork.description,
      ])
    );

    const artworkResults: SearchResultArtwork[] = matchedArtworks
      .slice(0, limit)
      .map(toSearchResultArtwork);

    // 작가 집계 (매칭된 작품 기준)
    const artistMap = new Map<
      string,
      { name_en?: string; artworkCount: number; sampleImage: string }
    >();
    for (const artwork of matchedArtworks) {
      const existing = artistMap.get(artwork.artist);
      if (existing) {
        existing.artworkCount += 1;
      } else {
        artistMap.set(artwork.artist, {
          name_en: artwork.artist_en,
          artworkCount: 1,
          sampleImage: artwork.images?.[0] ?? '',
        });
      }
    }

    // 작가 이름 자체가 쿼리에 매칭되는 경우 우선 노출
    const artistResults: SearchResultArtist[] = Array.from(artistMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => {
        const aNameMatch = matchesAnySearch(query, [a.name, a.name_en]);
        const bNameMatch = matchesAnySearch(query, [b.name, b.name_en]);
        if (aNameMatch && !bNameMatch) return -1;
        if (!aNameMatch && bNameMatch) return 1;
        return b.artworkCount - a.artworkCount;
      })
      .slice(0, 5);

    return NextResponse.json<SearchResponse>(
      {
        artworks: artworkResults,
        artists: artistResults,
        totalArtworkMatches: matchedArtworks.length,
        query,
      },
      {
        headers: {
          'Cache-Control': 's-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
