'use server';

import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { rateLimit } from '@/lib/rate-limit';
import { getRequestMetadata } from './request-metadata';
import { sendEventSms, sendEventEmail } from '@/lib/events/notify';
import { notifyEmail } from '@/lib/notify';
import { validateEventInput, type RegisterEventInput } from '@/lib/events/format';
import { runAllSettled } from '@/lib/server/after-response';
import {
  OH_YOON_MEMORIAL_SLUG,
  OH_YOON_MEMORIAL_PATH,
  OH_YOON_MEMORIAL_HOLD_MINUTES,
  OH_YOON_MEMORIAL_BANK,
  OH_YOON_MEMORIAL_BANK_ACCOUNT,
  OH_YOON_MEMORIAL_BANK_HOLDER,
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
    paymentMethod: candidate.paymentMethod === 'transfer' ? 'transfer' : 'card',
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

  const isTransfer = payload.paymentMethod === 'transfer';
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.rpc(
    isTransfer ? 'register_event_bank_transfer' : 'register_event_seat',
    {
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
    }
  );

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
    if (r.code === 'DUPLICATE_DEPOSIT') {
      // 같은 번호로 이미 입금 대기 중인 신청이 있음 (좌석 중복 점유 방지).
      return {
        ok: false,
        code: 'DUPLICATE_DEPOSIT',
        message:
          '이미 입금 대기 중인 신청이 있습니다. 입금이 확인되면 확정되며, 변경이 필요하면 사무국으로 문의해 주세요.',
      };
    }
    return { ok: false, code: 'INTERNAL_ERROR', message: '신청 처리 중 오류가 발생했습니다.' };
  }

  revalidatePath(OH_YOON_MEMORIAL_PATH);
  revalidatePath(`/en${OH_YOON_MEMORIAL_PATH}`);

  if (r.status === 'waitlist') {
    // 대기자 안내(무료) + 관리자 알림. ⚠️ after()로 감싸지 않으면 Server Action 응답 반환 시
    // 함수가 정지하며 in-flight Resend/Solapi fetch가 abort되어 누락된다(2026-06-16 회귀).
    after(async () => {
      await runAllSettled('eventRegistration.waitlist.notifications', [
        () =>
          sendEventSms(phone, 'waitlist', {
            name,
            partySize: payload.partySize,
            amount: r.amount ?? 0,
          }),
        ...(email
          ? [
              () =>
                sendEventEmail(email, 'waitlist', {
                  name,
                  partySize: payload.partySize,
                  amount: r.amount ?? 0,
                }),
            ]
          : []),
        // 관리자 알림 — 대기 신청도 접수 사실 통지
        () =>
          notifyEmail('info', '추도식 대기 신청 접수', {
            신청자: name,
            인원: `${payload.partySize}명`,
            연락처: phone,
            명단: 'https://www.saf2026.com/admin/event/oh-yoon-memorial',
          }),
      ]);
    });
    return { ok: true, code: 'OK_WAITLIST', message: '대기자로 등록되었습니다.' };
  }

  // 무통장입금(awaiting_deposit) → 입금 안내. 좌석은 이미 확보됨.
  if (r.status === 'awaiting_deposit') {
    const amount = r.amount ?? payload.partySize * 30000;
    after(async () => {
      await runAllSettled('eventRegistration.depositPending.notifications', [
        () =>
          sendEventSms(phone, 'deposit_pending', { name, partySize: payload.partySize, amount }),
        ...(email
          ? [
              () =>
                sendEventEmail(email, 'deposit_pending', {
                  name,
                  partySize: payload.partySize,
                  amount,
                  orderNo: r.order_no,
                }),
            ]
          : []),
        // 관리자 알림 — 무통장 신청 접수(입금 대기)
        () =>
          notifyEmail('info', '추도식 무통장 신청 접수(입금 대기)', {
            신청자: name,
            인원: `${payload.partySize}명`,
            회비: `${amount.toLocaleString('ko-KR')}원`,
            연락처: phone,
            주문번호: r.order_no ?? '',
            명단: 'https://www.saf2026.com/admin/event/oh-yoon-memorial',
          }),
      ]);
    });
    return {
      ok: true,
      code: 'OK_DEPOSIT',
      deposit: {
        orderNo: r.order_no!,
        amount,
        bank: OH_YOON_MEMORIAL_BANK,
        account: OH_YOON_MEMORIAL_BANK_ACCOUNT,
        holder: OH_YOON_MEMORIAL_BANK_HOLDER,
      },
    };
  }

  // pending → 결제창으로 (카드)
  return {
    ok: true,
    code: 'OK_PENDING',
    payment: { orderNo: r.order_no!, amount: r.amount!, orderName: '오윤 40주기 추도식 회비' },
  };
}
