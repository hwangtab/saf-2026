'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getWishlist, toggleWishlist as toggleUtil } from '@/lib/wishlist';

interface WishlistContextValue {
  ids: string[];
  count: number;
  toggle: (artworkId: string) => void;
  has: (artworkId: string) => boolean;
  /** true after localStorage is read — avoids hydration mismatch on first render */
  mounted: boolean;
}

interface WishlistState {
  ids: string[];
  mounted: boolean;
}

const WishlistContext = createContext<WishlistContextValue>({
  ids: [],
  count: 0,
  toggle: () => {},
  has: () => false,
  mounted: false,
});

export function useWishlist(): WishlistContextValue {
  return useContext(WishlistContext);
}

export default function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WishlistState>({ ids: [], mounted: false });
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    setState({ ids: getWishlist(), mounted: true });

    // 로그인 여부 체크 — dynamic import로 초기 번들에 Supabase SDK 미포함
    let cancelled = false;
    import('@/lib/auth/client').then(({ createSupabaseBrowserClient }) => {
      if (cancelled) return;
      const supabase = createSupabaseBrowserClient();
      supabase.auth.getUser().then(({ data }) => {
        if (!cancelled) {
          userIdRef.current = data.user?.id ?? null;
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback((artworkId: string) => {
    const { ids: next, added } = toggleUtil(artworkId);
    setState((prev) => ({ ...prev, ids: next }));

    // 로그인 상태이면 DB도 동기화 (fire-and-forget)
    if (userIdRef.current) {
      import('@/app/actions/mypage').then(({ addToWishlist, removeFromWishlist }) => {
        if (added) {
          addToWishlist(artworkId);
        } else {
          removeFromWishlist(artworkId);
        }
      });
    }
  }, []);

  const has = useCallback((artworkId: string) => state.ids.includes(artworkId), [state.ids]);

  return (
    <WishlistContext.Provider
      value={{
        ids: state.ids,
        count: state.ids.length,
        toggle,
        has,
        mounted: state.mounted,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}
