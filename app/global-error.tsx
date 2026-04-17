'use client';

import ErrorView from '@/components/common/ErrorView';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // global-error.tsx는 root layout 바깥이라 next-intl 사용 불가.
  // pathname에서 /en 프리픽스를 감지해 언어 결정.
  const isEnglish = typeof window !== 'undefined' && window.location.pathname.startsWith('/en');
  const lang = isEnglish ? 'en' : 'ko';

  return (
    <html lang={lang}>
      <body>
        <ErrorView
          icon="⚠️"
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
