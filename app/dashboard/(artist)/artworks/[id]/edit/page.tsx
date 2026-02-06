import { requireArtistActive } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { redirect, notFound } from 'next/navigation';
import { ArtworkForm } from '../../artwork-form';

export default async function EditArtworkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const { data: artist } = await supabase
    .from('artists')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!artist) {
    return <div>오류: 작가 정보를 찾을 수 없습니다.</div>;
  }

  // Fetch artwork ensuring it belongs to this artist
  const { data: artwork } = await supabase
    .from('artworks')
    .select('*')
    .eq('id', id)
    .eq('artist_id', artist.id)
    .single();

  if (!artwork) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto bg-white shadow-sm sm:rounded-lg p-6 sm:p-8">
      <ArtworkForm artwork={artwork} artistId={artist.id} />
    </div>
  );
}
