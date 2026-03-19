import type { Metadata } from 'next';
import { getExhibitorArtists } from '@/app/actions/exhibitor-artists';
import { ArtistList } from './_components/artist-list';
import LinkButton from '@/components/ui/LinkButton';
import {
  AdminBadge,
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('exhibitor');
  return {
    title: t('meta.artistManagement'),
  };
}

export default async function ExhibitorArtistsPage() {
  const t = await getTranslations('exhibitor.artists');
  const artists = await getExhibitorArtists();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeader>
          <div className="flex items-center gap-2">
            <AdminPageTitle>{t('title')}</AdminPageTitle>
            <AdminBadge tone="info">{t('badge')}</AdminBadge>
          </div>
          <AdminPageDescription>{t('description')}</AdminPageDescription>
        </AdminPageHeader>
        <LinkButton href="/exhibitor/artists/new" className="w-full sm:w-auto">
          {t('createArtist')}
        </LinkButton>
      </div>
      <ArtistList artists={artists} />
    </div>
  );
}
