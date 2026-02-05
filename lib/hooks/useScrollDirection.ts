'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Hook to detect scroll direction (up or down)
 * @param threshold - Minimum scroll distance (in pixels) to trigger direction change
 * @returns 'up' | 'down' | null
 */
export function useScrollDirection(threshold = 50) {
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const diff = currentScrollY - lastScrollY.current;

          if (Math.abs(diff) > threshold) {
            setScrollDirection(diff > 0 ? 'down' : 'up');
            lastScrollY.current = currentScrollY;
          }

          ticking.current = false;
        });
      }
    };

    lastScrollY.current = window.scrollY;
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [threshold]);

  return scrollDirection;
}
