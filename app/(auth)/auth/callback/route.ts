import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/auth/server';
import {
  getOAuthRoleCookieOptions,
  getOAuthStateCookieOptions,
  isValidIntendedRole,
  OAUTH_ROLE_COOKIE_NAME,
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
  response.cookies.set(OAUTH_ROLE_COOKIE_NAME, '', getOAuthRoleCookieOptions(0));
  return response;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const cookieRole = request.cookies.get(OAUTH_ROLE_COOKIE_NAME)?.value ?? null;

  // CSRF 방어는 Supabase PKCE flow가 자체 처리 (RFC 7636).
  // 우리 자체 state nonce 가드는 supabase의 query 보존 동작에 의존해서 false positive
  // 발생 가능 (OAuth 정상 흐름이 oauth_state 에러로 튕기는 회귀). 가드 제거 + PKCE 위임.
  // cookieRole만은 의도 보존 위해 계속 읽음 (signup에서 collector/artist/exhibitor 선택분).

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

          const metadataRole = user.user_metadata?.intended_role;
          const intendedRole =
            cookieRole ?? (isValidIntendedRole(metadataRole) ? metadataRole : null);

          // intendedRole: 'artist' | 'collector' | 'exhibitor' (isValidIntendedRole).
          // collector·미상 → 마이페이지. artist/exhibitor → 각자 신청 폼.
          const noAppDestination =
            intendedRole === 'artist'
              ? `${origin}/onboarding?role=artist`
              : intendedRole === 'exhibitor'
                ? `${origin}/exhibitor/onboarding`
                : `${origin}/mypage`;
          return redirectWithOAuthStateCleared(noAppDestination);
        }
      }
    }
  }

  // 최후 fallback: 신원 정보 불완전. 콜렉터로 가정해 마이페이지로.
  return redirectWithOAuthStateCleared(`${origin}/mypage`);
}
