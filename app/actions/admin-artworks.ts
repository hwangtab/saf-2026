'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminOrServerClient } from '@/lib/auth/server';
import { logAdminAction } from './admin-logs';
import {
  getString,
  getStoragePathFromPublicUrl,
  validateBatchSize,
} from '@/lib/utils/form-helpers';

export async function updateAdminArtwork(id: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

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
  const supabase = await createSupabaseAdminOrServerClient();

  const { data: artwork } = await supabase
    .from('artworks')
    .select('title, images, artist_id')
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

  await logAdminAction('artwork_deleted', 'artwork', id, {
    title: artwork?.title || 'Unknown',
  });
}

export async function getArtworkById(id: string) {
  await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const { data, error } = await supabase
    .from('artworks')
    .select('*, artists(id, name_ko)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function getAllArtists() {
  await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const { data, error } = await supabase.from('artists').select('id, name_ko').order('name_ko');

  if (error) throw error;
  return data || [];
}

export async function updateArtworkDetails(id: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const title = getString(formData, 'title');
  const description = getString(formData, 'description');
  const size = getString(formData, 'size');
  const material = getString(formData, 'material');
  const year = getString(formData, 'year');
  const edition = getString(formData, 'edition');
  const price = getString(formData, 'price');
  const shop_url = getString(formData, 'shop_url');
  const artist_id = getString(formData, 'artist_id');

  const { data: oldArtwork } = await supabase
    .from('artworks')
    .select('artist_id')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('artworks')
    .update({
      title,
      description,
      size,
      material,
      year,
      edition,
      price,
      shop_url,
      artist_id: artist_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;

  revalidatePath('/artworks');
  revalidatePath('/');
  revalidatePath(`/artworks/${id}`);
  revalidatePath('/admin/artworks');
  revalidatePath(`/admin/artworks/${id}`);

  // Revalidate both old and new artist pages
  if (oldArtwork?.artist_id) {
    const { data: artist } = await supabase
      .from('artists')
      .select('name_ko')
      .eq('id', oldArtwork.artist_id)
      .single();
    if (artist?.name_ko) {
      revalidatePath(`/artworks/artist/${encodeURIComponent(artist.name_ko)}`);
    }
  }
  if (artist_id && artist_id !== oldArtwork?.artist_id) {
    const { data: artist } = await supabase
      .from('artists')
      .select('name_ko')
      .eq('id', artist_id)
      .single();
    if (artist?.name_ko) {
      revalidatePath(`/artworks/artist/${encodeURIComponent(artist.name_ko)}`);
    }
  }

  await logAdminAction('artwork_updated', 'artwork', id, { title });

  return { success: true };
}

export async function updateArtworkImages(id: string, images: string[]) {
  await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const { error } = await supabase
    .from('artworks')
    .update({
      images,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;

  revalidatePath('/artworks');
  revalidatePath('/');
  revalidatePath(`/artworks/${id}`);
  revalidatePath('/admin/artworks');
  revalidatePath(`/admin/artworks/${id}`);

  await logAdminAction('artwork_images_updated', 'artwork', id, {
    image_count: images.length,
  });

  return { success: true };
}

// Batch operations
export async function batchUpdateArtworkStatus(ids: string[], status: string) {
  if (ids.length === 0) return { success: true, count: 0 };
  validateBatchSize(ids);
  await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  if (!['available', 'reserved', 'sold'].includes(status)) {
    throw new Error('Invalid status');
  }

  const { error } = await supabase
    .from('artworks')
    .update({ status, updated_at: new Date().toISOString() })
    .in('id', ids);

  if (error) throw error;

  revalidatePath('/artworks');
  revalidatePath('/');
  revalidatePath('/admin/artworks');

  await logAdminAction('batch_artwork_status', 'artwork', ids.join(','), {
    count: ids.length,
    status,
  });

  return { success: true, count: ids.length };
}

export async function batchToggleHidden(ids: string[], isHidden: boolean) {
  if (ids.length === 0) return { success: true, count: 0 };
  validateBatchSize(ids);
  await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const { error } = await supabase
    .from('artworks')
    .update({ is_hidden: isHidden, updated_at: new Date().toISOString() })
    .in('id', ids);

  if (error) throw error;

  revalidatePath('/artworks');
  revalidatePath('/');
  revalidatePath('/admin/artworks');

  await logAdminAction('batch_artwork_visibility', 'artwork', ids.join(','), {
    count: ids.length,
    hidden: isHidden,
  });

  return { success: true, count: ids.length };
}

export async function batchDeleteArtworks(ids: string[]) {
  if (ids.length === 0) return { success: true, count: 0 };
  validateBatchSize(ids);
  await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  // Get all artworks for cleanup
  const { data: artworks } = await supabase.from('artworks').select('id, images').in('id', ids);

  const { error } = await supabase.from('artworks').delete().in('id', ids);
  if (error) throw error;

  // Clean up images from storage
  const paths = (artworks || [])
    .flatMap((artwork: any) => artwork.images || [])
    .map((url: string) => getStoragePathFromPublicUrl(url, 'artworks'))
    .filter((path: string | null): path is string => !!path);

  if (paths.length > 0) {
    await supabase.storage.from('artworks').remove(paths);
  }

  revalidatePath('/artworks');
  revalidatePath('/');
  revalidatePath('/admin/artworks');

  await logAdminAction('batch_artwork_deleted', 'artwork', ids.join(','), {
    count: ids.length,
  });

  return { success: true, count: ids.length };
}
