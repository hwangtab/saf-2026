'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { BRAND_COLORS } from '@/lib/colors';

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const barRef = useRef<HTMLDivElement>(null);
  const isFirstRender = useRef(true);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafIdsRef = useRef<number[]>([]);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  const clearTimers = useCallback(() => {
    if (completeTimerRef.current) {
      clearTimeout(completeTimerRef.current);
      completeTimerRef.current = null;
    }

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const clearFrames = useCallback(() => {
    rafIdsRef.current.forEach((id) => {
      window.cancelAnimationFrame(id);
    });
    rafIdsRef.current = [];
  }, []);

  const scheduleFrame = useCallback((callback: FrameRequestCallback) => {
    const id = window.requestAnimationFrame((time) => {
      rafIdsRef.current = rafIdsRef.current.filter((frameId) => frameId !== id);
      callback(time);
    });
    rafIdsRef.current.push(id);
    return id;
  }, []);

  const resetBar = useCallback((bar: HTMLDivElement, hide = false) => {
    bar.style.transition = 'none';
    bar.style.width = '0%';
    bar.style.opacity = hide ? '0' : '1';
    bar.style.display = hide ? 'none' : 'block';
  }, []);

  const clearPendingAnimation = useCallback(
    (bar?: HTMLDivElement | null, hide = false) => {
      clearFrames();
      clearTimers();

      if (bar) {
        resetBar(bar, hide);
      }
    },
    [clearFrames, clearTimers, resetBar]
  );

  const forceReflow = useCallback((bar: HTMLDivElement) => {
    void bar.offsetWidth;
  }, []);

  const startProgress = useCallback(
    (bar: HTMLDivElement) => {
      resetBar(bar);
      forceReflow(bar);
      bar.style.transition = 'width 600ms ease-out';

      scheduleFrame(() => {
        scheduleFrame(() => {
          bar.style.width = '85%';
        });
      });

      completeTimerRef.current = setTimeout(() => {
        bar.style.transition = 'width 200ms linear, opacity 300ms ease-in';
        bar.style.width = '100%';
        bar.style.opacity = '0';

        hideTimerRef.current = setTimeout(() => {
          resetBar(bar, true);
          hideTimerRef.current = null;
        }, 500);

        completeTimerRef.current = null;
      }, 300);
    },
    [forceReflow, resetBar, scheduleFrame]
  );

  useEffect(() => {
    const bar = barRef.current;

    return () => {
      clearPendingAnimation(bar, true);
    };
  }, [clearPendingAnimation]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      resetBar(bar, true);
      return undefined;
    }

    if (prefersReducedMotion) {
      clearPendingAnimation(bar, true);
      return undefined;
    }

    clearPendingAnimation(bar);
    startProgress(bar);

    return () => {
      clearPendingAnimation(bar);
    };
  }, [
    pathname,
    searchParams,
    prefersReducedMotion,
    clearPendingAnimation,
    resetBar,
    startProgress,
  ]);

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
          backgroundColor: BRAND_COLORS.primary.DEFAULT,
        }}
      />
    </div>
  );
}
