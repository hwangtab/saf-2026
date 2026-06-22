'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';
import { NOTICE_TYPES, type NoticeType } from '@/lib/artist-notice';
import { CAREER_TIERS } from '@/types';
import type { Tables } from '@/types/supabase';
import {
  hasComposedTrailingConsonantQuery,
  hasHangulJamo,
  hasHangulSyllable,
  matchesAnySearch,
} from '@/lib/search-utils';
import { logAdminAction } from './activity-log-writer';
import { getString } from '@/lib/utils/form-helpers';
import { sanitizeIlikeQuery } from '@/lib/utils/query';
import { validatePhone } from '@/lib/utils/phone';
import { validateTextLength, validateUrl, validateEmail } from '@/lib/utils/input-validation';

function normalizeEmail(value: string | null | undefined): string | null {
  const trimmed = (value || '').trim();
  if (!trimmed) return null;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(trimmed) ? trimmed : null;
}

function extractEmailFromText(value: string): string | null {
  const emailMatch = value.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return normalizeEmail(emailMatch?.[0] || null);
}

function extractPhoneFromText(value: string): string | null {
  const sanitized = value.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, ' ');
  const phoneMatch = sanitized.match(/(?:\+?\d[\d\s()-]{5,}\d)/);
  return validatePhone(phoneMatch?.[0] || null);
}

function parseApplicationContact(contact: string | null | undefined) {
  const trimmed = (contact || '').trim();
  if (!trimmed) {
    return { contactEmail: null, contactPhone: null };
  }

  const parsedEmail = extractEmailFromText(trimmed) || normalizeEmail(trimmed);
  const parsedPhone = extractPhoneFromText(trimmed) || validatePhone(trimmed);

  return {
    contactEmail: parsedEmail,
    contactPhone: parsedPhone,
  };
}

// `artworks(count)` aggregate는 `{ count: number }[]` 형태로 들어와 첫 원소만 사용.
type ArtistWithArtworkCount = Tables<'artists'> & {
  artworks: { count: number }[] | null;
};

export async function getArtistsWithArtworkCount() {
  await requireAdmin();
  const supabase = await requireAdminClient();

  const { data: artists, error } = await supabase
    .from('artists')
    .select('*, artworks(count)')
    .order('name_ko')
    .returns<ArtistWithArtworkCount[]>();

  if (error) throw error;

  return (artists ?? []).map((artist) => ({
    ...artist,
    artwork_count: artist.artworks?.[0]?.count ?? 0,
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
  const supabase = await requireAdminClient();

  const page = Math.max(1, Math.floor(Number(params.page) || 1));
  const limit = Math.max(1, Math.min(100, Math.floor(Number(params.limit) || 25)));
  const offset = (page - 1) * limit;

  let query = supabase.from('artists').select('*, artworks(count)', { count: 'exact' });

  // 검색어 필터
  if (params.q && params.q.trim()) {
    const searchTerm = sanitizeIlikeQuery(params.q);
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
  } = await query
    .order('name_ko')
    .range(offset, offset + limit - 1)
    .returns<ArtistWithArtworkCount[]>();

  if (error) throw error;

  const totalItems = count ?? 0;
  const totalPages = Math.ceil(totalItems / limit);

  return {
    artists: (artists ?? []).map((artist) => ({
      ...artist,
      artwork_count: artist.artworks?.[0]?.count ?? 0,
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
  const supabase = await requireAdminClient();

  // notice_updated_by → profiles(id) FK 추가(20260430120000_artist_notice.sql)로
  // artists ↔ profiles 관계가 두 개가 됨(user_id, notice_updated_by). 명시적 FK hint 필수
  // — 안 그러면 PostgREST가 ambiguous로 거부해 admin 편집 진입이 깨짐.
  const { data, error } = await supabase
    .from('artists')
    .select('*, profiles!artists_user_id_fkey(id, name, email, status)')
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
  const supabase = await requireAdminClient();

  const name_ko = validateTextLength(getString(formData, 'name_ko'), 100, '한국어 이름');
  if (!name_ko.trim()) throw new Error('작가명(한국어)을 입력해 주세요.');
  const name_en = validateTextLength(getString(formData, 'name_en'), 100, '영어 이름');
  const careerTierRaw = getString(formData, 'career_tier').trim();
  const career_tier = (CAREER_TIERS as readonly string[]).includes(careerTierRaw)
    ? careerTierRaw
    : null;
  const bio = validateTextLength(getString(formData, 'bio'), 5000, '소개');
  const bio_en = validateTextLength(getString(formData, 'bio_en'), 5000, '영문 소개') || null;
  const history = validateTextLength(getString(formData, 'history'), 10000, '이력');
  const history_en =
    validateTextLength(getString(formData, 'history_en'), 10000, '영문 이력') || null;
  const profile_image = validateUrl(getString(formData, 'profile_image'), '프로필 이미지');
  const contact_phone = getString(formData, 'contact_phone');
  const contact_email = validateEmail(getString(formData, 'contact_email'));
  const instagram = validateUrl(getString(formData, 'instagram'), '인스타그램');
  const homepage = validateUrl(getString(formData, 'homepage'), '홈페이지');

  const { data: oldArtist } = await supabase
    .from('artists')
    .select(
      'id, name_ko, name_en, career_tier, bio, bio_en, history, history_en, profile_image, contact_phone, contact_email, instagram, homepage, updated_at'
    )
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('artists')
    .update({
      name_ko,
      name_en,
      career_tier,
      bio,
      bio_en,
      history,
      history_en,
      profile_image,
      contact_phone: contact_phone || null,
      contact_email,
      instagram,
      homepage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;

  const { data: newArtist } = await supabase
    .from('artists')
    .select(
      'id, name_ko, name_en, career_tier, bio, bio_en, history, history_en, profile_image, contact_phone, contact_email, instagram, homepage, updated_at'
    )
    .eq('id', id)
    .single();

  revalidatePublicArtworkSurfaces([name_ko]);
  revalidatePath('/admin/artists');
  revalidatePath(`/admin/artists/${id}`);

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
  const supabase = await requireAdminClient();

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
  const supabase = await requireAdminClient();

  // Keep full snapshot so deleted row can be restored from activity logs.
  // Fetch artist data and artwork count in parallel (independent queries).
  const [{ data: artist }, { count }] = await Promise.all([
    supabase
      .from('artists')
      .select(
        'id, user_id, owner_id, name_ko, name_en, bio, history, profile_image, contact_phone, contact_email, instagram, homepage, created_at, updated_at'
      )
      .eq('id', id)
      .single(),
    supabase.from('artworks').select('id', { count: 'exact', head: true }).eq('artist_id', id),
  ]);

  if (count && count > 0) {
    throw new Error(
      '작가에게 등록된 작품이 있어 삭제할 수 없습니다. 먼저 작품을 삭제하거나 다른 작가로 이전해 주세요.'
    );
  }

  const { error } = await supabase.from('artists').delete().eq('id', id);
  if (error) throw error;

  revalidatePublicArtworkSurfaces([artist?.name_ko]);
  revalidatePath('/admin/artists');

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
  const supabase = await requireAdminClient();

  const name_ko = validateTextLength(getString(formData, 'name_ko'), 100, '한국어 이름');
  if (!name_ko.trim()) throw new Error('작가명(한국어)을 입력해 주세요.');
  const name_en = validateTextLength(getString(formData, 'name_en'), 100, '영어 이름');
  const careerTierRawCreate = getString(formData, 'career_tier').trim();
  const career_tier = (CAREER_TIERS as readonly string[]).includes(careerTierRawCreate)
    ? careerTierRawCreate
    : null;
  const bio = validateTextLength(getString(formData, 'bio'), 5000, '소개');
  const bio_en = validateTextLength(getString(formData, 'bio_en'), 5000, '영문 소개') || null;
  const history = validateTextLength(getString(formData, 'history'), 10000, '이력');
  const history_en =
    validateTextLength(getString(formData, 'history_en'), 10000, '영문 이력') || null;
  const contact_phone = getString(formData, 'contact_phone');
  const contact_email = validateEmail(getString(formData, 'contact_email'));
  const instagram = validateUrl(getString(formData, 'instagram'), '인스타그램');
  const homepage = validateUrl(getString(formData, 'homepage'), '홈페이지');

  const { data, error } = await supabase
    .from('artists')
    .insert({
      name_ko,
      name_en,
      career_tier,
      bio,
      bio_en,
      history,
      history_en,
      contact_phone: contact_phone || null,
      contact_email,
      instagram,
      homepage,
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
  const supabase = await requireAdminClient();
  const normalizedQuery = query.trim().normalize('NFC');
  if (normalizedQuery.length < 2) return [];

  if (
    hasHangulSyllable(normalizedQuery) ||
    hasHangulJamo(normalizedQuery) ||
    hasComposedTrailingConsonantQuery(normalizedQuery)
  ) {
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

  const sanitizedQuery = sanitizeIlikeQuery(normalizedQuery);
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, avatar_url, role, status')
    .or(`name.ilike.%${sanitizedQuery}%,email.ilike.%${sanitizedQuery}%`)
    .limit(10);

  if (error) throw error;
  return data || [];
}

export async function linkArtistToUser(artistId: string, userId: string) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

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
  const supabase = await requireAdminClient();

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

// ─────────────────────────────────────────────────────────────────────────────
// 작가 페이지 + 작품 상세 페이지 공지 (artist notice)
// migration 20260430120000_artist_notice.sql 참조
// ─────────────────────────────────────────────────────────────────────────────

const NOTICE_MESSAGE_MAX = 280;

// Supabase 자동 생성 타입(`types/supabase.ts`)에서 파생 — 컬럼 추가/타입 변경 시 컴파일 에러로 즉시 감지
type ArtistNoticeRow = Pick<
  Tables<'artists'>,
  | 'id'
  | 'name_ko'
  | 'notice_enabled'
  | 'notice_type'
  | 'notice_message'
  | 'notice_message_en'
  | 'notice_active_until'
  | 'notice_updated_at'
  | 'notice_updated_by'
>;

async function fetchArtistNoticeRow(
  supabase: Awaited<ReturnType<typeof requireAdminClient>>,
  id: string
): Promise<ArtistNoticeRow> {
  const { data, error } = await supabase
    .from('artists')
    .select(
      'id, name_ko, notice_enabled, notice_type, notice_message, notice_message_en, notice_active_until, notice_updated_at, notice_updated_by'
    )
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

function revalidateArtistNoticeSurfaces(artistName: string | null | undefined) {
  // 공지를 변경하면 작가 페이지·갤러리·작품 상세 페이지 모두 갱신되어야 함
  revalidatePublicArtworkSurfaces([artistName]);
  // getSupabaseArtistNoticeByName 캐시 무효화 + 작품 상세 페이지의 artists 캐시
  revalidateTag('artist-notice', 'max');
  revalidateTag('artists', 'max');
  revalidatePath('/admin/artists');
}

/**
 * @param input ISO 8601 문자열만 허용 (예: '2026-05-01T01:00:00.000Z').
 *   클라이언트의 datetime-local input(timezone 없는 'YYYY-MM-DDTHH:mm')은
 *   `_NoticeFieldset.tsx`의 `localInputToIso()`로 사용자 로컬 시간대 기준 ISO로 변환된 뒤 전달됨.
 *   timezone 없는 raw 문자열을 직접 넘기면 서버(보통 UTC) 기준으로 파싱되어 시간대 어긋남.
 */
function parseNoticeActiveUntil(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    throw new Error('만료 시각 형식이 올바르지 않습니다.');
  }
  return date.toISOString();
}

export async function setArtistNotice(
  artistId: string,
  data: {
    type: NoticeType;
    message: string;
    message_en?: string | null;
    active_until?: string | null;
    enabled: boolean;
  }
) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  if (!(NOTICE_TYPES as readonly string[]).includes(data.type)) {
    throw new Error('공지 종류가 올바르지 않습니다.');
  }

  const message = (data.message ?? '').trim();
  if (!message) throw new Error('공지 메시지(한국어)를 입력해 주세요.');
  if (message.length > NOTICE_MESSAGE_MAX) {
    throw new Error(`공지 메시지는 ${NOTICE_MESSAGE_MAX}자 이내로 입력해 주세요.`);
  }
  const message_en_raw = (data.message_en ?? '').trim();
  if (message_en_raw.length > NOTICE_MESSAGE_MAX) {
    throw new Error(`영문 공지 메시지는 ${NOTICE_MESSAGE_MAX}자 이내로 입력해 주세요.`);
  }
  const message_en = message_en_raw || null;
  const active_until = parseNoticeActiveUntil(data.active_until);

  const oldRow = await fetchArtistNoticeRow(supabase, artistId);
  if (!oldRow) throw new Error('작가를 찾을 수 없습니다.');

  const { error } = await supabase
    .from('artists')
    .update({
      notice_enabled: Boolean(data.enabled),
      notice_type: data.type,
      notice_message: message,
      notice_message_en: message_en,
      notice_active_until: active_until,
      notice_updated_at: new Date().toISOString(),
      notice_updated_by: admin.id,
    })
    .eq('id', artistId);
  if (error) throw error;

  const newRow = await fetchArtistNoticeRow(supabase, artistId);
  revalidateArtistNoticeSurfaces(oldRow.name_ko);

  await logAdminAction(
    'artist_notice_set',
    'artist',
    artistId,
    {
      artist_name: oldRow.name_ko,
      type: data.type,
      enabled: data.enabled,
      has_active_until: Boolean(active_until),
    },
    admin.id,
    {
      summary: `작가 공지 저장: ${oldRow.name_ko || artistId} (${data.type}, ${data.enabled ? '활성' : '비활성'})`,
      beforeSnapshot: oldRow,
      afterSnapshot: newRow,
      reversible: true,
    }
  );

  return { success: true };
}

export async function toggleArtistNotice(artistId: string, enabled: boolean) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const oldRow = await fetchArtistNoticeRow(supabase, artistId);
  if (!oldRow) throw new Error('작가를 찾을 수 없습니다.');

  if (enabled && !(oldRow.notice_message ?? '').trim()) {
    throw new Error('공지 메시지가 비어 있어 활성화할 수 없습니다.');
  }

  const { error } = await supabase
    .from('artists')
    .update({
      notice_enabled: enabled,
      notice_updated_at: new Date().toISOString(),
      notice_updated_by: admin.id,
    })
    .eq('id', artistId);
  if (error) throw error;

  const newRow = await fetchArtistNoticeRow(supabase, artistId);
  revalidateArtistNoticeSurfaces(oldRow.name_ko);

  await logAdminAction(
    'artist_notice_toggled',
    'artist',
    artistId,
    {
      artist_name: oldRow.name_ko,
      enabled,
    },
    admin.id,
    {
      summary: `작가 공지 ${enabled ? '활성' : '비활성'}: ${oldRow.name_ko || artistId}`,
      beforeSnapshot: oldRow,
      afterSnapshot: newRow,
      reversible: true,
    }
  );

  return { success: true };
}

export async function clearArtistNotice(artistId: string) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const oldRow = await fetchArtistNoticeRow(supabase, artistId);
  if (!oldRow) throw new Error('작가를 찾을 수 없습니다.');

  const { error } = await supabase
    .from('artists')
    .update({
      notice_enabled: false,
      notice_type: null,
      notice_message: null,
      notice_message_en: null,
      notice_active_until: null,
      notice_updated_at: new Date().toISOString(),
      notice_updated_by: admin.id,
    })
    .eq('id', artistId);
  if (error) throw error;

  const newRow = await fetchArtistNoticeRow(supabase, artistId);
  revalidateArtistNoticeSurfaces(oldRow.name_ko);

  await logAdminAction(
    'artist_notice_cleared',
    'artist',
    artistId,
    { artist_name: oldRow.name_ko },
    admin.id,
    {
      summary: `작가 공지 삭제: ${oldRow.name_ko || artistId}`,
      beforeSnapshot: oldRow,
      afterSnapshot: newRow,
      reversible: true,
    }
  );

  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Artist Status & Approval
// ─────────────────────────────────────────────────────────────────────────────

type ArtistProfileStatus = 'pending' | 'active' | 'suspended';

/** 연결된 사용자 계정의 profiles.status를 직접 변경한다. */
export async function setArtistProfileStatus(artistId: string, status: ArtistProfileStatus) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const { data: artist, error: artistErr } = await supabase
    .from('artists')
    .select('user_id, name_ko')
    .eq('id', artistId)
    .single();
  if (artistErr || !artist) throw new Error('작가 정보를 찾을 수 없습니다.');
  if (!artist.user_id) throw new Error('연결된 사용자 계정이 없습니다.');

  const { error } = await supabase.from('profiles').update({ status }).eq('id', artist.user_id);
  if (error) throw error;

  revalidatePath('/admin/artists');
  revalidatePath(`/admin/artists/${artistId}`);
  // 작가 대시보드는 profiles.status로 접근 제어 — 상태 변경 즉시 캐시 무효화
  revalidatePath('/dashboard', 'layout');

  const statusLabel: Record<ArtistProfileStatus, string> = {
    pending: '승인 대기',
    active: '활성',
    suspended: '정지',
  };
  await logAdminAction(
    'artist_status_changed',
    'artist',
    artistId,
    { name: artist.name_ko, status },
    admin.id,
    { summary: `작가 상태 변경: ${artist.name_ko} → ${statusLabel[status]}` }
  );

  return { success: true };
}

/** 작가 승인 안내 이메일을 artists.contact_email로 발송한다. */
export async function sendArtistApprovalNotification(artistId: string) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const { data: artist, error: artistErr } = await supabase
    .from('artists')
    .select('name_ko, contact_email')
    .eq('id', artistId)
    .single();
  if (artistErr || !artist) throw new Error('작가 정보를 찾을 수 없습니다.');
  if (!artist.contact_email) throw new Error('등록된 이메일이 없습니다.');

  const { sendArtistApprovalEmail } = await import('@/lib/notify');
  await sendArtistApprovalEmail(artist.contact_email, artist.name_ko ?? '작가님');

  await logAdminAction(
    'artist_approval_email_sent',
    'artist',
    artistId,
    { name: artist.name_ko, email: artist.contact_email },
    admin.id,
    { summary: `작가 승인 이메일 발송: ${artist.name_ko}` }
  );

  return { success: true };
}
