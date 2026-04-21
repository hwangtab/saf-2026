import type { TossConfirmResponse } from './types';

/**
 * confirm_response에 저장하기 전 민감정보를 제거.
 * - card.number: Toss가 마스킹해서 보내지만 PCI 영역이라 보수적으로 제거
 * - card.approveNo: 승인번호 — 결제 식별·재현에 사용 가능, 관리자 외 노출 차단
 * - mobilePhone.customerMobilePhone: 휴대폰 결제 번호 PII
 *
 * virtualAccount.secret은 가상계좌 입금 콜백 검증에 필수이므로 유지.
 * virtualAccount의 계좌번호·은행명·기한은 구매자 안내에 필요하므로 유지.
 */
export function sanitizeConfirmResponse(response: TossConfirmResponse): Record<string, unknown> {
  const sanitized: Record<string, unknown> = { ...response };

  if (sanitized.card && typeof sanitized.card === 'object') {
    const { number: _n, approveNo: _a, ...rest } = sanitized.card as Record<string, unknown>;
    sanitized.card = rest;
  }

  if (sanitized.mobilePhone && typeof sanitized.mobilePhone === 'object') {
    const { customerMobilePhone: _p, ...rest } = sanitized.mobilePhone as Record<string, unknown>;
    sanitized.mobilePhone = rest;
  }

  return sanitized;
}

/**
 * payments.method_detail에 저장할 결제수단 메타데이터 — PII 제거된 버전.
 */
export function sanitizeMethodDetail(
  response: TossConfirmResponse
): Record<string, unknown> | null {
  if (response.card) {
    const {
      number: _n,
      approveNo: _a,
      ...rest
    } = response.card as unknown as Record<string, unknown>;
    return rest;
  }
  if (response.virtualAccount) {
    // virtualAccount는 PII 없음 (계좌번호는 가상이라 PCI 아님)
    return response.virtualAccount as unknown as Record<string, unknown>;
  }
  return null;
}
