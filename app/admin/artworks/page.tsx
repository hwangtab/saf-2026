import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { AdminArtworkList } from './admin-artwork-list';
import { Cafe24EditionInventorySyncButton } from './cafe24-edition-inventory-sync-button';
import { Cafe24MissingLinkSyncButton } from './cafe24-missing-link-sync-button';
import LinkButton from '@/components/ui/LinkButton';
import {
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';

type Props = {
  searchParams: Promise<{
    status?: string;
    visibility?: string;
    q?: string;
    sort?: string;
  }>;
};

export default async function AdminArtworksPage({ searchParams }: Props) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const params = await searchParams;

  const { data: artworks } = await supabase
    .from('artworks')
    .select('id, title, status, is_hidden, images, created_at, artists(name_ko)')
    .order('created_at', { ascending: false });

  const normalizedArtworks = (artworks || []).map((artwork: any) => ({
    ...artwork,
    artists: Array.isArray(artwork.artists) ? artwork.artists[0] || null : artwork.artists || null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeader>
          <AdminPageTitle>작품 관리</AdminPageTitle>
          <AdminPageDescription>등록된 작품 정보를 관리합니다.</AdminPageDescription>
        </AdminPageHeader>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Cafe24EditionInventorySyncButton />
          <Cafe24MissingLinkSyncButton />
          <LinkButton href="/admin/artworks/export" variant="white" className="w-full sm:w-auto">
            전체 작품 데이터 다운받기
          </LinkButton>
          <LinkButton href="/admin/artworks/new" className="w-full sm:w-auto">
            작품 등록
          </LinkButton>
        </div>
      </div>
      <AdminArtworkList
        artworks={normalizedArtworks}
        initialFilters={{
          status: params.status,
          visibility: params.visibility,
          q: params.q,
          sort: params.sort,
        }}
      />
    </div>
  );
}
