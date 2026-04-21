/**
 * 작품 갤러리 가격대 필터 프리셋. URL 파라미터와 UI에서 공통 소비.
 */
export type PriceBucketId = 'under1m' | '1to3m' | '3to5m' | 'over5m';

export interface PriceBucket {
  id: PriceBucketId;
  min: number;
  max: number | null;
  labelKo: string;
  labelEn: string;
}

export const PRICE_BUCKETS: PriceBucket[] = [
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
