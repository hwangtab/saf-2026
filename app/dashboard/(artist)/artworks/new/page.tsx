import { requireArtistActive } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { notFound } from 'next/navigation';
import { ArtworkForm } from '../artwork-form';

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
    <div className="max-w-3xl mx-auto bg-white shadow-sm sm:rounded-lg p-6 sm:p-8">
      <ArtworkForm artistId={artist.id} />
    </div>
  );
}
