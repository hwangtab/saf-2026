import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/server';
import {
  ARTIST_APPLICATION_CONSENT_SELECT,
  EXHIBITOR_APPLICATION_CONSENT_SELECT,
  buildTermsConsentPath,
  hasArtistApplication,
  hasExhibitorApplication,
  needsExhibitorTermsConsent,
  needsPrivacyConsent,
  needsTosConsent,
  resolveArtistReconsentRequirements,
} from '@/lib/auth/terms-consent';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (!sessionError) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Fetch profile to determine where to redirect
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          return NextResponse.redirect(`${origin}/login`);
        }

        if (profile?.role === 'admin') {
          return NextResponse.redirect(`${origin}/admin/dashboard`);
        }

        if (profile?.role === 'exhibitor') {
          const { data: application } = await supabase
            .from('exhibitor_applications')
            .select(EXHIBITOR_APPLICATION_CONSENT_SELECT)
            .eq('user_id', user.id)
            .maybeSingle();

          const hasApplication = hasExhibitorApplication(application);
          const needsTermsConsent = needsExhibitorTermsConsent(application);
          const needsPrivacy = needsPrivacyConsent(application);
          const needsTos = needsTosConsent(application);

          if (profile.status === 'suspended') {
            return NextResponse.redirect(`${origin}/exhibitor/suspended`);
          }

          if (profile.status === 'active') {
            return NextResponse.redirect(
              hasApplication
                ? `${origin}${
                    needsTermsConsent || needsPrivacy || needsTos
                      ? buildTermsConsentPath({
                          nextPath: '/exhibitor',
                          needsExhibitorConsent: needsTermsConsent,
                          needsPrivacyConsent: needsPrivacy,
                          needsTosConsent: needsTos,
                        })
                      : '/exhibitor'
                  }`
                : `${origin}/exhibitor/onboarding?recover=1`
            );
          }

          return NextResponse.redirect(
            hasApplication
              ? `${origin}${
                  needsTermsConsent || needsPrivacy || needsTos
                    ? buildTermsConsentPath({
                        nextPath: '/exhibitor/pending',
                        needsExhibitorConsent: needsTermsConsent,
                        needsPrivacyConsent: needsPrivacy,
                        needsTosConsent: needsTos,
                      })
                    : '/exhibitor/pending'
                }`
              : `${origin}/exhibitor/onboarding`
          );
        }

        if (profile?.role === 'artist') {
          const { data: application } = await supabase
            .from('artist_applications')
            .select(ARTIST_APPLICATION_CONSENT_SELECT)
            .eq('user_id', user.id)
            .maybeSingle();

          const hasApplication = hasArtistApplication(application);
          const artistReconsent = resolveArtistReconsentRequirements(application);

          if (profile.status === 'active') {
            return NextResponse.redirect(
              hasApplication
                ? `${origin}${
                    artistReconsent.needsArtistConsent ||
                    artistReconsent.needsPrivacyConsent ||
                    artistReconsent.needsTosConsent
                      ? buildTermsConsentPath({
                          nextPath: '/dashboard/artworks',
                          needsArtistConsent: artistReconsent.needsArtistConsent,
                          needsPrivacyConsent: artistReconsent.needsPrivacyConsent,
                          needsTosConsent: artistReconsent.needsTosConsent,
                        })
                      : '/dashboard/artworks'
                  }`
                : `${origin}/onboarding?recover=1`
            );
          }

          if (profile.status === 'pending') {
            return NextResponse.redirect(
              hasApplication
                ? `${origin}${
                    artistReconsent.needsArtistConsent ||
                    artistReconsent.needsPrivacyConsent ||
                    artistReconsent.needsTosConsent
                      ? buildTermsConsentPath({
                          nextPath: '/dashboard/pending',
                          needsArtistConsent: artistReconsent.needsArtistConsent,
                          needsPrivacyConsent: artistReconsent.needsPrivacyConsent,
                          needsTosConsent: artistReconsent.needsTosConsent,
                        })
                      : '/dashboard/pending'
                  }`
                : `${origin}/onboarding`
            );
          }
          if (profile.status === 'suspended') {
            return NextResponse.redirect(`${origin}/dashboard/suspended`);
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
            const needsExhibitorTos = needsTosConsent(exhibitorApplication);
            return NextResponse.redirect(
              `${origin}${
                needsExhibitorConsent || needsExhibitorPrivacy || needsExhibitorTos
                  ? buildTermsConsentPath({
                      nextPath: '/exhibitor/pending',
                      needsExhibitorConsent,
                      needsPrivacyConsent: needsExhibitorPrivacy,
                      needsTosConsent: needsExhibitorTos,
                    })
                  : '/exhibitor/pending'
              }`
            );
          }

          if (hasArtistApplicationData) {
            const artistReconsent = resolveArtistReconsentRequirements(artistApplication);
            return NextResponse.redirect(
              `${origin}${
                artistReconsent.needsArtistConsent ||
                artistReconsent.needsPrivacyConsent ||
                artistReconsent.needsTosConsent
                  ? buildTermsConsentPath({
                      nextPath: '/dashboard/pending',
                      needsArtistConsent: artistReconsent.needsArtistConsent,
                      needsPrivacyConsent: artistReconsent.needsPrivacyConsent,
                      needsTosConsent: artistReconsent.needsTosConsent,
                    })
                  : '/dashboard/pending'
              }`
            );
          }

          return NextResponse.redirect(`${origin}/onboarding`);
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}/onboarding`);
}
