import { createSupabaseServerClient } from '@/lib/auth/server';
import { getArtistDashboardContext } from '@/lib/auth/dashboard-context';
import { ArtworkList } from './artwork-list';
import LinkButton from '@/components/ui/LinkButton';
import {
  AdminBadge,
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';

type ArtworksPageProps = {
  searchParams?: {
    result?: string;
    cafe24?: string;
    cafe24_reason?: string;
  };
};

export default async function ArtworksPage({ searchParams }: ArtworksPageProps) {
  const { artist } = await getArtistDashboardContext();
  const supabase = await createSupabaseServerClient();

  const baseMessage =
    searchParams?.result === 'updated'
      ? '작품이 수정되었습니다.'
      : searchParams?.result === 'created'
        ? '작품이 등록되었습니다.'
        : null;
  const cafe24State = searchParams?.cafe24;
  const cafe24Reason = searchParams?.cafe24_reason?.trim() || null;
  const isMissingImageWarning = cafe24Reason?.includes('대표 이미지가 없어') || false;

  let flashMessage = baseMessage;
  let flashType: 'success' | 'warning' | 'error' | null = baseMessage ? 'success' : null;

  if (baseMessage && cafe24State === 'warning') {
    flashType = 'warning';
    flashMessage = isMissingImageWarning
      ? `${baseMessage} 온라인 구매 페이지에 노출할 이미지를 업로드해 주세요.`
      : `${baseMessage} 일부 판매 정보 반영이 진행 중입니다.`;
  } else if (baseMessage && cafe24State === 'failed') {
    flashType = 'warning';
    flashMessage = `${baseMessage} 온라인 구매 정보 반영이 지연되고 있습니다. 잠시 후 다시 확인해 주세요.`;
  } else if (baseMessage && cafe24State === 'pending_auth') {
    flashType = 'warning';
    flashMessage = `${baseMessage} 온라인 구매 정보 반영이 지연되고 있습니다.`;
  }

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
        <LinkButton href="/dashboard/artworks/new" variant="primary" className="w-full sm:w-auto">
          작품 등록
        </LinkButton>
      </div>

      <ArtworkList artworks={artworks || []} flashMessage={flashMessage} flashType={flashType} />
    </div>
  );
}
