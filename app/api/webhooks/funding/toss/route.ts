import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { fetchPayment } from '@/lib/integrations/toss/confirm';
import {
  verifyWebhookRequest,
  parseWebhookPayload,
  isPaymentStatusChanged,
} from '@/lib/integrations/toss/webhook';
import { isFundingOrderId } from '@/lib/funding/order-id';
import { notifyEmail } from '@/lib/notify';

export const runtime = 'nodejs';

/**
 * 후원 결제 webhook 백업.
 *
 * confirm route 실패 시 paid 승격 보정. mutate 전 Toss 재조회(위·변조·순서역전 방어).
 * EVT-/SAF- 등 비-FND 주문은 즉시 200 ack 무시.
 *
 * ⚠️ 이 엔드포인트는 작품 webhook(app/api/webhooks/toss/route.ts)과 같은 domestic MID를
 * 공유하므로 orderId prefix로 격리한다.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // SEC-04: 글로벌 webhook secret 검증 (legacy MID면 Basic Auth; 신규 MID면 통과 후 상위 layer 위임)
  if (!verifyWebhookRequest(req)) {
    console.error('[funding-webhook] Webhook secret verification failed');
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const payload = parseWebhookPayload(body);
  if (!payload) {
    console.error('[funding-webhook] Invalid payload received');
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
  }

  const orderId = payload.data.orderId;

  // 펀딩 외 주문(SAF-/EVT- 등)은 무시 — 이 엔드포인트는 FND- 전용
  if (!isFundingOrderId(orderId)) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // PAYMENT_STATUS_CHANGED 외 이벤트(DEPOSIT_CALLBACK 등) 무시
  if (!isPaymentStatusChanged(payload)) {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  // 위·변조·순서역전 방어: Toss 재조회로 실제 상태 확인
  const paymentKey = payload.data.paymentKey;
  const toss = await fetchPayment(paymentKey, 'domestic');
  if (!toss || toss.status !== 'DONE') {
    // 아직 DONE이 아니거나 API 장애 — 200 ack(Toss가 재시도하면 다시 처리)
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const supabase = createSupabaseAdminClient();

  // 후원 확정 RPC — confirm route 실패 시 보정
  const { data: confirmData } = await supabase.rpc('confirm_funding_pledge', {
    p_order_no: orderId,
    p_payment_key: toss.paymentKey,
    p_amount: toss.totalAmount,
  });

  const c = confirmData as { ok: boolean; code?: string } | null;

  // I2/I3: 결제는 완료됐으나 RPC가 CONFIRMED/ALREADY_PAID 외 코드를 반환한 경우
  // (예: TIER_SOLD_OUT, AMOUNT_MISMATCH, INVALID_STATE) — 후원자는 돈을 냈지만 리워드가 없음.
  // 운영자 수동 확인이 필요하므로 알림 발송. after()로 응답 후 실행(serverless abort 방지).
  if (c && !c.ok && c.code !== 'ALREADY_PAID') {
    after(async () => {
      await notifyEmail('error', '[펀딩 웹훅] 결제 완료 후 확정 실패 — 수동 확인 필요', {
        주문번호: orderId,
        'Payment Key': paymentKey,
        'RPC 코드': c.code ?? '(코드 없음)',
        처리: 'Toss DONE 확인됨. pledge 미확정. 환불 여부 수동 결정 필요.',
      });
    });
  }

  if (c?.ok && c.code === 'CONFIRMED') {
    // funding_payments INSERT — pledge_id NOT NULL이므로 funding_pledges에서 조회
    const { data: pledge } = await supabase
      .from('funding_pledges')
      .select('id')
      .eq('order_no', orderId)
      .maybeSingle();

    if (!pledge) {
      console.error(`[funding-webhook] pledge not found for order: ${orderId}`);
      // pledge가 없으면 insert 불가 — 200 ack(재시도해도 동일하므로 500 금지)
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const { error: insertError } = await supabase.from('funding_payments').insert({
      pledge_id: pledge.id,
      payment_key: toss.paymentKey,
      toss_order_id: orderId,
      method: toss.method ?? null,
      amount: toss.totalAmount,
      status: toss.status,
      approved_at: new Date().toISOString(),
      idempotency_key: `fnd-webhook-${toss.paymentKey}`,
    });

    if (insertError) {
      // idempotency_key UNIQUE 충돌(중복 webhook) = 정상. 그 외 에러는 로그만.
      const isDuplicate = typeof insertError.code === 'string' && insertError.code === '23505';
      if (!isDuplicate) {
        console.error('[funding-webhook] funding_payments insert failed:', insertError);
      } else {
        console.warn(`[funding-webhook] duplicate webhook ignored (idempotency): ${orderId}`);
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
