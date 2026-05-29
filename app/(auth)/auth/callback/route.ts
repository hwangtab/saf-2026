import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
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

async function redirectWithOAuthStateCleared(url: string) {
  // Next.js 15 Route Handler: NextResponse.redirect 명시 반환 시 next/headers cookies()로 set한
  // cookie가 자동 머지되지 않음. supabase가 exchangeCodeForSession 중 set한 session cookie를
  // 응답에 명시 복사해야 클라이언트로 전달됨. 이게 빠지면 사용자 브라우저에 세션 cookie 미세팅
  // → /mypage 등 후속 페이지가 user를 못 찾아 /login 무한 루프.
  const cookieStore = await cookies();
  const response = NextResponse.redirect(url);
  for (const c of cookieStore.getAll()) {
    response.cookies.set(c.name, c.value);
  }
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

    if (sessionError) {
      console.error('[auth/callback] exchangeCodeForSession failed', {
        code: sessionError.code,
        message: sessionError.message,
        status: sessionError.status,
      });
      return await redirectWithOAuthStateCleared(`${origin}/login?error=session_exchange`);
    }

    {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error('[auth/callback] session exchange ok but getUser returned null');
        return await redirectWithOAuthStateCleared(`${origin}/login?error=session_missing`);
      }

      if (user) {
        // Fetch profile to determine where to redirect
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          console.error('[auth/callback] profile lookup failed', {
            userId: user.id,
            code: profileError.code,
            message: profileError.message,
          });
          return await redirectWithOAuthStateCleared(`${origin}/login?error=profile_lookup`);
        }

        if (profile?.role === 'admin') {
          return await redirectWithOAuthStateCleared(`${origin}/admin/dashboard`);
        }

        if (profile?.role === 'exhibitor') {
          const { data: application, error: applicationError } = await supabase
            .from('exhibitor_applications')
            .select(EXHIBITOR_APPLICATION_CONSENT_SELECT)
            .eq('user_id', user.id)
            .maybeSingle();

          if (applicationError) {
            return await redirectWithOAuthStateCleared(`${origin}/login`);
          }

          const hasApplication = hasExhibitorApplication(application);
          const needsTermsConsent = needsExhibitorTermsConsent(application);
          const needsPrivacy = needsPrivacyConsent(application);
          const needsTos = needsTosConsent(application);

          if (profile.status === 'suspended') {
            return await redirectWithOAuthStateCleared(`${origin}/exhibitor/suspended`);
          }

          if (profile.status === 'active') {
            return await redirectWithOAuthStateCleared(
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

          return await redirectWithOAuthStateCleared(
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
            return await redirectWithOAuthStateCleared(`${origin}/login`);
          }

          const hasApplication = hasArtistApplication(application);
          const artistReconsent = resolveArtistReconsentRequirements(application);

          if (profile.status === 'active') {
            return await redirectWithOAuthStateCleared(
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
            return await redirectWithOAuthStateCleared(
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
            return await redirectWithOAuthStateCleared(`${origin}/dashboard/suspended`);
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
            return await redirectWithOAuthStateCleared(`${origin}/login`);
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

            return await redirectWithOAuthStateCleared(
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
          return await redirectWithOAuthStateCleared(noAppDestination);
        }
      }
    }
  }

  // 최후 fallback: code 자체 없는 경우. /login으로 보내고 명시.
  console.error('[auth/callback] reached final fallback', {
    hasCode: Boolean(code),
    url: request.url,
  });
  return await redirectWithOAuthStateCleared(`${origin}/login?error=callback_fallback`);
}
