'use server';

import { createSupabaseAdminOrServerClient } from '@/lib/auth/server';
import { requireAdmin } from '@/lib/auth/guards';
import { revalidatePath } from 'next/cache';
import { logAdminAction } from './admin-logs';

export type AdminActionState = {
  message: string;
  error?: boolean;
};

export async function approveUser(userId: string): Promise<AdminActionState> {
  try {
    await requireAdmin();
    const supabase = await createSupabaseAdminOrServerClient();

    const { data: application } = await supabase
      .from('artist_applications')
      .select('artist_name, contact, bio')
      .eq('user_id', userId)
      .maybeSingle();

    const contactValue = application?.contact?.trim() || '';

    // 1. Ensure Artist record exists (before activating profile)
    const { data: existingArtist, error: artistFetchError } = await supabase
      .from('artists')
      .select('id, contact_email')
      .eq('user_id', userId)
      .maybeSingle();

    if (artistFetchError) throw artistFetchError;

    let createdArtistId: string | null = null;
    if (existingArtist && contactValue && !existingArtist.contact_email?.trim()) {
      const { error: contactError } = await supabase
        .from('artists')
        .update({ contact_email: contactValue })
        .eq('id', existingArtist.id);
      if (contactError) throw contactError;
    }

    if (!existingArtist) {
      // Get profile + application info to populate initial artist data
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', userId)
        .single();

      const { data: createdArtist, error: artistError } = await supabase
        .from('artists')
        .insert({
          user_id: userId,
          name_ko: application?.artist_name || profile?.name || 'New Artist',
          bio: application?.bio || null,
          contact_email: contactValue || null,
        })
        .select('id')
        .single();
      if (artistError) {
        if (artistError.code !== '23505') throw artistError;
      } else {
        createdArtistId = createdArtist?.id || null;
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

export async function updateUserRole(
  userId: string,
  role: 'admin' | 'artist' | 'user'
): Promise<AdminActionState> {
  try {
    const adminUser = await requireAdmin();

    if (!['admin', 'artist', 'user'].includes(role)) {
      return { message: '유효하지 않은 역할입니다.', error: true };
    }

    if (adminUser.id === userId && role !== 'admin') {
      return { message: '본인의 관리자 권한은 해제할 수 없습니다.', error: true };
    }

    const supabase = await createSupabaseAdminOrServerClient();
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name')
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

    const updates: { role: 'admin' | 'artist' | 'user'; status?: 'active' } = { role };
    if (role === 'artist' || role === 'admin') {
      updates.status = 'active';
    }

    let createdArtistId: string | null = null;
    if (role === 'artist') {
      const contactValue = application?.contact?.trim() || '';
      const { data: existingArtist, error: artistFetchError } = await supabase
        .from('artists')
        .select('id, contact_email')
        .eq('user_id', userId)
        .maybeSingle();

      if (artistFetchError) throw artistFetchError;

      if (existingArtist && contactValue && !existingArtist.contact_email?.trim()) {
        const { error: contactError } = await supabase
          .from('artists')
          .update({ contact_email: contactValue })
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
            contact_email: contactValue || null,
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
