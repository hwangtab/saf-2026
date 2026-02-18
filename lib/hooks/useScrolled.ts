'use client';

import { useLayoutEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export function useScrolled(threshold = 10, disabled = false) {
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  useLayoutEffect(() => {
    if (disabled) return undefined;

    let ticking = false;

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
    syncScrolled();

    // Double check after a short delay to handle potential hydration/scroll restoration timing issues
    const timer = setTimeout(syncScrolled, 100);

    window.requestAnimationFrame(syncScrolled);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pageshow', syncScrolled);
      window.removeEventListener('resize', syncScrolled);
    };
  }, [threshold, disabled, pathname]);

  return isScrolled;
}
