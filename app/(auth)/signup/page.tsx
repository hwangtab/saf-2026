'use client';

import { useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/auth/client';
import {
  isWeakPasswordError,
  MIN_PASSWORD_LENGTH,
  hasValidPasswordLength,
} from '@/lib/auth/password-policy';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import Button from '@/components/ui/Button';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';

const SIGNUP_COPY = {
  ko: {
    subtitle: '아티스트 회원가입',
    continueWithGoogle: '구글로 계속하기',
    orEmailSignup: '또는 이메일 가입',
    nameLabel: '이름 (실명)',
    emailLabel: '이메일 주소',
    passwordLabel: '비밀번호',
    submit: '가입하기',
    alreadyHaveAccount: '이미 계정이 있으신가요?',
    login: '로그인',
    doneTitle: '가입 신청 완료',
    needsEmailConfirmLine1: '이메일 인증 링크가 전송되었습니다.',
    needsEmailConfirmLine2: '이메일 확인 후 로그인해주세요.',
    successLine1: '가입이 완료되었습니다.',
    successLine2: '로그인 후 아티스트 정보를 제출해주세요.',
    goLogin: '로그인 페이지로 이동',
    userExists: '이미 등록된 이메일입니다. 로그인을 시도해주세요.',
    passwordMinLengthHint: '비밀번호는 최소 8자 이상이어야 합니다.',
    weakPassword: '비밀번호는 최소 8자 이상으로 설정해주세요.',
    signupError: '회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    oauthError: '소셜 로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
  },
  en: {
    subtitle: 'Artist sign-up',
    continueWithGoogle: 'Continue with Google',
    orEmailSignup: 'Or sign up with email',
    nameLabel: 'Name (legal name)',
    emailLabel: 'Email address',
    passwordLabel: 'Password',
    submit: 'Create account',
    alreadyHaveAccount: 'Already have an account?',
    login: 'Sign in',
    doneTitle: 'Sign-up request completed',
    needsEmailConfirmLine1: 'A verification email has been sent.',
    needsEmailConfirmLine2: 'Please confirm your email and then sign in.',
    successLine1: 'Your account has been created.',
    successLine2: 'Sign in and submit your artist information.',
    goLogin: 'Go to sign-in page',
    userExists: 'This email is already registered. Please sign in instead.',
    passwordMinLengthHint: 'Password must be at least 8 characters long.',
    weakPassword: 'Please use a password with at least 8 characters.',
    signupError: 'An error occurred during sign-up. Please try again shortly.',
    oauthError: 'An error occurred during social sign-in. Please try again shortly.',
  },
} as const;

export default function SignUpPage() {
  const locale = useLocale();
  const copy = SIGNUP_COPY[locale as 'ko' | 'en'];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!hasValidPasswordLength(password)) {
      setError(copy.weakPassword);
      setLoading(false);
      return;
    }

    // 1. SignUp
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          name,
        },
      },
    });

    if (signUpError) {
      const errorCode = (signUpError as { code?: string }).code;
      const weakPasswordError = isWeakPasswordError({
        code: errorCode,
        message: signUpError.message,
      });
      setError(
        weakPasswordError
          ? copy.weakPassword
          : signUpError.message === 'User already registered'
            ? copy.userExists
            : copy.signupError
      );
      setLoading(false);
      return;
    }

    setLoading(false);

    if (data?.session) {
      router.push('/onboarding');
      router.refresh();
      return;
    }

    setRequiresConfirmation(true);
    setSuccess(true);
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

  if (success) {
    return (
      <div
        className={`min-h-screen bg-canvas-soft flex flex-col justify-center pt-20 ${SAWTOOTH_TOP_SAFE_PADDING} sm:px-6 lg:px-8`}
      >
        <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center">
          <h2 className="text-2xl font-bold text-success-a11y mb-4">{copy.doneTitle}</h2>
          <p className="text-gray-600 mb-6">
            {requiresConfirmation ? (
              <>
                {copy.needsEmailConfirmLine1}
                <br />
                {copy.needsEmailConfirmLine2}
              </>
            ) : (
              <>
                {copy.successLine1}
                <br />
                {copy.successLine2}
              </>
            )}
          </p>
          <Button href="/login" variant="primary">
            {copy.goLogin}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-canvas-soft flex flex-col justify-center pt-20 ${SAWTOOTH_TOP_SAFE_PADDING} sm:px-6 lg:px-8`}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-black text-gray-900">
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
            <span className="text-xs text-charcoal-soft">{copy.orEmailSignup}</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>
          <form className="space-y-6" onSubmit={handleSignUp}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-charcoal">
                {copy.nameLabel}
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                />
              </div>
            </div>

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
                  spellCheck={false}
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  autoComplete="new-password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                />
                <p className="mt-1 text-xs text-charcoal-soft">{copy.passwordMinLengthHint}</p>
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
                {copy.submit}
              </Button>
            </div>
            <div className="mt-6 text-center text-sm">
              <span className="text-gray-500">{copy.alreadyHaveAccount} </span>
              <Link href="/login" className="font-medium text-primary-a11y hover:text-primary">
                {copy.login}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
