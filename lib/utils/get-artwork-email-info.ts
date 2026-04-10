import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Fetches artwork title and artist name for use in buyer email notifications.
 * Returns empty strings on failure — email sending must not be blocked by this query.
 */
export async function getArtworkEmailInfo(
  supabase: SupabaseClient,
  artworkId: string | null | undefined
): Promise<{ artworkTitle: string; artistName: string }> {
  if (!artworkId) return { artworkTitle: '', artistName: '' };

  const { data } = await supabase
    .from('artworks')
    .select('title, artists(name_ko)')
    .eq('id', artworkId)
    .single();

  const artworkTitle = data?.title ?? '';
  const artistsRaw = data?.artists;
  const artistName = Array.isArray(artistsRaw)
    ? (artistsRaw[0]?.name_ko ?? '')
    : ((artistsRaw as { name_ko?: string } | null | undefined)?.name_ko ?? '');

  return { artworkTitle, artistName };
}
