'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  getCart,
  setCartQuantity,
  removeFromCart,
  clearCart,
  cartCount,
} from '@/lib/cart/cart-storage';
import type { CartItem } from '@/types';

interface CartContextValue {
  items: CartItem[];
  count: number;
  mounted: boolean;
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  setQuantity: (artworkId: string, quantity: number) => void;
  addOne: (artworkId: string, opts?: { unique?: boolean }) => void;
  remove: (artworkId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue>({
  items: [],
  count: 0,
  mounted: false,
  isOpen: false,
  openDrawer: () => {},
  closeDrawer: () => {},
  setQuantity: () => {},
  addOne: () => {},
  remove: () => {},
  clear: () => {},
});

export function useCart(): CartContextValue {
  return useContext(CartContext);
}

export default function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    setItems(getCart());
    setMounted(true);

    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    import('@/lib/auth/client')
      .then(({ createSupabaseBrowserClient }) => {
        if (cancelled) return;
        const supabase = createSupabaseBrowserClient();
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (cancelled) return;
          const newUserId = session?.user?.id ?? null;
          const prevUserId = userIdRef.current;
          userIdRef.current = newUserId;

          if (event === 'SIGNED_OUT') {
            clearCart();
            setItems([]);
            return;
          }

          // 이벤트명(SIGNED_IN/INITIAL_SESSION/TOKEN_REFRESHED)이 아니라 user id 전이로 판정.
          // 이미 로그인된 세션에서 구독 등록 시(새로고침·OAuth 콜백) 첫 이벤트는 INITIAL_SESSION이므로
          // event === 'SIGNED_IN' 조건은 그 경로의 DB 로드를 영영 건너뛴다.

          // 이 유저를 처음 인지(prevUserId === null): 게스트 카트 DB 병합 후 DB 로드.
          if (newUserId && prevUserId === null) {
            const guest = getCart();
            import('@/app/actions/cart')
              .then(async ({ mergeGuestCart, getCartItems }) => {
                const merge = guest.length > 0 ? await mergeGuestCart(guest) : {};
                const res = await getCartItems();
                // 병합/로드 중 하나라도 에러면 clearCart 하지 말고 게스트 카트 보존 → 다음 로드에서 reconcile.
                if (merge.error || res.error) return;
                clearCart();
                res.items.forEach((i) => setCartQuantity(i.artworkId, i.quantity));
                if (!cancelled) setItems(getCart());
              })
              .catch(() => {});
            return;
          }

          // 다른 계정으로 신원 변경: 이전 사용자 로컬 카트가 새 사용자로 새지 않게 비우고,
          // 새 유저의 DB 카트를 로드(이전 게스트 카트는 병합하지 않음 — 순수 DB 로드).
          if (newUserId && prevUserId !== null && prevUserId !== newUserId) {
            clearCart();
            setItems([]);
            import('@/app/actions/cart')
              .then(async ({ getCartItems }) => {
                const res = await getCartItems();
                if (res.error) return;
                res.items.forEach((i) => setCartQuantity(i.artworkId, i.quantity));
                if (!cancelled) setItems(getCart());
              })
              .catch(() => {});
          }
        });
        unsubscribe = () => subscription.unsubscribe();
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const syncUpsert = useCallback((artworkId: string, quantity: number) => {
    if (!userIdRef.current) return;
    import('@/app/actions/cart')
      .then(({ upsertCartItem }) => upsertCartItem(artworkId, quantity).catch(() => {}))
      .catch(() => {});
  }, []);

  const syncRemove = useCallback((artworkId: string) => {
    if (!userIdRef.current) return;
    import('@/app/actions/cart')
      .then(({ removeCartItem }) => removeCartItem(artworkId).catch(() => {}))
      .catch(() => {});
  }, []);

  const setQuantity = useCallback(
    (artworkId: string, quantity: number) => {
      const next = setCartQuantity(artworkId, quantity);
      setItems(next);
      if (quantity <= 0) syncRemove(artworkId);
      else syncUpsert(artworkId, Math.floor(quantity));
    },
    [syncUpsert, syncRemove]
  );

  const addOne = useCallback(
    (artworkId: string, opts?: { unique?: boolean }) => {
      const current = getCart().find((i) => i.artworkId === artworkId);
      const nextQty = opts?.unique ? 1 : (current?.quantity ?? 0) + 1;
      const next = setCartQuantity(artworkId, nextQty);
      setItems(next);
      syncUpsert(artworkId, nextQty);
    },
    [syncUpsert]
  );

  const remove = useCallback(
    (artworkId: string) => {
      setItems(removeFromCart(artworkId));
      syncRemove(artworkId);
    },
    [syncRemove]
  );

  const clear = useCallback(() => {
    setItems(clearCart());
    if (userIdRef.current) {
      import('@/app/actions/cart')
        .then(({ clearCartItems }) => clearCartItems().catch(() => {}))
        .catch(() => {});
    }
  }, []);

  const openDrawer = useCallback(() => setIsOpen(true), []);
  const closeDrawer = useCallback(() => setIsOpen(false), []);

  return (
    <CartContext.Provider
      value={{
        items,
        count: cartCount(items),
        mounted,
        isOpen,
        openDrawer,
        closeDrawer,
        setQuantity,
        addOne,
        remove,
        clear,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
