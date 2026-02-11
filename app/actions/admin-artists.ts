'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminOrServerClient } from '@/lib/auth/server';
import { logAdminAction } from './admin-logs';
import { getString, getStoragePathFromPublicUrl } from '@/lib/utils/form-helpers';

export async function getArtistsWithArtworkCount() {
  await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const { data: artists, error } = await supabase
    .from('artists')
    .select('*, artworks(count)')
    .order('name_ko');

  if (error) throw error;

  return (artists || []).map((artist: any) => ({
    ...artist,
    artwork_count: artist.artworks?.[0]?.count || 0,
  }));
}

export async function getArtistById(id: string) {
  await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const { data, error } = await supabase.from('artists').select('*').eq('id', id).single();

  if (error) throw error;
  return data;
}

export async function updateArtist(id: string, formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const name_ko = getString(formData, 'name_ko');
  const name_en = getString(formData, 'name_en');
  const bio = getString(formData, 'bio');
  const history = getString(formData, 'history');
  const profile_image = getString(formData, 'profile_image');
  const contact_email = getString(formData, 'contact_email');
  const instagram = getString(formData, 'instagram');
  const homepage = getString(formData, 'homepage');

  const { error } = await supabase
    .from('artists')
    .update({
      name_ko,
      name_en,
      bio,
      history,
      profile_image: profile_image || null,
      contact_email: contact_email || null,
      instagram: instagram || null,
      homepage: homepage || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;

  revalidatePath('/artworks');
  revalidatePath('/admin/artists');
  revalidatePath(`/admin/artists/${id}`);
  if (name_ko) {
    revalidatePath(`/artworks/artist/${encodeURIComponent(name_ko)}`);
  }

  await logAdminAction('artist_updated', 'artist', id, { name: name_ko });

  return { success: true };
}

export async function updateArtistProfileImage(id: string, profileImage: string | null) {
  await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const { error } = await supabase
    .from('artists')
    .update({
      profile_image: profileImage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;

  revalidatePath('/admin/artists');
  revalidatePath(`/admin/artists/${id}`);

  return { success: true };
}

export async function deleteArtist(id: string) {
  await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  // Get artist info for cleanup
  const { data: artist } = await supabase
    .from('artists')
    .select('profile_image, name_ko')
    .eq('id', id)
    .single();

  // Check for artworks
  const { count } = await supabase
    .from('artworks')
    .select('id', { count: 'exact', head: true })
    .eq('artist_id', id);

  if (count && count > 0) {
    throw new Error(
      '작가에게 등록된 작품이 있어 삭제할 수 없습니다. 먼저 작품을 삭제하거나 다른 작가로 이전해 주세요.'
    );
  }

  const { error } = await supabase.from('artists').delete().eq('id', id);
  if (error) throw error;

  // Clean up profile image from storage
  if (artist?.profile_image) {
    const path = getStoragePathFromPublicUrl(artist.profile_image, 'profiles');
    if (path) {
      await supabase.storage.from('profiles').remove([path]);
    }
  }

  revalidatePath('/artworks');
  revalidatePath('/admin/artists');
  if (artist?.name_ko) {
    revalidatePath(`/artworks/artist/${encodeURIComponent(artist.name_ko)}`);
  }

  await logAdminAction('artist_deleted', 'artist', id, { name: artist?.name_ko || 'Unknown' });

  return { success: true };
}

export async function createAdminArtist(formData: FormData) {
  await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const name_ko = getString(formData, 'name_ko');
  const name_en = getString(formData, 'name_en');
  const bio = getString(formData, 'bio');
  const history = getString(formData, 'history');
  const contact_email = getString(formData, 'contact_email');
  const instagram = getString(formData, 'instagram');
  const homepage = getString(formData, 'homepage');

  const { data, error } = await supabase
    .from('artists')
    .insert({
      name_ko,
      name_en,
      bio,
      history,
      contact_email: contact_email || null,
      instagram: instagram || null,
      homepage: homepage || null,
    })
    .select()
    .single();

  if (error) throw error;

  revalidatePath('/admin/artists');

  await logAdminAction('artist_created', 'artist', data.id, { name: name_ko });

  return { success: true, id: data.id };
}
