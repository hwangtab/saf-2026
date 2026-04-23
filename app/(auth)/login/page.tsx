'use client';

import { useMemo, useState } from 'react';
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
} from '@/lib/auth/terms-consent';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import Button from '@/components/ui/Button';

const LOGIN_COPY = {
  ko: {
    subtitle: '아티스트 로그인',
    continueWithGoogle: '구글로 계속하기',
    orEmailLogin: '또는 이메일 로그인',
    emailLabel: '이메일 주소',
    passwordLabel: '비밀번호',
    loginButton: '로그인',
    noAccount: '계정이 없으신가요?',
    signUp: '회원가입',
    invalidCredentials: '이메일 또는 비밀번호가 올바르지 않습니다.',
    loginError: '로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    oauthError: '소셜 로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  },
  en: {
    subtitle: 'Artist login',
    continueWithGoogle: 'Continue with Google',
    orEmailLogin: 'Or sign in with email',
    emailLabel: 'Email address',
    passwordLabel: 'Password',
    loginButton: 'Sign in',
    noAccount: "Don't have an account?",
    signUp: 'Sign up',
    invalidCredentials: 'Invalid email or password.',
    loginError: 'An error occurred while signing in. Please try again shortly.',
    oauthError: 'An error occurred during social sign-in. Please try again shortly.',
  },
} as const;

export default function LoginPage() {
  const locale = useLocale();
  const copy = LOGIN_COPY[locale as 'ko' | 'en'];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthLoading, setOauthLoading] = useState<'google' | null>(null);
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

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
          setError(copy.loginError);
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
            setError(copy.loginError);
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
            setError(copy.loginError);
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
            setError(copy.loginError);
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
            nextPath = '/onboarding';
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

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
      },
    });

    if (error) {
      setError(copy.oauthError);
      setOauthLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-soft flex flex-col justify-center pt-20 pb-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          SAF Online
          <br />
          <span className="text-xl font-medium text-gray-600">{copy.subtitle}</span>
        </h2>
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
