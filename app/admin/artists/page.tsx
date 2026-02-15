import { getArtistsWithArtworkCount } from '@/app/actions/admin-artists';
import { ArtistList } from './artist-list';
import Button from '@/components/ui/Button';
import {
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';

export default async function AdminArtistsPage() {
  const artists = await getArtistsWithArtworkCount();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeader>
          <AdminPageTitle>작가 관리</AdminPageTitle>
          <AdminPageDescription>등록된 작가 정보를 관리합니다.</AdminPageDescription>
        </AdminPageHeader>
        <Button href="/admin/artists/new" className="w-full sm:w-auto">
          작가 등록
        </Button>
      </div>
      <ArtistList artists={artists} />
    </div>
  );
}
