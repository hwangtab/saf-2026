import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

import { createSupabaseAdminClient } from '@/lib/auth/server';
import { validateInternalCronRequest } from '@/lib/security/internal-cron-auth';
import { PETITION_OH_YOON_PATH } from '@/lib/petition/constants';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * 청원 자동 마감 cron.
 *
 * `close_petitions_due()` RPC가 `deadline_at <= now()`이고 `is_active = true`인 모든
 * 청원을 순회하며 `close_petition(slug)`을 호출. 각 청원은 다음을 수행:
 *   - petitions.is_active = false
 *   - petitions.closed_at = now()
 *   - petition_snapshot 동결값 저장 (지역별 분포 포함)
 *   - petition_audit_log 기록
 *
 * 회귀 안전성: idempotent — 이미 close된 청원은 deadline 조건에 걸리지 않아 noop.
 * 만료 전 청원은 절대 close되지 않음 (deadline_at <= now() 조건).
 *
 * 배경: pg_cron이 Supabase에 설치되어 있으면 DB 레벨 cron도 동시에 작동하지만,
 * pg_cron 활성화는 Supabase Studio 수동 작업 필요. Vercel cron은 보장된 fallback.
 *
 * 인증: Bearer ${CRON_SECRET} (vercel.json crons[]에서 자동 부착).
 */
export async function GET(request: NextRequest) {
  const authError = validateInternalCronRequest(request);
  if (authError) {
    return authError;
  }

  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin.rpc('close_petitions_due');

    if (error) {
      console.error('[close-petition] rpc error:', error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const result = data as { ok?: boolean; closed?: number } | null;
    const closed = result?.closed ?? 0;

    // 청원이 close 되었으면 공개 페이지 캐시 무효화 (SignForm UI 즉시 제거)
    if (closed > 0) {
      revalidatePath(PETITION_OH_YOON_PATH);
      revalidatePath(`/en${PETITION_OH_YOON_PATH}`);
      console.error(`[close-petition] auto-closed ${closed} petition(s)`);
    }

    return NextResponse.json({ ok: true, closed });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[close-petition] unexpected error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
