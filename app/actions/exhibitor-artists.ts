'use server';

import { revalidatePath } from 'next/cache';
import { requireExhibitor } from '@/lib/auth/guards';
import { createSupabaseAdminOrServerClient } from '@/lib/auth/server';
import { getString, getStoragePathFromPublicUrl } from '@/lib/utils/form-helpers';
import { logExhibitorAction } from './admin-logs';

export async function getExhibitorArtists() {
  const user = await requireExhibitor();
  const supabase = await createSupabaseAdminOrServerClient();

  const { data: artists, error } = await supabase
    .from('artists')
    .select('*, artworks(count)')
    .eq('owner_id', user.id)
    .order('name_ko');

  if (error) throw error;

  return (artists || []).map((artist: any) => ({
    ...artist,
    artwork_count: artist.artworks?.[0]?.count || 0,
  }));
}

export async function getExhibitorArtistById(id: string) {
  const user = await requireExhibitor();
  const supabase = await createSupabaseAdminOrServerClient();

  const { data, error } = await supabase
    .from('artists')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (error) throw error;
  return data;
}

export async function createExhibitorArtist(formData: FormData) {
  const user = await requireExhibitor();
  const supabase = await createSupabaseAdminOrServerClient();

  const name_ko = getString(formData, 'name_ko');
  const name_en = getString(formData, 'name_en');
  const bio = getString(formData, 'bio');
  const history = getString(formData, 'history');
  const contact_email = getString(formData, 'contact_email');
  const instagram = getString(formData, 'instagram');
  const homepage = getString(formData, 'homepage');
  const profile_image = getString(formData, 'profile_image');

  const { data, error } = await supabase
    .from('artists')
    .insert({
      owner_id: user.id,
      name_ko,
      name_en,
      bio,
      history,
      contact_email: contact_email || null,
      instagram: instagram || null,
      homepage: homepage || null,
      profile_image: profile_image || null,
    })
    .select()
    .single();

  if (error) throw error;

  await logExhibitorAction(
    'artist_created',
    'artist',
    data.id,
    { name: name_ko },
    {
      afterSnapshot: data,
    }
  );

  revalidatePath('/exhibitor/artists');

  return { success: true, id: data.id };
}

export async function updateExhibitorArtist(id: string, formData: FormData) {
  const user = await requireExhibitor();
  const supabase = await createSupabaseAdminOrServerClient();

  // Fetch existing artist for snapshot
  const { data: oldArtist, error: fetchError } = await supabase
    .from('artists')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (fetchError || !oldArtist) {
    throw new Error('You do not have permission to update this artist.');
  }

  const name_ko = getString(formData, 'name_ko');
  const name_en = getString(formData, 'name_en');
  const bio = getString(formData, 'bio');
  const history = getString(formData, 'history');
  const profile_image = getString(formData, 'profile_image');
  const contact_email = getString(formData, 'contact_email');
  const instagram = getString(formData, 'instagram');
  const homepage = getString(formData, 'homepage');

  const { data: newArtist, error } = await supabase
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
    .eq('id', id)
    .eq('owner_id', user.id)
    .select()
    .single();

  if (error) throw error;

  await logExhibitorAction(
    'artist_updated',
    'artist',
    id,
    { name: name_ko },
    {
      beforeSnapshot: oldArtist,
      afterSnapshot: newArtist,
      reversible: true,
    }
  );

  revalidatePath('/exhibitor/artists');
  revalidatePath(`/exhibitor/artists/${id}`);
  if (name_ko) {
    revalidatePath(`/artworks/artist/${encodeURIComponent(name_ko)}`);
  }

  return { success: true };
}

export async function updateExhibitorArtistProfileImage(id: string, profileImage: string | null) {
  const user = await requireExhibitor();
  const supabase = await createSupabaseAdminOrServerClient();

  // Fetch existing artist for snapshot
  const { data: oldArtist, error: fetchError } = await supabase
    .from('artists')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (fetchError || !oldArtist) {
    throw new Error('You do not have permission to update this artist.');
  }

  const { data: newArtist, error } = await supabase
    .from('artists')
    .update({
      profile_image: profileImage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('owner_id', user.id)
    .select()
    .single();

  if (error) throw error;

  await logExhibitorAction(
    'artist_profile_image_updated',
    'artist',
    id,
    {
      name: oldArtist.name_ko,
    },
    {
      beforeSnapshot: oldArtist,
      afterSnapshot: newArtist,
      reversible: true,
    }
  );

  revalidatePath('/exhibitor/artists');
  revalidatePath(`/exhibitor/artists/${id}`);

  return { success: true };
}

export async function deleteExhibitorArtist(id: string) {
  const user = await requireExhibitor();
  const supabase = await createSupabaseAdminOrServerClient();

  // Fetch full artist data for snapshot
  const { data: artist, error: fetchError } = await supabase
    .from('artists')
    .select('*')
    .eq('id', id)
    .eq('owner_id', user.id)
    .single();

  if (fetchError || !artist) {
    throw new Error('You do not have permission to delete this artist.');
  }

  const { count } = await supabase
    .from('artworks')
    .select('id', { count: 'exact', head: true })
    .eq('artist_id', id);

  if (count && count > 0) {
    throw new Error('작가에게 등록된 작품이 있어 삭제할 수 없습니다. 먼저 작품을 삭제해 주세요.');
  }

  const { error } = await supabase.from('artists').delete().eq('id', id).eq('owner_id', user.id);

  if (error) throw error;

  await logExhibitorAction(
    'artist_deleted',
    'artist',
    id,
    { name: artist.name_ko },
    {
      beforeSnapshot: artist,
      afterSnapshot: null,
      reversible: true,
    }
  );

  if (artist.profile_image) {
    const path = getStoragePathFromPublicUrl(artist.profile_image, 'profiles');
    if (path) {
      await supabase.storage.from('profiles').remove([path]);
    }
  }

  revalidatePath('/exhibitor/artists');
  if (artist.name_ko) {
    revalidatePath(`/artworks/artist/${encodeURIComponent(artist.name_ko)}`);
  }

  return { success: true };
}
