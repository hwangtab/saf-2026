import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { PETITION_OH_YOON_GOAL, PETITION_OH_YOON_SLUG } from '@/lib/petition/constants';

import PetitionAdminClient from './_components/PetitionAdminClient';
import type { AdminBootstrap } from './_components/types';

export const dynamic = 'force-dynamic';

export default async function PetitionAdminPage() {
  await requireAdmin();
  const admin = createSupabaseAdminClient();

  // 1. 카운터·지역 분포·최근 24시간
  const [{ data: counts }, { data: regionRows }] = await Promise.all([
    admin
      .from('petition_counts')
      .select('total, committee_total, region_top_count, recent_24h, is_active, deadline_at, goal')
      .eq('petition_slug', PETITION_OH_YOON_SLUG)
      .maybeSingle(),
    admin
      .from('petition_signatures')
      .select('region_top')
      .eq('petition_slug', PETITION_OH_YOON_SLUG)
      .eq('is_masked', false),
  ]);

  // 지역별 분포 집계 (in-memory)
  const regionCounts = new Map<string, number>();
  for (const row of regionRows ?? []) {
    regionCounts.set(row.region_top, (regionCounts.get(row.region_top) ?? 0) + 1);
  }
  const regionBreakdown = Array.from(regionCounts.entries())
    .map(([region_top, count]) => ({ region_top, count }))
    .sort((a, b) => b.count - a.count);

  // 2. 메시지 큐 (메시지가 있는 행만, 최근 200개)
  const { data: messages } = await admin
    .from('petition_signatures')
    .select(
      'id, full_name, region_top, region_sub, message, message_public, is_masked, masked_at, created_at'
    )
    .eq('petition_slug', PETITION_OH_YOON_SLUG)
    .not('message', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200);

  // 3. 추진위원 명단 (가나다순)
  const { data: committee } = await admin
    .from('petition_signatures')
    .select('id, full_name, email, region_top, region_sub, created_at')
    .eq('petition_slug', PETITION_OH_YOON_SLUG)
    .eq('is_committee', true)
    .order('full_name', { ascending: true });

  // 4. 감사 로그 (최근 100개)
  const { data: auditRaw } = await admin
    .from('petition_audit_log')
    .select('id, actor_id, action, target_type, target_id, details, created_at')
    .eq('petition_slug', PETITION_OH_YOON_SLUG)
    .order('created_at', { ascending: false })
    .limit(100);

  const actorIds = [
    ...new Set((auditRaw ?? []).map((r) => r.actor_id).filter((id): id is string => Boolean(id))),
  ];
  let actorEmailMap = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: profiles } = await admin.from('profiles').select('id, email').in('id', actorIds);
    actorEmailMap = new Map((profiles ?? []).map((p) => [p.id, p.email ?? '(이메일 없음)']));
  }
  const audit = (auditRaw ?? []).map((r) => ({
    ...r,
    actor_email: r.actor_id ? (actorEmailMap.get(r.actor_id) ?? '(알 수 없음)') : '시스템',
  }));

  const bootstrap: AdminBootstrap = {
    counts: {
      total: counts?.total ?? 0,
      committee_total: counts?.committee_total ?? 0,
      region_top_count: counts?.region_top_count ?? 0,
      recent_24h: counts?.recent_24h ?? 0,
      is_active: counts?.is_active ?? true,
      deadline_at: counts?.deadline_at ?? null,
      goal: counts?.goal ?? PETITION_OH_YOON_GOAL,
    },
    regionBreakdown,
    messages: messages ?? [],
    committee: committee ?? [],
    audit,
  };

  return <PetitionAdminClient bootstrap={bootstrap} />;
}
