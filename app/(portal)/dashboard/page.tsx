import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/auth/server';
import {
  ARTIST_APPLICATION_CONSENT_SELECT,
  EXHIBITOR_APPLICATION_CONSENT_SELECT,
  buildTermsConsentPath,
  hasArtistApplication,
  hasExhibitorApplication,
  needsArtistTermsConsent,
  needsExhibitorTermsConsent,
  needsPrivacyConsent,
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
      .select(EXHIBITOR_APPLICATION_CONSENT_SELECT)
      .eq('user_id', user.id)
      .maybeSingle();

    const hasExhibitorApplicationData = hasExhibitorApplication(exhibitorApplication);
    const needsExhibitorConsent = needsExhibitorTermsConsent(exhibitorApplication);
    const needsExhibitorPrivacy = needsPrivacyConsent(exhibitorApplication);

    if (profile.status === 'suspended') {
      redirect('/exhibitor/suspended');
    }

    if (profile.status === 'active') {
      redirect(
        hasExhibitorApplicationData
          ? needsExhibitorConsent || needsExhibitorPrivacy
            ? buildTermsConsentPath({
                nextPath: '/exhibitor',
                needsExhibitorConsent: needsExhibitorConsent,
                needsPrivacyConsent: needsExhibitorPrivacy,
              })
            : '/exhibitor'
          : '/exhibitor/onboarding?recover=1'
      );
    }

    redirect(
      hasExhibitorApplicationData
        ? needsExhibitorConsent || needsExhibitorPrivacy
          ? buildTermsConsentPath({
              nextPath: '/exhibitor/pending',
              needsExhibitorConsent: needsExhibitorConsent,
              needsPrivacyConsent: needsExhibitorPrivacy,
            })
          : '/exhibitor/pending'
        : '/exhibitor/onboarding'
    );
  }

  if (profile?.role === 'artist') {
    const { data: application, error: applicationError } = await supabase
      .from('artist_applications')
      .select(ARTIST_APPLICATION_CONSENT_SELECT)
      .eq('user_id', user.id)
      .maybeSingle();

    if (applicationError) {
      throw new Error('신청 상태를 확인하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }

    const hasApplication = hasArtistApplication(application);
    const needsTermsConsent = needsArtistTermsConsent(application);
    const needsArtistPrivacy = needsPrivacyConsent(application);

    if (profile.status === 'active') {
      redirect(
        hasApplication
          ? needsTermsConsent || needsArtistPrivacy
            ? buildTermsConsentPath({
                nextPath: '/dashboard/artworks',
                needsArtistConsent: needsTermsConsent,
                needsPrivacyConsent: needsArtistPrivacy,
              })
            : '/dashboard/artworks'
          : '/onboarding?recover=1'
      );
    }

    if (profile.status === 'pending') {
      redirect(
        hasApplication
          ? needsTermsConsent || needsArtistPrivacy
            ? buildTermsConsentPath({
                nextPath: '/dashboard/pending',
                needsArtistConsent: needsTermsConsent,
                needsPrivacyConsent: needsArtistPrivacy,
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
        .select(EXHIBITOR_APPLICATION_CONSENT_SELECT)
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('artist_applications')
        .select(ARTIST_APPLICATION_CONSENT_SELECT)
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

    const hasExhibitorApplicationData = hasExhibitorApplication(exhibitorApplication);
    const hasArtistApplicationData = hasArtistApplication(artistApplication);

    if (hasExhibitorApplicationData) {
      const needsExhibitorConsent = needsExhibitorTermsConsent(exhibitorApplication);
      const needsExhibitorPrivacy = needsPrivacyConsent(exhibitorApplication);
      redirect(
        needsExhibitorConsent || needsExhibitorPrivacy
          ? buildTermsConsentPath({
              nextPath: '/exhibitor/pending',
              needsExhibitorConsent: needsExhibitorConsent,
              needsPrivacyConsent: needsExhibitorPrivacy,
            })
          : '/exhibitor/pending'
      );
    }

    if (hasArtistApplicationData) {
      const needsArtistConsent = needsArtistTermsConsent(artistApplication);
      const needsArtistPrivacy = needsPrivacyConsent(artistApplication);
      redirect(
        needsArtistConsent || needsArtistPrivacy
          ? buildTermsConsentPath({
              nextPath: '/dashboard/pending',
              needsArtistConsent: needsArtistConsent,
              needsPrivacyConsent: needsArtistPrivacy,
            })
          : '/dashboard/pending'
      );
    }
  }

  redirect('/onboarding');
}
