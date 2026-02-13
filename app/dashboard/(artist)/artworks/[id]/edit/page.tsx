import { createSupabaseServerClient } from '@/lib/auth/server';
import { notFound } from 'next/navigation';
import { getArtistDashboardContext } from '@/lib/auth/dashboard-context';
import { ArtworkForm } from '../../artwork-form';
import { AdminCard } from '@/app/admin/_components/admin-ui';

export default async function EditArtworkPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { artist } = await getArtistDashboardContext();
  const supabase = await createSupabaseServerClient();

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
