import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/auth/server';

export const revalidate = 60;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createSupabaseAdminClient();
  const { data: statusData, error } = await supabase.rpc('funding_project_status', {
    p_slug: slug,
  });
  const s = statusData as {
    found: boolean;
    goal_amount?: number;
    raised_amount?: number;
    backer_count?: number;
    is_open?: boolean;
    end_at?: string | null;
  } | null;
  if (error || !s || !s.found) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const { data: remaining } = await supabase.rpc('funding_tier_remaining', { p_slug: slug });
  const goal = s.goal_amount ?? 0;
  const raised = s.raised_amount ?? 0;
  const percent = goal > 0 ? Math.min(Math.floor((raised / goal) * 100), 100) : 0;
  return NextResponse.json({
    goal_amount: goal,
    raised_amount: raised,
    backer_count: s.backer_count ?? 0,
    percent,
    is_open: s.is_open ?? false,
    end_at: s.end_at ?? null,
    tier_remaining: (remaining as Record<string, number | null>) ?? {},
  });
}
