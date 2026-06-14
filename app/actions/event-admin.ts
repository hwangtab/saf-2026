'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { sendEventSms, sendEventEmail } from '@/lib/events/notify';
import {
  OH_YOON_MEMORIAL_SLUG,
  OH_YOON_MEMORIAL_ADMIN_PATH,
  OH_YOON_MEMORIAL_PATH,
} from '@/content/events/oh-yoon-memorial';

export interface EventAdminResult {
  ok: boolean;
  message?: string;
}

function revalidateEvent() {
  revalidatePath(OH_YOON_MEMORIAL_ADMIN_PATH);
  revalidatePath(OH_YOON_MEMORIAL_PATH);
  revalidatePath(`/en${OH_YOON_MEMORIAL_PATH}`);
}

/** 신청 취소(좌석 반환). 결제 환불은 토스 콘솔/별도 — v1은 상태만 cancelled. */
export async function cancelRegistration(id: string): Promise<EventAdminResult> {
  await requireAdmin();
  const db = createSupabaseAdminClient();
  const { error } = await db
    .from('event_registrations')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    console.error('[event-admin] cancel error:', error);
    return { ok: false, message: '취소 실패' };
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
  const { data: reg, error } = await db
    .from('event_registrations')
    .select('applicant_name, phone, email, party_size, amount, status')
    .eq('id', id)
    .single();
  if (error || !reg) return { ok: false, message: '대상 없음' };
  if (reg.status !== 'waitlist') return { ok: false, message: '대기자가 아닙니다' };

  const paymentUrl = `https://www.saf2026.com${OH_YOON_MEMORIAL_PATH}`;
  void sendEventSms(reg.phone, 'waitlist_payment', {
    name: reg.applicant_name,
    partySize: reg.party_size,
    amount: reg.amount,
    deadline: deadlineLabel,
    paymentUrl,
  });
  if (reg.email) {
    void sendEventEmail(reg.email, 'waitlist_payment', {
      name: reg.applicant_name,
      partySize: reg.party_size,
      amount: reg.amount,
      deadline: deadlineLabel,
      paymentUrl,
    });
  }
  return { ok: true };
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

  const header = '이름,휴대폰,이메일,인원,회비,결제시각';
  const rows = (data ?? []).map((r) =>
    [r.applicant_name, r.phone, r.email ?? '', r.party_size, r.amount, r.paid_at ?? '']
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(',')
  );
  return { ok: true, csv: [header, ...rows].join('\n') };
}
