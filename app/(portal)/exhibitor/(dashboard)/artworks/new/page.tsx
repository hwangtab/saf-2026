import type { Metadata } from 'next';
import { getExhibitorArtists } from '@/app/actions/exhibitor-artists';
import { ExhibitorArtworkForm } from '../_components/exhibitor-artwork-form';
import {
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';
import { getServerLocale } from '@/lib/server-locale';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    title: locale === 'en' ? 'Create New Artwork | SAF 2026' : '새 작품 등록 | 씨앗페 2026',
  };
}

type NewExhibitorArtworkPageProps = {
  searchParams?: {
    artist_id?: string | string[];
    artist_created?: string | string[];
  };
};

export default async function NewExhibitorArtworkPage({
  searchParams,
}: NewExhibitorArtworkPageProps) {
  const locale = await getServerLocale();
  const copy =
    locale === 'en'
      ? {
          title: 'Create new artwork',
          description: 'Select one of your artists and register a new artwork.',
        }
      : {
          title: '새 작품 등록',
          description: '보유한 작가를 선택하여 새로운 작품을 등록합니다.',
        };
  const artists = await getExhibitorArtists();
  const initialArtistId = Array.isArray(searchParams?.artist_id)
    ? searchParams?.artist_id[0]
    : searchParams?.artist_id;
  const artistCreatedParam = Array.isArray(searchParams?.artist_created)
    ? searchParams?.artist_created[0]
    : searchParams?.artist_created;
  const artistJustCreated = artistCreatedParam === '1';

  return (
    <div className="space-y-6">
      <AdminPageHeader>
        <AdminPageTitle>{copy.title}</AdminPageTitle>
        <AdminPageDescription>{copy.description}</AdminPageDescription>
      </AdminPageHeader>
      <ExhibitorArtworkForm
        artists={artists}
        initialArtistId={initialArtistId}
        artistJustCreated={artistJustCreated}
      />
    </div>
  );
}
