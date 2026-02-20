'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminOrServerClient } from '@/lib/auth/server';
import { hasHangulJamo, matchesAnySearch } from '@/lib/search-utils';
import { logAdminAction } from './admin-logs';
import { getString } from '@/lib/utils/form-helpers';

function normalizeEmail(value: string | null | undefined): string | null {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(trimmed) ? trimmed : null;
}

function normalizePhone(value: string | null | undefined): string | null {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;
  const phonePattern = /^\+?[0-9()\-\s]{7,20}$/;
  return phonePattern.test(trimmed) ? trimmed : null;
}

function extractEmailFromText(value: string): string | null {
  const emailMatch = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return normalizeEmail(emailMatch?.[0] || null);
}

function extractPhoneFromText(value: string): string | null {
  const sanitized = value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, ' ');
  const phoneMatch = sanitized.match(/(?:\+?\d[\d\s()-]{5,}\d)/);
  return normalizePhone(phoneMatch?.[0] || null);
}

function parseApplicationContact(contact: string | null | undefined) {
  const trimmed = (contact || '').trim();
  if (!trimmed) {
    return { contactEmail: null, contactPhone: null };
  }

  const parsedEmail = extractEmailFromText(trimmed) || normalizeEmail(trimmed);
  const parsedPhone = extractPhoneFromText(trimmed) || normalizePhone(trimmed);

  return {
    contactEmail: parsedEmail,
    contactPhone: parsedPhone,
  };
}

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

type GetArtistsPaginatedParams = {
  page?: number;
  limit?: number;
  q?: string;
  linked?: 'all' | 'linked' | 'unlinked';
};

export async function getArtistsPaginated(params: GetArtistsPaginatedParams = {}) {
  await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const page = params.page || 1;
  const limit = params.limit || 25;
  const offset = (page - 1) * limit;

  let query = supabase.from('artists').select('*, artworks(count)', { count: 'exact' });

  // 검색어 필터
  if (params.q && params.q.trim()) {
    const searchTerm = params.q.trim();
    query = query.or(
      `name_ko.ilike.%${searchTerm}%,name_en.ilike.%${searchTerm}%,contact_email.ilike.%${searchTerm}%,contact_phone.ilike.%${searchTerm}%`
    );
  }

  // 계정 연결 필터
  if (params.linked === 'linked') {
    query = query.not('user_id', 'is', null);
  } else if (params.linked === 'unlinked') {
    query = query.is('user_id', null);
  }

  const {
    data: artists,
    count,
    error,
  } = await query.order('name_ko').range(offset, offset + limit - 1);

  if (error) throw error;

  const totalItems = count || 0;
  const totalPages = Math.ceil(totalItems / limit);

  return {
    artists: (artists || []).map((artist: any) => ({
      ...artist,
      artwork_count: artist.artworks?.[0]?.count || 0,
    })),
    pagination: {
      currentPage: page,
      totalPages,
      totalItems,
    },
  };
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

  // Transform profiles array to single object or null if it comes as an array
  const artist = {
    ...data,
    profiles: Array.isArray(data.profiles) ? data.profiles[0] || null : data.profiles,
  };

  return artist;
}

export async function updateArtist(id: string, formData: FormData) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const name_ko = getString(formData, 'name_ko');
  const name_en = getString(formData, 'name_en');
  const bio = getString(formData, 'bio');
  const history = getString(formData, 'history');
  const profile_image = getString(formData, 'profile_image');
  const contact_phone = getString(formData, 'contact_phone');
  const contact_email = getString(formData, 'contact_email');
  const instagram = getString(formData, 'instagram');
  const homepage = getString(formData, 'homepage');

  const { data: oldArtist } = await supabase
    .from('artists')
    .select(
      'id, name_ko, name_en, bio, history, profile_image, contact_phone, contact_email, instagram, homepage, updated_at'
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
      contact_phone: contact_phone || null,
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
      'id, name_ko, name_en, bio, history, profile_image, contact_phone, contact_email, instagram, homepage, updated_at'
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

  // Keep full snapshot so deleted row can be restored from activity logs.
  const { data: artist } = await supabase
    .from('artists')
    .select(
      'id, user_id, owner_id, name_ko, name_en, bio, history, profile_image, contact_phone, contact_email, instagram, homepage, created_at, updated_at'
    )
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

  revalidatePath('/artworks');
  revalidatePath('/admin/artists');
  if (artist?.name_ko) {
    revalidatePath(`/artworks/artist/${encodeURIComponent(artist.name_ko)}`);
  }

  await logAdminAction(
    'artist_deleted',
    'artist',
    id,
    {
      name: artist?.name_ko || 'Unknown',
      storage_cleanup_deferred: true,
    },
    admin.id,
    {
      summary: `작가 삭제: ${artist?.name_ko || id}`,
      beforeSnapshot: artist || null,
      afterSnapshot: null,
      reversible: true,
    }
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
  const contact_phone = getString(formData, 'contact_phone');
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
      contact_phone: contact_phone || null,
      contact_email: contact_email || null,
      instagram: instagram || null,
      homepage: homepage || null,
    })
    .select()
    .single();

  if (error) throw error;

  revalidatePath('/admin/artists');

  await logAdminAction('artist_created', 'artist', data.id, { name: name_ko }, admin.id, {
    afterSnapshot: data,
    reversible: true,
  });

  return { success: true, id: data.id };
}

export async function searchUsersByName(query: string) {
  await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) return [];

  if (hasHangulJamo(normalizedQuery)) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_url, role, status')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    return (data || [])
      .filter((item) => matchesAnySearch(normalizedQuery, [item.name, item.email]))
      .slice(0, 10);
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, avatar_url, role, status')
    .or(`name.ilike.%${normalizedQuery}%,email.ilike.%${normalizedQuery}%`)
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

  // Get full artist info for snapshot (before linking)
  const { data: oldArtist } = await supabase
    .from('artists')
    .select('*')
    .eq('id', artistId)
    .single();

  const [{ data: profile }, { data: application }] = await Promise.all([
    supabase.from('profiles').select('email').eq('id', userId).maybeSingle(),
    supabase.from('artist_applications').select('contact').eq('user_id', userId).maybeSingle(),
  ]);

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

  const parsedContact = parseApplicationContact(application?.contact || null);
  const fallbackEmail = normalizeEmail(profile?.email || null);
  const nextContactEmail = parsedContact.contactEmail || fallbackEmail;
  const nextContactPhone = parsedContact.contactPhone;
  const artistContactPatch: { contact_email?: string; contact_phone?: string } = {};

  if (!oldArtist?.contact_email?.trim() && nextContactEmail) {
    artistContactPatch.contact_email = nextContactEmail;
  }
  if (!oldArtist?.contact_phone?.trim() && nextContactPhone) {
    artistContactPatch.contact_phone = nextContactPhone;
  }

  if (Object.keys(artistContactPatch).length > 0) {
    const { error: contactPatchError } = await supabase
      .from('artists')
      .update(artistContactPatch)
      .eq('id', artistId);
    if (contactPatchError) throw contactPatchError;
  }

  // Get artist state after all updates
  const { data: newArtist } = await supabase
    .from('artists')
    .select('*')
    .eq('id', artistId)
    .single();

  revalidatePath('/admin/artists');
  revalidatePath(`/admin/artists/${artistId}`);

  await logAdminAction(
    'artist_linked_to_user',
    'artist',
    artistId,
    {
      artist_name: oldArtist?.name_ko,
      user_id: userId,
      phone_autofilled: Boolean(artistContactPatch.contact_phone),
      email_autofilled: Boolean(artistContactPatch.contact_email),
    },
    admin.id,
    {
      beforeSnapshot: oldArtist,
      afterSnapshot: newArtist,
      reversible: true,
    }
  );

  return { success: true };
}

export async function unlinkArtistFromUser(artistId: string) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  // Get full artist info for snapshot (before unlinking)
  const { data: oldArtist } = await supabase
    .from('artists')
    .select('*')
    .eq('id', artistId)
    .single();

  const { error: unlinkError } = await supabase
    .from('artists')
    .update({ user_id: null })
    .eq('id', artistId);

  if (unlinkError) throw unlinkError;

  // Get artist state after unlink
  const { data: newArtist } = await supabase
    .from('artists')
    .select('*')
    .eq('id', artistId)
    .single();

  revalidatePath('/admin/artists');
  revalidatePath(`/admin/artists/${artistId}`);

  await logAdminAction(
    'artist_unlinked_from_user',
    'artist',
    artistId,
    {
      artist_name: oldArtist?.name_ko,
      user_id: oldArtist?.user_id,
    },
    admin.id,
    {
      beforeSnapshot: oldArtist,
      afterSnapshot: newArtist,
      reversible: true,
    }
  );

  return { success: true };
}
