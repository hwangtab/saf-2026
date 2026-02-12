import { requireArtistActive } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { notFound } from 'next/navigation';
import { ArtworkForm } from '../../artwork-form';
import { AdminCard } from '@/app/admin/_components/admin-ui';

export default async function EditArtworkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireArtistActive();
  const supabase = await createSupabaseServerClient();

  const { data: artist } = await supabase
    .from('artists')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!artist) {
    notFound();
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
    <AdminCard className="mx-auto max-w-4xl p-6 sm:p-8">
      <ArtworkForm artwork={artwork} artistId={artist.id} />
    </AdminCard>
  );
}
