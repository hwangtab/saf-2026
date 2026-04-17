import type { Metadata } from 'next';
import { getExhibitorArtists } from '@/app/actions/exhibitor-artists';
import { ExhibitorArtworkForm } from '../_components/exhibitor-artwork-form';
import {
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('exhibitor');
  return {
    title: t('meta.createNewArtwork'),
  };
}

type NewExhibitorArtworkPageProps = {
  searchParams: Promise<{
    artist_id?: string | string[];
    artist_created?: string | string[];
  }>;
};

export default async function NewExhibitorArtworkPage({
  searchParams,
}: NewExhibitorArtworkPageProps) {
  const t = await getTranslations('exhibitor.artworkNew');
  const artists = await getExhibitorArtists();
  const params = await searchParams;
  const initialArtistId = Array.isArray(params.artist_id) ? params.artist_id[0] : params.artist_id;
  const artistCreatedParam = Array.isArray(params.artist_created)
    ? params.artist_created[0]
    : params.artist_created;
  const artistJustCreated = artistCreatedParam === '1';

  return (
    <div className="space-y-6">
      <AdminPageHeader>
        <AdminPageTitle>{t('title')}</AdminPageTitle>
        <AdminPageDescription>{t('description')}</AdminPageDescription>
      </AdminPageHeader>
      <ExhibitorArtworkForm
        artists={artists}
        initialArtistId={initialArtistId}
        artistJustCreated={artistJustCreated}
      />
    </div>
  );
}
