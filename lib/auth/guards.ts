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

  // Admin should stay in admin surface
  if (profile?.role === 'admin') {
    redirect('/admin/dashboard');
  }

  // Check artist role and active status
  if (!profile || profile.role !== 'artist' || profile.status !== 'active') {
    // If suspended or pending, maybe redirect to specific page
    if (profile?.status === 'pending') {
      const { data: application } = await supabase
        .from('artist_applications')
        .select('artist_name, contact, bio')
        .eq('user_id', user.id)
        .maybeSingle();

      const hasApplication =
        !!application?.artist_name?.trim() &&
        !!application?.contact?.trim() &&
        !!application?.bio?.trim();

      if (!hasApplication) redirect('/onboarding');
      redirect('/dashboard/pending');
    }
    if (profile?.status === 'suspended') redirect('/dashboard/suspended');

    redirect('/onboarding');
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
