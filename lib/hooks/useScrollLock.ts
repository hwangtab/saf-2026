import { useRef, useCallback, useState, useEffect } from 'react';

export function useScrollLock() {
  const scrollPositionRef = useRef(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const lockScroll = useCallback(() => {
    const body = document.body;

    // 현재 스크롤 위치 저장
    scrollPositionRef.current = window.scrollY;

    // overflow: hidden 방식 - position: fixed보다 레이아웃 재계산이 적음
    // scrollbar-gutter: stable로 스크롤바 공간 유지하여 레이아웃 시프트 방지
    body.style.overflow = 'hidden';

    // 데스크탑에서만 스크롤바 공간 보정 (모바일은 오버레이 스크롤바 사용으로 불필요)
    if (!isMobile) {
      body.style.paddingRight = `${window.innerWidth - document.documentElement.clientWidth}px`;
    }
  }, [isMobile]);

  const unlockScroll = useCallback((restore = true) => {
    const body = document.body;

    body.style.overflow = '';
    body.style.paddingRight = '';

    if (restore) {
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollPositionRef.current);
      });
    }
  }, []);

  return { lockScroll, unlockScroll };
}
