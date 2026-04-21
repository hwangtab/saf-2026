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

export type ApiErrorCode =
  | 'invalid_json'
  | 'missing_fields'
  | 'order_not_found'
  | 'amount_mismatch'
  | 'invalid_order_status'
  | 'payment_confirmation_failed'
  | 'server_error'
  | 'rate_limited'
  | 'required_buyer_info'
  | 'required_shipping_info'
  | 'invalid_email_format'
  | 'invalid_phone_format'
  | 'invalid_shipping_phone_format'
  | 'invalid_postal_code'
  | 'invalid_input_length'
  | 'invalid_redirect_url'
  | 'artwork_not_found'
  | 'artwork_sold_out'
  | 'artwork_price_invalid'
  | 'availability_check_failed'
  | 'order_creation_failed'
  | 'order_state_update_failed'
  | 'payment_server_unreachable'
  | 'payment_session_failed'
  | 'checkout_url_missing';

const ERROR_MESSAGES: Record<ApiLocale, Record<ApiErrorCode, string>> = {
  ko: {
    invalid_json: '잘못된 JSON 요청 본문입니다.',
    missing_fields: 'paymentKey, orderId, amount 값이 필요합니다.',
    order_not_found: '주문을 찾을 수 없습니다.',
    amount_mismatch: '결제 금액이 일치하지 않습니다.',
    invalid_order_status: '현재 주문 상태에서는 결제를 진행할 수 없습니다.',
    payment_confirmation_failed: '결제 승인에 실패했습니다.',
    server_error: '서버 오류가 발생했습니다.',
    rate_limited: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
    required_buyer_info: '필수 정보를 입력해주세요.',
    required_shipping_info: '배송지 정보를 입력해주세요.',
    invalid_email_format: '올바른 이메일 형식이 아닙니다.',
    invalid_phone_format: '올바른 연락처 형식이 아닙니다.',
    invalid_shipping_phone_format: '올바른 배송지 연락처 형식이 아닙니다.',
    invalid_postal_code: '우편번호는 5자리 숫자여야 합니다.',
    invalid_input_length: '입력 정보의 길이가 너무 깁니다. 다시 확인해주세요.',
    invalid_redirect_url: '잘못된 결제 URL입니다.',
    artwork_not_found: '작품을 찾을 수 없습니다.',
    artwork_sold_out: '이미 판매된 작품입니다.',
    artwork_price_invalid: '작품 가격 정보를 확인할 수 없습니다.',
    availability_check_failed: '재고 확인 중 오류가 발생했습니다.',
    order_creation_failed: '주문 생성 중 오류가 발생했습니다.',
    order_state_update_failed: '주문 상태 변경 중 오류가 발생했습니다.',
    payment_server_unreachable: '결제 서버 연결에 실패했습니다.',
    payment_session_failed: '결제 세션 생성에 실패했습니다.',
    checkout_url_missing: '결제 URL을 받지 못했습니다.',
  },
  en: {
    invalid_json: 'Invalid JSON body.',
    missing_fields: 'paymentKey, orderId, and amount are required.',
    order_not_found: 'Order not found.',
    amount_mismatch: 'Payment amount does not match.',
    invalid_order_status: 'Order cannot be paid in its current status.',
    payment_confirmation_failed: 'Payment confirmation failed.',
    server_error: 'A server error occurred.',
    rate_limited: 'Too many requests. Please try again in a moment.',
    required_buyer_info: 'Please fill in all required buyer information.',
    required_shipping_info: 'Please fill in all shipping information.',
    invalid_email_format: 'Please enter a valid email address.',
    invalid_phone_format: 'Please enter a valid phone number.',
    invalid_shipping_phone_format: 'Please enter a valid shipping phone number.',
    invalid_postal_code: 'Postal code must be 5 digits.',
    invalid_input_length: 'Some fields are too long. Please check and try again.',
    invalid_redirect_url: 'Invalid payment redirect URL.',
    artwork_not_found: 'Artwork not found.',
    artwork_sold_out: 'This artwork has already been sold.',
    artwork_price_invalid: 'Unable to verify artwork price.',
    availability_check_failed: 'An error occurred while checking availability.',
    order_creation_failed: 'An error occurred while creating the order.',
    order_state_update_failed: 'An error occurred while updating the order state.',
    payment_server_unreachable: 'Failed to reach the payment server.',
    payment_session_failed: 'Failed to create a payment session.',
    checkout_url_missing: 'Checkout URL was not returned.',
  },
};

export function apiError(code: ApiErrorCode, locale: ApiLocale): string {
  return ERROR_MESSAGES[locale][code];
}
