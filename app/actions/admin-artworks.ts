'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';

const getStoragePathFromPublicUrl = (publicUrl: string, bucket: string) => {
  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const index = url.pathname.indexOf(marker);
    if (index === -1) return null;
    return url.pathname.slice(index + marker.length);
  } catch {
    return null;
  }
};

export async function updateAdminArtwork(id: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const rawStatus = String(formData.get('status') || 'available');
  const status = ['available', 'reserved', 'sold'].includes(rawStatus) ? rawStatus : 'available';
  const is_hidden = formData.get('is_hidden') === 'on';

  const { data: artwork, error: fetchError } = await supabase
    .from('artworks')
    .select('id, artist_id')
    .eq('id', id)
    .single();

  if (fetchError) throw fetchError;

  const { error } = await supabase
    .from('artworks')
    .update({ status, is_hidden, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;

  revalidatePath('/artworks');
  revalidatePath('/');
  revalidatePath(`/artworks/${id}`);
  if (artwork?.artist_id) {
    const { data: artist } = await supabase
      .from('artists')
      .select('name_ko')
      .eq('id', artwork.artist_id)
      .single();
    if (artist?.name_ko) {
      revalidatePath(`/artworks/artist/${encodeURIComponent(artist.name_ko)}`);
    }
  }
}

export async function deleteAdminArtwork(id: string) {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const { data: artwork } = await supabase
    .from('artworks')
    .select('images, artist_id')
    .eq('id', id)
    .single();

  const { error } = await supabase.from('artworks').delete().eq('id', id);
  if (error) throw error;

  const paths = (artwork?.images || [])
    .map((url: string) => getStoragePathFromPublicUrl(url, 'artworks'))
    .filter((path: string | null): path is string => !!path);

  if (paths.length > 0) {
    await supabase.storage.from('artworks').remove(paths);
  }

  revalidatePath('/artworks');
  revalidatePath('/');
  if (artwork?.artist_id) {
    const { data: artist } = await supabase
      .from('artists')
      .select('name_ko')
      .eq('id', artwork.artist_id)
      .single();
    if (artist?.name_ko) {
      revalidatePath(`/artworks/artist/${encodeURIComponent(artist.name_ko)}`);
    }
  }
}
