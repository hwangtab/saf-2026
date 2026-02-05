import { createSupabaseServerClient } from './server';
import { redirect } from 'next/navigation';

export async function requireAuth() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return user;
}

export async function requireArtistActive() {
  const user = await requireAuth();
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single();

  // Admin bypass
  if (profile?.role === 'admin') return user;

  // Check artist role and active status
  if (!profile || profile.role !== 'artist' || profile.status !== 'active') {
    // If suspended or pending, maybe redirect to specific page
    if (profile?.status === 'pending') redirect('/dashboard/pending');
    if (profile?.status === 'suspended') redirect('/dashboard/suspended');

    // Not an artist at all
    redirect('/');
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    redirect('/');
  }

  return user;
}
