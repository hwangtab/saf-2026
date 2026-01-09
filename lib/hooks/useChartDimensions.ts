'use client';

import { useState, useEffect, useMemo } from 'react';

const MOBILE_BREAKPOINT = 380;
const DEBOUNCE_DELAY = 200;

export function useChartDimensions() {
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    setWidth(window.innerWidth);

    let timeoutId: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setWidth(window.innerWidth);
      }, DEBOUNCE_DELAY);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return useMemo(() => {
    if (width === null) return null;

    const isMobile = width < MOBILE_BREAKPOINT;

    return {
      isMobile,
      pieOuterRadius: isMobile ? 80 : 120,
      pieInnerRadius: isMobile ? 50 : 80,
      yAxisWidth: isMobile ? 60 : 100,
      tickFontSize: isMobile ? 10 : 11,
      chartMargin: isMobile
        ? { top: 10, right: 10, left: -20, bottom: 0 }
        : { top: 20, right: 30, left: 20, bottom: 5 },
    };
  }, [width]);
}
