import { requireAdmin } from '@/lib/auth/guards';
import { getArtistById } from '@/app/actions/admin-artists';
import { ArtistEditForm } from '../artist-edit-form';
import { notFound } from 'next/navigation';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminArtistDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  let artist;
  try {
    artist = await getArtistById(id);
  } catch {
    notFound();
  }

  if (!artist) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">작가 정보 수정</h1>
        <p className="text-sm text-gray-500 mt-2">{artist.name_ko || '(이름 없음)'}</p>
      </div>
      <ArtistEditForm artist={artist} />
    </div>
  );
}
