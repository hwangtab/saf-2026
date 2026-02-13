'use server';

import { createSupabaseAdminOrServerClient } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/guards';
import { revalidatePath } from 'next/cache';
import { logAdminAction } from './admin-logs';

export type AdminActionState = {
  message: string;
  error?: boolean;
};

export type UnlinkedArtistSearchItem = {
  id: string;
  name_ko: string | null;
  name_en: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  updated_at: string | null;
  artwork_count: number;
};

type PromoteArtistMode = 'link_existing' | 'create_and_link' | 'role_only';

type PromoteUserToArtistParams = {
  userId: string;
  mode: PromoteArtistMode;
  artistId?: string;
};

function sanitizeIlikeQuery(query: string) {
  return query
    .trim()
    .replace(/[%(),]/g, ' ')
    .replace(/\s+/g, ' ');
}

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

function parseApplicationContact(contact: string | null | undefined) {
  const trimmed = (contact || '').trim();
  if (!trimmed) {
    return { contactEmail: null, contactPhone: null };
  }
  return {
    contactEmail: normalizeEmail(trimmed),
    contactPhone: normalizePhone(trimmed),
  };
}

export async function searchUnlinkedArtists(query: string): Promise<UnlinkedArtistSearchItem[]> {
  await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const normalizedQuery = sanitizeIlikeQuery(query);
  if (normalizedQuery.length < 2) return [];

  const { data, error } = await supabase
    .from('artists')
    .select('id, name_ko, name_en, contact_phone, contact_email, updated_at, artworks(count)')
    .is('user_id', null)
    .or(
      `name_ko.ilike.%${normalizedQuery}%,name_en.ilike.%${normalizedQuery}%,contact_phone.ilike.%${normalizedQuery}%,contact_email.ilike.%${normalizedQuery}%`
    )
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) throw error;

  type ArtistSearchRow = {
    id: string;
    name_ko: string | null;
    name_en: string | null;
    contact_phone: string | null;
    contact_email: string | null;
    updated_at: string | null;
    artworks?: Array<{ count: number | null }> | null;
  };

  return ((data || []) as ArtistSearchRow[]).map((artist) => ({
    id: artist.id,
    name_ko: artist.name_ko || null,
    name_en: artist.name_en || null,
    contact_phone: artist.contact_phone || null,
    contact_email: artist.contact_email || null,
    updated_at: artist.updated_at || null,
    artwork_count: artist.artworks?.[0]?.count || 0,
  }));
}

export async function promoteUserToArtistWithLink({
  userId,
  mode,
  artistId,
}: PromoteUserToArtistParams): Promise<AdminActionState> {
  try {
    await requireAdmin();
    const supabase = await createSupabaseAdminOrServerClient();

    if (!userId) {
      return { message: '사용자 ID가 필요합니다.', error: true };
    }

    if (!['link_existing', 'create_and_link', 'role_only'].includes(mode)) {
      return { message: '유효하지 않은 처리 모드입니다.', error: true };
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    const { data: application } = await supabase
      .from('artist_applications')
      .select('artist_name, contact, bio')
      .eq('user_id', userId)
      .maybeSingle();

    const parsedContact = parseApplicationContact(application?.contact || null);
    const fallbackEmail = normalizeEmail(profile?.email || null);
    const candidateEmail = parsedContact.contactEmail || fallbackEmail;
    const candidatePhone = parsedContact.contactPhone;
    const profileName = profile?.name || 'Unknown';
    let linkedArtistId: string | null = null;
    let linkedArtistName: string | null = null;
    let createdArtistId: string | null = null;
    let phoneAutofilled = false;
    let emailAutofilled = false;

    if (mode === 'link_existing') {
      if (!artistId) {
        return { message: '연결할 작가를 선택해 주세요.', error: true };
      }

      const { data: sameUserArtist, error: sameUserArtistError } = await supabase
        .from('artists')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (sameUserArtistError) throw sameUserArtistError;
      if (sameUserArtist && sameUserArtist.id !== artistId) {
        return { message: '이 사용자는 이미 다른 작가와 연결되어 있습니다.', error: true };
      }

      const { data: updatedRows, error: updateArtistError } = await supabase
        .from('artists')
        .update({ user_id: userId })
        .eq('id', artistId)
        .is('user_id', null)
        .select('id, name_ko, contact_phone, contact_email');

      if (updateArtistError) throw updateArtistError;

      if ((updatedRows || []).length === 0) {
        const { data: currentArtist, error: currentArtistError } = await supabase
          .from('artists')
          .select('id, name_ko, user_id, contact_phone, contact_email')
          .eq('id', artistId)
          .single();
        if (currentArtistError) throw currentArtistError;
        if (currentArtist.user_id !== userId) {
          return {
            message: '선택한 작가는 이미 연결되었습니다. 목록을 새로고침 후 다시 시도해 주세요.',
            error: true,
          };
        }
        linkedArtistId = currentArtist.id;
        linkedArtistName = currentArtist.name_ko || null;
        const artistContactPatch: { contact_phone?: string; contact_email?: string } = {};
        if (!currentArtist.contact_phone?.trim() && candidatePhone) {
          artistContactPatch.contact_phone = candidatePhone;
        }
        if (!currentArtist.contact_email?.trim() && candidateEmail) {
          artistContactPatch.contact_email = candidateEmail;
        }
        if (Object.keys(artistContactPatch).length > 0) {
          const { error: artistContactError } = await supabase
            .from('artists')
            .update(artistContactPatch)
            .eq('id', currentArtist.id);
          if (artistContactError) throw artistContactError;
          phoneAutofilled = Boolean(artistContactPatch.contact_phone);
          emailAutofilled = Boolean(artistContactPatch.contact_email);
        }
      } else {
        linkedArtistId = updatedRows?.[0]?.id || null;
        linkedArtistName = updatedRows?.[0]?.name_ko || null;
        const linkedArtist = updatedRows?.[0];
        const artistContactPatch: { contact_phone?: string; contact_email?: string } = {};
        if (linkedArtist && !linkedArtist.contact_phone?.trim() && candidatePhone) {
          artistContactPatch.contact_phone = candidatePhone;
        }
        if (linkedArtist && !linkedArtist.contact_email?.trim() && candidateEmail) {
          artistContactPatch.contact_email = candidateEmail;
        }
        if (linkedArtist && Object.keys(artistContactPatch).length > 0) {
          const { error: artistContactError } = await supabase
            .from('artists')
            .update(artistContactPatch)
            .eq('id', linkedArtist.id);
          if (artistContactError) throw artistContactError;
          phoneAutofilled = Boolean(artistContactPatch.contact_phone);
          emailAutofilled = Boolean(artistContactPatch.contact_email);
        }
      }
    }

    if (mode === 'create_and_link') {
      const { data: existingArtist, error: existingArtistError } = await supabase
        .from('artists')
        .select('id, name_ko, contact_phone, contact_email')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingArtistError) throw existingArtistError;

      if (existingArtist) {
        linkedArtistId = existingArtist.id;
        linkedArtistName = existingArtist.name_ko || null;
        const artistContactPatch: { contact_phone?: string; contact_email?: string } = {};
        if (!existingArtist.contact_phone?.trim() && candidatePhone) {
          artistContactPatch.contact_phone = candidatePhone;
        }
        if (!existingArtist.contact_email?.trim() && candidateEmail) {
          artistContactPatch.contact_email = candidateEmail;
        }
        if (Object.keys(artistContactPatch).length > 0) {
          const { error: updateContactError } = await supabase
            .from('artists')
            .update(artistContactPatch)
            .eq('id', existingArtist.id);
          if (updateContactError) throw updateContactError;
          phoneAutofilled = Boolean(artistContactPatch.contact_phone);
          emailAutofilled = Boolean(artistContactPatch.contact_email);
        }
      } else {
        const { data: insertedArtist, error: insertedArtistError } = await supabase
          .from('artists')
          .insert({
            user_id: userId,
            name_ko: application?.artist_name || profileName,
            bio: application?.bio || null,
            contact_phone: candidatePhone || null,
            contact_email: candidateEmail || null,
          })
          .select('id, name_ko')
          .single();

        if (insertedArtistError) {
          if (insertedArtistError.code !== '23505') throw insertedArtistError;

          const { data: conflictArtist, error: conflictArtistError } = await supabase
            .from('artists')
            .select('id, name_ko')
            .eq('user_id', userId)
            .single();
          if (conflictArtistError) throw conflictArtistError;
          linkedArtistId = conflictArtist.id;
          linkedArtistName = conflictArtist.name_ko || null;
        } else {
          createdArtistId = insertedArtist.id;
          linkedArtistId = insertedArtist.id;
          linkedArtistName = insertedArtist.name_ko || null;
          phoneAutofilled = Boolean(candidatePhone);
          emailAutofilled = Boolean(candidateEmail);
        }
      }
    }

    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({ role: 'artist', status: 'active' })
      .eq('id', userId);

    if (updateProfileError) {
      if (createdArtistId) {
        await supabase.from('artists').delete().eq('id', createdArtistId);
      }
      throw updateProfileError;
    }

    revalidatePath('/admin/users');
    revalidatePath('/admin/artists');
    if (linkedArtistId) {
      revalidatePath(`/admin/artists/${linkedArtistId}`);
    }

    await logAdminAction('user_role_changed', 'user', userId, {
      to: 'artist',
      user_name: profileName,
    });

    if (linkedArtistId) {
      await logAdminAction('artist_linked_to_user', 'artist', linkedArtistId, {
        artist_name: linkedArtistName || linkedArtistId,
        user_id: userId,
        phone_autofilled: phoneAutofilled,
        email_autofilled: emailAutofilled,
      });
    }

    if (mode === 'link_existing' && linkedArtistName) {
      return {
        message: `${profileName} 사용자를 '${linkedArtistName}' 작가와 연결하고 승인했습니다.`,
        error: false,
      };
    }

    if (mode === 'create_and_link') {
      return {
        message: `${profileName} 사용자를 작가로 승인하고 프로필을 연결했습니다.`,
        error: false,
      };
    }

    return { message: `${profileName} 사용자의 권한을 artist로 변경했습니다.`, error: false };
  } catch (error: any) {
    return { message: error.message, error: true };
  }
}

export async function approveUser(userId: string): Promise<AdminActionState> {
  try {
    await requireAdmin();
    const supabase = await createSupabaseAdminOrServerClient();

    const { data: application } = await supabase
      .from('artist_applications')
      .select('artist_name, contact, bio')
      .eq('user_id', userId)
      .maybeSingle();

    const parsedContact = parseApplicationContact(application?.contact || null);

    // 1. Ensure Artist record exists (before activating profile)
    const { data: existingArtist, error: artistFetchError } = await supabase
      .from('artists')
      .select('id, contact_phone, contact_email')
      .eq('user_id', userId)
      .maybeSingle();

    if (artistFetchError) throw artistFetchError;

    let createdArtistId: string | null = null;
    if (!existingArtist) {
      // Get profile + application info to populate initial artist data
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('id', userId)
        .single();

      const fallbackEmail = normalizeEmail(profile?.email || null);
      const candidateEmail = parsedContact.contactEmail || fallbackEmail;

      const { data: createdArtist, error: artistError } = await supabase
        .from('artists')
        .insert({
          user_id: userId,
          name_ko: application?.artist_name || profile?.name || 'New Artist',
          bio: application?.bio || null,
          contact_phone: parsedContact.contactPhone || null,
          contact_email: candidateEmail || null,
        })
        .select('id')
        .single();
      if (artistError) {
        if (artistError.code !== '23505') throw artistError;
      } else {
        createdArtistId = createdArtist?.id || null;
      }
    } else {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .maybeSingle();
      const fallbackEmail = normalizeEmail(profile?.email || null);
      const candidateEmail = parsedContact.contactEmail || fallbackEmail;
      const artistContactPatch: { contact_phone?: string; contact_email?: string } = {};

      if (!existingArtist.contact_phone?.trim() && parsedContact.contactPhone) {
        artistContactPatch.contact_phone = parsedContact.contactPhone;
      }
      if (!existingArtist.contact_email?.trim() && candidateEmail) {
        artistContactPatch.contact_email = candidateEmail;
      }
      if (Object.keys(artistContactPatch).length > 0) {
        const { error: contactError } = await supabase
          .from('artists')
          .update(artistContactPatch)
          .eq('id', existingArtist.id);
        if (contactError) throw contactError;
      }
    }

    // 2. Update Profile to active and role artist
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ status: 'active', role: 'artist' })
      .eq('id', userId);

    if (profileError) {
      if (createdArtistId) {
        await supabase.from('artists').delete().eq('id', createdArtistId);
      }
      throw profileError;
    }

    revalidatePath('/admin/users');

    await logAdminAction('user_approved', 'user', userId, {
      user_name: application?.artist_name || 'Unknown',
    });

    return { message: '사용자가 승인되었습니다.', error: false };
  } catch (error: any) {
    return { message: error.message, error: true };
  }
}

export async function rejectUser(userId: string): Promise<AdminActionState> {
  try {
    await requireAdmin();
    const supabase = await createSupabaseAdminOrServerClient();

    // Update status to suspended or just delete?
    // Let's set to suspended for now so we have a record, or delete if it's spam.
    // User requested "Approve/Reject". Reject usually means denial.
    // Let's set status to 'suspended' effectively blocking them.
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'suspended' })
      .eq('id', userId);

    if (error) throw error;

    revalidatePath('/admin/users');

    await logAdminAction('user_rejected', 'user', userId);

    return { message: '사용자가 거절(차단)되었습니다.', error: false };
  } catch (error: any) {
    return { message: error.message, error: true };
  }
}

export async function reactivateUser(userId: string): Promise<AdminActionState> {
  try {
    await requireAdmin();
    const supabase = await createSupabaseAdminOrServerClient();

    const { error } = await supabase.from('profiles').update({ status: 'active' }).eq('id', userId);

    if (error) throw error;

    revalidatePath('/admin/users');

    await logAdminAction('user_reactivated', 'user', userId);

    return { message: '사용자가 다시 활성화되었습니다.', error: false };
  } catch (error: any) {
    return { message: error.message, error: true };
  }
}

export async function updateUserRole(
  userId: string,
  role: 'admin' | 'artist' | 'user' | 'exhibitor'
): Promise<AdminActionState> {
  try {
    const adminUser = await requireAdmin();

    if (!['admin', 'artist', 'user', 'exhibitor'].includes(role)) {
      return { message: '유효하지 않은 역할입니다.', error: true };
    }

    if (adminUser.id === userId && role !== 'admin') {
      return { message: '본인의 관리자 권한은 해제할 수 없습니다.', error: true };
    }

    const supabase = await createSupabaseAdminOrServerClient();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', userId)
      .single();

    if (profileError) throw profileError;

    let application: {
      artist_name: string | null;
      contact: string | null;
      bio: string | null;
    } | null = null;

    if (role === 'artist') {
      const { data: applicationData, error: applicationError } = await supabase
        .from('artist_applications')
        .select('artist_name, contact, bio')
        .eq('user_id', userId)
        .maybeSingle();

      // Admin can promote users to artist without application data.
      // If lookup fails or no row exists, fall back to profile-based defaults.
      if (!applicationError) {
        application = applicationData;
      }
    }

    const updates: { role: 'admin' | 'artist' | 'user' | 'exhibitor'; status?: 'active' } = {
      role,
    };
    if (role === 'artist' || role === 'admin' || role === 'exhibitor') {
      updates.status = 'active';
    }

    let createdArtistId: string | null = null;
    if (role === 'artist') {
      const parsedContact = parseApplicationContact(application?.contact || null);
      const fallbackEmail = normalizeEmail(profile?.email || null);
      const candidateEmail = parsedContact.contactEmail || fallbackEmail;
      const { data: existingArtist, error: artistFetchError } = await supabase
        .from('artists')
        .select('id, contact_phone, contact_email')
        .eq('user_id', userId)
        .maybeSingle();

      if (artistFetchError) throw artistFetchError;

      if (
        existingArtist &&
        ((!existingArtist.contact_phone?.trim() && parsedContact.contactPhone) ||
          (!existingArtist.contact_email?.trim() && candidateEmail))
      ) {
        const artistContactPatch: { contact_phone?: string; contact_email?: string } = {};
        if (!existingArtist.contact_phone?.trim() && parsedContact.contactPhone) {
          artistContactPatch.contact_phone = parsedContact.contactPhone;
        }
        if (!existingArtist.contact_email?.trim() && candidateEmail) {
          artistContactPatch.contact_email = candidateEmail;
        }

        const { error: contactError } = await supabase
          .from('artists')
          .update(artistContactPatch)
          .eq('id', existingArtist.id);
        if (contactError) throw contactError;
      }

      if (!existingArtist) {
        const { data: createdArtist, error: artistError } = await supabase
          .from('artists')
          .insert({
            user_id: userId,
            name_ko: application?.artist_name || profile?.name || 'New Artist',
            bio: application?.bio || null,
            contact_phone: parsedContact.contactPhone || null,
            contact_email: candidateEmail || null,
          })
          .select('id')
          .single();
        if (artistError) {
          // If another admin created it concurrently, ignore unique violation.
          if (artistError.code !== '23505') throw artistError;
        } else {
          createdArtistId = createdArtist?.id || null;
        }
      }
    }

    const { error } = await supabase.from('profiles').update(updates).eq('id', userId);

    if (error) {
      if (createdArtistId) {
        await supabase.from('artists').delete().eq('id', createdArtistId);
      }
      throw error;
    }

    revalidatePath('/admin/users');

    await logAdminAction('user_role_changed', 'user', userId, {
      to: role,
      user_name: profile?.name || 'Unknown',
    });

    return { message: '권한이 변경되었습니다.', error: false };
  } catch (error: any) {
    return { message: error.message, error: true };
  }
}
