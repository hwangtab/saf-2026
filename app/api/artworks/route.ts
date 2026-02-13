import { NextResponse } from 'next/server';
import { getSupabaseArtworks } from '@/lib/supabase-data';

export const revalidate = 300;

export async function GET() {
  try {
    const artworks = await getSupabaseArtworks();

    // Footer 슬라이더에 필요한 최소 필드만 필터링하여 전송량 최소화
    const minimizedArtworks = artworks.map((artwork) => ({
      id: artwork.id,
      artist: artwork.artist,
      title: artwork.title,
      images: artwork.images || [],
      price: artwork.price,
      sold: artwork.sold,
    }));

    return NextResponse.json(minimizedArtworks, {
      headers: {
        'Cache-Control': 's-maxage=300, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('API Error fetching artworks:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
