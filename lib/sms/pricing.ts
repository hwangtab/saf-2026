// Solapi 발송 단가 (원/건, 부가세 10% 포함 = 공급가 × 1.1).
// 출처: Solapi pricing API(/pricing/v1/messaging) — 이 계정 공급가 SMS 18 / LMS 45 / MMS 110 / 알림톡 13원.
// 브로드캐스트 본문은 텍스트라 SMS/LMS만 사용. MMS·ATA는 참고용.
export const SMS_UNIT_PRICE_KRW = {
  SMS: 19.8, // 단문문자 (90바이트 이하) — 공급가 18
  LMS: 49.5, // 장문문자 (90바이트 초과) — 공급가 45
  MMS: 121, // 사진문자 (브로드캐스트 미사용) — 공급가 110
  ATA: 14.3, // 카카오 알림톡 (트랜잭션 자동발송용) — 공급가 13
} as const;

export type BroadcastSegment = 'SMS' | 'LMS';

/**
 * 단체 발송 예상 비용(원, 부가세 포함) = 대상 수 × 세그먼트 단가.
 * 소수 단가이므로 원 단위로 반올림.
 */
export function estimateBroadcastCost(count: number, segment: BroadcastSegment): number {
  const safeCount = Math.max(0, Math.floor(count));
  return Math.round(safeCount * SMS_UNIT_PRICE_KRW[segment]);
}
