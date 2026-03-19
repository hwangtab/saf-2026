import type { Metadata } from 'next';
import { getExhibitorArtists } from '@/app/actions/exhibitor-artists';
import {
  AdminCard,
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('exhibitor');
  return {
    title: t('meta.dashboard'),
  };
}

export default async function ExhibitorDashboard() {
  const t = await getTranslations('exhibitor.dashboard');
  const artists = await getExhibitorArtists();
  const artworkCount = artists.reduce(
    (sum: number, artist) =>
      sum + (typeof artist.artwork_count === 'number' ? artist.artwork_count : 0),
    0
  );

  return (
    <div className="space-y-8">
      <AdminPageHeader>
        <AdminPageTitle>{t('title')}</AdminPageTitle>
        <AdminPageDescription>{t('description')}</AdminPageDescription>
      </AdminPageHeader>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <AdminCard className="p-6">
          <h2 className="text-sm font-medium text-slate-500">{t('managedArtists')}</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">{artists.length}</p>
        </AdminCard>

        <AdminCard className="p-6">
          <h2 className="text-sm font-medium text-slate-500">{t('registeredArtworks')}</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-slate-900">{artworkCount}</p>
        </AdminCard>
      </div>
    </div>
  );
}
