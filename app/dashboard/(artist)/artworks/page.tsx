import { requireArtistActive } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import { ArtworkList } from './artwork-list';
import Button from '@/components/ui/Button';

export default async function ArtworksPage() {
  const user = await requireArtistActive();
  const supabase = await createSupabaseServerClient();

  // Check if user is admin and redirect to admin page
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'admin') {
    redirect('/admin/artworks');
  }

  // Get artist id first (RLS requires it usually, or we query by artist_id found from user_id)
  const { data: artist } = await supabase
    .from('artists')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!artist) {
    redirect('/login');
  }

  // Fetch artworks
  const { data: artworks } = await supabase
    .from('artworks')
    .select('*')
    .eq('artist_id', artist.id)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">작품 관리</h2>
          <p className="mt-1 text-sm text-gray-500">
            총 {artworks?.length || 0}개의 작품이 등록되어 있습니다.
          </p>
        </div>
        <Button href="/dashboard/artworks/new" variant="primary">
          작품 등록
        </Button>
      </div>

      <ArtworkList artworks={artworks || []} />
    </div>
  );
}
