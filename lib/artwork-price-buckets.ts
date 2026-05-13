/**
 * 작품 갤러리 가격대 필터 프리셋. URL 파라미터와 UI에서 공통 소비.
 *
 * 두 가지 bucket 패턴이 섞여 있음:
 * - **누적형** (`under*`): min:0, max:X — "X원 이하" UX. 작은 가격대(소품/판화 등)
 *   진입 사용자의 mental model에 부합. 한 작품이 여러 누적 bucket에 동시 매칭되며
 *   PriceRangeFilter는 single-radio라 사용자가 선택한 하나만 적용 → 자연스러움.
 * - **구간형** (`1to3m`, `3to5m`): min~max 분리 — mutually exclusive. 중·고가 구간.
 *
 * 누적/구간 혼합이 e-commerce 표준 (e.g. 백화점 "X원 이하" + "X~Y원" 동시 노출).
 */
export type PriceBucketId =
  | 'under100k'
  | 'under300k'
  | 'under500k'
  | 'under1m'
  | '1to3m'
  | '3to5m'
  | 'over5m';

export interface PriceBucket {
  id: PriceBucketId;
  min: number;
  max: number | null;
  labelKo: string;
  labelEn: string;
}

export const PRICE_BUCKETS: PriceBucket[] = [
  { id: 'under100k', min: 0, max: 100_000, labelKo: '10만원 이하', labelEn: 'Under ₩100K' },
  { id: 'under300k', min: 0, max: 300_000, labelKo: '30만원 이하', labelEn: 'Under ₩300K' },
  { id: 'under500k', min: 0, max: 500_000, labelKo: '50만원 이하', labelEn: 'Under ₩500K' },
  { id: 'under1m', min: 0, max: 1_000_000, labelKo: '100만원 이하', labelEn: 'Under ₩1M' },
  { id: '1to3m', min: 1_000_000, max: 3_000_000, labelKo: '100~300만원', labelEn: '₩1M–₩3M' },
  { id: '3to5m', min: 3_000_000, max: 5_000_000, labelKo: '300~500만원', labelEn: '₩3M–₩5M' },
  { id: 'over5m', min: 5_000_000, max: null, labelKo: '500만원 이상', labelEn: 'Over ₩5M' },
];

export function getPriceBucket(id: PriceBucketId | null): PriceBucket | null {
  if (!id) return null;
  return PRICE_BUCKETS.find((b) => b.id === id) ?? null;
}

export function isValidPriceBucketId(value: string | null): value is PriceBucketId {
  if (!value) return false;
  return PRICE_BUCKETS.some((b) => b.id === value);
}

export function matchesPriceBucket(price: number, bucket: PriceBucket): boolean {
  if (price < bucket.min) return false;
  if (bucket.max !== null && price >= bucket.max) return false;
  return true;
}

export function getPriceBucketLabel(bucket: PriceBucket, locale: string): string {
  return locale === 'en' ? bucket.labelEn : bucket.labelKo;
}
