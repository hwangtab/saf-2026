'use client';

import { usePathname } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import ErrorView from '@/components/common/ErrorView';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // global-error.tsx는 root layout 바깥이라 next-intl 사용 불가.
  // usePathname은 SSR/CSR에서 동일한 path를 반환 (Next.js 공식 — App Router가 client에 path를
  // 직렬화 전달). 이전 typeof window 패턴은 hydration mismatch + react-hooks/set-state-in-effect
  // lint 위반이었음. usePathname으로 단일 표현식 derive.
  const pathname = usePathname();
  const isEnglish = pathname?.startsWith('/en') ?? false;
  const lang = isEnglish ? 'en' : 'ko';

  return (
    <html lang={lang}>
      <body>
        <ErrorView
          icon={<AlertTriangle className="h-16 w-16" />}
          title={isEnglish ? 'A critical error occurred' : '치명적인 오류가 발생했습니다'}
          message={
            isEnglish
              ? 'A problem occurred while loading the page. Please try again later.'
              : '페이지를 불러오는 도중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
          }
          retryLabel={isEnglish ? 'Try again' : '다시 시도하기'}
          homeLabel={isEnglish ? 'Go to home' : '홈으로 돌아가기'}
          error={error}
          reset={reset}
        />
      </body>
    </html>
  );
}
