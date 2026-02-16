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

// Helper to check exhibitor role only (for onboarding/pending pages)
export async function requireExhibitorRole() {
  const { profile, user } = await getCurrentProfile();

  if (profile?.role === 'admin') {
    return { user, profile, isAdmin: true };
  }

  if (!profile || profile.role !== 'exhibitor') {
    redirect('/');
  }

  return { user, profile, isAdmin: false };
}

export async function requireExhibitor() {
  const { supabase, user, profile } = await getCurrentProfile();

  // Admin should stay in admin surface
  if (profile?.role === 'admin') {
    redirect('/admin/dashboard');
  }

  if (!profile || profile.role !== 'exhibitor') {
    redirect('/');
  }

  // Check exhibitor status - similar to artist flow
  if (profile.status !== 'active') {
    if (profile.status === 'pending') {
      const { data: application } = await supabase
        .from('exhibitor_applications')
        .select('representative_name, contact, bio')
        .eq('user_id', user.id)
        .maybeSingle();

      const hasApplication =
        !!application?.representative_name?.trim() &&
        !!application?.contact?.trim() &&
        !!application?.bio?.trim();

      if (!hasApplication) redirect('/exhibitor/onboarding');
      redirect('/exhibitor/pending');
    }
    if (profile.status === 'suspended') redirect('/exhibitor/pending');

    redirect('/exhibitor/onboarding');
  }

  return user;
}
