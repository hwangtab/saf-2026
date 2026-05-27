'use server';

import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import { revalidatePath } from 'next/cache';
import { logAdminAction } from './activity-log-writer';
import { hasAllRequiredConsents } from '@/lib/auth/terms-consent';

export async function approveExhibitor(userId: string) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('status, role')
    .eq('id', userId)
    .single();

  if (!profile || (profile.role !== 'user' && profile.role !== 'exhibitor')) {
    throw new Error('유효하지 않은 출품자입니다.');
  }

  const { data: application } = await supabase
    .from('exhibitor_applications')
    .select(
      'representative_name, contact, bio, terms_version, terms_accepted_at, privacy_version, privacy_accepted_at, tos_version, tos_accepted_at'
    )
    .eq('user_id', userId)
    .maybeSingle();

  const hasApplication =
    !!application?.representative_name?.trim() &&
    !!application?.contact?.trim() &&
    !!application?.bio?.trim();

  if (!hasApplication) {
    throw new Error('출품자 신청서가 제출되지 않아 승인할 수 없습니다.');
  }

  if (!hasAllRequiredConsents(application, 'exhibitor')) {
    throw new Error('동의가 완료되지 않은 사용자입니다.');
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: 'exhibitor', status: 'active' })
    .eq('id', userId);

  if (error) {
    throw new Error('승인 처리 중 오류가 발생했습니다.');
  }

  await logAdminAction(
    'approve_exhibitor',
    'user',
    userId,
    { role: 'exhibitor', status: 'active' },
    admin.id
  );

  revalidatePath('/admin/exhibitors');
  revalidatePath('/admin/users');
  return { success: true };
}
