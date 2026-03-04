'use client';

import ErrorView from '@/components/common/ErrorView';

export default function ArtworksError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorView
      icon="😔"
      title="작품을 불러올 수 없습니다"
      message="작품 데이터를 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도하거나 다른 검색어를 입력해주세요."
      backLink={{ href: '/artworks', label: '전체 작품 보기' }}
      error={error}
      reset={reset}
    />
  );
}
