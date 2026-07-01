import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { getAdminTags } from '@/app/actions/admin-artwork-tags';
import { AdminArtworkList } from './admin-artwork-list';
import LinkButton from '@/components/ui/LinkButton';
import {
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';
import type { Tables } from '@/types/supabase';

type Props = {
  searchParams: Promise<{
    status?: string;
    visibility?: string;
    tag?: string;
    q?: string;
    sort?: string;
    exhibition?: string;
  }>;
};

// Supabase nested embed는 1:N 관계를 single이 아닌 array로 반환할 수 있어
// artists를 union으로 받은 뒤 아래 mapping에서 평탄화한다.
type ArtistRef = Pick<Tables<'artists'>, 'name_ko'>;
type AdminTagRef = Pick<
  Tables<'admin_tags'>,
  'id' | 'name' | 'slug' | 'color' | 'description' | 'archived_at'
>;
type ArtworkAdminTagRef = {
  tag_id: string;
  admin_tags: AdminTagRef | AdminTagRef[] | null;
};
type AdminArtworkRow = Pick<
  Tables<'artworks'>,
  | 'id'
  | 'title'
  | 'admin_product_name'
  | 'status'
  | 'is_hidden'
  | 'images'
  | 'created_at'
  | 'category'
  | 'exhibition'
> & {
  artists: ArtistRef | ArtistRef[] | null;
  artwork_admin_tags: ArtworkAdminTagRef[] | null;
};

export default async function AdminArtworksPage({ searchParams }: Props) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const params = await searchParams;

  const [artworksResult, allAdminTags] = await Promise.all([
    supabase
      .from('artworks')
      .select(
        'id, title, admin_product_name, status, is_hidden, images, created_at, category, exhibition, artists(name_ko), artwork_admin_tags(tag_id, admin_tags(id, name, slug, color, description, archived_at))'
      )
      .order('created_at', { ascending: false })
      .returns<AdminArtworkRow[]>(),
    getAdminTags(true),
  ]);

  if (artworksResult.error) {
    console.error('[admin-artworks-page] Artwork list loading failed:', artworksResult.error);
    throw new Error('작품 목록을 불러오지 못했습니다.');
  }

  const artworks = artworksResult.data;
  const adminTags = allAdminTags.filter((tag) => !tag.archived_at);
  const archivedAdminTags = allAdminTags.filter((tag) => tag.archived_at);

  // DB status/is_hidden은 nullable이지만 어드민 UI(`ArtworkItem`)는 non-null을 요구.
  // production 데이터에 null이 들어오면 가장 보수적인 active 상태로 fallback.
  const normalizedArtworks = (artworks ?? []).map((artwork) => ({
    ...artwork,
    status: artwork.status ?? 'available',
    is_hidden: artwork.is_hidden ?? false,
    exhibition: artwork.exhibition ?? null,
    artists: Array.isArray(artwork.artists)
      ? (artwork.artists[0] ?? null)
      : (artwork.artists ?? null),
    admin_tags: (artwork.artwork_admin_tags || [])
      .map((row) => (Array.isArray(row.admin_tags) ? row.admin_tags[0] : row.admin_tags))
      .filter((tag): tag is AdminTagRef => Boolean(tag))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko')),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeader>
          <AdminPageTitle>작품 관리</AdminPageTitle>
          <AdminPageDescription>등록된 작품 정보를 관리합니다.</AdminPageDescription>
        </AdminPageHeader>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
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
        adminTags={adminTags}
        archivedAdminTags={archivedAdminTags}
        initialFilters={{
          status: params.status,
          visibility: params.visibility,
          tag: params.tag,
          q: params.q,
          sort: params.sort,
          exhibition: params.exhibition,
        }}
      />
    </div>
  );
}
