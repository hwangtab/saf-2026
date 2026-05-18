import { NextRequest, NextResponse } from 'next/server';
import { getArtworksByIds } from '@/lib/supabase-data';

export const dynamic = 'force-dynamic';

/** GET /api/artworks/batch?ids=id1,id2,...
 *  위시리스트 페이지에서 localStorage ID 배열로 artwork 데이터를 가져오는 엔드포인트.
 *  최대 50개 ID 수락. */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('ids') ?? '';
  const ids = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);

  if (ids.length === 0) {
    return NextResponse.json([]);
  }

  const artworks = await getArtworksByIds(ids);
  return NextResponse.json(artworks, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
