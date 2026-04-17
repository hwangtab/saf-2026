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
  searchParams: Promise<{
    result?: string;
  }>;
};

export default async function ArtworksPage({ searchParams }: ArtworksPageProps) {
  const t = await getTranslations('dashboard.artworks');

  const { artist } = await getArtistDashboardContext();
  const supabase = await createSupabaseServerClient();

  const params = await searchParams;
  const flashMessage =
    params.result === 'updated' ? t('updated') : params.result === 'created' ? t('created') : null;
  const flashType: 'success' | 'warning' | 'error' | null = flashMessage ? 'success' : null;

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
