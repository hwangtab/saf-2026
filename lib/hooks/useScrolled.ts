'use client';

import { useState, useEffect } from 'react';

export function useScrolled(threshold = 10, disabled = false) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (disabled) return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const newValue = window.scrollY > threshold;
          setIsScrolled((prev) => (prev !== newValue ? newValue : prev));
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [threshold, disabled]);

  return isScrolled;
}
