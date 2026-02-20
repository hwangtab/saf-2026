import { createSupabaseServerClient } from '@/lib/auth/server';

type ProfileRow = {
  role: string | null;
  status: string | null;
};

export async function hasActiveAdminSession(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return false;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return false;
  }

  const typed = profile as ProfileRow;
  return typed.role === 'admin' && typed.status === 'active';
}
