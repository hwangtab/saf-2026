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

/** 타입별 정보성 SMS 본문. 모든 본문에 [씨앗페] 접두어. */
export function buildSmsText(type: BuyerSmsType, data: BuyerSmsData): string {
  switch (type) {
    case 'payment_confirmed':
      return `[씨앗페] ${data.buyerName}님, '${data.artworkTitle}' 결제(${won(data.amount)})가 완료되었습니다. 감사합니다.`;
    case 'virtual_account_issued': {
      const va = data.virtualAccount ?? {};
      const due = va.dueDate ? ` / 기한 ${va.dueDate}` : '';
      return `[씨앗페] 입금안내: ${va.bankName ?? ''} ${va.accountNumber ?? ''} / ${won(data.amount)}${due}`;
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

/**
 * 구매자 트랜잭션 SMS를 한국 휴대폰으로 발송하고 sms_logs에 기록한다.
 * - en locale·비-KR 번호·전화번호 없음 → 조용히 스킵 (이메일은 별도로 발송됨)
 * - never throw — 결제/웹훅 플로우를 막지 않음
 */
export async function sendBuyerSms(
  phone: string | null | undefined,
  type: BuyerSmsType,
  data: BuyerSmsData,
  locale: 'ko' | 'en' = 'ko',
  orderNo?: string
): Promise<void> {
  try {
    if (locale === 'en') return; // 1차는 한국어 본문만
    const to = normalizeKoreanMobile(phone);
    if (!to) return;

    const text = buildSmsText(type, data);
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
  } catch (err) {
    console.error(`[buyer-sms:${type}] send failed:`, err);
  }
}
