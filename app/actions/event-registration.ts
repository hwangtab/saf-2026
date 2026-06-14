'use server';

import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { rateLimit } from '@/lib/rate-limit';
import { getRequestMetadata } from './request-metadata';
import { sendEventSms, sendEventEmail } from '@/lib/events/notify';
import { validateEventInput, type RegisterEventInput } from '@/lib/events/format';
import {
  OH_YOON_MEMORIAL_SLUG,
  OH_YOON_MEMORIAL_PATH,
  OH_YOON_MEMORIAL_HOLD_MINUTES,
} from '@/content/events/oh-yoon-memorial';

export type { RegisterEventInput };

export type RegisterEventCode =
  | 'OK_PENDING'
  | 'OK_WAITLIST'
  | 'INVALID_INPUT'
  | 'RATE_LIMITED'
  | 'EVENT_CLOSED'
  | 'INTERNAL_ERROR';

export interface RegisterEventResult {
  ok: boolean;
  code: RegisterEventCode;
  errors?: Partial<Record<keyof RegisterEventInput, string>>;
  message?: string;
  /** pending(결제대기)일 때 토스 결제 진행용 */
  payment?: { orderNo: string; amount: number; orderName: string };
}

export async function registerEvent(input: RegisterEventInput): Promise<RegisterEventResult> {
  const errors = validateEventInput(input);
  if (Object.keys(errors).length > 0) {
    return { ok: false, code: 'INVALID_INPUT', errors, message: '입력을 확인해 주세요.' };
  }

  const meta = await getRequestMetadata();
  const ipKey = meta.ip ?? 'unknown-ip';
  const limit = await rateLimit(`event:register:${ipKey}`, { limit: 5, windowMs: 60_000 });
  if (!limit.success) {
    return { ok: false, code: 'RATE_LIMITED', message: '잠시 후 다시 시도해 주세요.' };
  }

  const name = input.applicantName.trim();
  const phone = input.phone.trim();
  const email = input.email?.trim() ?? '';

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc('register_event_seat', {
    p_payload: {
      event_slug: OH_YOON_MEMORIAL_SLUG,
      applicant_name: name,
      phone,
      email,
      party_size: input.partySize,
      boarding_confirmed: input.boardingConfirmed,
      agreed_privacy: input.agreedPrivacy,
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
      partySize: input.partySize,
      amount: r.amount ?? 0,
    });
    if (email) {
      void sendEventEmail(email, 'waitlist', {
        name,
        partySize: input.partySize,
        amount: r.amount ?? 0,
      });
    }
    return { ok: true, code: 'OK_WAITLIST', message: '대기자로 등록되었습니다.' };
  }

  // pending → 결제창으로
  return {
    ok: true,
    code: 'OK_PENDING',
    payment: { orderNo: r.order_no!, amount: r.amount!, orderName: '오윤 40주기 추도식 회비' },
  };
}
