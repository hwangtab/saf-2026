'use server';

import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';

export type AdminNavBadges = {
  /** 승인 대기 신청자(심사 큐) */
  pendingReview: number;
  /** 관리자 수동 처리 필요 주문(입금 대기 + 환불 요청) */
  ordersActionNeeded: number;
  /** 미처리 피드백(open/reviewing) */
  openFeedback: number;
};

/**
 * admin nav 뱃지용 경량 카운트. head-count 쿼리만 사용(행 데이터 미반환).
 * 레이아웃에서 매 렌더 시 호출되므로 저비용 유지. 실패 시 0으로 폴백(nav 표시가 깨지지 않게).
 */
export async function getAdminNavBadges(): Promise<AdminNavBadges> {
  await requireAdmin();
  const supabase = await requireAdminClient();

  const [pendingRes, ordersRes, feedbackRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .neq('role', 'admin')
      .eq('status', 'pending'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['awaiting_deposit', 'refund_requested']),
    supabase
      .from('feedback')
      .select('id', { count: 'exact', head: true })
      .in('status', ['open', 'reviewing']),
  ]);

  return {
    pendingReview: pendingRes.count ?? 0,
    ordersActionNeeded: ordersRes.count ?? 0,
    openFeedback: feedbackRes.count ?? 0,
  };
}
