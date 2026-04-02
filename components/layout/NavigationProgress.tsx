'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const barRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const bar = barRef.current;
    if (!bar) return;

    clearTimer();

    // loading: 0% → 85%
    bar.style.display = 'block';
    bar.style.opacity = '1';
    bar.style.transition = 'width 600ms ease-out';
    bar.style.width = '0%';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bar.style.width = '85%';
      });
    });

    // completing: 85% → 100% + fade out
    timerRef.current = setTimeout(() => {
      bar.style.transition = 'width 200ms linear, opacity 300ms ease-in';
      bar.style.width = '100%';
      bar.style.opacity = '0';

      // idle: hide
      timerRef.current = setTimeout(() => {
        bar.style.display = 'none';
        bar.style.width = '0%';
      }, 500);
    }, 300);

    return clearTimer;
  }, [pathname, searchParams, clearTimer]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-40 h-[2px] w-full motion-reduce:hidden"
    >
      <div
        ref={barRef}
        style={{
          display: 'none',
          width: '0%',
          height: '100%',
          backgroundColor: '#2176FF',
        }}
      />
    </div>
  );
}
