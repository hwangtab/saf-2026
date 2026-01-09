'use client';

import ErrorView from '@/components/common/ErrorView';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorView
      icon="⚠️"
      title="오류가 발생했습니다"
      message="페이지를 불러오는 도중 예상치 못한 문제가 발생했습니다. 잠시 후 다시 시도해주세요."
      error={error}
      reset={reset}
    />
  );
}
