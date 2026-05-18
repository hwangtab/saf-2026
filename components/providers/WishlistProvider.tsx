'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR hydration gate: localStorage is only accessible on client after mount
    setState({ ids: getWishlist(), mounted: true });
  }, []);

  const toggle = useCallback((artworkId: string) => {
    const { ids: next } = toggleUtil(artworkId);
    setState((prev) => ({ ...prev, ids: next }));
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
