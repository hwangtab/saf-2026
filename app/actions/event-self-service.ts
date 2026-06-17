'use server';

import crypto from 'crypto';
import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { rateLimit } from '@/lib/rate-limit';
import { getRequestMetadata } from './request-metadata';
import { sendSolapiSms } from '@/lib/sms/solapi';
import { cancelPayment } from '@/lib/integrations/toss/cancel';
import { notifyEmail } from '@/lib/notify';
import {
  OH_YOON_MEMORIAL_SLUG,
  OH_YOON_MEMORIAL_PATH,
  OH_YOON_MEMORIAL_ADMIN_PATH,
  OH_YOON_MEMORIAL_REFUND_DEADLINE,
} from '@/content/events/oh-yoon-memorial';

const digits = (s: string) => (s ?? '').replace(/\D/g, '');
const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function isRefundOpen(): boolean {
  return Date.now() <= Date.parse(OH_YOON_MEMORIAL_REFUND_DEADLINE);
}

export interface EventRegistrationView {
  applicantName: string;
  partySize: number;
  amount: number;
  status: 'pending' | 'confirmed' | 'waitlist' | 'cancelled' | 'expired' | 'awaiting_deposit';
  refundable: boolean;
  refundClosed: boolean;
  /** 무통장 입금대기(미결제) — 환불 없이 본인 취소 가능. */
  cancellable: boolean;
}

export type EventSelfCode =
  | 'OK'
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'INVALID_CODE'
  | 'CODE_EXPIRED'
  | 'NOT_REFUNDABLE'
  | 'REFUND_CLOSED'
  | 'REFUND_FAILED'
  | 'INTERNAL_ERROR';

export interface EventSelfResult {
  ok: boolean;
  code: EventSelfCode;
  message?: string;
  registration?: EventRegistrationView;
}

/** 휴대폰으로 확정 신청을 찾아 6자리 인증번호를 문자로 발송. */
export async function requestEventRefundCode(phoneRaw: string): Promise<EventSelfResult> {
  const phone = digits(phoneRaw);
  if (phone.length < 9) {
    return { ok: false, code: 'INVALID_INPUT', message: '휴대폰 번호를 확인해 주세요.' };
  }

  const meta = await getRequestMetadata();
  const ipLimit = await rateLimit(`event:code:ip:${meta.ip ?? 'unknown'}`, {
    limit: 5,
    windowMs: 10 * 60_000,
  });
  const phoneLimit = await rateLimit(`event:code:phone:${phone}`, {
    limit: 3,
    windowMs: 10 * 60_000,
  });
  if (!ipLimit.success || !phoneLimit.success) {
    return { ok: false, code: 'RATE_LIMITED', message: '잠시 후 다시 시도해 주세요.' };
  }

  const supabase = createSupabaseAdminClient();
  // 해당 번호의 조회·취소 가능 신청 존재 확인 (없으면 발송하지 않음 — 문자 폭탄 방지).
  // confirmed(결제완료, 환불 대상) + awaiting_deposit(무통장 미입금, 취소 대상) 모두 포함.
  const { data: regs, error } = await supabase
    .from('event_registrations')
    .select('id, phone, status')
    .eq('event_slug', OH_YOON_MEMORIAL_SLUG)
    .in('status', ['confirmed', 'awaiting_deposit']);
  if (error) {
    console.error('[event-self] code lookup error:', error);
    return { ok: false, code: 'INTERNAL_ERROR', message: '처리 중 오류가 발생했습니다.' };
  }
  const matched = (regs ?? []).some((r) => digits(r.phone) === phone);
  if (!matched) {
    return {
      ok: false,
      code: 'NOT_FOUND',
      message: '해당 번호로 조회 가능한 신청을 찾을 수 없습니다.',
    };
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  // 이전 미사용 코드 무효화 후 새 코드 저장
  await supabase
    .from('event_phone_verifications')
    .update({ consumed: true })
    .eq('event_slug', OH_YOON_MEMORIAL_SLUG)
    .eq('phone', phone)
    .eq('consumed', false);
  const { error: insErr } = await supabase.from('event_phone_verifications').insert({
    event_slug: OH_YOON_MEMORIAL_SLUG,
    phone,
    code,
    expires_at: expiresAt,
  });
  if (insErr) {
    console.error('[event-self] code insert error:', insErr);
    return { ok: false, code: 'INTERNAL_ERROR', message: '처리 중 오류가 발생했습니다.' };
  }

  const sms = await sendSolapiSms({
    to: phone,
    text: `[씨앗페] 오윤 추도식 신청 조회·취소 인증번호 ${code} (5분 내 입력)`,
  });
  // 'not-configured'(env 미설정 dev)는 통과, 그 외 발송 실패만 에러
  if (!sms.ok && sms.error !== 'not-configured') {
    return { ok: false, code: 'INTERNAL_ERROR', message: '인증번호 발송에 실패했습니다.' };
  }

  return { ok: true, code: 'OK', message: '인증번호를 문자로 보냈습니다.' };
}

/** 인증번호 검증 — 유효하면 신청 정보 반환(소비하지 않음, 환불 단계에서 재검증). */
async function verifyCode(
  phone: string,
  codeInput: string
): Promise<{ ok: true } | { ok: false; result: EventSelfResult }> {
  const supabase = createSupabaseAdminClient();
  const { data: row } = await supabase
    .from('event_phone_verifications')
    .select('id, code, attempts, consumed, expires_at')
    .eq('event_slug', OH_YOON_MEMORIAL_SLUG)
    .eq('phone', phone)
    .eq('consumed', false)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!row) {
    return {
      ok: false,
      result: { ok: false, code: 'INVALID_CODE', message: '인증번호를 다시 받아 주세요.' },
    };
  }
  if (Date.parse(row.expires_at) < Date.now()) {
    return {
      ok: false,
      result: {
        ok: false,
        code: 'CODE_EXPIRED',
        message: '인증번호가 만료되었습니다. 다시 받아 주세요.',
      },
    };
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    return {
      ok: false,
      result: {
        ok: false,
        code: 'INVALID_CODE',
        message: '시도 횟수를 초과했습니다. 다시 받아 주세요.',
      },
    };
  }
  if (row.code !== codeInput) {
    await supabase
      .from('event_phone_verifications')
      .update({ attempts: row.attempts + 1 })
      .eq('id', row.id);
    return {
      ok: false,
      result: { ok: false, code: 'INVALID_CODE', message: '인증번호가 일치하지 않습니다.' },
    };
  }
  return { ok: true };
}

function viewOf(reg: {
  applicant_name: string;
  party_size: number;
  amount: number;
  status: string;
}): EventRegistrationView {
  const status = reg.status as EventRegistrationView['status'];
  const open = isRefundOpen();
  return {
    applicantName: reg.applicant_name,
    partySize: reg.party_size,
    amount: reg.amount,
    status,
    refundable: status === 'confirmed' && open,
    refundClosed: status === 'confirmed' && !open,
    // 무통장 미입금은 결제 전이라 환불 없이 언제든 본인 취소 가능(좌석만 반납).
    cancellable: status === 'awaiting_deposit',
  };
}

/** 인증번호 확인 후 본인 신청 조회. */
export async function verifyEventRefundCode(
  phoneRaw: string,
  codeRaw: string
): Promise<EventSelfResult> {
  const phone = digits(phoneRaw);
  const codeInput = digits(codeRaw);
  if (phone.length < 9 || codeInput.length !== 6) {
    return { ok: false, code: 'INVALID_INPUT', message: '휴대폰 번호와 인증번호를 확인해 주세요.' };
  }

  const meta = await getRequestMetadata();
  const limit = await rateLimit(`event:verify:${meta.ip ?? 'unknown'}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!limit.success)
    return { ok: false, code: 'RATE_LIMITED', message: '잠시 후 다시 시도해 주세요.' };

  const verified = await verifyCode(phone, codeInput);
  if (!verified.ok) return verified.result;

  const supabase = createSupabaseAdminClient();
  const { data: regs } = await supabase
    .from('event_registrations')
    .select('applicant_name, phone, party_size, amount, status, created_at')
    .eq('event_slug', OH_YOON_MEMORIAL_SLUG)
    .in('status', ['confirmed', 'awaiting_deposit'])
    .order('created_at', { ascending: false });
  const reg = (regs ?? []).find((r) => digits(r.phone) === phone);
  if (!reg) return { ok: false, code: 'NOT_FOUND', message: '신청 내역을 찾을 수 없습니다.' };

  return { ok: true, code: 'OK', registration: viewOf(reg) };
}

/** 인증번호 재확인 후 본인 즉시 환불(토스 자동환불 + 좌석 반납). */
export async function selfRefundEventRegistration(
  phoneRaw: string,
  codeRaw: string
): Promise<EventSelfResult> {
  const phone = digits(phoneRaw);
  const codeInput = digits(codeRaw);
  if (phone.length < 9 || codeInput.length !== 6) {
    return { ok: false, code: 'INVALID_INPUT', message: '휴대폰 번호와 인증번호를 확인해 주세요.' };
  }

  const meta = await getRequestMetadata();
  const limit = await rateLimit(`event:refund:${meta.ip ?? 'unknown'}`, {
    limit: 5,
    windowMs: 60_000,
  });
  if (!limit.success)
    return { ok: false, code: 'RATE_LIMITED', message: '잠시 후 다시 시도해 주세요.' };

  const verified = await verifyCode(phone, codeInput);
  if (!verified.ok) return verified.result;

  const supabase = createSupabaseAdminClient();
  const { data: regs } = await supabase
    .from('event_registrations')
    .select('id, order_no, phone, applicant_name, party_size, amount, status, payment_key')
    .eq('event_slug', OH_YOON_MEMORIAL_SLUG)
    .in('status', ['confirmed', 'awaiting_deposit'])
    .order('created_at', { ascending: false });
  const reg = (regs ?? []).find((r) => digits(r.phone) === phone);
  if (!reg)
    return { ok: false, code: 'NOT_REFUNDABLE', message: '취소 가능한 신청을 찾을 수 없습니다.' };

  // 무통장 입금대기(미결제) — 토스 환불 없이 좌석만 반납하고 취소.
  if (reg.status === 'awaiting_deposit') {
    const { data: cancelled, error: cancelErr } = await supabase
      .from('event_registrations')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', reg.id)
      .eq('status', 'awaiting_deposit')
      .select('id');
    if (cancelErr || !cancelled || cancelled.length === 0) {
      return {
        ok: false,
        code: 'INTERNAL_ERROR',
        message: '취소 처리 중 문제가 발생했습니다. 사무국으로 문의해 주세요.',
      };
    }
    await supabase
      .from('event_phone_verifications')
      .update({ consumed: true })
      .eq('event_slug', OH_YOON_MEMORIAL_SLUG)
      .eq('phone', phone)
      .eq('consumed', false);

    revalidatePath(OH_YOON_MEMORIAL_PATH);
    revalidatePath(`/en${OH_YOON_MEMORIAL_PATH}`);
    revalidatePath(OH_YOON_MEMORIAL_ADMIN_PATH);

    after(() =>
      notifyEmail('info', '추도식 무통장 신청 본인 취소', {
        신청자: reg.applicant_name,
        주문번호: reg.order_no ?? '',
        인원: `${reg.party_size}명`,
      })
    );

    return {
      ok: true,
      code: 'OK',
      message: '신청이 취소되었습니다.',
      registration: viewOf({ ...reg, status: 'cancelled' }),
    };
  }

  if (!isRefundOpen()) {
    return {
      ok: false,
      code: 'REFUND_CLOSED',
      message:
        '자가 환불 기한(7월 2일)이 지났습니다. 사무국(contact@kosmart.org)으로 문의해 주세요.',
    };
  }
  if (!reg.payment_key) {
    return {
      ok: false,
      code: 'REFUND_FAILED',
      message: '결제 정보를 찾을 수 없어 사무국 확인이 필요합니다.',
    };
  }

  let cancel: Awaited<ReturnType<typeof cancelPayment>>;
  try {
    cancel = await cancelPayment(
      reg.payment_key,
      { cancelReason: '본인 추도식 참가 취소' },
      `event-self-refund-${reg.order_no ?? reg.id}`,
      'domestic'
    );
  } catch (e) {
    console.error('[event-self] toss cancel error:', e);
    return { ok: false, code: 'REFUND_FAILED', message: '환불 요청 중 오류가 발생했습니다.' };
  }
  if (!cancel.success) {
    return {
      ok: false,
      code: 'REFUND_FAILED',
      message: '환불에 실패했습니다. 사무국으로 문의해 주세요.',
    };
  }

  const { data: updated, error: updErr } = await supabase
    .from('event_registrations')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', reg.id)
    .eq('status', 'confirmed')
    .select('id');

  if (updErr || !updated || updated.length === 0) {
    after(() =>
      notifyEmail('error', '추도식 본인환불 성공 후 상태 변경 실패', {
        주문번호: reg.order_no ?? '',
        결제키: reg.payment_key ?? '',
      })
    );
    return {
      ok: false,
      code: 'REFUND_FAILED',
      message: '환불 후 처리에 문제가 있어 사무국이 확인합니다.',
    };
  }

  // 인증번호 소비
  await supabase
    .from('event_phone_verifications')
    .update({ consumed: true })
    .eq('event_slug', OH_YOON_MEMORIAL_SLUG)
    .eq('phone', phone)
    .eq('consumed', false);

  revalidatePath(OH_YOON_MEMORIAL_PATH);
  revalidatePath(`/en${OH_YOON_MEMORIAL_PATH}`);
  revalidatePath(OH_YOON_MEMORIAL_ADMIN_PATH);

  after(() =>
    notifyEmail('info', '추도식 본인 환불 완료', {
      신청자: reg.applicant_name,
      주문번호: reg.order_no ?? '',
      환불금액: `${reg.amount.toLocaleString('ko-KR')}원`,
    })
  );

  return {
    ok: true,
    code: 'OK',
    message: '환불이 완료되었습니다.',
    registration: viewOf({ ...reg, status: 'cancelled' }),
  };
}
