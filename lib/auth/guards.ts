import { createSupabaseServerClient } from './server';
import { redirect } from 'next/navigation';
import { cache } from 'react';

const getAuthUserContext = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  return { supabase, user };
});

const getCurrentProfile = cache(async () => {
  const { supabase, user } = await getAuthUserContext();
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error('계정 정보를 확인하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  }

  return { supabase, user, profile };
});

export async function requireAuth() {
  const { user } = await getAuthUserContext();
  return user;
}

export async function requireArtistActive() {
  const { supabase, user, profile } = await getCurrentProfile();

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
  const { user, profile } = await getCurrentProfile();

  if (!profile || profile.role !== 'admin') {
    redirect('/');
  }

  return user;
}

export async function requireExhibitor() {
  const { user, profile } = await getCurrentProfile();

  if (!profile || profile.role !== 'exhibitor') {
    redirect('/');
  }

  return user;
}
