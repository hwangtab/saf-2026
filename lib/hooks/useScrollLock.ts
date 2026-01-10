import { useRef, useCallback } from 'react';

export function useScrollLock() {
  const scrollPositionRef = useRef(0);

  const lockScroll = useCallback(() => {
    const body = document.body;
    const html = document.documentElement;

    scrollPositionRef.current = window.scrollY;

    body.style.position = 'fixed';
    body.style.top = `-${scrollPositionRef.current}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.overscrollBehavior = 'contain';
    html.style.scrollBehavior = 'auto';
  }, []);

  const unlockScroll = useCallback((restore = true) => {
    const body = document.body;
    const html = document.documentElement;

    body.style.position = '';
    body.style.top = '';
    body.style.left = '';
    body.style.right = '';
    body.style.overscrollBehavior = '';
    html.style.scrollBehavior = '';

    if (restore) {
      window.scrollTo(0, scrollPositionRef.current);
    }
  }, []);

  return { lockScroll, unlockScroll };
}
