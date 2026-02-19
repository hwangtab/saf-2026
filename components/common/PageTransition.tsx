'use client';

import { usePathname } from 'next/navigation';
import { AnimatePresence, m } from 'framer-motion';
import { isProtectedSurfacePath } from '@/lib/path-rules';

/**
 * 페이지 전환 애니메이션을 처리하는 컴포넌트
 * - AnimatePresence: 컴포넌트가 언마운트될 때 exit 애니메이션을 실행
 * - mode="wait": 이전 페이지의 exit 애니메이션이 끝난 후 새 페이지의 enter 애니메이션 시작
 * - FrozenRouter: exit 애니메이션 중 라우터 컨텍스트를 고정하여 이전 페이지 내용을 유지
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isProtectedSurface = isProtectedSurfacePath(pathname);

  if (isProtectedSurface) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait">
      <m.div
        key={pathname}
        data-route-path={pathname || ''}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="w-full h-full"
      >
        {children}
      </m.div>
    </AnimatePresence>
  );
}
