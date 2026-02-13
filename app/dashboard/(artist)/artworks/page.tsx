import { createSupabaseServerClient } from '@/lib/auth/server';
import { getArtistDashboardContext } from '@/lib/auth/dashboard-context';
import { ArtworkList } from './artwork-list';
import Button from '@/components/ui/Button';
import {
  AdminBadge,
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';

type ArtworksPageProps = {
  searchParams?: {
    result?: string;
  };
};

export default async function ArtworksPage({ searchParams }: ArtworksPageProps) {
  const { artist } = await getArtistDashboardContext();
  const supabase = await createSupabaseServerClient();

  const flashMessage =
    searchParams?.result === 'updated'
      ? '작품이 수정되었습니다.'
      : searchParams?.result === 'created'
        ? '작품이 등록되었습니다.'
        : null;

  // Fetch artworks
  const { data: artworks } = await supabase
    .from('artworks')
    .select('*')
    .eq('artist_id', artist.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeader>
          <div className="flex items-center gap-2">
            <AdminPageTitle>작품 관리</AdminPageTitle>
            <AdminBadge tone="info">내 작품</AdminBadge>
          </div>
          <AdminPageDescription>
            총 {artworks?.length || 0}개의 작품이 등록되어 있습니다.
          </AdminPageDescription>
        </AdminPageHeader>
        <Button href="/dashboard/artworks/new" variant="primary" className="w-full sm:w-auto">
          작품 등록
        </Button>
      </div>

      <ArtworkList artworks={artworks || []} flashMessage={flashMessage} />
    </div>
  );
}
