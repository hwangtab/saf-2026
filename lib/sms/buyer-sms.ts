import { createSupabaseAdminClient } from '@/lib/auth/server';
import { normalizeKoreanMobile } from '@/lib/sms/phone';
import { sendSolapiSms } from '@/lib/sms/solapi';

export type BuyerSmsType =
  | 'payment_confirmed'
  | 'virtual_account_issued'
  | 'deposit_confirmed'
  | 'shipped'
  | 'delivered'
  | 'refunded'
  | 'auto_cancelled';

export interface BuyerSmsData {
  buyerName: string;
  artworkTitle: string;
  amount: number;
  virtualAccount?: { bankName?: string; accountNumber?: string; dueDate?: string };
  carrier?: string;
  trackingNumber?: string;
}

const won = (n: number) => `₩${(n ?? 0).toLocaleString('ko-KR')}`;

/**
 * 타입별 정보성 SMS 본문.
 * - ko: [씨앗페] 접두어. en: [Seed Art Festival] 접두어.
 * - 금액은 원화 거래이므로 두 locale 모두 ₩ 유지.
 */
export function buildSmsText(
  type: BuyerSmsType,
  data: BuyerSmsData,
  locale: 'ko' | 'en' = 'ko'
): string {
  if (locale === 'en') return buildSmsTextEn(type, data);
  switch (type) {
    case 'payment_confirmed':
      return `[씨앗페] ${data.buyerName}님, '${data.artworkTitle}' 결제(${won(data.amount)})가 완료되었습니다. 감사합니다.`;
    case 'virtual_account_issued': {
      const va = data.virtualAccount ?? {};
      const due = va.dueDate ? ` / 기한 ${va.dueDate}` : '';
      const greeting = data.buyerName ? `${data.buyerName}님, ` : '';
      return `[씨앗페] ${greeting}입금안내: ${va.bankName ?? ''} ${va.accountNumber ?? ''} / ${won(data.amount)}${due}`;
    }
    case 'deposit_confirmed':
      return `[씨앗페] ${data.buyerName}님, 입금이 확인되었습니다. 작품을 준비합니다.`;
    case 'shipped': {
      const carrier = data.carrier ? ` ${data.carrier}` : '';
      const tracking = data.trackingNumber ? ` ${data.trackingNumber}` : '';
      return `[씨앗페] '${data.artworkTitle}' 발송완료.${carrier}${tracking}`;
    }
    case 'delivered':
      return `[씨앗페] '${data.artworkTitle}' 배송이 완료되었습니다.`;
    case 'refunded':
      return `[씨앗페] ${won(data.amount)} 환불이 처리되었습니다.`;
    case 'auto_cancelled':
      return `[씨앗페] 주문이 자동취소되었습니다.`;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

/** 영문 트랜잭션 SMS 본문. 접두어 [Seed Art Festival], 금액은 ₩ 유지 (원화 거래). */
function buildSmsTextEn(type: BuyerSmsType, data: BuyerSmsData): string {
  switch (type) {
    case 'payment_confirmed':
      return `[Seed Art Festival] ${data.buyerName}, your payment (${won(data.amount)}) for '${data.artworkTitle}' is complete. Thank you.`;
    case 'virtual_account_issued': {
      const va = data.virtualAccount ?? {};
      const due = va.dueDate ? ` (due ${va.dueDate})` : '';
      const greeting = data.buyerName ? `${data.buyerName}, ` : '';
      return `[Seed Art Festival] ${greeting}Deposit: ${va.bankName ?? ''} ${va.accountNumber ?? ''} / ${won(data.amount)}${due}`;
    }
    case 'deposit_confirmed':
      return `[Seed Art Festival] ${data.buyerName}, your deposit is confirmed. We're preparing your artwork.`;
    case 'shipped': {
      const carrier = data.carrier ? ` ${data.carrier}` : '';
      const tracking = data.trackingNumber ? ` ${data.trackingNumber}` : '';
      return `[Seed Art Festival] '${data.artworkTitle}' has shipped.${carrier}${tracking}`;
    }
    case 'delivered':
      return `[Seed Art Festival] '${data.artworkTitle}' has been delivered.`;
    case 'refunded':
      return `[Seed Art Festival] Your refund of ${won(data.amount)} has been processed.`;
    case 'auto_cancelled':
      return `[Seed Art Festival] Your order has been automatically cancelled.`;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export type BuyerSmsSendResult = { ok: boolean; skipped: boolean; error?: string };

/**
 * 구매자 트랜잭션 SMS를 한국 휴대폰으로 발송하고 sms_logs에 기록한다.
 * - locale(ko/en)에 맞는 본문으로 발송. en+010 번호는 영문 본문으로 발송.
 * - 비-010 번호·전화번호 없음 → 스킵 (skipped: true).
 * - 국제(비-010) 발송은 범위 밖 — normalizeKoreanMobile가 null 반환 시 스킵.
 * - never throw — 결제/웹훅 플로우를 막지 않음.
 * - 반환값: { ok, skipped, error? } — 호출부는 void로 무시해도 무방 (fire-and-forget).
 */
export async function sendBuyerSms(
  phone: string | null | undefined,
  type: BuyerSmsType,
  data: BuyerSmsData,
  locale: 'ko' | 'en' = 'ko',
  orderNo?: string
): Promise<BuyerSmsSendResult> {
  try {
    const to = normalizeKoreanMobile(phone);
    if (!to) return { ok: false, skipped: true };

    const text = buildSmsText(type, data, locale);
    const result = await sendSolapiSms({ to, text });

    // best-effort 로그 — 실패해도 무시
    try {
      const admin = createSupabaseAdminClient();
      await admin.from('sms_logs').insert({
        order_no: orderNo ?? null,
        to_phone: to,
        type,
        provider: 'solapi',
        provider_message_id: result.messageId ?? null,
        status: result.ok ? 'sent' : 'failed',
        segment: result.segment ?? null,
        error: result.ok ? null : (result.error ?? 'unknown'),
      });
    } catch (logErr) {
      console.error(`[buyer-sms:${type}] log insert failed:`, logErr);
    }

    return {
      ok: result.ok,
      skipped: false,
      error: result.ok ? undefined : (result.error ?? 'send_failed'),
    };
  } catch (err) {
    console.error(`[buyer-sms:${type}] send failed:`, err);
    return { ok: false, skipped: false, error: 'exception' };
  }
}
