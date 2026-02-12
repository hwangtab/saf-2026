'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function useScrolled(threshold = 10, disabled = false) {
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (disabled) return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(() => {
          const newValue = window.scrollY > threshold;
          setIsScrolled((prev) => (prev !== newValue ? newValue : prev));
          ticking = false;
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [threshold, disabled, pathname]);

  return isScrolled;
}
