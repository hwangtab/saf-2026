import { cache } from 'react';
import { notFound } from 'next/navigation';
import { createSupabaseServerClient } from './server';
import { requireArtistActive } from './guards';

export const getArtistDashboardContext = cache(async () => {
  const user = await requireArtistActive();
  const supabase = await createSupabaseServerClient();

  const { data: artist, error } = await supabase
    .from('artists')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !artist) {
    notFound();
  }

  return { user, artist };
});
