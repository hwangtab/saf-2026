import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getExhibitorArtworkById } from '@/app/actions/exhibitor-artworks';
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
    title: t('meta.editArtwork'),
  };
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ExhibitorArtworkDetailPage({ params }: Props) {
  const t = await getTranslations('exhibitor.artworkEdit');
  const { id } = await params;

  let artwork;
  let artists;

  try {
    [artwork, artists] = await Promise.all([getExhibitorArtworkById(id), getExhibitorArtists()]);
  } catch (error) {
    console.error('[exhibitor-artwork-detail] Artwork detail loading failed:', error);
    notFound();
  }

  if (!artwork) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader>
        <AdminPageTitle>{t('title')}</AdminPageTitle>
        <AdminPageDescription>{artwork.title}</AdminPageDescription>
      </AdminPageHeader>
      <ExhibitorArtworkForm artwork={artwork} artists={artists} />
    </div>
  );
}
