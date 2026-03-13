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
import { getServerLocale } from '@/lib/server-locale';

type ArtworksPageProps = {
  searchParams?: {
    result?: string;
    cafe24?: string;
    cafe24_reason?: string;
  };
};

export default async function ArtworksPage({ searchParams }: ArtworksPageProps) {
  const locale = await getServerLocale();
  const copy =
    locale === 'en'
      ? {
          updated: 'Artwork has been updated.',
          created: 'Artwork has been created.',
          missingImageWarning:
            'Please upload an image to display this artwork on the online purchase page.',
          partialSyncWarning: 'Some sales info is still being synchronized.',
          delayedSyncWarning: 'Online purchase info sync is delayed. Please check again shortly.',
          pendingAuthWarning: 'Online purchase info sync is delayed.',
          title: 'Artwork management',
          badge: 'My artworks',
          description: (count: number) => `${count} artworks are currently registered.`,
          create: 'Create artwork',
        }
      : {
          updated: '작품이 수정되었습니다.',
          created: '작품이 등록되었습니다.',
          missingImageWarning: '온라인 구매 페이지에 노출할 이미지를 업로드해 주세요.',
          partialSyncWarning: '일부 판매 정보 반영이 진행 중입니다.',
          delayedSyncWarning:
            '온라인 구매 정보 반영이 지연되고 있습니다. 잠시 후 다시 확인해 주세요.',
          pendingAuthWarning: '온라인 구매 정보 반영이 지연되고 있습니다.',
          title: '작품 관리',
          badge: '내 작품',
          description: (count: number) => `총 ${count}개의 작품이 등록되어 있습니다.`,
          create: '작품 등록',
        };

  const { artist } = await getArtistDashboardContext();
  const supabase = await createSupabaseServerClient();

  const baseMessage =
    searchParams?.result === 'updated'
      ? copy.updated
      : searchParams?.result === 'created'
        ? copy.created
        : null;
  const cafe24State = searchParams?.cafe24;
  const cafe24Reason = searchParams?.cafe24_reason?.trim() || null;
  const isMissingImageWarning =
    cafe24Reason?.includes('대표 이미지') ||
    /representative image|primary image|main image|cover image/i.test(cafe24Reason || '');

  let flashMessage = baseMessage;
  let flashType: 'success' | 'warning' | 'error' | null = baseMessage ? 'success' : null;

  if (baseMessage && cafe24State === 'warning') {
    flashType = 'warning';
    flashMessage = isMissingImageWarning
      ? `${baseMessage} ${copy.missingImageWarning}`
      : `${baseMessage} ${copy.partialSyncWarning}`;
  } else if (baseMessage && cafe24State === 'failed') {
    flashType = 'warning';
    flashMessage = `${baseMessage} ${copy.delayedSyncWarning}`;
  } else if (baseMessage && cafe24State === 'pending_auth') {
    flashType = 'warning';
    flashMessage = `${baseMessage} ${copy.pendingAuthWarning}`;
  }

  // Fetch artworks
  const { data: artworks } = await supabase
    .from('artworks')
    .select('id, title, images, price, status, is_hidden, created_at')
    .eq('artist_id', artist.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeader>
          <div className="flex items-center gap-2">
            <AdminPageTitle>{copy.title}</AdminPageTitle>
            <AdminBadge tone="info">{copy.badge}</AdminBadge>
          </div>
          <AdminPageDescription>{copy.description(artworks?.length || 0)}</AdminPageDescription>
        </AdminPageHeader>
        <LinkButton href="/dashboard/artworks/new" variant="primary" className="w-full sm:w-auto">
          {copy.create}
        </LinkButton>
      </div>

      <ArtworkList artworks={artworks || []} flashMessage={flashMessage} flashType={flashType} />
    </div>
  );
}
