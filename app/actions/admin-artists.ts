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

  const { data, error } = await supabase
    .from('artists')
    .select('*, profiles(id, name, email)')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function updateArtist(id: string, formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const name_ko = getString(formData, 'name_ko');
  const name_en = getString(formData, 'name_en');
  const bio = getString(formData, 'bio');
  const history = getString(formData, 'history');
  const profile_image = getString(formData, 'profile_image');
  const contact_email = getString(formData, 'contact_email');
  const instagram = getString(formData, 'instagram');
  const homepage = getString(formData, 'homepage');

  const { data: oldArtist } = await supabase
    .from('artists')
    .select(
      'id, name_ko, name_en, bio, history, profile_image, contact_email, instagram, homepage, updated_at'
    )
    .eq('id', id)
    .single();

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

  const { data: newArtist } = await supabase
    .from('artists')
    .select(
      'id, name_ko, name_en, bio, history, profile_image, contact_email, instagram, homepage, updated_at'
    )
    .eq('id', id)
    .single();

  revalidatePath('/artworks');
  revalidatePath('/admin/artists');
  revalidatePath(`/admin/artists/${id}`);
  if (name_ko) {
    revalidatePath(`/artworks/artist/${encodeURIComponent(name_ko)}`);
  }

  await logAdminAction('artist_updated', 'artist', id, { name: name_ko }, admin.id, {
    summary: `작가 수정: ${name_ko || id}`,
    beforeSnapshot: oldArtist || null,
    afterSnapshot: newArtist || null,
    reversible: true,
  });

  return { success: true };
}

export async function updateArtistProfileImage(id: string, profileImage: string | null) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const { data: oldArtist } = await supabase
    .from('artists')
    .select('id, name_ko, profile_image, updated_at')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('artists')
    .update({
      profile_image: profileImage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;

  const { data: newArtist } = await supabase
    .from('artists')
    .select('id, name_ko, profile_image, updated_at')
    .eq('id', id)
    .single();

  revalidatePath('/admin/artists');
  revalidatePath(`/admin/artists/${id}`);

  await logAdminAction(
    'artist_profile_image_updated',
    'artist',
    id,
    { name: newArtist?.name_ko || oldArtist?.name_ko || id },
    admin.id,
    {
      summary: `작가 프로필 이미지 변경: ${newArtist?.name_ko || oldArtist?.name_ko || id}`,
      beforeSnapshot: oldArtist || null,
      afterSnapshot: newArtist || null,
      reversible: true,
    }
  );

  return { success: true };
}

export async function deleteArtist(id: string) {
  const admin = await requireAdmin();
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

  await logAdminAction(
    'artist_deleted',
    'artist',
    id,
    { name: artist?.name_ko || 'Unknown' },
    admin.id
  );

  return { success: true };
}

export async function createAdminArtist(formData: FormData) {
  const admin = await requireAdmin();
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

  await logAdminAction('artist_created', 'artist', data.id, { name: name_ko }, admin.id);

  return { success: true, id: data.id };
}

export async function searchUsersByName(query: string) {
  await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, avatar_url, role, status')
    .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(10);

  if (error) throw error;
  return data || [];
}

export async function linkArtistToUser(artistId: string, userId: string) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  // Check if user is already linked to another artist
  const { data: existingArtist, error: checkError } = await supabase
    .from('artists')
    .select('id, name_ko')
    .eq('user_id', userId)
    .maybeSingle();

  if (checkError) throw checkError;
  if (existingArtist) {
    throw new Error(`이 사용자는 이미 다른 작가('${existingArtist.name_ko}')와 연결되어 있습니다.`);
  }

  // Get artist info for logging
  const { data: artist } = await supabase
    .from('artists')
    .select('name_ko')
    .eq('id', artistId)
    .single();

  // Update artist linkage
  const { error: linkError } = await supabase
    .from('artists')
    .update({ user_id: userId })
    .eq('id', artistId);

  if (linkError) throw linkError;

  // Ensure user is active and has artist role
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: 'artist', status: 'active' })
    .eq('id', userId);

  if (profileError) throw profileError;

  revalidatePath('/admin/artists');
  revalidatePath(`/admin/artists/${artistId}`);

  await logAdminAction(
    'artist_linked_to_user',
    'artist',
    artistId,
    {
      artist_name: artist?.name_ko,
      user_id: userId,
    },
    admin.id
  );

  return { success: true };
}

export async function unlinkArtistFromUser(artistId: string) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  // Get artist info for logging
  const { data: artist } = await supabase
    .from('artists')
    .select('name_ko, user_id')
    .eq('id', artistId)
    .single();

  const { error: unlinkError } = await supabase
    .from('artists')
    .update({ user_id: null })
    .eq('id', artistId);

  if (unlinkError) throw unlinkError;

  revalidatePath('/admin/artists');
  revalidatePath(`/admin/artists/${artistId}`);

  await logAdminAction(
    'artist_unlinked_from_user',
    'artist',
    artistId,
    {
      artist_name: artist?.name_ko,
      user_id: artist?.user_id,
    },
    admin.id
  );

  return { success: true };
}
