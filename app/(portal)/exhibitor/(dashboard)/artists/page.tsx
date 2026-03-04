import { getExhibitorArtists } from '@/app/actions/exhibitor-artists';
import { ArtistList } from './_components/artist-list';
import LinkButton from '@/components/ui/LinkButton';
import {
  AdminBadge,
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
          <div className="flex items-center gap-2">
            <AdminPageTitle>작가 관리</AdminPageTitle>
            <AdminBadge tone="info">내 작가</AdminBadge>
          </div>
          <AdminPageDescription>소속 작가 정보를 등록하고 관리합니다.</AdminPageDescription>
        </AdminPageHeader>
        <LinkButton href="/exhibitor/artists/new" className="w-full sm:w-auto">
          작가 등록
        </LinkButton>
      </div>
      <ArtistList artists={artists} />
    </div>
  );
}
