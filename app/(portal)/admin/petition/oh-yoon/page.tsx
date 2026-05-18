import { unstable_cache } from 'next/cache';

import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { PETITION_OH_YOON_GOAL, PETITION_OH_YOON_SLUG } from '@/lib/petition/constants';

import PetitionAdminClient from './_components/PetitionAdminClient';
import type { AdminBootstrap } from './_components/types';

export const dynamic = 'force-dynamic';

// 지역 분포 RPC 결과를 5분 캐시 — admin 다중 새로고침·동시 접속 시 RPC 중복 방지.
const getCachedRegionBreakdown = unstable_cache(
  async (slug: string) => {
    const admin = createSupabaseAdminClient();
    const { data } = await admin.rpc('get_petition_region_breakdown', { p_slug: slug });
    return ((data as Array<{ region_top: string; count: number | string }> | null) ?? []).map(
      (r) => ({ region_top: r.region_top, count: Number(r.count) })
    );
  },
  ['petition-admin-region-breakdown'],
  { revalidate: 300 }
);

export default async function PetitionAdminPage() {
  await requireAdmin();
  const admin = createSupabaseAdminClient();

  // 1. 카운터 — trigger 카운터로 O(1). 지역 분포 — 5분 캐시 RPC.
  //    지역 분포는 PostgREST db-max-rows=1000 한도 우회 위해 RPC로 DB 직접 집계.
  const [{ data: counts }, regionBreakdown] = await Promise.all([
    admin
      .from('petition_counts')
      .select('total, committee_total, region_top_count, recent_24h, is_active, deadline_at, goal')
      .eq('petition_slug', PETITION_OH_YOON_SLUG)
      .maybeSingle(),
    getCachedRegionBreakdown(PETITION_OH_YOON_SLUG),
  ]);

  // 2. 메시지 수 — HEAD query (rows 미전송, COUNT만). 탭 뱃지 표시용.
  //    전체 행 데이터는 MessagesTab 마운트 시 fetchAdminMessages server action으로 lazy fetch.
  const { count: messagesTotal } = await admin
    .from('petition_signatures')
    .select('id', { count: 'exact', head: true })
    .eq('petition_slug', PETITION_OH_YOON_SLUG)
    .not('message', 'is', null);

  // 3. 감사 로그 (최근 100개)
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
    messagesTotal: messagesTotal ?? 0,
    audit,
  };

  return <PetitionAdminClient bootstrap={bootstrap} />;
}
