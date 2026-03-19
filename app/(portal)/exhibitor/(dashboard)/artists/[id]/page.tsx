import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getExhibitorArtistById } from '@/app/actions/exhibitor-artists';
import { ArtistForm } from '../_components/artist-form';
import {
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('exhibitor');
  return {
    title: t('meta.editArtist'),
  };
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ExhibitorArtistDetailPage({ params }: Props) {
  const t = await getTranslations('exhibitor.artistEdit');
  const { id } = await params;

  let artist;
  try {
    artist = await getExhibitorArtistById(id);
  } catch (error) {
    console.error('[exhibitor-artist-detail] Artist detail loading failed:', error);
    notFound();
  }

  if (!artist) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader>
        <AdminPageTitle>{t('title')}</AdminPageTitle>
        <AdminPageDescription>{artist.name_ko || t('unnamed')}</AdminPageDescription>
      </AdminPageHeader>
      <ArtistForm artist={artist} />
    </div>
  );
}
