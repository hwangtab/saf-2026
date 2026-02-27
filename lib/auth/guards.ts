import { createSupabaseServerClient } from './server';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { UserRole, UserStatus } from '@/types/database.types';
import {
  buildTermsConsentPath,
  hasArtistApplication,
  hasExhibitorApplication,
  needsArtistTermsConsent,
  needsExhibitorTermsConsent,
} from './terms-consent';

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

  // Cast retrieved data to typed object if needed, though supabase-js infers types if generated.
  // Here we explicitly type the result structure we expect for logic consistency.
  const typedProfile = profile as { role: UserRole; status: UserStatus } | null;

  return { supabase, user, profile: typedProfile };
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

  if (profile?.role === 'artist') {
    const { data: application } = await supabase
      .from('artist_applications')
      .select('artist_name, contact, bio, terms_version, terms_accepted_at')
      .eq('user_id', user.id)
      .maybeSingle();

    const hasApplication = hasArtistApplication(application);

    if (profile.status === 'active' && !hasApplication) {
      redirect('/onboarding?recover=1');
    }

    if (needsArtistTermsConsent(application)) {
      redirect(
        buildTermsConsentPath({
          nextPath: profile.status === 'active' ? '/dashboard/artworks' : '/dashboard/pending',
          needsArtistConsent: true,
        })
      );
    }
  }

  // Check artist role and active status
  if (!profile || profile.role !== 'artist' || profile.status !== 'active') {
    // If suspended or pending, maybe redirect to specific page
    if (profile?.status === 'pending') {
      const { data: application } = await supabase
        .from('artist_applications')
        .select('artist_name, contact, bio, terms_version, terms_accepted_at')
        .eq('user_id', user.id)
        .maybeSingle();

      const hasApplication = hasArtistApplication(application);

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

/**
 * Checks if the user has the 'exhibitor' role.
 * Does NOT check for 'active' status.
 * Used for onboarding and pending pages where inactive exhibitors need access.
 */
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

/**
 * Enforces strict access control for exhibitor dashboard.
 * Requires both 'exhibitor' role AND 'active' status.
 * Redirects to onboarding or pending pages if status is not active.
 */
export async function requireExhibitor() {
  const { supabase, user, profile } = await getCurrentProfile();

  // Admin should stay in admin surface
  if (profile?.role === 'admin') {
    redirect('/admin/dashboard');
  }

  if (!profile || profile.role !== 'exhibitor') {
    redirect('/');
  }

  const { data: application } = await supabase
    .from('exhibitor_applications')
    .select('representative_name, contact, bio, terms_version, terms_accepted_at')
    .eq('user_id', user.id)
    .maybeSingle();

  const hasApplication = hasExhibitorApplication(application);

  if (profile.status === 'active' && !hasApplication) {
    redirect('/exhibitor/onboarding?recover=1');
  }

  if (needsExhibitorTermsConsent(application)) {
    redirect(
      buildTermsConsentPath({
        nextPath: profile.status === 'active' ? '/exhibitor' : '/exhibitor/pending',
        needsExhibitorConsent: true,
      })
    );
  }

  // Check exhibitor status - similar to artist flow
  if (profile.status !== 'active') {
    if (profile.status === 'pending') {
      if (!hasApplication) redirect('/exhibitor/onboarding');
      redirect('/exhibitor/pending');
    }
    if (profile.status === 'suspended') redirect('/exhibitor/suspended');

    redirect('/exhibitor/onboarding');
  }

  return user;
}
