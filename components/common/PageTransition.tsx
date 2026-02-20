'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { m, useAnimationControls, useReducedMotion } from 'framer-motion';

/**
 * 페이지 전환 래퍼 컴포넌트.
 * 라우트 전환 시 아주 약한 fade-in만 적용한다.
 * (exit 애니메이션 없음: 화이트 플래시/깜빡임 방지)
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prefersReducedMotion = useReducedMotion();
  const controls = useAnimationControls();
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    if (prefersReducedMotion) return;

    // 첫 렌더는 즉시 표시, 이후 라우트 변경부터 미세 전환 적용
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    void (async () => {
      await controls.set({ opacity: 0.985 });
      await controls.start({
        opacity: 1,
        transition: { duration: 0.16, ease: 'easeOut' },
      });
    })();
  }, [controls, pathname, prefersReducedMotion]);

  return (
    <m.div
      data-route-path={pathname || ''}
      className="w-full h-full"
      initial={{ opacity: 1 }}
      animate={prefersReducedMotion ? { opacity: 1 } : controls}
    >
      {children}
    </m.div>
  );
}
