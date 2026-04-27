/**
 * Currency conversion utilities — KRW(원) ↔ USD(달러).
 *
 * 환율: NEXT_PUBLIC_KRW_USD_RATE 환경변수로 조정 가능. 기본값 1400 (2026-04 기준).
 * 매일 변동하는 실시간 환율은 별도 API(예: exchangerate-api.com) 도입 시 사용.
 *
 * 정책:
 * - PayPal 결제는 USD만 지원 (Toss API 강제) → ko 가격(KRW) 기준으로 USD 환산 필요
 * - 환산 USD는 createOrder 시점에 orders.metadata.usd_amount로 저장
 *   → confirm 단계에서 환율 변동에 영향 받지 않도록 시점 고정
 * - cents 단위로 올림(ceil) 처리하여 환율 손실 보정
 */

export const KRW_USD_RATE = Number(process.env.NEXT_PUBLIC_KRW_USD_RATE ?? '1400');

/**
 * KRW를 USD로 환산. **whole dollar 단위 올림(ceil).**
 *
 * Toss /v1/payments + FOREIGN_EASY_PAY(PayPal)는 amount를 정수 USD로 받음.
 * 소수(2.93 등)를 보내면 Toss 내부에서 truncate되어 PayPal에 부정확한 금액 전달
 * → COMMON_ERROR 반환 사례 확인. 따라서 항상 dollar 단위 올림.
 *
 * 예: 4,100 KRW / 1400 = 2.928... → 3 USD
 *     5,000,000 KRW / 1400 = 3571.42... → 3572 USD
 *
 * 환율 손실은 사용자가 부담 (소액 작품일수록 비율 커지지만, KRW 표시도 같이 노출)
 */
export function krwToUsd(krw: number): number {
  if (!Number.isFinite(krw) || krw <= 0) return 0;
  return Math.ceil(krw / KRW_USD_RATE);
}

/** USD 통화 표시 ($36) — 정수 USD 기준이므로 소수 미표시 */
export function formatUsd(usd: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(usd);
}
