import { notFound } from 'next/navigation';
import { getExhibitorArtistById } from '@/app/actions/exhibitor-artists';
import { ArtistForm } from '../_components/artist-form';

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
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">작가 정보 수정</h1>
        <p className="mt-2 text-sm text-slate-500">{artist.name_ko || '(이름 없음)'}</p>
      </div>
      <ArtistForm artist={artist} />
    </div>
  );
}
