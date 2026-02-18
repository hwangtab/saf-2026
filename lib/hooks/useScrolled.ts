'use client';

import { useLayoutEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

type UseScrolledOptions = {
  optimisticTopOnPathChange?: boolean;
  settleDelayMs?: number;
};

export function useScrolled(threshold = 50, disabled = false, options: UseScrolledOptions = {}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const { optimisticTopOnPathChange = false, settleDelayMs = 120 } = options;

  useLayoutEffect(() => {
    if (disabled) return undefined;

    let ticking = false;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;
    let optimisticRafId: number | null = null;

    const syncScrolled = () => {
      const next = window.scrollY > threshold;
      setIsScrolled((prev) => (prev !== next ? next : prev));
    };

    const handleScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(() => {
          syncScrolled();
          ticking = false;
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('pageshow', syncScrolled);
    window.addEventListener('resize', syncScrolled);

    if (optimisticTopOnPathChange) {
      optimisticRafId = window.requestAnimationFrame(() => {
        setIsScrolled(false);
      });
    } else {
      syncScrolled();
      window.requestAnimationFrame(syncScrolled);
    }

    if (settleDelayMs > 0) {
      settleTimer = setTimeout(syncScrolled, settleDelayMs);
    }

    return () => {
      if (settleTimer) {
        clearTimeout(settleTimer);
      }
      if (optimisticRafId !== null) {
        window.cancelAnimationFrame(optimisticRafId);
      }
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pageshow', syncScrolled);
      window.removeEventListener('resize', syncScrolled);
    };
  }, [threshold, disabled, pathname, optimisticTopOnPathChange, settleDelayMs]);

  return isScrolled;
}
