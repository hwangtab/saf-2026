import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/server';
import {
  getOAuthStateCookieOptions,
  isValidOAuthState,
  OAUTH_STATE_COOKIE_NAME,
} from '@/lib/auth/oauth-state';
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

function redirectWithOAuthStateCleared(url: string) {
  const response = NextResponse.redirect(url);
  response.cookies.set(OAUTH_STATE_COOKIE_NAME, '', getOAuthStateCookieOptions(0));
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const requestState = searchParams.get('state');
  const cookieState = request.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value ?? null;

  if (code && !isValidOAuthState(requestState, cookieState)) {
    return redirectWithOAuthStateCleared(`${origin}/login?error=oauth_state`);
  }

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
          return redirectWithOAuthStateCleared(`${origin}/login`);
        }

        if (profile?.role === 'admin') {
          return redirectWithOAuthStateCleared(`${origin}/admin/dashboard`);
        }

        if (profile?.role === 'exhibitor') {
          const { data: application, error: applicationError } = await supabase
            .from('exhibitor_applications')
            .select(EXHIBITOR_APPLICATION_CONSENT_SELECT)
            .eq('user_id', user.id)
            .maybeSingle();

          if (applicationError) {
            return redirectWithOAuthStateCleared(`${origin}/login`);
          }

          const hasApplication = hasExhibitorApplication(application);
          const needsTermsConsent = needsExhibitorTermsConsent(application);
          const needsPrivacy = needsPrivacyConsent(application);
          const needsTos = needsTosConsent(application);

          if (profile.status === 'suspended') {
            return redirectWithOAuthStateCleared(`${origin}/exhibitor/suspended`);
          }

          if (profile.status === 'active') {
            return redirectWithOAuthStateCleared(
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

          return redirectWithOAuthStateCleared(
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
          const { data: application, error: applicationError } = await supabase
            .from('artist_applications')
            .select(ARTIST_APPLICATION_CONSENT_SELECT)
            .eq('user_id', user.id)
            .maybeSingle();

          if (applicationError) {
            return redirectWithOAuthStateCleared(`${origin}/login`);
          }

          const hasApplication = hasArtistApplication(application);
          const artistReconsent = resolveArtistReconsentRequirements(application);

          if (profile.status === 'active') {
            return redirectWithOAuthStateCleared(
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
            return redirectWithOAuthStateCleared(
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
            return redirectWithOAuthStateCleared(`${origin}/dashboard/suspended`);
          }
        }

        if (profile?.role === 'user') {
          const [exhibitorResult, artistResult] = await Promise.all([
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

          if (exhibitorResult.error || artistResult.error) {
            return redirectWithOAuthStateCleared(`${origin}/login`);
          }

          const exhibitorApplication = exhibitorResult.data;
          const artistApplication = artistResult.data;

          const hasExhibitorApplicationData = hasExhibitorApplication(exhibitorApplication);
          const hasArtistApplicationData = hasArtistApplication(artistApplication);

          if (hasExhibitorApplicationData || hasArtistApplicationData) {
            const artistReconsent = hasArtistApplicationData
              ? resolveArtistReconsentRequirements(artistApplication)
              : null;
            const needsArtistConsent = artistReconsent?.needsArtistConsent ?? false;
            const needsArtistPrivacy = artistReconsent?.needsPrivacyConsent ?? false;
            const needsArtistTos = artistReconsent?.needsTosConsent ?? false;
            const needsExhibitorConsent = hasExhibitorApplicationData
              ? needsExhibitorTermsConsent(exhibitorApplication)
              : false;
            const needsExhibitorPrivacy = hasExhibitorApplicationData
              ? needsPrivacyConsent(exhibitorApplication)
              : false;
            const needsExhibitorTos = hasExhibitorApplicationData
              ? needsTosConsent(exhibitorApplication)
              : false;
            const needsPrivacy = needsArtistPrivacy || needsExhibitorPrivacy;
            const needsTos = needsArtistTos || needsExhibitorTos;
            const defaultPath =
              hasExhibitorApplicationData && !hasArtistApplicationData
                ? '/exhibitor/pending'
                : '/dashboard/pending';

            return redirectWithOAuthStateCleared(
              `${origin}${
                needsArtistConsent || needsExhibitorConsent || needsPrivacy || needsTos
                  ? buildTermsConsentPath({
                      nextPath: defaultPath,
                      needsArtistConsent,
                      needsExhibitorConsent,
                      needsPrivacyConsent: needsPrivacy,
                      needsTosConsent: needsTos,
                    })
                  : defaultPath
              }`
            );
          }

          return redirectWithOAuthStateCleared(`${origin}/onboarding`);
        }
      }
    }
  }

  return redirectWithOAuthStateCleared(`${origin}/onboarding`);
}
