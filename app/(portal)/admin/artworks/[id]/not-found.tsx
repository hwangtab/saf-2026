import { ImageIcon } from 'lucide-react';
import NotFoundView from '@/components/common/NotFoundView';

export default function AdminArtworkNotFound() {
  return (
    <NotFoundView
      icon={<ImageIcon className="h-16 w-16" />}
      title="작품을 찾을 수 없습니다"
      message="요청하신 작품이 존재하지 않거나 삭제되었습니다."
      backLink={{ href: '/admin/artworks', label: '작품 목록으로' }}
    />
  );
}
