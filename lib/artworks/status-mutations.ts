import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

export type ArtworkStatusMutationClient = SupabaseClient<Database>;
export type ArtworkStatus = Database['public']['Enums']['artwork_status'];

export type BatchArtworkStatusRow = {
  id: string;
  title: string | null;
  status: ArtworkStatus | null;
  sold_at: string | null;
  manual_sold_override: boolean | null;
  updated_at: string | null;
};

export type BatchUpdateArtworkStatusInput = {
  ids: string[];
  status: ArtworkStatus;
  now: string;
};

export type BatchUpdateArtworkStatusMutationResult = {
  beforeArtworks: BatchArtworkStatusRow[];
  afterArtworks: BatchArtworkStatusRow[];
};

export async function batchUpdateArtworkStatusMutation(
  supabase: ArtworkStatusMutationClient,
  { ids, status, now }: BatchUpdateArtworkStatusInput
): Promise<BatchUpdateArtworkStatusMutationResult> {
  const { data: beforeArtworks } = await supabase
    .from('artworks')
    .select('id, title, status, sold_at, manual_sold_override, updated_at')
    .in('id', ids);

  if (status === 'sold') {
    const { error: statusOnlyError } = await supabase
      .from('artworks')
      .update({
        status,
        manual_sold_override: true,
        updated_at: now,
      })
      .in('id', ids);

    if (statusOnlyError) throw statusOnlyError;

    const idsMissingSoldAt = (beforeArtworks || [])
      .filter((artwork) => !artwork.sold_at)
      .map((artwork) => artwork.id);

    if (idsMissingSoldAt.length > 0) {
      const { error: soldAtError } = await supabase
        .from('artworks')
        .update({
          sold_at: now,
          updated_at: now,
        })
        .in('id', idsMissingSoldAt);

      if (soldAtError) throw soldAtError;
    }
  } else {
    const { error } = await supabase
      .from('artworks')
      .update({
        status,
        sold_at: null,
        manual_sold_override: false,
        updated_at: now,
      })
      .in('id', ids);

    if (error) throw error;
  }

  const { data: afterArtworks } = await supabase
    .from('artworks')
    .select('id, title, status, sold_at, manual_sold_override, updated_at')
    .in('id', ids);

  return {
    beforeArtworks: (beforeArtworks || []) as BatchArtworkStatusRow[],
    afterArtworks: (afterArtworks || []) as BatchArtworkStatusRow[],
  };
}
