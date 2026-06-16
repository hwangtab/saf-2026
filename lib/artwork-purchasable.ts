/**
 * 작품 카트 담기 가능 여부 판정 — 단일 출처.
 *
 * ArtworkCard(gallery variant) · ArtworkCategoryGrid · ArtworkGridCard 호출처에서
 * 공통으로 사용. 가격 리터럴은 한국어 원본(DB 저장값) 기준.
 */
export function isArtworkPurchasable(a: {
  sold?: boolean;
  reserved?: boolean;
  price?: string;
}): boolean {
  if (a.sold || a.reserved) return false;
  const p = a.price;
  if (!p) return false;
  if (p === '문의' || p === 'Inquiry') return false;
  if (p === '확인 중' || p === 'Pending') return false;
  return true;
}
