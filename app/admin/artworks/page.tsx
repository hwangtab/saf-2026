import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { AdminArtworkList } from './admin-artwork-list';
import Button from '@/components/ui/Button';
import {
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <AdminPageHeader>
          <AdminPageTitle>작품 관리</AdminPageTitle>
          <AdminPageDescription>등록된 작품 정보를 관리합니다.</AdminPageDescription>
        </AdminPageHeader>
        <Button href="/admin/artworks/new" className="w-full sm:w-auto">
          작품 등록
        </Button>
      </div>
      <AdminArtworkList artworks={normalizedArtworks} />
    </div>
  );
}
