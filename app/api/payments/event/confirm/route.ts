import { NextRequest, NextResponse, after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { confirmPayment } from '@/lib/integrations/toss/confirm';
import { cancelPayment } from '@/lib/integrations/toss/cancel';
import { notifyEmail } from '@/lib/notify';
import { sendEventSms, sendEventEmail } from '@/lib/events/notify';
import { OH_YOON_MEMORIAL_PATH, OH_YOON_MEMORIAL_SLUG } from '@/content/events/oh-yoon-memorial';

/**
 * 행사(추도식) 결제 confirm.
 * 토스 승인 → confirm_event_registration RPC로 좌석 확정(원자적, hold 만료 시 재확인) →
 * 좌석 확정 실패 시 자동 환불 → 알림톡/이메일 발송.
 */
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
  const { data: reg, error: regErr } = await supabase
    .from('event_registrations')
    .select('id, applicant_name, phone, email, party_size, amount, status, order_no')
    .eq('order_no', orderId)
    .single();

  if (regErr || !reg) {
    return NextResponse.json({ error: 'registration_not_found' }, { status: 404 });
  }

  // 금액 검증 (서버 계산값과 대조)
  if (reg.amount !== amount) {
    return NextResponse.json({ error: 'amount_mismatch' }, { status: 400 });
  }

  // 이미 확정된 신청 (success 페이지 재호출 등)
  if (reg.status === 'confirmed') {
    return NextResponse.json({ success: true, alreadyConfirmed: true });
  }
  if (reg.status !== 'pending') {
    return NextResponse.json({ error: 'invalid_registration_status' }, { status: 409 });
  }

  // 토스 승인
  const confirmResult = await confirmPayment(
    { paymentKey, orderId, amount },
    `event-confirm-${orderId}`,
    'domestic'
  );

  if (!confirmResult.success) {
    after(() =>
      notifyEmail('error', '추도식 결제 승인 실패', {
        주문번호: orderId,
        에러: confirmResult.error.message ?? '',
      })
    );
    return NextResponse.json({ error: 'payment_confirmation_failed' }, { status: 400 });
  }

  const toss = confirmResult.data;

  // 이 행사는 카드 즉시결제만 지원. 가상계좌(WAITING_FOR_DEPOSIT) 등 비-DONE 상태는
  // 입금 전이므로 확정하지 않는다. (현 MID는 가상계좌 미계약이라 사실상 불발생 — 방어적 가드.)
  if (toss.status !== 'DONE') {
    after(() =>
      notifyEmail('warning', '추도식 비-DONE 결제 상태(미확정)', {
        주문번호: orderId,
        status: toss.status,
      })
    );
    return NextResponse.json({ error: 'unsupported_payment_status' }, { status: 400 });
  }

  // 좌석 확정(원자적). hold 만료 시 재확인 후 승격, 초과면 SOLD_OUT.
  const { data: confirmData, error: confErr } = await supabase.rpc('confirm_event_registration', {
    p_order_no: orderId,
    p_payment_key: toss.paymentKey,
    p_amount: amount,
  });

  const c = confirmData as { ok: boolean; code?: string } | null;

  if (confErr || !c?.ok) {
    // Toss 승인은 완료됐지만 좌석 확정이 실패한 상태이므로 자동 환불한다.
    const reason =
      c?.code === 'SOLD_OUT' ? '정원 초과 - 자동 환불' : '신청 상태 확정 실패 - 자동 환불';
    let refundSucceeded = false;
    try {
      const cancelResult = await cancelPayment(
        toss.paymentKey,
        { cancelReason: reason },
        `event-refund-${orderId}`,
        'domestic'
      );
      if (cancelResult.success) {
        refundSucceeded = true;
      } else {
        after(() =>
          notifyEmail('error', '추도식 자동환불 실패(수동 확인 필요)', {
            주문번호: orderId,
            결제키: toss.paymentKey,
            에러: cancelResult.error.message || cancelResult.error.code,
          })
        );
      }
    } catch (e) {
      console.error('[event-confirm] auto-refund failed:', e);
      after(() =>
        notifyEmail('error', '추도식 자동환불 실패(수동 확인 필요)', {
          주문번호: orderId,
          결제키: toss.paymentKey,
        })
      );
    }
    const { error: cancelUpdateError } = await supabase
      .from('event_registrations')
      .update({
        status: refundSucceeded ? 'cancelled' : 'expired',
        payment_key: toss.paymentKey,
        hold_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('order_no', orderId);
    if (cancelUpdateError) {
      console.error('[event-confirm] cancelled status update failed:', cancelUpdateError);
      after(() =>
        notifyEmail('error', '추도식 자동환불 후 상태 변경 실패', {
          주문번호: orderId,
          결제키: toss.paymentKey,
        })
      );
    }
    return NextResponse.json(
      {
        error: refundSucceeded
          ? c?.code === 'SOLD_OUT'
            ? 'sold_out_refunded'
            : 'confirm_failed_refunded'
          : 'auto_refund_failed',
      },
      { status: refundSucceeded ? 409 : 502 }
    );
  }

  revalidatePath(OH_YOON_MEMORIAL_PATH);
  revalidatePath(`/en${OH_YOON_MEMORIAL_PATH}`);

  // 현재 누적 좌석 현황 (관리자 알림에 "총 몇 석/잔여" 포함용)
  const { data: seatNow } = await supabase.rpc('event_seat_status', {
    p_slug: OH_YOON_MEMORIAL_SLUG,
  });
  const s = seatNow as { capacity: number; occupied: number; remaining: number } | null;

  // 발송 — 응답 후 백그라운드. ⚠️ bare `void`로 두면 응답 반환 시 서버리스 함수가
  // 정지하며 in-flight Resend/Solapi fetch가 abort되어 알림이 누락된다(2026-06-16 회귀:
  // 관리자 알림 미수신). after()로 감싸 런타임이 발송 완료까지 함수를 살려둔다.
  // 주문 결제는 Toss 웹훅이 별도 알림 백업을 제공하지만 행사 결제(event_registrations)는
  // 웹훅 경로가 없어 이 confirm 라우트가 유일한 알림 출처다.
  after(async () => {
    await Promise.allSettled([
      notifyEmail('payment', '추도식 신청 접수(결제완료)', {
        신청자: reg.applicant_name,
        인원: `${reg.party_size}명`,
        금액: `${reg.amount.toLocaleString('ko-KR')}원`,
        현재누적: s ? `${s.occupied}/${s.capacity}석 (잔여 ${s.remaining}석)` : '-',
        명단: 'https://www.saf2026.com/admin/event/oh-yoon-memorial',
      }),
      sendEventSms(
        reg.phone,
        'payment_confirmed',
        { name: reg.applicant_name, partySize: reg.party_size, amount: reg.amount },
        orderId
      ),
      ...(reg.email
        ? [
            sendEventEmail(reg.email, 'payment_confirmed', {
              name: reg.applicant_name,
              partySize: reg.party_size,
              amount: reg.amount,
              orderNo: orderId,
            }),
          ]
        : []),
    ]);
  });

  return NextResponse.json({ success: true });
}
