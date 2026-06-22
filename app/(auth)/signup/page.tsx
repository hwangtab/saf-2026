'use client';

import { useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/auth/client';
import {
  isWeakPasswordError,
  MIN_PASSWORD_LENGTH,
  hasValidPasswordLength,
} from '@/lib/auth/password-policy';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import clsx from 'clsx';
import Button from '@/components/ui/Button';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';
import SafeImage from '@/components/common/SafeImage';

type RoleChoice = 'collector' | 'artist' | 'exhibitor';

const SIGNUP_COPY = {
  ko: {
    subtitle: '회원가입',
    roleTitle: '어떤 목적으로 가입하시나요?',
    collectorLabel: '컬렉터',
    collectorDesc: '작품을 구매하고 위시리스트를 관리해요',
    artistLabel: '아티스트',
    artistDesc: '작품을 출품하고 씨앗페에 참여해요',
    artistApprovalNote:
      '아티스트는 가입 후 작품·프로필 심사와 관리자 승인을 거쳐 활동이 시작됩니다.',
    exhibitorLabel: '갤러리·큐레이터',
    exhibitorDesc: '소속 작가의 작품을 출품해요',
    exhibitorApprovalNote:
      '갤러리·큐레이터는 가입 후 출품자 신청서 제출과 관리자 승인을 거쳐 활동이 시작됩니다.',
    continueWithGoogle: '구글로 계속하기',
    orEmailSignup: '또는 이메일 가입',
    nameLabel: '이름 (실명)',
    emailLabel: '이메일 주소',
    passwordLabel: '비밀번호',
    passwordConfirmLabel: '비밀번호 확인',
    passwordMismatch: '비밀번호가 일치하지 않습니다.',
    marketingConsentLabel: '(선택) 마케팅 이메일 수신 동의 — 신작·전시·캠페인 소식',
    submit: '가입하기',
    alreadyHaveAccount: '이미 계정이 있으신가요?',
    login: '로그인',
    doneTitle: '가입 신청 완료',
    sentToPrefix: '아래 주소로 인증 링크를 보냈습니다:',
    needsEmailConfirmLine1: '이메일 인증 링크가 전송되었습니다.',
    needsEmailConfirmLine2: '이메일 확인 후 로그인해 주세요.',
    successLine1: '가입이 완료되었습니다.',
    successLine2: '로그인해 주세요.',
    goLogin: '로그인 페이지로 이동',
    resend: '인증 메일 재발송',
    resending: '재발송 중…',
    resent: '재발송했습니다. 이메일함을 확인해 주세요.',
    resendError: '재발송에 실패했습니다. 잠시 후 다시 시도해 주세요.',
    userExists: '이미 등록된 이메일입니다. 로그인을 시도해 주세요.',
    passwordMinLengthHint: '비밀번호는 최소 8자 이상이어야 합니다.',
    weakPassword: '비밀번호는 최소 8자 이상으로 설정해 주세요.',
    signupError: '회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    oauthError: '소셜 로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  },
  en: {
    subtitle: 'Sign up',
    roleTitle: 'How will you use SAF Online?',
    collectorLabel: 'Collector',
    collectorDesc: 'Browse, save, and purchase artworks',
    artistLabel: 'Artist',
    artistDesc: 'Submit your works and join the SAF campaign',
    artistApprovalNote:
      'Artists become active after submitting works and receiving admin approval.',
    exhibitorLabel: 'Gallery / Curator',
    exhibitorDesc: 'Submit works on behalf of your artists',
    exhibitorApprovalNote:
      'Galleries and curators become active after submitting the exhibitor application and receiving admin approval.',
    continueWithGoogle: 'Continue with Google',
    orEmailSignup: 'Or sign up with email',
    nameLabel: 'Name (legal name)',
    emailLabel: 'Email address',
    passwordLabel: 'Password',
    passwordConfirmLabel: 'Confirm password',
    passwordMismatch: 'Passwords do not match.',
    marketingConsentLabel: '(Optional) Marketing emails — new works, exhibitions, campaigns',
    submit: 'Create account',
    alreadyHaveAccount: 'Already have an account?',
    login: 'Sign in',
    doneTitle: 'Sign-up request completed',
    sentToPrefix: 'We sent a verification link to:',
    needsEmailConfirmLine1: 'A verification email has been sent.',
    needsEmailConfirmLine2: 'Please confirm your email and then sign in.',
    successLine1: 'Your account has been created.',
    successLine2: 'Please sign in.',
    goLogin: 'Go to sign-in page',
    resend: 'Resend verification email',
    resending: 'Sending…',
    resent: 'Email resent. Please check your inbox.',
    resendError: 'Failed to resend. Please try again shortly.',
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
  const [roleChoice, setRoleChoice] = useState<RoleChoice>('collector');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [requiresConfirmation, setRequiresConfirmation] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'google' | null>(null);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [marketingConsent, setMarketingConsent] = useState(false);

  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  // 이미 로그인된 사용자가 /signup에 도달하면 마이페이지로 보냄 — 폼 노출 방지.
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (mounted && user) {
        router.replace('/mypage');
      }
    });
    return () => {
      mounted = false;
    };
  }, [supabase, router]);

  const requestOAuthState = async () => {
    const response = await fetch('/api/auth/oauth/state', {
      method: 'POST',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: roleChoice }),
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

    if (password !== passwordConfirm) {
      setError(copy.passwordMismatch);
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          name,
          intended_role: roleChoice,
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

    // Supabase Email Enumeration Protection:
    // 이미 가입된 이메일이어도 signUp이 에러 없이 user를 돌려주지만 identities가 빈 배열로 옴.
    // 이걸 분기하지 않으면 "가입 신청 완료" 화면이 잘못 뜨고 메일도 안 옴.
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setError(copy.userExists);
      setLoading(false);
      return;
    }

    if (data?.user && marketingConsent) {
      await supabase
        .from('profiles')
        .update({
          marketing_consent: true,
          marketing_consent_at: new Date().toISOString(),
          marketing_consent_source: 'signup',
        })
        .eq('id', data.user.id);
    }

    setLoading(false);

    if (data?.session) {
      router.push(
        roleChoice === 'artist'
          ? '/onboarding'
          : roleChoice === 'exhibitor'
            ? '/exhibitor/onboarding'
            : '/mypage'
      );
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

    // 계정 전환 안전장치: 이미 다른 계정 세션이 살아 있는 상태로 OAuth를 시작하면
    // PKCE code_verifier 충돌로 교환이 실패하거나, 실패 시 이전 세션이 잔존한다.
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

  const handleResend = async () => {
    setResendState('sending');
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email });
    setResendState(resendError ? 'error' : 'sent');
  };

  if (success) {
    return (
      <div
        className={`min-h-screen bg-canvas-soft flex flex-col justify-center pt-20 ${SAWTOOTH_TOP_SAFE_PADDING} sm:px-6 lg:px-8`}
      >
        <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white p-8 rounded-2xl border border-gray-200 shadow-sm text-center">
          <h2 className="text-2xl font-bold text-success-a11y mb-4">{copy.doneTitle}</h2>
          <p className="text-gray-600 mb-4">
            {requiresConfirmation ? (
              <>
                {copy.sentToPrefix}
                <br />
                <strong className="text-charcoal">{email}</strong>
                <br />
                <span className="text-sm">{copy.needsEmailConfirmLine2}</span>
              </>
            ) : (
              <>
                {copy.successLine1}
                <br />
                {copy.successLine2}
              </>
            )}
          </p>
          {requiresConfirmation && (
            <div className="mb-4 space-y-2">
              <Button
                type="button"
                variant="white"
                className="w-full justify-center"
                loading={resendState === 'sending'}
                disabled={resendState === 'sending' || resendState === 'sent'}
                onClick={handleResend}
              >
                {resendState === 'sending' ? copy.resending : copy.resend}
              </Button>
              {resendState === 'sent' && <p className="text-sm text-success-a11y">{copy.resent}</p>}
              {resendState === 'error' && (
                <p className="text-sm text-danger-a11y">{copy.resendError}</p>
              )}
            </div>
          )}
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
          {/* 역할 선택 */}
          <div className="mb-6">
            <p className="text-sm font-medium text-charcoal mb-3">{copy.roleTitle}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(
                [
                  { value: 'collector', label: copy.collectorLabel, desc: copy.collectorDesc },
                  { value: 'artist', label: copy.artistLabel, desc: copy.artistDesc },
                  { value: 'exhibitor', label: copy.exhibitorLabel, desc: copy.exhibitorDesc },
                ] as const
              ).map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRoleChoice(value)}
                  className={clsx(
                    'grid grid-rows-[2.5rem_1fr] items-start gap-1 p-3 text-center rounded-xl border-2 transition-colors cursor-pointer h-full',
                    roleChoice === value
                      ? 'border-primary bg-primary/5 text-primary-strong'
                      : 'border-gray-200 bg-gray-50 text-charcoal-muted hover:border-gray-300 hover:bg-gray-100'
                  )}
                >
                  <span className="flex items-center justify-center font-semibold text-sm leading-tight">
                    {label}
                  </span>
                  <span className="text-xs leading-snug opacity-80">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          {(roleChoice === 'artist' || roleChoice === 'exhibitor') && (
            <p className="mb-4 text-xs text-charcoal-muted bg-canvas-strong rounded-lg px-3 py-2">
              {roleChoice === 'artist' ? copy.artistApprovalNote : copy.exhibitorApprovalNote}
            </p>
          )}

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

            <div>
              <label htmlFor="password-confirm" className="block text-sm font-medium text-charcoal">
                {copy.passwordConfirmLabel}
              </label>
              <div className="mt-1">
                <input
                  id="password-confirm"
                  name="password-confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  aria-invalid={
                    passwordConfirm.length > 0 && passwordConfirm !== password ? true : undefined
                  }
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg placeholder-gray-400 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-primary"
                />
                {passwordConfirm.length > 0 && passwordConfirm !== password && (
                  <p className="mt-1 text-xs text-danger-a11y">{copy.passwordMismatch}</p>
                )}
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-2 text-sm text-charcoal-muted">
              <input
                id="marketing-consent"
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                className="mt-0.5 rounded border-gray-300"
              />
              <span>{copy.marketingConsentLabel}</span>
            </label>

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
