'use client';

import ErrorView from '@/components/common/ErrorView';

export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorView
      icon="⚠️"
      title="결제 오류"
      message={
        error.message?.includes('configured')
          ? '결제 시스템이 아직 준비 중입니다. 잠시 후 다시 시도해주세요.'
          : '결제 페이지를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
      }
      backLink={{ href: '/artworks', label: '작품 목록으로' }}
      error={error}
      reset={reset}
    />
  );
}
