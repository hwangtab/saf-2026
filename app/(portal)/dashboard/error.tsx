'use client';

import ErrorView from '@/components/common/ErrorView';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorView
      icon="😔"
      title="대시보드를 불러올 수 없습니다"
      message="데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
      backLink={{ href: '/dashboard', label: '대시보드로' }}
      error={error}
      reset={reset}
    />
  );
}
