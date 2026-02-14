'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function useScrolled(threshold = 10, disabled = false) {
  const [isScrolled, setIsScrolled] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.scrollY > threshold;
  });
  const pathname = usePathname();

  useEffect(() => {
    if (disabled) return undefined;

    let ticking = false;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;

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

    // Next.js 라우트 전환 시 scrollTo(0, 0)가 비동기 타이밍에 실행될 수 있어
    // 초기 1회 + settle check를 추가해 stale 상태를 방지한다.
    window.requestAnimationFrame(syncScrolled);
    settleTimer = setTimeout(syncScrolled, 120);

    return () => {
      if (settleTimer) clearTimeout(settleTimer);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('pageshow', syncScrolled);
      window.removeEventListener('resize', syncScrolled);
    };
  }, [threshold, disabled, pathname]);

  return isScrolled;
}
