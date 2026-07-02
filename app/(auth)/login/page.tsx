'use client';

import { useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/auth/client';
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
  sanitizeInternalPath,
} from '@/lib/auth/terms-consent';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';
import SafeImage from '@/components/common/SafeImage';

/**
 * 공개 출품 랜딩에서 심은 '기금마련전 출품 의도' 쿠키(불리언 플래그)를 읽고 소비한다.
 * 활성 작가가 로그인하면 목적지를 /dashboard/fundraiser로. 쿠키 없으면 false → 기존 동작 유지.
 */
function takeFundraiserSubmitIntent(): boolean {
  if (typeof document === 'undefined') return false;
  const has = document.cookie.split('; ').includes('fundraiser_submit_intent=1');
  if (has) {
    document.cookie = 'fundraiser_submit_intent=; path=/; max-age=0; samesite=lax';
  }
  return has;
}

const LOGIN_COPY = {
  ko: {
    subtitle: '로그인',
    continueWithGoogle: '구글로 계속하기',
    orEmailLogin: '또는 이메일 로그인',
    emailLabel: '이메일 주소',
    passwordLabel: '비밀번호',
    loginButton: '로그인',
    noAccount: '계정이 없으신가요?',
    signUp: '회원가입',
    invalidCredentials: '이메일 또는 비밀번호가 올바르지 않습니다.',
    loginError: '로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    accountLoadError: '계정 정보를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.',
    oauthError: '소셜 로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    oauthStateError: '인증 세션이 만료되었거나 유효하지 않습니다. 다시 로그인해 주세요.',
    sessionExchangeError:
      '소셜 로그인 세션 생성에 실패했습니다. 잠시 후 다시 시도해 주세요. (지속되면 관리자에게 문의)',
    sessionMissingError:
      '로그인은 처리되었으나 세션이 유실되었습니다. 쿠키 차단 설정을 확인하고 다시 시도해 주세요.',
    profileLookupError: '계정 정보 조회에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    callbackFallbackError: '인증 처리가 완료되지 않았습니다. 다시 로그인해 주세요.',
    forgotPassword: '비밀번호를 잊으셨나요?',
    resetSuccess: '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.',
  },
  en: {
    subtitle: 'Sign in',
    continueWithGoogle: 'Continue with Google',
    orEmailLogin: 'Or sign in with email',
    emailLabel: 'Email address',
    passwordLabel: 'Password',
    loginButton: 'Sign in',
    noAccount: "Don't have an account?",
    signUp: 'Sign up',
    invalidCredentials: 'Invalid email or password.',
    loginError: 'An error occurred while signing in. Please try again shortly.',
    accountLoadError: 'We could not load your account info. Please refresh and try again.',
    oauthError: 'An error occurred during social sign-in. Please try again shortly.',
    oauthStateError: 'Your sign-in session expired or was invalid. Please sign in again.',
    sessionExchangeError:
      'Failed to create a session from the social login. Please try again shortly.',
    sessionMissingError:
      'Sign-in succeeded but the session was lost. Check your cookie blocking settings and try again.',
    profileLookupError: 'Failed to look up your account info. Please try again shortly.',
    callbackFallbackError: 'Authentication did not complete. Please sign in again.',
    forgotPassword: 'Forgot your password?',
    resetSuccess: 'Password changed. Please sign in with your new password.',
  },
} as const;

export default function LoginPage() {
  const locale = useLocale();
  const copy = LOGIN_COPY[locale as 'ko' | 'en'];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectAfterLogin = searchParams.get('redirectTo');
  const oauthErrorParam = searchParams.get('error');
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  // 이미 로그인된 사용자가 /login에 도달하면 마이페이지로 보냄 — 폼 노출 방지.
  // 단, error/redirectTo 파라미터가 있으면 무한 redirect 가능성이 있어 skip.
  useEffect(() => {
    if (oauthErrorParam || redirectAfterLogin) return;
    let mounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (mounted && user) {
        router.replace('/mypage');
      }
    });
    return () => {
      mounted = false;
    };
  }, [supabase, router, oauthErrorParam, redirectAfterLogin]);

  const initialError =
    oauthErrorParam === 'oauth_state'
      ? copy.oauthStateError
      : oauthErrorParam === 'session_exchange'
        ? copy.sessionExchangeError
        : oauthErrorParam === 'session_missing'
          ? copy.sessionMissingError
          : oauthErrorParam === 'profile_lookup'
            ? copy.profileLookupError
            : oauthErrorParam === 'callback_fallback'
              ? copy.callbackFallbackError
              : null;
  const [error, setError] = useState<string | null>(initialError);

  const resetParam = searchParams.get('reset');
  const initialSuccess = resetParam === 'success' ? copy.resetSuccess : null;
  const [successMessage, setSuccessMessage] = useState<string | null>(initialSuccess);

  const requestOAuthState = async () => {
    const response = await fetch('/api/auth/oauth/state', {
      method: 'POST',
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to initialize oauth state');
    }

    const payload = (await response.json()) as { redirectTo?: unknown };
    if (typeof payload.redirectTo !== 'string' || payload.redirectTo.length === 0) {
      throw new Error('Invalid oauth state payload');
    }

    return payload.redirectTo;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(
        error.message === 'Invalid login credentials' ? copy.invalidCredentials : copy.loginError
      );
      setLoading(false);
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let nextPath = '/dashboard';

      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) {
          setError(copy.accountLoadError);
          setLoading(false);
          return;
        }

        if (profile?.role === 'admin') {
          nextPath = '/admin/dashboard';
        } else if (profile?.role === 'exhibitor') {
          const { data: application, error: applicationError } = await supabase
            .from('exhibitor_applications')
            .select(EXHIBITOR_APPLICATION_CONSENT_SELECT)
            .eq('user_id', user.id)
            .maybeSingle();

          if (applicationError) {
            setError(copy.accountLoadError);
            setLoading(false);
            return;
          }

          const hasApplication = hasExhibitorApplication(application);
          const needsTermsConsent = needsExhibitorTermsConsent(application);
          const needsPrivacy = needsPrivacyConsent(application);
          const needsTos = needsTosConsent(application);

          if (profile.status === 'suspended') {
            nextPath = '/exhibitor/suspended';
          } else if (profile.status === 'active') {
            nextPath = hasApplication
              ? needsTermsConsent || needsPrivacy || needsTos
                ? buildTermsConsentPath({
                    nextPath: '/exhibitor',
                    needsExhibitorConsent: needsTermsConsent,
                    needsPrivacyConsent: needsPrivacy,
                    needsTosConsent: needsTos,
                  })
                : '/exhibitor'
              : '/exhibitor/onboarding?recover=1';
          } else {
            nextPath = hasApplication
              ? needsTermsConsent || needsPrivacy || needsTos
                ? buildTermsConsentPath({
                    nextPath: '/exhibitor/pending',
                    needsExhibitorConsent: needsTermsConsent,
                    needsPrivacyConsent: needsPrivacy,
                    needsTosConsent: needsTos,
                  })
                : '/exhibitor/pending'
              : '/exhibitor/onboarding';
          }
        } else if (profile?.role === 'artist') {
          const { data: application, error: applicationError } = await supabase
            .from('artist_applications')
            .select(ARTIST_APPLICATION_CONSENT_SELECT)
            .eq('user_id', user.id)
            .maybeSingle();

          if (applicationError) {
            setError(copy.accountLoadError);
            setLoading(false);
            return;
          }

          const hasApplication = hasArtistApplication(application);
          const artistReconsent = resolveArtistReconsentRequirements(application);

          if (profile.status === 'active') {
            nextPath = hasApplication
              ? artistReconsent.needsArtistConsent ||
                artistReconsent.needsPrivacyConsent ||
                artistReconsent.needsTosConsent
                ? buildTermsConsentPath({
                    nextPath: '/dashboard/artworks',
                    needsArtistConsent: artistReconsent.needsArtistConsent,
                    needsPrivacyConsent: artistReconsent.needsPrivacyConsent,
                    needsTosConsent: artistReconsent.needsTosConsent,
                  })
                : takeFundraiserSubmitIntent()
                  ? '/dashboard/fundraiser'
                  : '/dashboard/artworks'
              : '/onboarding?recover=1';
          } else if (profile.status === 'suspended') {
            nextPath = '/dashboard/suspended';
          } else if (profile.status === 'pending') {
            nextPath = hasApplication
              ? artistReconsent.needsArtistConsent ||
                artistReconsent.needsPrivacyConsent ||
                artistReconsent.needsTosConsent
                ? buildTermsConsentPath({
                    nextPath: '/dashboard/pending',
                    needsArtistConsent: artistReconsent.needsArtistConsent,
                    needsPrivacyConsent: artistReconsent.needsPrivacyConsent,
                    needsTosConsent: artistReconsent.needsTosConsent,
                  })
                : '/dashboard/pending'
              : '/onboarding';
          }
        } else if (profile?.role === 'user') {
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
            setError(copy.accountLoadError);
            setLoading(false);
            return;
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

            nextPath =
              needsArtistConsent || needsExhibitorConsent || needsPrivacy || needsTos
                ? buildTermsConsentPath({
                    nextPath: defaultPath,
                    needsArtistConsent,
                    needsExhibitorConsent,
                    needsPrivacyConsent: needsPrivacy,
                    needsTosConsent: needsTos,
                  })
                : defaultPath;
          } else {
            // collector — redirectTo 파라미터 우선, 외부 URL/open redirect 차단
            nextPath = sanitizeInternalPath(redirectAfterLogin, '/mypage');
          }
        }
      }

      router.push(nextPath);
      router.refresh();
    }
  };

  const handleOAuthLogin = async (provider: 'google') => {
    setOauthLoading(provider);
    setError(null);

    let redirectTo: string;
    try {
      redirectTo = await requestOAuthState();
    } catch {
      setError(copy.oauthError);
      setOauthLoading(null);
      return;
    }

    // 계정 전환 안전장치: 이미 다른 계정 세션이 살아 있는 상태로 OAuth를 시작하면
    // PKCE code_verifier 충돌로 교환이 실패하거나, 실패 시 이전 세션이 잔존해
    // "다른 계정으로 로그인했는데 이전 계정(예: admin)으로 보이는" 사고가 난다.
    // OAuth 시작 전 로컬 세션을 비우고, 구글에 항상 계정 선택을 강제한다.
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch {
      // 세션이 없거나 정리 실패해도 OAuth는 진행 — prompt=select_account가 2차 방어.
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        queryParams: { prompt: 'select_account' },
      },
    });

    if (error) {
      setError(copy.oauthError);
      setOauthLoading(null);
    }
  };

  return (
    <div
      className={`min-h-screen bg-canvas-soft flex flex-col justify-center pt-20 ${SAWTOOTH_TOP_SAFE_PADDING} sm:px-6 lg:px-8`}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mt-6 flex flex-col items-center gap-3">
          <SafeImage
            src="/images/logo/320pxX90px.webp"
            alt="씨앗페"
            width={160}
            height={45}
            className="h-10 w-auto object-contain"
            priority
          />
          <p className="text-xl font-medium text-gray-600">{copy.subtitle}</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-gray-200 sm:rounded-2xl sm:px-10">
          <div className="space-y-3">
            <Button
              type="button"
              variant="white"
              className="w-full justify-center"
              loading={oauthLoading === 'google'}
              disabled={oauthLoading !== null}
              onClick={() => handleOAuthLogin('google')}
            >
              {copy.continueWithGoogle}
            </Button>
          </div>

          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs text-charcoal-soft">{copy.orEmailLogin}</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-charcoal">
                {copy.emailLabel}
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  spellCheck={false}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-charcoal">
                {copy.passwordLabel}
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                />
              </div>
            </div>

            <div className="mt-2 text-right">
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-primary-a11y hover:text-primary"
              >
                {copy.forgotPassword}
              </Link>
            </div>

            {successMessage && (
              <output className="block text-sm text-success-a11y">{successMessage}</output>
            )}

            {error && (
              <div role="alert" className="text-danger-a11y text-sm">
                {error}
              </div>
            )}

            <div>
              <Button
                type="submit"
                loading={loading}
                disabled={loading}
                className="w-full flex justify-center"
              >
                {copy.loginButton}
              </Button>
            </div>

            {/* Simple footer for sign up hint */}
            <div className="mt-6 text-center text-sm">
              <span className="text-gray-500">{copy.noAccount} </span>
              <Link href="/signup" className="font-medium text-primary-a11y hover:text-primary">
                {copy.signUp}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
