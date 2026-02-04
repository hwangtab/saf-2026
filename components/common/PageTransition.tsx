'use client';

import { AnimatePresence, m } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { LayoutRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { useContext, useMemo } from 'react';

/**
 * 페이지 전환 애니메이션을 처리하는 컴포넌트
 * - AnimatePresence: 컴포넌트가 언마운트될 때 exit 애니메이션을 실행
 * - mode="wait": 이전 페이지의 exit 애니메이션이 끝난 후 새 페이지의 enter 애니메이션 시작
 * - FrozenRouter: exit 애니메이션 중 라우터 컨텍스트를 고정하여 이전 페이지 내용을 유지
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <m.div
        key={pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="w-full h-full"
      >
        <FrozenRouter>{children}</FrozenRouter>
      </m.div>
    </AnimatePresence>
  );
}

/**
 * exit 애니메이션이 실행되는 동안 라우터 컨텍스트를 고정(Freeze)하는 래퍼
 * 이를 통해 페이지가 바뀌어도 exit 애니메이션 중에는 이전 페이지의 내용이 그대로 유지됨
 */
function FrozenRouter({ children }: { children: React.ReactNode }) {
  const context = useContext(LayoutRouterContext);
  const frozen = useMemo(() => context, []);

  return <LayoutRouterContext.Provider value={frozen}>{children}</LayoutRouterContext.Provider>;
}
