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
import { getServerLocale } from '@/lib/server-locale';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    title: locale === 'en' ? 'Edit Artwork | SAF 2026' : '작품 정보 수정 | 씨앗페 2026',
  };
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ExhibitorArtworkDetailPage({ params }: Props) {
  const locale = await getServerLocale();
  const title = locale === 'en' ? 'Edit artwork information' : '작품 정보 수정';
  const { id } = await params;

  let artwork;
  let artists;

  try {
    [artwork, artists] = await Promise.all([getExhibitorArtworkById(id), getExhibitorArtists()]);
  } catch {
    notFound();
  }

  if (!artwork) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader>
        <AdminPageTitle>{title}</AdminPageTitle>
        <AdminPageDescription>{artwork.title}</AdminPageDescription>
      </AdminPageHeader>
      <ExhibitorArtworkForm artwork={artwork} artists={artists} />
    </div>
  );
}
