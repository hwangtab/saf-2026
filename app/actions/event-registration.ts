'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { rateLimit } from '@/lib/rate-limit';
import { getRequestMetadata } from './request-metadata';
import { sendEventSms, sendEventEmail } from '@/lib/events/notify';
import { notifyEmail } from '@/lib/notify';
import { validateEventInput, type RegisterEventInput } from '@/lib/events/format';
import {
  OH_YOON_MEMORIAL_SLUG,
  OH_YOON_MEMORIAL_PATH,
  OH_YOON_MEMORIAL_HOLD_MINUTES,
} from '@/content/events/oh-yoon-memorial';

function normalizeRegisterEventInput(input: unknown): RegisterEventInput {
  const candidate =
    input && typeof input === 'object'
      ? (input as Partial<Record<keyof RegisterEventInput, unknown>>)
      : {};
  const rawPartySize = candidate.partySize;
  const partySize =
    typeof rawPartySize === 'number'
      ? rawPartySize
      : typeof rawPartySize === 'string'
        ? Number(rawPartySize)
        : 0;

  return {
    applicantName: typeof candidate.applicantName === 'string' ? candidate.applicantName : '',
    phone: typeof candidate.phone === 'string' ? candidate.phone : '',
    email: typeof candidate.email === 'string' ? candidate.email : '',
    partySize: Number.isFinite(partySize) ? partySize : 0,
    boardingConfirmed: candidate.boardingConfirmed === true,
    agreedPrivacy: candidate.agreedPrivacy === true,
  };
}

export async function registerEvent(input: unknown) {
  const payload = normalizeRegisterEventInput(input);
  const errors = validateEventInput(payload);
  if (Object.keys(errors).length > 0) {
    return { ok: false, code: 'INVALID_INPUT', errors, message: '입력을 확인해 주세요.' };
  }

  const meta = await getRequestMetadata();
  const ipKey = meta.ip ?? 'unknown-ip';
  const limit = await rateLimit(`event:register:${ipKey}`, { limit: 5, windowMs: 60_000 });
  if (!limit.success) {
    return { ok: false, code: 'RATE_LIMITED', message: '잠시 후 다시 시도해 주세요.' };
  }

  const name = payload.applicantName.trim();
  const phone = payload.phone.trim();
  const email = payload.email?.trim() ?? '';

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc('register_event_seat', {
    p_payload: {
      event_slug: OH_YOON_MEMORIAL_SLUG,
      applicant_name: name,
      phone,
      email,
      party_size: payload.partySize,
      boarding_confirmed: payload.boardingConfirmed,
      agreed_privacy: payload.agreedPrivacy,
      hold_minutes: OH_YOON_MEMORIAL_HOLD_MINUTES,
      user_agent: meta.userAgent ?? null,
    },
  });

  if (error) {
    console.error('[event-register] rpc error:', error);
    return { ok: false, code: 'INTERNAL_ERROR', message: '신청 처리 중 오류가 발생했습니다.' };
  }

  const r = data as {
    ok: boolean;
    code?: string;
    status?: string;
    order_no?: string;
    amount?: number;
  };

  if (!r.ok) {
    if (r.code === 'EVENT_CLOSED' || r.code === 'EVENT_NOT_FOUND') {
      return { ok: false, code: 'EVENT_CLOSED', message: '신청이 마감되었습니다.' };
    }
    return { ok: false, code: 'INTERNAL_ERROR', message: '신청 처리 중 오류가 발생했습니다.' };
  }

  revalidatePath(OH_YOON_MEMORIAL_PATH);
  revalidatePath(`/en${OH_YOON_MEMORIAL_PATH}`);

  if (r.status === 'waitlist') {
    // 대기자는 즉시 안내 (무료)
    void sendEventSms(phone, 'waitlist', {
      name,
      partySize: payload.partySize,
      amount: r.amount ?? 0,
    });
    if (email) {
      void sendEventEmail(email, 'waitlist', {
        name,
        partySize: payload.partySize,
        amount: r.amount ?? 0,
      });
    }
    // 관리자 알림 — 대기 신청도 접수 사실 통지
    void notifyEmail('info', '추도식 대기 신청 접수', {
      신청자: name,
      인원: `${input.partySize}명`,
      연락처: phone,
      명단: 'https://www.saf2026.com/admin/event/oh-yoon-memorial',
    });
    return { ok: true, code: 'OK_WAITLIST', message: '대기자로 등록되었습니다.' };
  }

  // pending → 결제창으로
  return {
    ok: true,
    code: 'OK_PENDING',
    payment: { orderNo: r.order_no!, amount: r.amount!, orderName: '오윤 40주기 추도식 회비' },
  };
}
