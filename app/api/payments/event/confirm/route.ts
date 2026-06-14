import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { confirmPayment } from '@/lib/integrations/toss/confirm';
import { notifyEmail } from '@/lib/notify';
import { sendEventSms, sendEventEmail } from '@/lib/events/notify';
import { OH_YOON_MEMORIAL_PATH } from '@/content/events/oh-yoon-memorial';

/**
 * 행사(추도식) 결제 confirm.
 * 토스 승인 → confirm_event_registration RPC로 좌석 확정(원자적, hold 만료 시 재확인) →
 * 정원 초과(SOLD_OUT) 시 자동 환불 → 알림톡/이메일 발송.
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

  // 토스 승인
  const confirmResult = await confirmPayment(
    { paymentKey, orderId, amount },
    `event-confirm-${orderId}`,
    'domestic'
  );

  if (!confirmResult.success) {
    void notifyEmail('error', '추도식 결제 승인 실패', {
      주문번호: orderId,
      에러: confirmResult.error.message ?? '',
    });
    return NextResponse.json({ error: 'payment_confirmation_failed' }, { status: 400 });
  }

  const toss = confirmResult.data;

  // 이 행사는 카드 즉시결제만 지원. 가상계좌(WAITING_FOR_DEPOSIT) 등 비-DONE 상태는
  // 입금 전이므로 확정하지 않는다. (현 MID는 가상계좌 미계약이라 사실상 불발생 — 방어적 가드.)
  if (toss.status !== 'DONE') {
    void notifyEmail('warning', '추도식 비-DONE 결제 상태(미확정)', {
      주문번호: orderId,
      status: toss.status,
    });
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
    // 정원 초과 → 자동 환불 + 신청 취소
    if (c?.code === 'SOLD_OUT') {
      const { cancelPayment } = await import('@/lib/integrations/toss/cancel');
      try {
        await cancelPayment(
          toss.paymentKey,
          { cancelReason: '정원 초과 — 자동 환불' },
          `event-refund-${orderId}`,
          'domestic'
        );
      } catch (e) {
        console.error('[event-confirm] auto-refund failed:', e);
        void notifyEmail('error', '추도식 자동환불 실패(수동 확인 필요)', {
          주문번호: orderId,
          결제키: toss.paymentKey,
        });
      }
      await supabase
        .from('event_registrations')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('order_no', orderId);
      return NextResponse.json({ error: 'sold_out_refunded' }, { status: 409 });
    }
    console.error('[event-confirm] confirm rpc failed:', confErr ?? c?.code);
    return NextResponse.json({ error: 'confirm_failed' }, { status: 400 });
  }

  revalidatePath(OH_YOON_MEMORIAL_PATH);
  revalidatePath(`/en${OH_YOON_MEMORIAL_PATH}`);

  // 발송 (fire-and-forget)
  void notifyEmail('payment', '추도식 결제 완료', {
    신청자: reg.applicant_name,
    인원: String(reg.party_size),
    금액: String(reg.amount),
  });
  void sendEventSms(
    reg.phone,
    'payment_confirmed',
    { name: reg.applicant_name, partySize: reg.party_size, amount: reg.amount },
    orderId
  );
  if (reg.email) {
    void sendEventEmail(reg.email, 'payment_confirmed', {
      name: reg.applicant_name,
      partySize: reg.party_size,
      amount: reg.amount,
    });
  }

  return NextResponse.json({ success: true });
}
