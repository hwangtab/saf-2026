'use server';

import { after } from 'next/server';
import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { cancelPayment } from '@/lib/integrations/toss/cancel';
import { notifyEmail } from '@/lib/notify';
import { logAdminAction } from './activity-log-writer';

const VALID_STATUS = ['draft', 'active', 'closed', 'settled'] as const;
const STATUS_ORDER: Record<string, number> = { draft: 0, active: 1, closed: 2, settled: 3 };

export interface FundingProjectInput {
  slug: string;
  title: string;
  summary?: string;
  story?: string;
  cover_image?: string;
  goal_amount: number;
  start_at?: string;
  end_at?: string;
}

export async function createFundingProject(input: FundingProjectInput) {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  if (!input.slug?.trim() || !input.title?.trim() || !(input.goal_amount > 0))
    return { ok: false, error: 'INVALID_INPUT' };
  const { data, error } = await db
    .from('funding_projects')
    .insert({
      slug: input.slug,
      title: input.title,
      summary: input.summary ?? null,
      story: input.story ?? null,
      cover_image: input.cover_image ?? null,
      goal_amount: input.goal_amount,
      status: 'draft',
      start_at: input.start_at ?? null,
      end_at: input.end_at ?? null,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  const newId = (data as { id: string }).id;
  await logAdminAction('funding_project_created', 'funding_project', newId, {
    slug: input.slug,
    title: input.title,
    goal_amount: input.goal_amount,
  });
  return { ok: true, id: newId };
}

export async function updateFundingProject(
  id: string,
  input: Partial<FundingProjectInput> & { status?: string }
) {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  // status 전이 가드: 현재 status 조회 → 역행 금지
  if (input.status) {
    if (!VALID_STATUS.includes(input.status as (typeof VALID_STATUS)[number]))
      return { ok: false, error: 'INVALID_STATUS' };
    const { data: cur } = await db.from('funding_projects').select('status').eq('id', id).single();
    const curData = cur as { status: string } | null;
    if (curData && STATUS_ORDER[input.status] < STATUS_ORDER[curData.status])
      return { ok: false, error: 'STATUS_REGRESSION' };
  }
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const patchableKeys = [
    'title',
    'summary',
    'story',
    'cover_image',
    'goal_amount',
    'start_at',
    'end_at',
    'status',
  ] as const;
  for (const k of patchableKeys) {
    if (input[k] !== undefined) patch[k] = input[k];
  }
  const { error } = await db.from('funding_projects').update(patch).eq('id', id);
  if (error) return { ok: false, error: error.message };
  await logAdminAction('funding_project_updated', 'funding_project', id, {
    changed: Object.keys(patch).filter((k) => k !== 'updated_at'),
  });
  return { ok: true };
}

export async function createRewardTier(input: {
  project_id: string;
  title: string;
  description?: string;
  amount: number;
  total_quantity?: number | null;
  requires_shipping?: boolean;
  reward_kind?: string;
  image_url?: string;
  estimated_delivery?: string;
  sort_order?: number;
}) {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  if (!input.title?.trim() || !(input.amount > 0)) return { ok: false, error: 'INVALID_INPUT' };
  const { error } = await db.from('reward_tiers').insert({
    project_id: input.project_id,
    title: input.title,
    description: input.description ?? null,
    amount: input.amount,
    total_quantity: input.total_quantity ?? null,
    requires_shipping: input.requires_shipping ?? false,
    reward_kind: input.reward_kind ?? 'goods',
    image_url: input.image_url ?? null,
    estimated_delivery: input.estimated_delivery ?? null,
    sort_order: input.sort_order ?? 0,
  });
  if (error) return { ok: false, error: error.message };
  await logAdminAction('reward_tier_created', 'reward_tier', input.project_id, {
    title: input.title,
    amount: input.amount,
  });
  return { ok: true };
}

export async function updateRewardTier(id: string, input: Record<string, unknown>) {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  const allowed = [
    'title',
    'description',
    'amount',
    'total_quantity',
    'requires_shipping',
    'reward_kind',
    'image_url',
    'estimated_delivery',
    'sort_order',
  ];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) if (input[k] !== undefined) patch[k] = input[k];
  const { error } = await db.from('reward_tiers').update(patch).eq('id', id);
  if (error) return { ok: false, error: error.message };
  await logAdminAction('reward_tier_updated', 'reward_tier', id, {
    changed: Object.keys(patch),
  });
  return { ok: true };
}

export async function deleteRewardTier(id: string) {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  // paid 후원이 묶인 티어 삭제 차단 — 2-step (embedded join 비사용)
  // 1) 이 티어를 가진 pledge_item들의 pledge_id 수집
  const { data: items } = await db
    .from('pledge_items')
    .select('pledge_id')
    .eq('reward_tier_id', id);
  const pledgeIds = (items ?? []).map((r) => r.pledge_id);
  // 2) 그 중 status='paid'인 pledge가 하나라도 있으면 삭제 차단
  if (pledgeIds.length > 0) {
    const { data: paidPledges } = await db
      .from('funding_pledges')
      .select('id')
      .in('id', pledgeIds)
      .eq('status', 'paid')
      .limit(1);
    if (paidPledges && paidPledges.length > 0) return { ok: false, error: 'TIER_HAS_PLEDGES' };
  }
  const { error } = await db.from('reward_tiers').delete().eq('id', id);
  if (error) return { ok: false, error: error.message };
  await logAdminAction('reward_tier_deleted', 'reward_tier', id, {});
  return { ok: true };
}

export async function listFundingBackers(projectId: string) {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  const { data, error } = await db
    .from('funding_pledges')
    .select(
      'id, order_no, backer_name, backer_email, backer_phone, total_amount, status, fulfillment_status, tracking_company, tracking_number, shipping_name, shipping_phone, shipping_address, shipping_postal_code, shipping_memo, is_anonymous, supporter_message, paid_at, created_at'
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  return { pledges: data ?? [], error: error?.message };
}

export async function refundFundingPledge(pledgeId: string) {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  const { data: pledge, error: pErr } = await db
    .from('funding_pledges')
    .select('id, status, order_no')
    .eq('id', pledgeId)
    .single();
  const pledgeData = pledge as { id: string; status: string; order_no: string } | null;
  if (pErr || !pledgeData) return { ok: false, error: 'NOT_FOUND' };
  if (pledgeData.status !== 'paid') return { ok: false, error: 'NOT_REFUNDABLE' };
  const { data: pay } = await db
    .from('funding_payments')
    .select('payment_key, status')
    .eq('pledge_id', pledgeId)
    .single();
  const payData = pay as { payment_key: string; status: string } | null;
  if (!payData?.payment_key) return { ok: false, error: 'NO_PAYMENT' };

  // 부분실패 재시도 안전: 결제가 이미 CANCELED면 Toss를 다시 호출하지 않고
  // pledge 상태 동기화만 마저 수행한다(직전 시도가 pledge UPDATE 전에 끊긴 경우).
  if (payData.status !== 'CANCELED') {
    const cancelResult = await cancelPayment(
      payData.payment_key,
      { cancelReason: '관리자 환불' },
      `fnd-admin-refund-${pledgeData.order_no}`,
      'domestic'
    );
    if (!cancelResult.success) {
      after(() =>
        notifyEmail('error', '펀딩 환불 실패(수동확인)', {
          주문번호: pledgeData.order_no,
          에러: cancelResult.error?.message ?? cancelResult.error?.code ?? '알 수 없는 오류',
        })
      );
      return { ok: false, error: 'TOSS_CANCEL_FAILED' };
    }
    // Toss 취소 성공 직후 결제 레코드를 먼저 CANCELED로 확정 → 매출 집계 정합성 우선.
    const { error: payErr } = await db
      .from('funding_payments')
      .update({ status: 'CANCELED', cancelled_at: new Date().toISOString() })
      .eq('pledge_id', pledgeId);
    if (payErr) {
      after(() =>
        notifyEmail('error', '펀딩 환불 후 결제상태 변경 실패(Toss는 취소됨, 수동확인)', {
          주문번호: pledgeData.order_no,
          에러: payErr.message,
        })
      );
      return { ok: false, error: 'SYNC_FAILED' };
    }
  }

  const { error: uErr } = await db
    .from('funding_pledges')
    .update({
      status: 'refunded',
      refunded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', pledgeId);
  if (uErr) {
    after(() =>
      notifyEmail('error', '펀딩 환불 후 후원상태 변경 실패(Toss·결제는 취소됨, 수동확인)', {
        주문번호: pledgeData.order_no,
        에러: uErr.message,
      })
    );
    return { ok: false, error: 'SYNC_FAILED' };
  }

  await logAdminAction('funding_pledge_refunded', 'funding_pledge', pledgeId, {
    order_no: pledgeData.order_no,
  });
  return { ok: true };
}

export async function updateFulfillment(
  pledgeId: string,
  status: string,
  company?: string,
  number?: string
) {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  if (!['none', 'preparing', 'shipped', 'delivered'].includes(status))
    return { ok: false, error: 'INVALID_STATUS' };
  const { error } = await db
    .from('funding_pledges')
    .update({
      fulfillment_status: status,
      tracking_company: company ?? null,
      tracking_number: number ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pledgeId);
  if (error) return { ok: false, error: error.message };
  await logAdminAction('funding_fulfillment_updated', 'funding_pledge', pledgeId, {
    fulfillment_status: status,
    tracking_company: company ?? null,
    tracking_number: number ?? null,
  });
  return { ok: true };
}
