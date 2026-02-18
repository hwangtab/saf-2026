'use client';

import { useLayoutEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export function useScrolled(threshold = 50, disabled = false) {
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

    window.requestAnimationFrame(syncScrolled);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pageshow', syncScrolled);
      window.removeEventListener('resize', syncScrolled);
    };
  }, [threshold, disabled, pathname]);

  return isScrolled;
}
