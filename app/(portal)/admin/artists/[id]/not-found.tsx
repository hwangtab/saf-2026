import NotFoundView from '@/components/common/NotFoundView';

export default function AdminArtistNotFound() {
  return (
    <NotFoundView
      icon="👤"
      title="작가를 찾을 수 없습니다"
      message="요청하신 작가가 존재하지 않거나 삭제되었습니다."
      backLink={{ href: '/admin/artists', label: '작가 목록으로' }}
    />
  );
}
