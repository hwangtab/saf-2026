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

    // onAuthStateChange: 마운트 즉시 현재 세션 emit → race condition 해소.
    // 로그인/로그아웃 이벤트도 실시간 반영. dynamic import로 초기 번들에 SDK 미포함.
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    import('@/lib/auth/client')
      .then(({ createSupabaseBrowserClient }) => {
        if (cancelled) return;
        const supabase = createSupabaseBrowserClient();
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!cancelled) {
            userIdRef.current = session?.user?.id ?? null;
          }
        });
        unsubscribe = () => subscription.unsubscribe();
      })
      .catch(() => {
        // 청크 로드 실패 — localStorage-only 모드로 graceful degradation
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const toggle = useCallback((artworkId: string) => {
    const { ids: next, added } = toggleUtil(artworkId);
    setState((prev) => ({ ...prev, ids: next }));

    // 로그인 상태이면 DB도 동기화 (optimistic — localStorage가 source of truth)
    if (userIdRef.current) {
      import('@/app/actions/mypage')
        .then(({ addToWishlist, removeFromWishlist }) => {
          const action = added ? addToWishlist(artworkId) : removeFromWishlist(artworkId);
          action.catch(() => {
            // DB 동기화 실패 — 다음 마이페이지 진입 시 bulkAdd가 보정
          });
        })
        .catch(() => {});
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
