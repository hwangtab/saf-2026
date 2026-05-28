import { useSyncExternalStore } from 'react';

// SSR-safe `prefers-reduced-motion` 구독.
// useEffect+setState 패턴은 react-hooks/set-state-in-effect lint 위반이고 SSR snapshot이
// hydration mismatch를 일으킬 수 있어 useSyncExternalStore가 표준 패턴.

const subscribe = (cb: () => void) => {
  if (typeof window === 'undefined') return () => undefined;
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
};

const getSnapshot = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const getServerSnapshot = () => false;

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
