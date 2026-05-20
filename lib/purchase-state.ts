import { storageGet, storageSet } from './storage';

const PURCHASE_COUNT_KEY = 'saf:purchaseCount';

/** 이전 누적 구매 횟수를 반환한다. SSR에서는 항상 0. */
export function getPurchaseCount(): number {
  const count = storageGet<number>(PURCHASE_COUNT_KEY);
  return typeof count === 'number' && Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
}

/** 결제 완료 시 호출. 중복 발화는 SuccessClient의 sessionStorage 가드로 방지. */
export function incrementPurchaseCount(): void {
  storageSet(PURCHASE_COUNT_KEY, getPurchaseCount() + 1);
}

/**
 * 매뉴얼 7.6 누적 구매 단계 판정.
 *
 * count = 이전 구매 횟수 (이번 구매 전 기준).
 * - 0회 → 1단 (첫 구매자, 기본 카피)
 * - 1~2회 → 2단 (2~3번째 구매자)
 * - 3회+ → 3단 (4번째+ 누적 컬렉터)
 */
export function getPurchaseStage(count: number): 1 | 2 | 3 {
  if (count === 0) return 1;
  if (count <= 2) return 2;
  return 3;
}
