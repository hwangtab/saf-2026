'use server';

import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminOrServerClient } from '@/lib/auth/server';
import { revalidatePath } from 'next/cache';
import { logAdminAction } from './admin-logs';

export type Exhibitor = {
  id: string; // profile id
  email: string;
  name: string | null;
  role: 'user' | 'exhibitor';
  status: 'active' | 'pending' | 'suspended' | 'deleted';
  created_at: string;
  application?: {
    representative_name: string;
    contact: string;
    bio: string;
    referrer: string | null;
    created_at: string;
    updated_at: string;
  } | null;
};

export async function getExhibitors(filters?: {
  status?: 'active' | 'pending' | 'suspended';
  query?: string;
}) {
  await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const { data: applications, error: appError } = await supabase
    .from('exhibitor_applications')
    .select('user_id, representative_name, contact, bio, referrer, created_at, updated_at');

  if (appError) {
    console.error('Error fetching exhibitor applications:', appError);
    if (appError.code === '42501') {
      throw new Error('출품자 신청서 조회 권한이 없습니다. Supabase 테이블 권한을 확인해주세요.');
    }
    throw new Error('출품자 신청서를 불러오는 중 오류가 발생했습니다.');
  }

  const applicantIds = (applications || []).map((application) => application.user_id);

  let query = supabase
    .from('profiles')
    .select('id, email, name, role, status, created_at')
    .order('created_at', { ascending: false });

  if (applicantIds.length > 0) {
    query = query.or(`role.eq.exhibitor,id.in.(${applicantIds.join(',')})`);
  } else {
    query = query.eq('role', 'exhibitor');
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.query) {
    query = query.or(`email.ilike.%${filters.query}%,name.ilike.%${filters.query}%`);
  }

  const { data: profiles, error } = await query;

  if (error) {
    console.error('Error fetching exhibitors:', error);
    if (
      error.code === '42501' &&
      (error.message?.includes('profiles') || error.message?.includes('permission denied'))
    ) {
      throw new Error('출품자 목록 조회 권한이 없습니다. Supabase 테이블 권한을 확인해주세요.');
    }
    throw new Error('출품자 목록을 불러오는 중 오류가 발생했습니다.');
  }

  const applicationMap = new Map(
    (applications || []).map((application) => [application.user_id, application])
  );

  const exhibitors: Exhibitor[] = (profiles || []).map((profile) => {
    const application = applicationMap.get(profile.id);

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      status: profile.status,
      created_at: profile.created_at,
      application: application || null,
    };
  });

  // If query filter exists, we might want to filter in-memory for application fields if DB query didn't cover it
  if (filters?.query) {
    const q = filters.query.toLowerCase();
    return exhibitors.filter(
      (e) =>
        e.email.toLowerCase().includes(q) ||
        (e.name && e.name.toLowerCase().includes(q)) ||
        (e.application && e.application.contact.toLowerCase().includes(q)) ||
        (e.application && e.application.representative_name.toLowerCase().includes(q))
    );
  }

  return exhibitors;
}

export async function approveExhibitor(userId: string) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

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
    .select('representative_name, contact, bio')
    .eq('user_id', userId)
    .maybeSingle();

  const hasApplication =
    !!application?.representative_name?.trim() &&
    !!application?.contact?.trim() &&
    !!application?.bio?.trim();

  if (!hasApplication) {
    throw new Error('출품자 신청서가 제출되지 않아 승인할 수 없습니다.');
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

export async function suspendExhibitor(userId: string) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminOrServerClient();

  const { error } = await supabase
    .from('profiles')
    .update({ status: 'suspended' })
    .eq('id', userId);

  if (error) {
    throw new Error('정지 처리 중 오류가 발생했습니다.');
  }

  await logAdminAction('suspend_exhibitor', 'user', userId, { status: 'suspended' }, admin.id);

  revalidatePath('/admin/exhibitors');
  revalidatePath('/admin/users');
  return { success: true };
}
