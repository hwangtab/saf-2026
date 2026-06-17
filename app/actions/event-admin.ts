'use server';

import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { sendEventSms, sendEventEmail } from '@/lib/events/notify';
import { cancelPayment } from '@/lib/integrations/toss/cancel';
import { notifyEmail } from '@/lib/notify';
import { runAllSettled } from '@/lib/server/after-response';
import {
  OH_YOON_MEMORIAL_SLUG,
  OH_YOON_MEMORIAL_ADMIN_PATH,
  OH_YOON_MEMORIAL_PATH,
  OH_YOON_MEMORIAL_HOLD_MINUTES,
} from '@/content/events/oh-yoon-memorial';

interface EventAdminResult {
  ok: boolean;
  message?: string;
}

function revalidateEvent() {
  revalidatePath(OH_YOON_MEMORIAL_ADMIN_PATH);
  revalidatePath(OH_YOON_MEMORIAL_PATH);
  revalidatePath(`/en${OH_YOON_MEMORIAL_PATH}`);
}

/**
 * 미결제/대기/입금대기 신청 취소(좌석 반환). 확정 결제자는 refundConfirmedRegistration만 허용.
 * awaiting_deposit(무통장 미입금)은 토스 결제가 없으므로 환불 없이 바로 취소 가능.
 */
export async function cancelRegistration(id: string): Promise<EventAdminResult> {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  const { data: updated, error } = await db
    .from('event_registrations')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id)
    .in('status', ['pending', 'waitlist', 'awaiting_deposit'])
    .select('id');
  if (error) {
    console.error('[event-admin] cancel error:', error);
    return { ok: false, message: '취소 실패' };
  }
  if (!updated || updated.length === 0) {
    return { ok: false, message: '확정 결제자는 환불 취소를 사용해 주세요.' };
  }
  revalidateEvent();
  return { ok: true };
}

/** 무통장입금 신청 입금확인 → 확정. awaiting_deposit → confirmed + 확정 안내 발송. */
export async function confirmBankTransferDeposit(id: string): Promise<EventAdminResult> {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  const { data, error } = await db.rpc('confirm_event_bank_transfer', { p_id: id });
  if (error) {
    console.error('[event-admin] confirm bank transfer error:', error);
    return { ok: false, message: '입금확인 처리 실패' };
  }
  const c = data as {
    ok: boolean;
    code?: string;
    applicant_name?: string;
    party_size?: number;
    amount?: number;
    phone?: string;
    email?: string | null;
    order_no?: string;
  } | null;
  if (!c?.ok) {
    const message =
      c?.code === 'NOT_FOUND'
        ? '대상 신청을 찾을 수 없습니다.'
        : c?.code === 'INVALID_STATE'
          ? '입금대기(무통장) 상태가 아닙니다.'
          : '입금확인 처리 실패';
    return { ok: false, message };
  }

  if (c.code !== 'ALREADY_CONFIRMED') {
    const name = c.applicant_name ?? '';
    const partySize = c.party_size ?? 1;
    const amount = c.amount ?? 0;
    after(async () => {
      await runAllSettled('eventAdmin.confirmBankTransfer.notifications', [
        () => sendEventSms(c.phone, 'payment_confirmed', { name, partySize, amount }, c.order_no),
        ...(c.email
          ? [
              () =>
                sendEventEmail(c.email, 'payment_confirmed', {
                  name,
                  partySize,
                  amount,
                  orderNo: c.order_no,
                }),
            ]
          : []),
        () =>
          notifyEmail('payment', '추도식 무통장 입금확인(확정)', {
            신청자: name,
            인원: `${partySize}명`,
            회비: `${amount.toLocaleString('ko-KR')}원`,
            주문번호: c.order_no ?? '',
            명단: 'https://www.saf2026.com/admin/event/oh-yoon-memorial',
          }),
      ]);
    });
  }

  revalidateEvent();
  return { ok: true };
}

/** 확정 결제자 환불 후 취소. */
export async function refundConfirmedRegistration(id: string): Promise<EventAdminResult> {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  const { data: reg, error } = await db
    .from('event_registrations')
    .select('id, applicant_name, order_no, payment_key, status')
    .eq('id', id)
    .single();

  if (error || !reg) return { ok: false, message: '대상 없음' };
  const canRefund = reg.status === 'confirmed' || (reg.status === 'expired' && reg.payment_key);
  if (!canRefund) return { ok: false, message: '환불 가능한 결제 상태가 아닙니다.' };
  if (!reg.payment_key) return { ok: false, message: '결제키가 없어 자동 환불할 수 없습니다.' };

  const now = new Date().toISOString();
  let cancelResult: Awaited<ReturnType<typeof cancelPayment>>;
  try {
    cancelResult = await cancelPayment(
      reg.payment_key,
      { cancelReason: '관리자 추도식 참가 취소' },
      `event-admin-refund-${reg.order_no ?? reg.id}`,
      'domestic'
    );
  } catch (e) {
    console.error('[event-admin] refund toss cancel error:', e);
    return { ok: false, message: '토스 환불 요청 중 오류가 발생했습니다.' };
  }

  if (!cancelResult.success) {
    return {
      ok: false,
      message: `토스 환불 실패: ${cancelResult.error.message || cancelResult.error.code}`,
    };
  }

  const { data: updated, error: updateError } = await db
    .from('event_registrations')
    .update({ status: 'cancelled', updated_at: now })
    .eq('id', id)
    .in('status', ['confirmed', 'expired'])
    .select('id');

  if (updateError || !updated || updated.length === 0) {
    console.error('[event-admin] refund status update error:', updateError);
    after(() =>
      notifyEmail('error', '추도식 환불 성공 후 상태 변경 실패', {
        신청자: reg.applicant_name,
        주문번호: reg.order_no ?? '',
        결제키: reg.payment_key ?? '',
      })
    );
    return { ok: false, message: '환불 후 상태 변경 실패' };
  }

  revalidateEvent();
  return { ok: true };
}

/** 대기자에게 결제 안내 발송(좌석은 결제 시 확정). */
export async function sendWaitlistPaymentLink(
  id: string,
  deadlineLabel: string
): Promise<EventAdminResult> {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  const { data: promoted, error: promoteError } = await db.rpc(
    'promote_waitlist_event_registration',
    {
      p_id: id,
      p_hold_minutes: OH_YOON_MEMORIAL_HOLD_MINUTES,
    }
  );
  if (promoteError) {
    console.error('[event-admin] waitlist promote error:', promoteError);
    return { ok: false, message: '대기자 승격 실패' };
  }
  const p = promoted as {
    ok: boolean;
    code?: string;
    order_no?: string;
    amount?: number;
    party_size?: number;
    applicant_name?: string;
    phone?: string;
    email?: string | null;
  } | null;
  if (!p?.ok || !p.order_no) {
    const message =
      p?.code === 'SOLD_OUT'
        ? '잔여석이 부족합니다.'
        : p?.code === 'INVALID_STATE'
          ? '대기자 상태가 아닙니다.'
          : '결제 안내를 만들 수 없습니다.';
    return { ok: false, message };
  }

  if (!p.phone) return { ok: false, message: '연락처 없음' };

  const paymentUrl = `https://www.saf2026.com${OH_YOON_MEMORIAL_PATH}?eventOrderNo=${encodeURIComponent(p.order_no)}`;
  const notifyData = {
    name: p.applicant_name ?? '',
    partySize: p.party_size ?? 1,
    amount: p.amount ?? 0,
    deadline: deadlineLabel,
    paymentUrl,
  };
  const smsResult = await sendEventSms(p.phone, 'waitlist_payment', notifyData);
  if (!smsResult.ok) {
    const { error: rollbackError } = await db
      .from('event_registrations')
      .update({
        status: 'waitlist',
        order_no: null,
        hold_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', 'pending');
    if (rollbackError) {
      console.error('[event-admin] waitlist promote rollback error:', rollbackError);
      after(() =>
        notifyEmail('error', '추도식 대기자 안내 실패 후 상태 복구 실패', {
          신청ID: id,
          주문번호: p.order_no ?? '',
        })
      );
      return { ok: false, message: '문자 발송 실패 및 상태 복구 실패' };
    }
    revalidateEvent();
    return { ok: false, message: '문자 발송 실패로 대기 상태를 유지했습니다.' };
  }
  if (p.email) {
    after(() =>
      runAllSettled('eventAdmin.promoteWaitlist.email', [
        () => sendEventEmail(p.email!, 'waitlist_payment', notifyData),
      ])
    );
  }
  revalidateEvent();
  return { ok: true };
}

export async function cancelEventPendingPayment(
  orderNo: string,
  failureCode: string | null | undefined
): Promise<EventAdminResult> {
  if (!/^EVT-[A-F0-9]{16}$/.test(orderNo) || !failureCode) {
    return { ok: false, message: '취소할 결제 대상을 확인할 수 없습니다.' };
  }

  try {
    const db = createSupabaseAdminClient();
    const { data: updated, error } = await db
      .from('event_registrations')
      .update({
        status: 'cancelled',
        hold_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('order_no', orderNo)
      .eq('event_slug', OH_YOON_MEMORIAL_SLUG)
      .eq('status', 'pending')
      .select('id');
    if (error) {
      console.error('[event-admin] pending payment cancel error:', error);
      return { ok: false, message: '결제대기 취소 실패' };
    }
    if (!updated || updated.length === 0) {
      return { ok: false, message: '이미 처리되었거나 결제대기 상태가 아닙니다.' };
    }
    revalidateEvent();
    return { ok: true };
  } catch (e) {
    console.error('[event-admin] pending payment cancel exception:', e);
    return { ok: false, message: '결제대기 취소 실패' };
  }
}

export async function resumeEventPayment(orderNo: string): Promise<
  | {
      ok: true;
      payment: {
        orderNo: string;
        amount: number;
        orderName: string;
        customerName: string;
        customerEmail?: string;
      };
    }
  | { ok: false; message: string }
> {
  if (!/^EVT-[A-F0-9]{16}$/.test(orderNo)) {
    return { ok: false, message: '결제 링크가 올바르지 않습니다.' };
  }

  try {
    const db = createSupabaseAdminClient();
    const { data: reg, error } = await db
      .from('event_registrations')
      .select('applicant_name, email, amount, status, hold_expires_at')
      .eq('order_no', orderNo)
      .eq('event_slug', OH_YOON_MEMORIAL_SLUG)
      .single();

    if (error || !reg) return { ok: false, message: '결제 대상을 찾을 수 없습니다.' };
    if (reg.status !== 'pending') return { ok: false, message: '결제 가능한 상태가 아닙니다.' };
    if (reg.hold_expires_at && new Date(reg.hold_expires_at).getTime() <= Date.now()) {
      const { data: restored, error: restoreError } = await db
        .from('event_registrations')
        .update({
          status: 'waitlist',
          order_no: null,
          hold_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('order_no', orderNo)
        .eq('event_slug', OH_YOON_MEMORIAL_SLUG)
        .eq('status', 'pending')
        .select('id');
      if (restoreError) {
        console.error('[event-admin] expired payment restore error:', restoreError);
        return { ok: false, message: '결제 가능 시간이 만료되었습니다.' };
      }
      if (restored && restored.length > 0) {
        revalidateEvent();
      }
      return { ok: false, message: '결제 가능 시간이 만료되어 대기 상태로 돌아갔습니다.' };
    }

    return {
      ok: true,
      payment: {
        orderNo,
        amount: reg.amount,
        orderName: '오윤 40주기 추도식 회비',
        customerName: reg.applicant_name,
        ...(reg.email ? { customerEmail: reg.email } : {}),
      },
    };
  } catch (e) {
    console.error('[event-admin] resume payment error:', e);
    return { ok: false, message: '결제 정보를 확인할 수 없습니다.' };
  }
}

/** 정원 조정. */
export async function updateCapacity(capacity: number): Promise<EventAdminResult> {
  await requireAdmin();
  if (!Number.isInteger(capacity) || capacity < 0) return { ok: false, message: '정원 값 오류' };
  const db = createSupabaseAdminClient();
  const { error } = await db
    .from('events')
    .update({ capacity, updated_at: new Date().toISOString() })
    .eq('slug', OH_YOON_MEMORIAL_SLUG);
  if (error) {
    console.error('[event-admin] capacity error:', error);
    return { ok: false, message: '정원 변경 실패' };
  }
  revalidateEvent();
  return { ok: true };
}

/** CSV: 확정 참가자 명단(버스/점심 예약용). */
export async function exportConfirmedCsv(): Promise<{ ok: boolean; csv?: string }> {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  const { data } = await db
    .from('event_registrations')
    .select('applicant_name, phone, email, party_size, amount, paid_at')
    .eq('event_slug', OH_YOON_MEMORIAL_SLUG)
    .eq('status', 'confirmed')
    .order('paid_at', { ascending: true });

  // CSV 수식 인젝션 방지: =,+,-,@,탭,캐리지리턴 으로 시작하는 셀은 작은따옴표 prefix.
  const csvCell = (c: unknown): string => {
    const s = String(c ?? '');
    const guarded = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return `"${guarded.replace(/"/g, '""')}"`;
  };

  const header = '이름,휴대폰,이메일,인원,회비,결제시각';
  const rows = (data ?? []).map((r) =>
    [r.applicant_name, r.phone, r.email ?? '', r.party_size, r.amount, r.paid_at ?? '']
      .map(csvCell)
      .join(',')
  );
  return { ok: true, csv: [header, ...rows].join('\n') };
}
