import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { AdminArtworkList } from './admin-artwork-list';

export default async function AdminArtworksPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: artworks } = await supabase
    .from('artworks')
    .select('id, title, status, is_hidden, images, artists(name_ko)')
    .order('created_at', { ascending: false });

  const normalizedArtworks = (artworks || []).map((artwork: any) => ({
    ...artwork,
    artists: Array.isArray(artwork.artists) ? artwork.artists[0] || null : artwork.artists || null,
  }));

  return <AdminArtworkList artworks={normalizedArtworks} />;
}
