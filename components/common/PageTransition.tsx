'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * 페이지 전환 래퍼 컴포넌트.
 * 라우트 전환 시 아주 약한 fade-in만 적용한다.
 * (exit 애니메이션 없음: 화이트 플래시/깜빡임 방지)
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFirstRenderRef = useRef(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    el.style.opacity = '0.985';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.opacity = '1';
      });
    });
  }, [pathname]);

  return (
    <div
      ref={containerRef}
      data-route-path={pathname || ''}
      className="w-full h-full motion-reduce:!opacity-100"
      style={{ transition: 'opacity 150ms ease-out' }}
    >
      {children}
    </div>
  );
}
