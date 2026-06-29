'use client';

import { usePathname } from 'next/navigation';
import { shouldHideSiteFooter } from '@/lib/path-rules';

/**
 * 결제 입력 페이지에서 사이트 Footer(출품작 캐러셀 + 풀 푸터)를 숨기는 client gate.
 * GlobalAnalyticsGate와 동일 패턴 — server Footer를 children으로 받아 경로에 따라 렌더 차단.
 * 판정 단일 출처는 lib/path-rules의 shouldHideSiteFooter.
 */
export default function FooterGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (shouldHideSiteFooter(pathname)) return null;
  return <>{children}</>;
}
