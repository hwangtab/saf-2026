'use client';

import { usePathname } from 'next/navigation';
import { isProtectedSurfacePath } from '@/lib/path-rules';

/**
 * 페이지 전환 래퍼 컴포넌트.
 * 전역 opacity 페이드가 페이지 전체의 번쩍임(화이트 플래시)을 유발할 수 있어
 * 퍼블릭 화면에서는 애니메이션 없이 그대로 렌더링한다.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isProtectedSurface = isProtectedSurfacePath(pathname);

  if (isProtectedSurface) {
    return <>{children}</>;
  }

  return (
    <div key={pathname} data-route-path={pathname || ''} className="w-full h-full">
      {children}
    </div>
  );
}
