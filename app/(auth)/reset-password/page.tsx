'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import SafeImage from '@/components/common/SafeImage';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';
import { createSupabaseBrowserClient } from '@/lib/auth/client';
import {
  MIN_PASSWORD_LENGTH,
  hasValidPasswordLength,
  isWeakPasswordError,
} from '@/lib/auth/password-policy';

const COPY = {
  ko: {
    subtitle: '새 비밀번호 설정',
    newPasswordLabel: '새 비밀번호',
    confirmPasswordLabel: '새 비밀번호 확인',
    submit: '비밀번호 변경',
    policy: `${MIN_PASSWORD_LENGTH}자 이상 입력해 주세요`,
    mismatch: '비밀번호가 일치하지 않습니다',
    weak: `비밀번호가 너무 짧습니다 (${MIN_PASSWORD_LENGTH}자 이상)`,
    error: '오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    sessionMissing: '세션이 만료되었습니다. 비밀번호 찾기를 다시 시도해 주세요.',
    backToLogin: '로그인으로 돌아가기',
  },
  en: {
    subtitle: 'Set new password',
    newPasswordLabel: 'New password',
    confirmPasswordLabel: 'Confirm new password',
    submit: 'Change password',
    policy: `Use at least ${MIN_PASSWORD_LENGTH} characters`,
    mismatch: 'Passwords do not match',
    weak: `Password is too short (at least ${MIN_PASSWORD_LENGTH} characters)`,
    error: 'An error occurred. Please try again later.',
    sessionMissing: 'Your session expired. Please request a new reset link.',
    backToLogin: 'Back to sign in',
  },
} as const;

export default function ResetPasswordPage() {
  const locale = useLocale();
  const copy = COPY[locale as 'ko' | 'en'] ?? COPY.ko;
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        router.replace('/forgot-password?error=session_expired');
        return;
      }
      setSessionChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasValidPasswordLength(password)) {
      setError(copy.weak);
      return;
    }
    if (password !== confirm) {
      setError(copy.mismatch);
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(isWeakPasswordError(updateError) ? copy.weak : copy.error);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    router.replace('/login?reset=success');
  };

  if (!sessionChecked) {
    return null;
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
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-charcoal">
                {copy.newPasswordLabel}
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
              </div>
              <p className="mt-1 text-xs text-charcoal-soft">{copy.policy}</p>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-charcoal">
                {copy.confirmPasswordLabel}
              </label>
              <div className="mt-1">
                <input
                  id="confirm"
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={MIN_PASSWORD_LENGTH}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
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
                {copy.submit}
              </Button>
            </div>

            <div className="mt-6 text-center text-sm">
              <Link href="/login" className="font-medium text-primary-a11y hover:text-primary">
                {copy.backToLogin}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
