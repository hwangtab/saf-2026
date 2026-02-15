import { getArtistsPaginated } from '@/app/actions/admin-artists';
import { ArtistList } from './artist-list';
import Button from '@/components/ui/Button';
import {
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';

type Props = {
  searchParams: Promise<{
    q?: string;
    linked?: string;
    page?: string;
  }>;
};

export default async function AdminArtistsPage({ searchParams }: Props) {
  const params = await searchParams;

  const pageParam = Number(params.page);
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const linked = params.linked === 'linked' || params.linked === 'unlinked' ? params.linked : 'all';

  const { artists, pagination } = await getArtistsPaginated({
    page,
    q: params.q,
    linked,
  });

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
      <ArtistList
        artists={artists}
        initialFilters={{
          q: params.q,
          linked,
        }}
        pagination={pagination}
      />
    </div>
  );
}
