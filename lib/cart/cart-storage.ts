import { storageGet, storageSet } from '@/lib/storage';
import type { CartItem } from '@/types';

const CART_KEY = 'saf:cart';

export function getCart(): CartItem[] {
  const parsed = storageGet<unknown>(CART_KEY);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(
    (x): x is CartItem =>
      !!x &&
      typeof (x as CartItem).artworkId === 'string' &&
      typeof (x as CartItem).quantity === 'number'
  );
}

/** 항목 수량을 절대값으로 설정. 0 이하면 제거. 신규면 추가. */
export function setCartQuantity(artworkId: string, quantity: number): CartItem[] {
  const qty = Math.floor(quantity);
  const current = getCart();
  let next: CartItem[];
  if (qty <= 0) {
    next = current.filter((i) => i.artworkId !== artworkId);
  } else if (current.some((i) => i.artworkId === artworkId)) {
    next = current.map((i) => (i.artworkId === artworkId ? { ...i, quantity: qty } : i));
  } else {
    next = [{ artworkId, quantity: qty }, ...current];
  }
  storageSet(CART_KEY, next);
  return next;
}

export function removeFromCart(artworkId: string): CartItem[] {
  const next = getCart().filter((i) => i.artworkId !== artworkId);
  storageSet(CART_KEY, next);
  return next;
}

export function clearCart(): CartItem[] {
  storageSet(CART_KEY, []);
  return [];
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
