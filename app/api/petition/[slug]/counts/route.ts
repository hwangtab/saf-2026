import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/server';

export const revalidate = 60;

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from('petition_counts')
      .select('total, region_top_count, recent_24h, is_active')
      .eq('petition_slug', slug)
      .maybeSingle();

    return NextResponse.json(
      {
        total: data?.total ?? 0,
        region_top_count: data?.region_top_count ?? 0,
        recent_24h: data?.recent_24h ?? 0,
        is_active: data?.is_active ?? true,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      }
    );
  } catch (error) {
    console.error('[api/petition/counts] fetch 실패:', error);
    return NextResponse.json(
      { total: 0, region_top_count: 0, recent_24h: 0, is_active: true },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
