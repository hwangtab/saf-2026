import { requireArtistActive } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { notFound } from 'next/navigation';
import { ArtworkForm } from '../artwork-form';
import { AdminCard } from '@/app/admin/_components/admin-ui';

export default async function NewArtworkPage() {
  const user = await requireArtistActive();
  const supabase = await createSupabaseServerClient();

  // Need Artist ID for uploads path mainly
  const { data: artist } = await supabase
    .from('artists')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!artist) {
    notFound();
  }

  return (
    <AdminCard className="mx-auto max-w-4xl p-6 sm:p-8">
      <ArtworkForm artistId={artist.id} />
    </AdminCard>
  );
}
