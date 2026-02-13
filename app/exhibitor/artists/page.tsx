import { getExhibitorArtists } from '@/app/actions/exhibitor-artists';
import { ArtistList } from './_components/artist-list';
import Button from '@/components/ui/Button';
import {
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';

export const metadata = {
  title: '작가 관리 | 씨앗페 2026',
};

export default async function ExhibitorArtistsPage() {
  const artists = await getExhibitorArtists();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeader>
          <AdminPageTitle>작가 관리</AdminPageTitle>
          <AdminPageDescription>등록된 작가 정보를 관리합니다.</AdminPageDescription>
        </AdminPageHeader>
        <Button href="/exhibitor/artists/new" className="w-full sm:w-auto">
          작가 등록
        </Button>
      </div>
      <ArtistList artists={artists} />
    </div>
  );
}
