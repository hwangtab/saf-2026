'use server';

import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminOrServerClient } from '@/lib/auth/server';
import { revalidatePath } from 'next/cache';
import { logAdminAction } from './admin-logs';

export type Exhibitor = {
  id: string; // profile id
  email: string;
  name: string | null;
  role: 'exhibitor';
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

  let query = supabase
    .from('profiles')
    .select(
      `
        id,
        email,
        name,
        role,
        status,
        created_at,
        application:exhibitor_applications!left(
          representative_name,
          contact,
          bio,
          referrer,
          created_at,
          updated_at
        )
      `
    )
    .eq('role', 'exhibitor')
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.query) {
    // Search by email, name, or representative_name
    query = query.or(`email.ilike.%${filters.query}%,name.ilike.%${filters.query}%`);
    // Note: Searching representative_name in joined table is trickier with simple OR,
    // usually requires separate query or embedding.
    // For simplicity, search email/name on profile first.
    // To search application fields, we might need a different approach if critical.
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching exhibitors:', error);
    throw new Error('출품자 목록을 불러오는 중 오류가 발생했습니다.');
  }

  // Transform data to match Exhibitor type
  const exhibitors: Exhibitor[] = data.map((profile: any) => ({
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    status: profile.status,
    created_at: profile.created_at,
    application: profile.application
      ? Array.isArray(profile.application)
        ? profile.application[0]
        : profile.application
      : null,
  }));

  // If query filter exists, we might want to filter in-memory for application fields if DB query didn't cover it
  if (filters?.query) {
    const q = filters.query.toLowerCase();
    return exhibitors.filter(
      (e) =>
        e.email.toLowerCase().includes(q) ||
        (e.name && e.name.toLowerCase().includes(q)) ||
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

  if (!profile || profile.role !== 'exhibitor') {
    throw new Error('유효하지 않은 출품자입니다.');
  }

  const { error } = await supabase.from('profiles').update({ status: 'active' }).eq('id', userId);

  if (error) {
    throw new Error('승인 처리 중 오류가 발생했습니다.');
  }

  await logAdminAction('approve_exhibitor', 'user', userId, { status: 'active' }, admin.id);

  revalidatePath('/admin/exhibitors');
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
  return { success: true };
}
