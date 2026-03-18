import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getExhibitorArtistById } from '@/app/actions/exhibitor-artists';
import { ArtistForm } from '../_components/artist-form';
import {
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';
import { getServerLocale } from '@/lib/server-locale';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    title: locale === 'en' ? 'Edit Artist' : '작가 정보 수정',
  };
}

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ExhibitorArtistDetailPage({ params }: Props) {
  const locale = await getServerLocale();
  const copy =
    locale === 'en'
      ? {
          title: 'Edit artist information',
          unnamed: '(Unnamed)',
        }
      : {
          title: '작가 정보 수정',
          unnamed: '(이름 없음)',
        };
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
        <AdminPageTitle>{copy.title}</AdminPageTitle>
        <AdminPageDescription>{artist.name_ko || copy.unnamed}</AdminPageDescription>
      </AdminPageHeader>
      <ArtistForm artist={artist} />
    </div>
  );
}
