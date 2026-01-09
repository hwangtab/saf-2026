'use client';

import ErrorView from '@/components/common/ErrorView';

export default function NewsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorView
      icon="📰"
      title="소식을 불러올 수 없습니다"
      message="관련 기사를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
      backLink={{ href: '/news', label: '뉴스 목록으로' }}
      error={error}
      reset={reset}
    />
  );
}
