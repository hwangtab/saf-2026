import {
  getCart,
  setCartQuantity,
  removeFromCart,
  clearCart,
  cartCount,
} from '@/lib/cart/cart-storage';

beforeEach(() => window.localStorage.clear());

describe('cart-storage', () => {
  it('빈 카트는 []', () => {
    expect(getCart()).toEqual([]);
  });
  it('setCartQuantity로 신규 항목 추가', () => {
    expect(setCartQuantity('a1', 2)).toEqual([{ artworkId: 'a1', quantity: 2 }]);
    expect(getCart()).toEqual([{ artworkId: 'a1', quantity: 2 }]);
  });
  it('setCartQuantity로 기존 항목 수량 변경(중복 추가 아님)', () => {
    setCartQuantity('a1', 1);
    expect(setCartQuantity('a1', 3)).toEqual([{ artworkId: 'a1', quantity: 3 }]);
  });
  it('setCartQuantity 수량 0 이하는 항목 제거', () => {
    setCartQuantity('a1', 2);
    expect(setCartQuantity('a1', 0)).toEqual([]);
  });
  it('removeFromCart', () => {
    setCartQuantity('a1', 1);
    setCartQuantity('a2', 1);
    expect(removeFromCart('a1')).toEqual([{ artworkId: 'a2', quantity: 1 }]);
  });
  it('cartCount는 수량 합', () => {
    setCartQuantity('a1', 2);
    setCartQuantity('a2', 3);
    expect(cartCount(getCart())).toBe(5);
  });
  it('clearCart', () => {
    setCartQuantity('a1', 1);
    expect(clearCart()).toEqual([]);
    expect(getCart()).toEqual([]);
  });
});
