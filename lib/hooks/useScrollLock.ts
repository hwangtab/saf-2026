import { useRef, useCallback, useState, useEffect } from 'react';

export function useScrollLock() {
  const scrollPositionRef = useRef(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      // Consistent with other components (768px or 1024px depending on design)
      // Header uses lg:hidden (1024px) for mobile menu, so we check for < 1024px
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const lockScroll = useCallback(() => {
    // Prevent double locking
    if (document.body.style.overflow === 'hidden') return;

    scrollPositionRef.current = window.scrollY;

    const body = document.body;

    // Only add padding if scrollbar is actually visible
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;

    if (scrollBarWidth > 0 && !isMobile) {
      body.style.paddingRight = `${scrollBarWidth}px`;
    }

    body.style.overflow = 'hidden';
  }, [isMobile]);

  const unlockScroll = useCallback((restore = true) => {
    const body = document.body;

    body.style.overflow = '';
    body.style.paddingRight = '';

    if (restore) {
      // Only restore if we have significantly drifted (which shouldn't happen with overflow:hidden usually)
      // or if we need to force it.
      // Removing the double rAF and eager scrollTo which causes flickering.
      // If overflow:hidden works correctly, the scroll position should be preserved naturally 
      // when overflow is removed, OR it stays at 0.

      // However, some mobile browsers might reset scroll on overflow change.
      // We only restore if strict restoration is needed and current scroll is wrong.
      if (Math.abs(window.scrollY - scrollPositionRef.current) > 1) {
        window.scrollTo(0, scrollPositionRef.current);
      }
    }
  }, []);

  return { lockScroll, unlockScroll };
}
