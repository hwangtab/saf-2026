import { requireAdmin } from '@/lib/auth/guards';
import { getArtworkById, getAllArtists } from '@/app/actions/admin-artworks';
import { ArtworkEditForm } from '../artwork-edit-form';
import { notFound } from 'next/navigation';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminArtworkDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  let artwork;
  let artists;
  try {
    [artwork, artists] = await Promise.all([getArtworkById(id), getAllArtists()]);
  } catch {
    notFound();
  }

  if (!artwork) {
    notFound();
  }

  const normalizedArtwork = {
    ...artwork,
    artists: Array.isArray(artwork.artists) ? artwork.artists[0] || null : artwork.artists || null,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">작품 수정</h1>
          <p className="text-sm text-gray-500 mt-1">
            {normalizedArtwork.artists?.name_ko || '알 수 없음'} - {artwork.title}
          </p>
        </div>
      </div>
      <ArtworkEditForm artwork={normalizedArtwork} artists={artists} />
    </div>
  );
}
