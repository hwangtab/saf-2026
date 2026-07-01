import { requireAdmin } from '@/lib/auth/guards';
import { getArtworkById, getAllArtists } from '@/app/actions/admin-artworks';
import { getArtworkSales } from '@/app/actions/admin-artwork-sales';
import { getAdminTags, getArtworkAdminTags } from '@/app/actions/admin-artwork-tags';
import type { Artwork, ArtworkSale } from '@/types';
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
  let adminTags;
  let artworkAdminTags;
  try {
    [artwork, artists, sales, adminTags, artworkAdminTags] = await Promise.all([
      getArtworkById(id),
      getAllArtists(),
      getArtworkSales(id),
      getAdminTags(),
      getArtworkAdminTags(id),
    ]);
  } catch (error) {
    console.error('[admin-artwork-detail] Artwork detail loading failed:', error);
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
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">작품 수정</h1>
          <p className="mt-2 text-sm text-gray-500">
            {normalizedArtwork.artists?.name_ko || '알 수 없음'} - {artwork.title}
          </p>
        </div>
      </div>
      <ArtworkEditForm
        artwork={normalizedArtwork as Partial<Artwork>}
        artists={artists}
        adminTags={adminTags}
        artworkAdminTags={artworkAdminTags}
      />

      <div className="border-t border-gray-200 pt-6">
        <SalesHistory
          artworkId={id}
          editionType={artwork.edition_type || 'unique'}
          editionLimit={artwork.edition_limit}
          sales={sales as ArtworkSale[]}
          artworkPrice={artwork.price}
        />
      </div>
    </div>
  );
}
