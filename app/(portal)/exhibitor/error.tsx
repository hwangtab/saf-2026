'use client';

import ErrorView from '@/components/common/ErrorView';

export default function ExhibitorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorView
      icon="😔"
      title="출품자 포털을 불러올 수 없습니다"
      message="데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
      backLink={{ href: '/exhibitor', label: '출품자 홈으로' }}
      error={error}
      reset={reset}
    />
  );
}
