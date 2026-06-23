import { NextRequest, NextResponse, after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { confirmPayment } from '@/lib/integrations/toss/confirm';
import { cancelPayment } from '@/lib/integrations/toss/cancel';
import { notifyEmail } from '@/lib/notify';
import { runAllSettled } from '@/lib/server/after-response';
import type { Json } from '@/types/supabase';

/** 후원 결제 confirm. 토스 승인 → confirm_funding_pledge → 실패 시 자동환불 → 알림. */
export async function POST(req: NextRequest) {
  let body: { paymentKey?: string; orderId?: string; amount?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const { paymentKey, orderId, amount } = body;
  if (!paymentKey || !orderId || typeof amount !== 'number') {
    return NextResponse.json({ error: 'invalid_params' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: pledge, error: pErr } = await supabase
    .from('funding_pledges')
    .select(
      'id, backer_name, backer_email, backer_phone, total_amount, status, order_no, project_id'
    )
    .eq('order_no', orderId)
    .single();
  if (pErr || !pledge) {
    return NextResponse.json({ error: 'pledge_not_found' }, { status: 404 });
  }

  // 이미 확정된 후원 (success 페이지 재호출 등)
  if (pledge.status === 'paid') {
    return NextResponse.json({ success: true, alreadyPaid: true });
  }

  // 금액 검증 (서버 계산값과 대조)
  if (pledge.total_amount !== amount) {
    return NextResponse.json({ error: 'amount_mismatch' }, { status: 400 });
  }

  if (pledge.status !== 'pending_payment') {
    return NextResponse.json({ error: 'invalid_pledge_status' }, { status: 409 });
  }

  // 토스 승인
  const confirmResult = await confirmPayment(
    { paymentKey, orderId, amount },
    `fnd-confirm-${orderId}`,
    'domestic'
  );

  if (!confirmResult.success) {
    after(() =>
      notifyEmail('error', '후원 결제 승인 실패', {
        주문번호: orderId,
        에러: confirmResult.error.message ?? '',
      })
    );
    return NextResponse.json({ error: 'payment_confirmation_failed' }, { status: 400 });
  }

  const toss = confirmResult.data;

  // 이 플랫폼은 카드 즉시결제만 지원. 가상계좌(WAITING_FOR_DEPOSIT) 등 비-DONE 상태는
  // 입금 전이므로 확정하지 않는다. (현 MID는 가상계좌 미계약이라 사실상 불발생 — 방어적 가드.)
  if (toss.status !== 'DONE') {
    after(() =>
      notifyEmail('warning', '후원 비-DONE 결제 상태(미확정)', {
        주문번호: orderId,
        status: toss.status,
      })
    );
    return NextResponse.json({ error: 'unsupported_payment_status' }, { status: 400 });
  }

  // 후원 확정(원자적). 한정 리워드 소진 시 TIER_SOLD_OUT.
  const { data: confirmData, error: confErr } = await supabase.rpc('confirm_funding_pledge', {
    p_order_no: orderId,
    p_payment_key: toss.paymentKey,
    p_amount: amount,
  });

  const c = confirmData as { ok: boolean; code?: string } | null;

  if (confErr || !c?.ok) {
    // Toss 승인은 완료됐지만 후원 확정이 실패한 상태이므로 자동 환불한다.
    const reason =
      c?.code === 'TIER_SOLD_OUT' ? '한정 리워드 소진 - 자동 환불' : '후원 확정 실패 - 자동 환불';
    let refunded = false;
    try {
      const cancelResult = await cancelPayment(
        toss.paymentKey,
        { cancelReason: reason },
        `fnd-refund-${orderId}`,
        'domestic'
      );
      refunded = cancelResult.success;
      if (!cancelResult.success) {
        after(() =>
          notifyEmail('error', '후원 자동환불 실패(수동확인)', {
            주문번호: orderId,
            결제키: toss.paymentKey,
            에러: cancelResult.error.message || cancelResult.error.code,
          })
        );
      }
    } catch (e) {
      console.error('[funding-confirm] auto-refund failed:', e);
      after(() =>
        notifyEmail('error', '후원 자동환불 실패(수동확인)', {
          주문번호: orderId,
          결제키: toss.paymentKey,
        })
      );
    }
    await supabase
      .from('funding_pledges')
      .update({
        status: refunded ? 'cancelled' : 'expired',
        cancelled_at: new Date().toISOString(),
        hold_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('order_no', orderId);
    return NextResponse.json(
      {
        error: refunded
          ? c?.code === 'TIER_SOLD_OUT'
            ? 'sold_out_refunded'
            : 'confirm_failed_refunded'
          : 'auto_refund_failed',
      },
      { status: refunded ? 409 : 502 }
    );
  }

  // 결제 기록(funding_payments) — 멱등: idempotency_key UNIQUE 충돌 시 무시
  // (confirm RPC가 이미 ALREADY_PAID로 멱등하므로 재호출 경로는 status 분기에서 일찍 반환됨)
  await supabase.from('funding_payments').insert({
    pledge_id: pledge.id,
    payment_key: toss.paymentKey,
    toss_order_id: orderId,
    method: toss.method ?? null,
    amount,
    status: toss.status,
    approved_at: new Date().toISOString(),
    confirm_response: toss as unknown as Json,
    idempotency_key: `fnd-confirm-${orderId}`,
  });

  revalidatePath('/funding/oh-yoon-terracotta');
  revalidatePath('/en/funding/oh-yoon-terracotta');

  // 발송 — 응답 후 백그라운드. ⚠️ bare `void`로 두면 응답 반환 시 서버리스 함수가
  // 정지하며 in-flight Resend fetch가 abort되어 알림이 누락된다(2026-06-16 회귀 참조).
  // after()로 감싸 런타임이 발송 완료까지 함수를 살려둔다.
  after(async () => {
    await runAllSettled('fundingConfirm.notifications', [
      () =>
        notifyEmail('payment', '후원 접수(결제완료)', {
          후원자: pledge.backer_name,
          금액: `${pledge.total_amount.toLocaleString('ko-KR')}원`,
          주문번호: orderId,
        }),
      // 구매자 이메일/SMS는 후속 Phase(약관·템플릿 확정 후)에서 추가
    ]);
  });

  return NextResponse.json({ success: true });
}
