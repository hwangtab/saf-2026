'use server';

import { requireAdmin, requireAuth } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/auth/server';

export type AdminLogEntry = {
  id: string;
  admin_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  admin?: {
    name: string | null;
    email: string | null;
  } | null;
};

export async function logAdminAction(
  action: string,
  targetType?: string,
  targetId?: string,
  details?: Record<string, unknown>
) {
  const user = await requireAuth();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from('admin_logs').insert({
    admin_id: user.id,
    action,
    target_type: targetType || null,
    target_id: targetId || null,
    details: details || null,
  });

  if (error) {
    console.error('Failed to log admin action:', error);
  }
}

export async function getAdminLogs(
  page = 1,
  limit = 50
): Promise<{ logs: AdminLogEntry[]; total: number }> {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const offset = (page - 1) * limit;

  // Get total count
  const { count } = await supabase.from('admin_logs').select('id', { count: 'exact', head: true });

  // Get logs with admin info
  const { data: logs, error } = await supabase
    .from('admin_logs')
    .select('*, profiles!admin_logs_admin_id_fkey(name, email)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return {
    logs: (logs || []).map((log: any) => ({
      ...log,
      admin: log.profiles || null,
      profiles: undefined,
    })),
    total: count || 0,
  };
}
