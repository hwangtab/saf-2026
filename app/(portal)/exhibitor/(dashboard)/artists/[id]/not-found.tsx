import { UserRound } from 'lucide-react';
import NotFoundView from '@/components/common/NotFoundView';

export default function ExhibitorArtistNotFound() {
  return (
    <NotFoundView
      icon={<UserRound className="h-16 w-16" />}
      title="작가를 찾을 수 없습니다"
      message="요청하신 작가가 존재하지 않거나 삭제되었습니다."
      backLink={{ href: '/exhibitor/artists', label: '작가 목록으로' }}
    />
  );
}
