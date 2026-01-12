'use client';

import { useState, useEffect } from 'react';
import { BREAKPOINTS } from '@/lib/breakpoints';

const DEFAULT_BREAKPOINT = BREAKPOINTS.MOBILE;

export function useIsMobile(breakpoint = DEFAULT_BREAKPOINT): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    checkMobile();

    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [breakpoint]);

  return isMobile;
}
