'use server';

import { revalidatePath } from 'next/cache';
import { requireExhibitor } from '@/lib/auth/guards';
import { createSupabaseAdminOrServerClient } from '@/lib/auth/server';
import { getString, getStoragePathsForRemoval } from '@/lib/utils/form-helpers';
import { logExhibitorAction } from './admin-logs';
import { validateArtworkData } from '@/lib/actions/artwork-validation';

export async function getExhibitorArtworks() {
  const user = await requireExhibitor();
  const supabase = await createSupabaseAdminOrServerClient();

  const { data: artworks, error } = await supabase
    .from('artworks')
    .select('*, artists!inner(id, name_ko, owner_id)')
    .eq('artists.owner_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (artworks || []).map((artwork: any) => ({
    ...artwork,
    artists: artwork.artists || null,
  }));
}

export async function getExhibitorArtworkById(id: string) {
  const user = await requireExhibitor();
  const supabase = await createSupabaseAdminOrServerClient();

  const { data: artwork, error } = await supabase
    .from('artworks')
    .select('*, artists!inner(id, name_ko, owner_id)')
    .eq('id', id)
    .eq('artists.owner_id', user.id)
    .single();

  if (error) throw error;

  return {
    ...artwork,
    artists: artwork.artists || null,
  };
}

export async function createExhibitorArtwork(formData: FormData) {
  const user = await requireExhibitor();
  const supabase = await createSupabaseAdminOrServerClient();

  // Validate Data
  const validation = validateArtworkData(formData);
  if (validation.error) {
    throw new Error(validation.error);
  }

  const title = getString(formData, 'title');
  const description = getString(formData, 'description');
  const size = getString(formData, 'size');
  const material = getString(formData, 'material');
  const year = getString(formData, 'year');
  const edition = getString(formData, 'edition');
  const edition_type = getString(formData, 'edition_type') || 'unique';
  const edition_limit_str = getString(formData, 'edition_limit');
  const edition_limit = edition_limit_str ? parseInt(edition_limit_str) : null;
  const price = getString(formData, 'price');
  const shop_url = getString(formData, 'shop_url');
  const artist_id = getString(formData, 'artist_id');

  if (!artist_id) throw new Error('작가를 선택해주세요.');

  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .select('id, name_ko')
    .eq('id', artist_id)
    .eq('owner_id', user.id)
    .single();

  if (artistError || !artist) {
    throw new Error('선택한 작가에 대한 권한이 없습니다.');
  }

  const { data: artwork, error } = await supabase
    .from('artworks')
    .insert({
      title,
      description,
      size,
      material,
      year,
      edition,
      edition_type,
      edition_limit,
      price,
      shop_url,
      artist_id,
      status: 'available',
      is_hidden: false,
    })
    .select()
    .single();

  if (error) throw error;

  await logExhibitorAction(
    'exhibitor_artwork_created',
    'artwork',
    artwork.id,
    {
      title,
      artist: artist.name_ko,
    },
    {
      afterSnapshot: artwork,
      reversible: true,
    }
  );

  revalidatePath('/exhibitor/artworks');
  if (artist.name_ko) {
    revalidatePath(`/artworks/artist/${encodeURIComponent(artist.name_ko)}`);
  }

  return { success: true, id: artwork.id };
}

export async function updateExhibitorArtwork(id: string, formData: FormData) {
  const user = await requireExhibitor();
  const supabase = await createSupabaseAdminOrServerClient();

  // Validate Data
  const validation = validateArtworkData(formData);
  if (validation.error) {
    throw new Error(validation.error);
  }

  const title = getString(formData, 'title');
  const description = getString(formData, 'description');
  const size = getString(formData, 'size');
  const material = getString(formData, 'material');
  const year = getString(formData, 'year');
  const edition = getString(formData, 'edition');
  const edition_type = getString(formData, 'edition_type') || 'unique';
  const edition_limit_str = getString(formData, 'edition_limit');
  const edition_limit = edition_limit_str ? parseInt(edition_limit_str) : null;
  const price = getString(formData, 'price');
  const shop_url = getString(formData, 'shop_url');
  const artist_id = getString(formData, 'artist_id');

  // Fetch full existing artwork for snapshot
  const { data: oldArtwork, error: fetchError } = await supabase
    .from('artworks')
    .select('*, artists!inner(owner_id)')
    .eq('id', id)
    .eq('artists.owner_id', user.id)
    .single();

  if (fetchError || !oldArtwork) {
    throw new Error('작품을 수정할 권한이 없습니다.');
  }

  if (artist_id && artist_id !== oldArtwork.artist_id) {
    const { data: newArtistCheck } = await supabase
      .from('artists')
      .select('id')
      .eq('id', artist_id)
      .eq('owner_id', user.id)
      .single();

    if (!newArtistCheck) {
      throw new Error('선택한 작가에 대한 권한이 없습니다.');
    }
  }

  const { data: newArtwork, error } = await supabase
    .from('artworks')
    .update({
      title,
      description,
      size,
      material,
      year,
      edition,
      edition_type,
      edition_limit,
      price,
      shop_url,
      artist_id: artist_id || oldArtwork.artist_id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  await logExhibitorAction(
    'exhibitor_artwork_updated',
    'artwork',
    id,
    { title },
    {
      beforeSnapshot: oldArtwork,
      afterSnapshot: newArtwork,
      reversible: true,
    }
  );

  revalidatePath('/exhibitor/artworks');
  revalidatePath(`/exhibitor/artworks/${id}`);
  revalidatePath('/artworks');

  return { success: true };
}

export async function updateExhibitorArtworkImages(id: string, images: string[]) {
  const user = await requireExhibitor();
  const supabase = await createSupabaseAdminOrServerClient();

  // Fetch full existing artwork for snapshot
  const { data: oldArtwork, error: fetchError } = await supabase
    .from('artworks')
    .select('*, artists!inner(owner_id)')
    .eq('id', id)
    .eq('artists.owner_id', user.id)
    .single();

  if (fetchError || !oldArtwork) {
    throw new Error('작품을 수정할 권한이 없습니다.');
  }

  const { data: newArtwork, error } = await supabase
    .from('artworks')
    .update({
      images,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  await logExhibitorAction(
    'exhibitor_artwork_images_updated',
    'artwork',
    id,
    {
      title: oldArtwork.title,
      imageCount: images.length,
    },
    {
      beforeSnapshot: oldArtwork,
      afterSnapshot: newArtwork,
      reversible: true,
    }
  );

  revalidatePath('/exhibitor/artworks');
  revalidatePath(`/exhibitor/artworks/${id}`);
  revalidatePath('/artworks');

  return { success: true };
}

export async function deleteExhibitorArtwork(id: string) {
  const user = await requireExhibitor();
  const supabase = await createSupabaseAdminOrServerClient();

  // Fetch full artwork for snapshot
  const { data: artwork, error: fetchError } = await supabase
    .from('artworks')
    .select('*, artists!inner(owner_id, name_ko)')
    .eq('id', id)
    .eq('artists.owner_id', user.id)
    .single();

  if (fetchError || !artwork) {
    throw new Error('작품을 삭제할 권한이 없습니다.');
  }

  const { error } = await supabase.from('artworks').delete().eq('id', id);
  if (error) throw error;

  await logExhibitorAction(
    'exhibitor_artwork_deleted',
    'artwork',
    id,
    {
      title: artwork.title,
      artist: (artwork.artists as any)?.name_ko,
    },
    {
      beforeSnapshot: artwork,
      afterSnapshot: null,
      reversible: true,
    }
  );

  const paths = getStoragePathsForRemoval(artwork.images || [], 'artworks');
  if (paths.length > 0) {
    await supabase.storage.from('artworks').remove(paths);
  }

  revalidatePath('/exhibitor/artworks');
  if (artwork.artists && (artwork.artists as any).name_ko) {
    revalidatePath(`/artworks/artist/${encodeURIComponent((artwork.artists as any).name_ko)}`);
  }

  return { success: true };
}
