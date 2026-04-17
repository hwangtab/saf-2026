import type { NextRequest } from 'next/server';

export type ApiLocale = 'ko' | 'en';

/**
 * Accept-Language 헤더를 파싱하여 'ko' | 'en' 반환.
 * 구체적인 q 파라미터 가중치는 고려하지 않고, 첫 매칭 기반.
 * 한국어가 포함되어 있거나 언어 헤더가 없으면 'ko' (기본값).
 */
export function getRequestLocale(req: NextRequest | Request): ApiLocale {
  const header = (req.headers.get('accept-language') ?? '').toLowerCase();
  if (!header) return 'ko';

  const firstTag = header.split(',')[0]?.trim() ?? '';
  if (firstTag.startsWith('ko')) return 'ko';
  if (firstTag.startsWith('en')) return 'en';

  if (header.includes('ko')) return 'ko';
  if (header.includes('en')) return 'en';
  return 'ko';
}

type ApiErrorCode =
  | 'invalid_json'
  | 'missing_fields'
  | 'order_not_found'
  | 'amount_mismatch'
  | 'invalid_order_status'
  | 'payment_confirmation_failed'
  | 'server_error';

const ERROR_MESSAGES: Record<ApiLocale, Record<ApiErrorCode, string>> = {
  ko: {
    invalid_json: '잘못된 JSON 요청 본문입니다.',
    missing_fields: 'paymentKey, orderId, amount 값이 필요합니다.',
    order_not_found: '주문을 찾을 수 없습니다.',
    amount_mismatch: '결제 금액이 일치하지 않습니다.',
    invalid_order_status: '현재 주문 상태에서는 결제를 진행할 수 없습니다.',
    payment_confirmation_failed: '결제 승인에 실패했습니다.',
    server_error: '서버 오류가 발생했습니다.',
  },
  en: {
    invalid_json: 'Invalid JSON body.',
    missing_fields: 'paymentKey, orderId, and amount are required.',
    order_not_found: 'Order not found.',
    amount_mismatch: 'Payment amount does not match.',
    invalid_order_status: 'Order cannot be paid in its current status.',
    payment_confirmation_failed: 'Payment confirmation failed.',
    server_error: 'A server error occurred.',
  },
};

export function apiError(code: ApiErrorCode, locale: ApiLocale): string {
  return ERROR_MESSAGES[locale][code];
}
