import { getSupabaseArtworks } from '@/lib/supabase-data';
import { AdminArtworkList } from '../artworks/admin-artwork-list';

export default async function TestAdminArtworksPage() {
  const artworks = await getSupabaseArtworks();

  const normalizedArtworks = artworks
    .filter((artwork: any) => artwork.image)
    .map((artwork: any) => ({
      id: artwork.id,
      title: artwork.title,
      status: (artwork.sold ? 'sold' : 'available') as any,
      is_hidden: false,
      images: [artwork.image],
      artists: { name_ko: artwork.artist || 'Unknown' },
    }));

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Admin Artworks (Auth Bypassed)</h1>
      <AdminArtworkList artworks={normalizedArtworks} />
    </div>
  );
}
