import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { PETITION_OH_YOON_GOAL, PETITION_OH_YOON_SLUG } from '@/lib/petition/constants';
import { fetchAllInBatches } from '@/lib/utils/supabase-batch';

import PetitionAdminClient from './_components/PetitionAdminClient';
import type { AdminBootstrap } from './_components/types';

export const dynamic = 'force-dynamic';

export default async function PetitionAdminPage() {
  await requireAdmin();
  const admin = createSupabaseAdminClient();

  // 1. 카운터·지역 분포·최근 24시간
  // 지역 분포는 PostgREST `db-max-rows=1000` 서버 한도를 우회하기 위해 RPC로 DB에서 직접 집계.
  // 이전에 .select('region_top').range(0, 49999)로 받아 in-memory로 집계했으나 실제로는
  // 1000명 표본만 fetch되어 부분집계(예: 서울 1595명 → 441명으로 잘림)가 송출되던 버그.
  const [{ data: counts }, { data: regionRows }] = await Promise.all([
    admin
      .from('petition_counts')
      .select('total, committee_total, region_top_count, recent_24h, is_active, deadline_at, goal')
      .eq('petition_slug', PETITION_OH_YOON_SLUG)
      .maybeSingle(),
    admin.rpc('get_petition_region_breakdown', { p_slug: PETITION_OH_YOON_SLUG }),
  ]);

  // RPC는 이미 ORDER BY count DESC 적용됨. bigint(string으로 serialize)/number 모두 Number로 변환.
  const regionBreakdown = (
    (regionRows as Array<{ region_top: string; count: number | string }> | null) ?? []
  ).map((r) => ({
    region_top: r.region_top,
    count: Number(r.count),
  }));

  // 2. 메시지 큐 (메시지가 있는 행만)
  // PostgREST db-max-rows=1000 한도 우회 — fetchAllInBatches로 1000개씩 페이지네이션 fetch.
  // 이전 .range(0, 49999) 단발 호출은 서버 한도에 걸려 1000개만 반환되어 중간에서 잘렸음.
  const { data: messages, count: messagesTotal } = await fetchAllInBatches((from, to) =>
    admin
      .from('petition_signatures')
      .select(
        'id, full_name, region_top, region_sub, message, message_public, is_masked, masked_at, created_at',
        { count: 'exact' }
      )
      .eq('petition_slug', PETITION_OH_YOON_SLUG)
      .not('message', 'is', null)
      .order('created_at', { ascending: false })
      .range(from, to)
  );

  // 3. 추진위원 명단 (가나다순)
  const { data: committee, count: committeeTotal } = await fetchAllInBatches((from, to) =>
    admin
      .from('petition_signatures')
      .select('id, full_name, email, phone, region_top, region_sub, created_at', {
        count: 'exact',
      })
      .eq('petition_slug', PETITION_OH_YOON_SLUG)
      .eq('is_committee', true)
      .order('full_name', { ascending: true })
      .range(from, to)
  );

  // 3b. 전체 서명 명단 (운영자 표)
  const { data: signatures, count: signaturesTotal } = await fetchAllInBatches((from, to) =>
    admin
      .from('petition_signatures')
      .select(
        'id, full_name, email, phone, region_top, region_sub, is_committee, message, message_public, is_masked, created_at',
        { count: 'exact' }
      )
      .eq('petition_slug', PETITION_OH_YOON_SLUG)
      .order('created_at', { ascending: false })
      .range(from, to)
  );

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
    messagesTotal: messagesTotal ?? 0,
    committee: committee ?? [],
    committeeTotal: committeeTotal ?? 0,
    signatures: signatures ?? [],
    signaturesTotal: signaturesTotal ?? 0,
    audit,
  };

  return <PetitionAdminClient bootstrap={bootstrap} />;
}
