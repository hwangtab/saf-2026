import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/auth/server';
import {
  buildTermsConsentPath,
  hasArtistApplication,
  hasExhibitorApplication,
  needsArtistTermsConsent,
  needsExhibitorTermsConsent,
} from '@/lib/auth/terms-consent';

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error('계정 정보를 확인하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  }

  if (profile?.role === 'admin') {
    redirect('/admin/dashboard');
  }

  if (profile?.role === 'exhibitor') {
    const { data: exhibitorApplication } = await supabase
      .from('exhibitor_applications')
      .select('representative_name, contact, bio, terms_version, terms_accepted_at')
      .eq('user_id', user.id)
      .maybeSingle();

    const hasExhibitorApplicationData = hasExhibitorApplication(exhibitorApplication);
    const needsExhibitorConsent = needsExhibitorTermsConsent(exhibitorApplication);

    if (profile.status === 'suspended') {
      redirect('/exhibitor/suspended');
    }

    if (profile.status === 'active') {
      redirect(
        hasExhibitorApplicationData
          ? needsExhibitorConsent
            ? buildTermsConsentPath({
                nextPath: '/exhibitor',
                needsExhibitorConsent: true,
              })
            : '/exhibitor'
          : '/exhibitor/onboarding?recover=1'
      );
    }

    redirect(
      hasExhibitorApplicationData
        ? needsExhibitorConsent
          ? buildTermsConsentPath({
              nextPath: '/exhibitor/pending',
              needsExhibitorConsent: true,
            })
          : '/exhibitor/pending'
        : '/exhibitor/onboarding'
    );
  }

  if (profile?.role === 'artist') {
    const { data: application, error: applicationError } = await supabase
      .from('artist_applications')
      .select('artist_name, contact, bio, terms_version, terms_accepted_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (applicationError) {
      throw new Error('신청 상태를 확인하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }

    const hasApplication = hasArtistApplication(application);
    const needsTermsConsent = needsArtistTermsConsent(application);

    if (profile.status === 'active') {
      redirect(
        hasApplication
          ? needsTermsConsent
            ? buildTermsConsentPath({
                nextPath: '/dashboard/artworks',
                needsArtistConsent: true,
              })
            : '/dashboard/artworks'
          : '/onboarding?recover=1'
      );
    }

    if (profile.status === 'pending') {
      redirect(
        hasApplication
          ? needsTermsConsent
            ? buildTermsConsentPath({
                nextPath: '/dashboard/pending',
                needsArtistConsent: true,
              })
            : '/dashboard/pending'
          : '/onboarding'
      );
    }
    if (profile.status === 'suspended') {
      redirect('/dashboard/suspended');
    }
  }

  if (profile?.role === 'user') {
    const [{ data: exhibitorApplication }, { data: artistApplication }] = await Promise.all([
      supabase
        .from('exhibitor_applications')
        .select('representative_name, contact, bio, terms_version, terms_accepted_at')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('artist_applications')
        .select('artist_name, contact, bio, terms_version, terms_accepted_at')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    const hasExhibitorApplicationData = hasExhibitorApplication(exhibitorApplication);
    const hasArtistApplicationData = hasArtistApplication(artistApplication);
    const needsExhibitorConsent = needsExhibitorTermsConsent(exhibitorApplication);
    const needsArtistConsent = needsArtistTermsConsent(artistApplication);

    if (hasExhibitorApplicationData) {
      redirect(
        needsExhibitorConsent
          ? buildTermsConsentPath({
              nextPath: '/exhibitor/pending',
              needsExhibitorConsent: true,
            })
          : '/exhibitor/pending'
      );
    }

    if (hasArtistApplicationData) {
      redirect(
        needsArtistConsent
          ? buildTermsConsentPath({
              nextPath: '/dashboard/pending',
              needsArtistConsent: true,
            })
          : '/dashboard/pending'
      );
    }
  }

  redirect('/onboarding');
}
