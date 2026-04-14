'use server';

import { revalidatePath } from 'next/cache';
import { requireExhibitor } from '@/lib/auth/guards';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/auth/server';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';
import { getString, getStoragePathFromPublicUrl } from '@/lib/utils/form-helpers';
import { validateTextLength, validateUrl, validateEmail } from '@/lib/utils/input-validation';
import { logExhibitorAction } from './admin-logs';

export async function getExhibitorArtists() {
  const user = await requireExhibitor();
  const supabase = await createSupabaseServerClient();

  const { data: artists, error } = await supabase
    .from('artists')
    .select('*, artworks(count)')
    .eq('owner_id', user.id)
    .order('name_ko');

  if (error) throw error;

  return (artists || []).map((artist) => ({
    ...artist,
    artwork_count: (artist.artworks as unknown as { count: number }[] | undefined)?.[0]?.count || 0,
  }));
}

export async function getExhibitorArtistById(id: string) {
  const user = await requireExhibitor();
  const supabase = await createSupabaseServerClient();

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
  const supabase = await createSupabaseServerClient();

  const name_ko = validateTextLength(getString(formData, 'name_ko'), 100, '한국어 이름');
  const name_en = validateTextLength(getString(formData, 'name_en'), 100, '영어 이름');
  const bio = validateTextLength(getString(formData, 'bio'), 5000, '소개');
  const bio_en = validateTextLength(getString(formData, 'bio_en'), 5000, '영문 소개') || null;
  const history = validateTextLength(getString(formData, 'history'), 10000, '이력');
  const history_en =
    validateTextLength(getString(formData, 'history_en'), 10000, '영문 이력') || null;
  const contact_email = validateEmail(getString(formData, 'contact_email') || null);
  const instagram = validateUrl(getString(formData, 'instagram') || null);
  const homepage = validateUrl(getString(formData, 'homepage') || null);
  const profile_image = getString(formData, 'profile_image');

  const { data, error } = await supabase
    .from('artists')
    .insert({
      owner_id: user.id,
      name_ko,
      name_en,
      bio,
      bio_en,
      history,
      history_en,
      contact_email,
      instagram,
      homepage,
      profile_image: profile_image || null,
    })
    .select()
    .single();

  if (error) throw error;

  await logExhibitorAction(
    'exhibitor_artist_created',
    'artist',
    data.id,
    { name: name_ko },
    {
      afterSnapshot: data,
      reversible: true,
    }
  );

  revalidatePath('/exhibitor/artists');
  revalidatePublicArtworkSurfaces([name_ko]);

  return { success: true, id: data.id };
}

export async function updateExhibitorArtist(id: string, formData: FormData) {
  const user = await requireExhibitor();
  const supabase = await createSupabaseServerClient();

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

  const name_ko = validateTextLength(getString(formData, 'name_ko'), 100, '한국어 이름');
  const name_en = validateTextLength(getString(formData, 'name_en'), 100, '영어 이름');
  const bio = validateTextLength(getString(formData, 'bio'), 5000, '소개');
  const bio_en = validateTextLength(getString(formData, 'bio_en'), 5000, '영문 소개') || null;
  const history = validateTextLength(getString(formData, 'history'), 10000, '이력');
  const history_en =
    validateTextLength(getString(formData, 'history_en'), 10000, '영문 이력') || null;
  const profile_image = getString(formData, 'profile_image');
  const contact_email = validateEmail(getString(formData, 'contact_email') || null);
  const instagram = validateUrl(getString(formData, 'instagram') || null);
  const homepage = validateUrl(getString(formData, 'homepage') || null);

  const { data: newArtist, error } = await supabase
    .from('artists')
    .update({
      name_ko,
      name_en,
      bio,
      bio_en,
      history,
      history_en,
      profile_image: profile_image || null,
      contact_email,
      instagram,
      homepage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('owner_id', user.id)
    .select()
    .single();

  if (error) throw error;

  await logExhibitorAction(
    'exhibitor_artist_updated',
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
  revalidatePublicArtworkSurfaces([oldArtist.name_ko, name_ko]);

  return { success: true };
}

export async function updateExhibitorArtistProfileImage(id: string, profileImage: string | null) {
  const user = await requireExhibitor();
  const supabase = await createSupabaseServerClient();

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
    'exhibitor_artist_profile_image_updated',
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
  revalidatePublicArtworkSurfaces([oldArtist.name_ko, newArtist.name_ko]);

  return { success: true };
}

export async function deleteExhibitorArtist(id: string) {
  const user = await requireExhibitor();
  const supabase = await createSupabaseServerClient();

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
    'exhibitor_artist_deleted',
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
      // profiles 버킷 RLS는 owner uid 기준이므로 exhibitor가 직접 삭제 불가 → admin client 사용
      const adminClient = createSupabaseAdminClient();
      await adminClient.storage.from('profiles').remove([path]);
    }
  }

  revalidatePath('/exhibitor/artists');
  revalidatePublicArtworkSurfaces([artist.name_ko]);

  return { success: true };
}
