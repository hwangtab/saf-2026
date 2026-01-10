import { useRef, useCallback } from 'react';

export function useScrollLock() {
  const scrollPositionRef = useRef(0);

  const lockScroll = useCallback(() => {
    const body = document.body;

    // 현재 스크롤 위치 저장
    scrollPositionRef.current = window.scrollY;

    // overflow: hidden 방식 - position: fixed보다 레이아웃 재계산이 적음
    // scrollbar-gutter: stable로 스크롤바 공간 유지하여 레이아웃 시프트 방지
    body.style.overflow = 'hidden';
    body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`;
  }, []);

  const unlockScroll = useCallback((restore = true) => {
    const body = document.body;

    body.style.overflow = '';
    body.style.paddingRight = '';

    if (restore) {
      window.scrollTo(0, scrollPositionRef.current);
    }
  }, []);

  return { lockScroll, unlockScroll };
}
