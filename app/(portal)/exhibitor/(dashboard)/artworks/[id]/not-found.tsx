import NotFoundView from '@/components/common/NotFoundView';

export default function ExhibitorArtworkNotFound() {
  return (
    <NotFoundView
      icon="🖼️"
      title="작품을 찾을 수 없습니다"
      message="요청하신 작품이 존재하지 않거나 삭제되었습니다."
      backLink={{ href: '/exhibitor/artworks', label: '작품 목록으로' }}
    />
  );
}
