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

          // 첫 로그인(prevUserId === null): 게스트 카트 DB 병합 후 DB 로드
          if (event === 'SIGNED_IN' && prevUserId === null) {
            const guest = getCart();
            import('@/app/actions/cart')
              .then(async ({ mergeGuestCart, getCartItems }) => {
                if (guest.length > 0) await mergeGuestCart(guest).catch(() => {});
                const { items: dbItems } = await getCartItems();
                clearCart();
                dbItems.forEach((i) => setCartQuantity(i.artworkId, i.quantity));
                if (!cancelled) setItems(getCart());
              })
              .catch(() => {});
            return;
          }

          // 다른 계정으로 신원 변경: 이전 사용자 로컬 카트가 새 사용자로 새지 않게 비움
          if (event === 'SIGNED_IN' && prevUserId !== null && prevUserId !== newUserId) {
            clearCart();
            setItems([]);
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

  return (
    <CartContext.Provider
      value={{
        items,
        count: cartCount(items),
        mounted,
        isOpen,
        openDrawer: () => setIsOpen(true),
        closeDrawer: () => setIsOpen(false),
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
