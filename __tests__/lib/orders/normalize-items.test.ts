import { normalizeOrderItems } from '@/lib/orders/normalize-items';

describe('normalizeOrderItems', () => {
  it('단건(artworkId만)을 1개짜리 items로 변환', () => {
    expect(normalizeOrderItems({ artworkId: 'a1' })).toEqual([{ artworkId: 'a1', quantity: 1 }]);
  });

  it('items 배열을 그대로 정규화하고 quantity 기본값 1을 채운다', () => {
    expect(
      normalizeOrderItems({ items: [{ artworkId: 'a1', quantity: 2 }, { artworkId: 'a2' }] })
    ).toEqual([
      { artworkId: 'a1', quantity: 2 },
      { artworkId: 'a2', quantity: 1 },
    ]);
  });

  it('동일 artworkId 중복 항목은 수량을 합산한다', () => {
    expect(
      normalizeOrderItems({
        items: [
          { artworkId: 'a1', quantity: 1 },
          { artworkId: 'a1', quantity: 2 },
        ],
      })
    ).toEqual([{ artworkId: 'a1', quantity: 3 }]);
  });

  it('빈 입력은 빈 배열', () => {
    expect(normalizeOrderItems({ items: [] })).toEqual([]);
    expect(normalizeOrderItems({})).toEqual([]);
  });

  it('quantity가 0 이하면 1로 보정', () => {
    expect(normalizeOrderItems({ items: [{ artworkId: 'a1', quantity: 0 }] })).toEqual([
      { artworkId: 'a1', quantity: 1 },
    ]);
  });
});
