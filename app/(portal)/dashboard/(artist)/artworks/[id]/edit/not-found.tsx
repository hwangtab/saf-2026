import NotFoundView from '@/components/common/NotFoundView';

export default function ArtworkEditNotFound() {
  return (
    <NotFoundView
      icon="🖼️"
      title="작품을 찾을 수 없습니다"
      message="요청하신 작품이 존재하지 않거나 접근 권한이 없습니다."
      backLink={{ href: '/dashboard/artworks', label: '내 작품 목록으로' }}
    />
  );
}
