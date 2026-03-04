'use client';

import ErrorView from '@/components/common/ErrorView';

export default function AdminUsersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorView
      icon="⚠️"
      title="사용자 목록을 불러올 수 없습니다"
      message="사용자 데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
      backLink={{ href: '/admin/dashboard', label: '관리자 홈으로' }}
      error={error}
      reset={reset}
    />
  );
}
