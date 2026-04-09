import { NextResponse } from 'next/server';
import { getSupabaseArtworks } from '@/lib/supabase-data';
import { matchesAnySearch } from '@/lib/search-utils';

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get('q')?.trim() ?? '').slice(0, 200);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '8', 10), 20);

  if (!query) {
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

    const artworkResults: SearchResultArtwork[] = matchedArtworks.slice(0, limit).map((a) => ({
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
    }));

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
