import type { SupabaseClient } from '@supabase/supabase-js';

import {
  buildAdminArtworkCreateInsert,
  buildAdminArtworkDetailsUpdate,
  type AdminArtworkCreateFormValues,
  type AdminArtworkDetailsFormValues,
} from '@/lib/artworks/details-form';
import type { Database } from '@/types/supabase';

export type ArtworkDetailsMutationClient = SupabaseClient<Database>;

export type AdminArtworkDetailsSnapshot = {
  id: string;
  title: string | null;
  title_en?: string | null;
  admin_product_name?: string | null;
  artist_id: string | null;
  description?: string | null;
  size?: string | null;
  material?: string | null;
  year?: string | null;
  edition?: string | null;
  edition_type?: string | null;
  edition_limit?: number | null;
  price?: string | null;
  tax_type?: string | null;
  status?: string | null;
  sold_at?: string | null;
  images?: unknown;
  tone?: unknown;
  is_hidden?: boolean | null;
  shop_url?: string | null;
  updated_at?: string | null;
};

export type UpdateAdminArtworkDetailsMutationInput = {
  id: string;
  details: AdminArtworkDetailsFormValues;
  now: string;
};

export type UpdateAdminArtworkDetailsMutationResult = {
  oldArtwork: AdminArtworkDetailsSnapshot | null;
  newArtwork: AdminArtworkDetailsSnapshot | null;
  artistNames: Array<string | null>;
};

export type CreateAdminArtworkRecordMutationInput = {
  details: AdminArtworkCreateFormValues;
};

export type CreateAdminArtworkRecordMutationResult = {
  artwork: AdminArtworkDetailsSnapshot;
  artistName: string | null;
};

const OLD_ARTWORK_DETAILS_COLUMNS =
  'id, title, title_en, admin_product_name, artist_id, description, size, material, year, edition, edition_type, edition_limit, price, tax_type, status, sold_at, images, is_hidden, shop_url, updated_at';

const NEW_ARTWORK_DETAILS_COLUMNS =
  'id, title, admin_product_name, artist_id, description, size, material, year, edition, edition_type, edition_limit, price, tax_type, status, sold_at, images, tone, is_hidden, shop_url, updated_at';

async function getArtistName(
  supabase: ArtworkDetailsMutationClient,
  artistId: string | null | undefined
): Promise<string | null> {
  if (!artistId) return null;
  const { data: artist } = await supabase
    .from('artists')
    .select('name_ko')
    .eq('id', artistId)
    .single();
  return artist?.name_ko ?? null;
}

export async function updateAdminArtworkDetailsMutation(
  supabase: ArtworkDetailsMutationClient,
  { id, details, now }: UpdateAdminArtworkDetailsMutationInput
): Promise<UpdateAdminArtworkDetailsMutationResult> {
  const { data: oldArtwork } = await supabase
    .from('artworks')
    .select(OLD_ARTWORK_DETAILS_COLUMNS)
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('artworks')
    .update(buildAdminArtworkDetailsUpdate(details, now))
    .eq('id', id);

  if (error) throw error;

  const { data: newArtwork } = await supabase
    .from('artworks')
    .select(NEW_ARTWORK_DETAILS_COLUMNS)
    .eq('id', id)
    .single();

  const artistNames: Array<string | null> = [];
  if (oldArtwork?.artist_id) {
    artistNames.push(await getArtistName(supabase, oldArtwork.artist_id));
  }
  if (details.artist_id && details.artist_id !== oldArtwork?.artist_id) {
    artistNames.push(await getArtistName(supabase, details.artist_id));
  }

  return {
    oldArtwork: (oldArtwork || null) as AdminArtworkDetailsSnapshot | null,
    newArtwork: (newArtwork || null) as AdminArtworkDetailsSnapshot | null,
    artistNames,
  };
}

export async function createAdminArtworkRecordMutation(
  supabase: ArtworkDetailsMutationClient,
  { details }: CreateAdminArtworkRecordMutationInput
): Promise<CreateAdminArtworkRecordMutationResult> {
  const { data: artwork, error } = await supabase
    .from('artworks')
    .insert(buildAdminArtworkCreateInsert(details))
    .select()
    .single();

  if (error) throw error;

  return {
    artwork: artwork as AdminArtworkDetailsSnapshot,
    artistName: await getArtistName(supabase, details.artist_id),
  };
}
