'use client';

import { useEffect, useState, type ReactNode } from 'react';

interface IdleMountProps {
  /** Rendered immediately during initial paint (e.g. skeleton placeholder).
   *  Must have the same intrinsic size as `children` to prevent CLS. */
  fallback: ReactNode;
  /** Mounted only after `requestIdleCallback` fires (or `timeoutMs` elapses). */
  children: ReactNode;
  /** Fallback timeout if `requestIdleCallback` is unavailable or never fires (default: 2000ms). */
  timeoutMs?: number;
}

/**
 * Defers mounting of children until the browser is idle.
 *
 * Used to push large dynamic-import chunks (e.g. AuthButtons → @supabase/ssr ~49KB)
 * out of the TBT/INP measurement window while keeping them eventually visible.
 * The `fallback` MUST match `children`'s intrinsic size to prevent layout shift.
 *
 * Trade-off: AuthButtons appears slightly later (~50-200ms after paint depending on
 * main-thread load), but the Supabase SDK no longer competes with LCP/TBT.
 */
export default function IdleMount({ fallback, children, timeoutMs = 2000 }: IdleMountProps) {
  const [shouldMount, setShouldMount] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Use requestIdleCallback when available; fall back to setTimeout for Safari < 17.
    const w = window as Window &
      typeof globalThis & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
        cancelIdleCallback?: (handle: number) => void;
      };

    if (typeof w.requestIdleCallback === 'function') {
      const handle = w.requestIdleCallback(
        () => {
          if (!cancelled) setShouldMount(true);
        },
        { timeout: timeoutMs }
      );
      return () => {
        cancelled = true;
        w.cancelIdleCallback?.(handle);
      };
    }

    const handle = window.setTimeout(() => {
      if (!cancelled) setShouldMount(true);
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [timeoutMs]);

  return <>{shouldMount ? children : fallback}</>;
}
