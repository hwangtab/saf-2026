import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { Database } from '@/types/supabase';
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

type PendingCookie = { name: string; value: string; options: CookieOptions };

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const cookieRole = request.cookies.get(OAUTH_ROLE_COOKIE_NAME)?.value ?? null;

  // [locale]/* 경로(/mypage 등)는 next-intl이 /ko/* 또는 /en/*로 redirect 처리.
  // callback이 bare /mypage로 보내면 intlProxy redirect chain이 한 단계 추가되어
  // supabase session cookie 전파에 부정적. NEXT_LOCALE cookie로 locale 결정해서
  // 명시 prefix 부여. portal 경로(/dashboard, /exhibitor 등)는 locale 없음.
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value;
  const localePrefix = localeCookie === 'en' ? '/en' : '/ko';

  // supabase-ssr setAll 콜백이 알려주는 모든 session cookie를 양쪽에 set:
  // (1) NextResponse.cookies — redirect 응답에 명시 (브라우저로 전달)
  // (2) next/headers cookies() — 같은 요청 내 다른 server-side 코드가 봐야 할 때 대비 (안전망)
  // path는 '/'로 강제 — supabase가 '/auth/callback' 같은 wrong scope path를 보내도 root에서 보이게.
  const cookieStore = await cookies();
  const cookiesToPropagate: PendingCookie[] = [];

  const redirectWithOAuthStateCleared = (url: string) => {
    // NextResponse.redirect 대신 manual NextResponse 생성 — set-cookie 헤더 처리를 명시 제어.
    const response = new NextResponse(null, {
      status: 307,
      headers: { Location: url },
    });
    for (const c of cookiesToPropagate) {
      const options: CookieOptions = { ...c.options, path: '/' };
      response.cookies.set(c.name, c.value, options);
    }
    response.cookies.set(OAUTH_STATE_COOKIE_NAME, '', getOAuthStateCookieOptions(0));
    response.cookies.set(OAUTH_ROLE_COOKIE_NAME, '', getOAuthRoleCookieOptions(0));
    const setCookieHeaders = response.headers.getSetCookie();
    const totalHeaderBytes = setCookieHeaders.reduce((acc, h) => acc + h.length, 0);
    console.log('[auth/callback] redirect', {
      url,
      cookieCount: cookiesToPropagate.length,
      cookieNames: cookiesToPropagate.map((c) => c.name),
      setCookieHeaderCount: setCookieHeaders.length,
      totalSetCookieBytes: totalHeaderBytes,
      perCookieBytes: setCookieHeaders.map((h) => h.length),
    });
    return response;
  };

  // CSRF 방어는 Supabase PKCE flow가 자체 처리 (RFC 7636). 우리 자체 state nonce 가드는 제거.

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      console.error('[auth/callback] missing supabase env');
      return redirectWithOAuthStateCleared(`${origin}/login?error=config`);
    }

    const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(setCookies) {
          for (const c of setCookies) {
            // path '/' 강제 + 두 store에 모두 적용
            const options: CookieOptions = { ...(c.options ?? {}), path: '/' };
            cookiesToPropagate.push({ name: c.name, value: c.value, options });
            try {
              cookieStore.set(c.name, c.value, options);
            } catch (e) {
              console.error('[auth/callback] cookieStore.set failed', c.name, e);
            }
          }
        },
      },
    });

    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError) {
      console.error('[auth/callback] exchangeCodeForSession failed', {
        code: sessionError.code,
        message: sessionError.message,
        status: sessionError.status,
      });
      return redirectWithOAuthStateCleared(`${origin}/login?error=session_exchange`);
    }

    {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error('[auth/callback] session exchange ok but getUser returned null');
        return redirectWithOAuthStateCleared(`${origin}/login?error=session_missing`);
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
          return redirectWithOAuthStateCleared(`${origin}/login?error=profile_lookup`);
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
                : `${origin}${localePrefix}/mypage`;
          return redirectWithOAuthStateCleared(noAppDestination);
        }
      }
    }
  }

  // 최후 fallback: code 자체 없는 경우. /login으로 보내고 명시.
  console.error('[auth/callback] reached final fallback', {
    hasCode: Boolean(code),
    url: request.url,
  });
  return redirectWithOAuthStateCleared(`${origin}/login?error=callback_fallback`);
}
