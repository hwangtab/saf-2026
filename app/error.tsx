'use client';

import ErrorView from '@/components/common/ErrorView';
import { usePathname } from 'next/navigation';
import { resolveClientLocale } from '@/lib/client-locale';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const locale = resolveClientLocale(pathname);
  const copy =
    locale === 'en'
      ? {
          title: 'Something went wrong',
          message:
            'An unexpected error occurred while loading this page. Please try again shortly.',
          retryLabel: 'Try again',
          homeLabel: 'Go to home',
        }
      : {
          title: '오류가 발생했습니다',
          message:
            '페이지를 불러오는 도중 예상치 못한 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
          retryLabel: '다시 시도하기',
          homeLabel: '홈으로 돌아가기',
        };

  return (
    <ErrorView
      icon="⚠️"
      title={copy.title}
      message={copy.message}
      retryLabel={copy.retryLabel}
      homeLabel={copy.homeLabel}
      error={error}
      reset={reset}
    />
  );
}
