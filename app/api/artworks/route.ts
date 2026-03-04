import { NextResponse } from 'next/server';
import { getSupabaseHomepageArtworks } from '@/lib/supabase-data';

export const revalidate = 60;

export async function GET() {
  try {
    const artworks = await getSupabaseHomepageArtworks(30);

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
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (error) {
    console.error('API Error fetching artworks:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
