'use client';

import { useState, useEffect } from 'react';

export function useChartDimensions() {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    setWidth(window.innerWidth);

    const handleResize = () => {
      setWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = width > 0 && width < 380;

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
}
