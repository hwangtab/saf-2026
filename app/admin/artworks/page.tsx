import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { AdminArtworkList } from './admin-artwork-list';
import Button from '@/components/ui/Button';
import {
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';

const ITEMS_PER_PAGE = 25;

type Props = {
  searchParams: Promise<{
    status?: string;
    visibility?: string;
    q?: string;
    page?: string;
  }>;
};

export default async function AdminArtworksPage({ searchParams }: Props) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const params = await searchParams;

  // 페이지 파싱
  const pageParam = Number(params.page);
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const offset = (page - 1) * ITEMS_PER_PAGE;

  // 기본 쿼리 빌더
  let query = supabase
    .from('artworks')
    .select('id, title, status, is_hidden, images, artists(name_ko)', { count: 'exact' });

  // 상태 필터
  if (params.status && ['available', 'reserved', 'sold'].includes(params.status)) {
    query = query.eq('status', params.status);
  }

  // 공개 여부 필터
  if (params.visibility === 'visible') {
    query = query.eq('is_hidden', false);
  } else if (params.visibility === 'hidden') {
    query = query.eq('is_hidden', true);
  }

  // 검색어 필터 (작품 제목 + 작가명)
  if (params.q && params.q.trim()) {
    const searchTerm = params.q.trim();

    // 작가명으로 검색하여 매칭되는 artist_id 찾기
    const { data: matchedArtists } = await supabase
      .from('artists')
      .select('id')
      .ilike('name_ko', `%${searchTerm}%`);

    const artistIds = (matchedArtists || []).map((a: { id: string }) => a.id);

    if (artistIds.length > 0) {
      // 작품 제목 OR 작가 ID로 검색
      query = query.or(`title.ilike.%${searchTerm}%,artist_id.in.(${artistIds.join(',')})`);
    } else {
      // 작가 매칭이 없으면 제목만 검색
      query = query.ilike('title', `%${searchTerm}%`);
    }
  }

  // 정렬 및 페이지네이션
  const { data: artworks, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + ITEMS_PER_PAGE - 1);

  const totalItems = count || 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

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
        <Button href="/admin/artworks/new" className="w-full sm:w-auto">
          작품 등록
        </Button>
      </div>
      <AdminArtworkList
        artworks={normalizedArtworks}
        initialFilters={{
          status: params.status,
          visibility: params.visibility,
          q: params.q,
        }}
        pagination={{
          currentPage: page,
          totalPages,
          totalItems,
        }}
      />
    </div>
  );
}
