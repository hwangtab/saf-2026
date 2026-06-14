import type { OrderItemInput } from '@/types';

export type { OrderItemInput };

type NormalizeInput = {
  artworkId?: string;
  items?: Array<{ artworkId: string; quantity?: number }>;
};

/**
 * createOrder 입력을 정규화된 OrderItemInput[]로 변환한다.
 * - 단건(artworkId)과 다건(items)을 통일. items가 있으면 items 우선(artworkId 무시)
 * - 단건 경로는 항상 quantity=1 (바로구매). 동일 작품 중복은 수량 합산
 * - quantity는 최소 1로 보정 (unique 강제는 서버 재고 검증 단계에서 처리)
 */
export function normalizeOrderItems(input: NormalizeInput): OrderItemInput[] {
  const raw: Array<{ artworkId: string; quantity?: number }> = input.items
    ? input.items
    : input.artworkId
      ? [{ artworkId: input.artworkId, quantity: 1 }]
      : [];

  const merged = new Map<string, number>();
  for (const { artworkId, quantity } of raw) {
    if (!artworkId) continue;
    const qty = Math.max(1, Math.floor(quantity ?? 1));
    merged.set(artworkId, (merged.get(artworkId) ?? 0) + qty);
  }
  return [...merged.entries()].map(([artworkId, quantity]) => ({ artworkId, quantity }));
}
