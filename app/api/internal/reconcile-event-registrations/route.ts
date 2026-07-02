import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { validateInternalCronRequest } from '@/lib/security/internal-cron-auth';
import { withCronRun } from '@/lib/monitoring/cron-run';
import { fetchPaymentByOrderId } from '@/lib/integrations/toss/confirm';
import { cancelPayment } from '@/lib/integrations/toss/cancel';
import { notifyEmail } from '@/lib/notify';
import { sendEventSms, sendEventEmail } from '@/lib/events/notify';
import { planEventReconcile, interpretConfirmCode } from '@/lib/events/reconcile-decision';
import { runAllSettled } from '@/lib/server/after-response';

export const runtime = 'nodejs';

/** 이벤트 결제는 작품과 같은 domestic MID(saf202i818) 고정. */
const EVENT_PROVIDER = 'domestic' as const;
/** 누적 시도 임계치 — 초과 행은 조회 제외(폭주 차단) + admin 수동. */
const MAX_ATTEMPTS = 5;

/**
 * Reconciliation cron: 이벤트 결제 '캡처됐는데 미확정' 자동 복구.
 *
 * 배경: 이벤트 confirm route가 Toss 캡처(confirmPayment) 성공 후 좌석 확정/자동환불 단계에서
 * 실패(크래시·타임아웃·환불 거부)하면 → 고객은 결제했는데 등록이 pending 잔류 또는 expired
 * (환불실패)로 남는다. 작품과 달리 이벤트엔 웹훅 안전망이 없으므로 이 크론이 보정한다.
 *
 * 동작 (lib/events/reconcile-decision의 순수 규칙을 따름):
 * 1) pending/expired + 5분~48h 경과 + 시도<MAX 등록 조회
 * 2) fetchPaymentByOrderId(order_no, domestic)로 Toss 권위 확인 — DONE인 건만 처리
 * 3) pending+DONE → confirm_event_registration(좌석 있으면 확정, 매진이면 환불)
 *    expired+DONE → 곧장 환불(RPC는 pending만 처리)
 * 4) 환불 실패 tail은 reconcile_attempts++ + 최초 1회 알림(폭주 방지)
 *
 * 매 10분 Vercel Cron (작품 reconcile-payments와 별개).
 */
export const GET = withCronRun('reconcile-event-registrations', cronHandler);

async function cronHandler(request: NextRequest) {
  const authError = validateInternalCronRequest(request);
  if (authError) return authError;

  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch (err) {
    console.error('[reconcile-event] admin client init failed:', err);
    return NextResponse.json({ error: 'Supabase admin credentials are missing.' }, { status: 500 });
  }

  // 5분 미만은 정상 confirm 진행 중일 수 있어 제외. 48h 초과 고대 행은 admin 수동.
  const minAge = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const maxAge = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: stuck, error: fetchError } = await supabase
    .from('event_registrations')
    .select(
      'id, order_no, status, amount, party_size, applicant_name, phone, email, reconcile_attempts'
    )
    .in('status', ['pending', 'expired'])
    .gt('created_at', minAge)
    .lt('created_at', maxAge)
    .lt('reconcile_attempts', MAX_ATTEMPTS);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!stuck || stuck.length === 0) {
    return NextResponse.json({ reconciled: 0, checked: 0 });
  }

  // order_no(=Toss orderId)가 없는 행은 Toss 조회 불가 → 제외(스키마상 nullable).
  const rows = stuck.filter((r): r is StuckRegistration => r.order_no !== null);
  if (rows.length === 0) {
    return NextResponse.json({ reconciled: 0, checked: 0 });
  }

  let reconciled = 0;
  const errors: string[] = [];

  for (const reg of rows) {
    try {
      const toss = await fetchPaymentByOrderId(reg.order_no, EVENT_PROVIDER);
      const action = planEventReconcile(reg.status, toss?.status ?? null);
      // skip이거나 toss 없음(미캡처/이미환불) → 자가 치유. toss를 non-null로 narrow.
      if (action === 'skip' || !toss) continue;

      const paymentKey = toss.paymentKey;
      let shouldRefund = action === 'refund';

      // ── 확정 시도 (pending) ──
      if (action === 'confirm') {
        const { data: confirmData, error: confErr } = await supabase.rpc(
          'confirm_event_registration',
          { p_order_no: reg.order_no, p_payment_key: paymentKey, p_amount: reg.amount }
        );
        if (confErr) {
          await bumpAttempt(supabase, reg);
          errors.push(`${reg.order_no}: confirm RPC error: ${confErr.message}`);
          continue;
        }
        const code = (confirmData as { ok: boolean; code?: string } | null)?.code;
        const outcome = interpretConfirmCode(code);

        if (outcome === 'confirmed') {
          await notifyCustomer(reg, 'payment_confirmed');
          reconciled++;
          continue;
        }
        if (outcome === 'noop') continue; // 경합으로 confirm route가 먼저 처리
        if (outcome === 'alert') {
          await bumpAttempt(supabase, reg);
          errors.push(`${reg.order_no}: confirm 비정상 코드 ${code ?? 'none'} — 수동 확인`);
          continue;
        }
        shouldRefund = true; // outcome === 'refund' (SOLD_OUT)
      }

      // ── 환불 (expired 또는 SOLD_OUT) ──
      if (shouldRefund) {
        const refund = await cancelPayment(
          paymentKey,
          { cancelReason: '추도식 좌석 마감/확정 실패로 회비 자동 환불 (reconcile)' },
          `event-reconcile-refund-${reg.order_no}`,
          EVENT_PROVIDER
        );

        if (refund.success) {
          // status → cancelled (멱등: 현재 상태에서만)
          const now = new Date().toISOString();
          const { error: updateError } = await supabase
            .from('event_registrations')
            .update({ status: 'cancelled', reconciled_at: now, updated_at: now })
            .eq('id', reg.id)
            .eq('status', reg.status);
          if (updateError) {
            errors.push(`${reg.order_no}: 환불 후 상태 갱신 실패: ${updateError.message}`);
            await bumpAttempt(supabase, reg);
            await notifyEmail('error', '추도식 회비 환불 후 상태 갱신 실패', {
              주문번호: reg.order_no,
              등록ID: reg.id,
              에러: updateError.message,
              참고: 'Toss 환불은 성공했지만 event_registrations 상태를 cancelled로 기록하지 못했습니다.',
            });
            continue;
          }
          await notifyCustomer(reg, 'refunded');
          reconciled++;
        } else {
          // 환불 실패 — attempts++, 최초 1회만 운영팀 알림(폭주 방지)
          await bumpAttempt(supabase, reg);
          if ((reg.reconcile_attempts ?? 0) === 0) {
            await runAllSettled('reconcile-event.refundFailureAdminNotification', [
              () =>
                notifyEmail('error', '🚨 이벤트 결제 자동 환불 실패 — 수동 환불 필요', {
                  주문번호: reg.order_no,
                  결제키: paymentKey,
                  금액: `₩${reg.amount.toLocaleString('ko-KR')}`,
                  참고: '캡처됐으나 좌석 마감/확정실패 + 자동환불 거부. 즉시 수동 환불 요망.',
                }),
            ]);
          }
          errors.push(`${reg.order_no}: 자동 환불 실패`);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${reg.order_no}: ${msg}`);
      console.error(`[reconcile-event] ERROR ${reg.order_no}:`, err);
    }
  }

  // 사이클 종료 집계 알림 (reconcile-payments 패턴)
  if (errors.length > 0) {
    await notifyEmail('error', `이벤트 결제 보정 에러 (${errors.length}건)`, {
      검사: `${rows.length}건`,
      보정: `${reconciled}건`,
      에러: errors.slice(0, 3).join('\n'),
    });
  } else if (reconciled > 0) {
    await notifyEmail('warning', `이벤트 결제 보정 완료 (${reconciled}건)`, {
      검사: `${rows.length}건`,
      보정: `${reconciled}건`,
    });
  }

  return NextResponse.json({
    checked: rows.length,
    reconciled,
    ...(errors.length > 0 ? { errors } : {}),
  });
}

type StuckRegistration = {
  id: string;
  order_no: string;
  status: string;
  amount: number;
  party_size: number;
  applicant_name: string;
  phone: string;
  email: string | null;
  reconcile_attempts: number;
};

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

/** 시도 횟수 증가 + 마지막 처리 시각 기록 (영구 stuck 행 폭주 차단). */
async function bumpAttempt(supabase: AdminClient, reg: StuckRegistration): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from('event_registrations')
    .update({ reconcile_attempts: (reg.reconcile_attempts ?? 0) + 1, reconciled_at: now })
    .eq('id', reg.id);
}

/** 고객 확정/환불 알림 (SMS 알림톡→대체 + 이메일). 실패해도 보정 자체는 되돌리지 않음. */
async function notifyCustomer(
  reg: StuckRegistration,
  type: 'payment_confirmed' | 'refunded'
): Promise<void> {
  const data = { name: reg.applicant_name, partySize: reg.party_size, amount: reg.amount };
  await runAllSettled(`reconcile-event.notifyCustomer.${type}`, [
    () => sendEventSms(reg.phone, type, data, reg.order_no),
    ...(reg.email
      ? [() => sendEventEmail(reg.email, type, { ...data, orderNo: reg.order_no })]
      : []),
  ]);
}
