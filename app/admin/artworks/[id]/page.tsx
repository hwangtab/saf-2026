import { requireAdmin } from '@/lib/auth/guards';
import { getArtworkById, getAllArtists, getArtworkSales } from '@/app/actions/admin-artworks';
import { ArtworkEditForm } from '../artwork-edit-form';
import { SalesHistory } from './sales-history';
import { notFound } from 'next/navigation';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminArtworkDetailPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  let artwork;
  let artists;
  let sales;
  try {
    [artwork, artists, sales] = await Promise.all([
      getArtworkById(id),
      getAllArtists(),
      getArtworkSales(id),
    ]);
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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">작품 수정</h1>
          <p className="mt-2 text-sm text-slate-500">
            {normalizedArtwork.artists?.name_ko || '알 수 없음'} - {artwork.title}
          </p>
        </div>
      </div>
      <ArtworkEditForm artwork={normalizedArtwork} artists={artists} />

      <div className="border-t border-gray-200 pt-6">
        <SalesHistory
          artworkId={id}
          editionType={artwork.edition_type || 'unique'}
          editionLimit={artwork.edition_limit}
          sales={sales}
        />
      </div>
    </div>
  );
}
