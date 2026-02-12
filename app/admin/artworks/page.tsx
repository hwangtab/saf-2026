import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { AdminArtworkList } from './admin-artwork-list';
import Button from '@/components/ui/Button';

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">작품 관리</h1>
          <p className="mt-2 text-sm text-slate-500">등록된 작품 정보를 관리합니다.</p>
        </div>
        <Button href="/admin/artworks/new">작품 등록</Button>
      </div>
      <AdminArtworkList artworks={normalizedArtworks} />
    </div>
  );
}
