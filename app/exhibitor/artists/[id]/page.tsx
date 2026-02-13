import { notFound } from 'next/navigation';
import { getExhibitorArtistById } from '@/app/actions/exhibitor-artists';
import { ArtistForm } from '../_components/artist-form';
import {
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ExhibitorArtistDetailPage({ params }: Props) {
  const { id } = await params;

  let artist;
  try {
    artist = await getExhibitorArtistById(id);
  } catch {
    notFound();
  }

  if (!artist) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader>
        <AdminPageTitle>작가 정보 수정</AdminPageTitle>
        <AdminPageDescription>{artist.name_ko || '(이름 없음)'}</AdminPageDescription>
      </AdminPageHeader>
      <ArtistForm artist={artist} />
    </div>
  );
}
