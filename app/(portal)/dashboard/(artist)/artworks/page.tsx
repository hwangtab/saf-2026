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
import { getTranslations } from 'next-intl/server';

type ArtworksPageProps = {
  searchParams?: {
    result?: string;
    cafe24?: string;
    cafe24_reason?: string;
  };
};

export default async function ArtworksPage({ searchParams }: ArtworksPageProps) {
  const t = await getTranslations('dashboard.artworks');

  const { artist } = await getArtistDashboardContext();
  const supabase = await createSupabaseServerClient();

  const baseMessage =
    searchParams?.result === 'updated'
      ? t('updated')
      : searchParams?.result === 'created'
        ? t('created')
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
      ? `${baseMessage} ${t('missingImageWarning')}`
      : `${baseMessage} ${t('partialSyncWarning')}`;
  } else if (baseMessage && cafe24State === 'failed') {
    flashType = 'warning';
    flashMessage = `${baseMessage} ${t('delayedSyncWarning')}`;
  } else if (baseMessage && cafe24State === 'pending_auth') {
    flashType = 'warning';
    flashMessage = `${baseMessage} ${t('pendingAuthWarning')}`;
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
            <AdminPageTitle>{t('title')}</AdminPageTitle>
            <AdminBadge tone="info">{t('badge')}</AdminBadge>
          </div>
          <AdminPageDescription>
            {t('description', { count: artworks?.length || 0 })}
          </AdminPageDescription>
        </AdminPageHeader>
        <LinkButton href="/dashboard/artworks/new" variant="primary" className="w-full sm:w-auto">
          {t('create')}
        </LinkButton>
      </div>

      <ArtworkList artworks={artworks || []} flashMessage={flashMessage} flashType={flashType} />
    </div>
  );
}
