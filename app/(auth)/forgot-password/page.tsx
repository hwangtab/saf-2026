'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import SafeImage from '@/components/common/SafeImage';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';
import { requestPasswordReset } from './actions';

const COPY = {
  ko: {
    subtitle: '비밀번호 찾기',
    description: '가입하신 이메일로 재설정 링크를 보내드립니다',
    emailLabel: '이메일 주소',
    submit: '재설정 링크 보내기',
    backToLogin: '로그인으로 돌아가기',
    sent: '재설정 링크를 이메일로 보냈습니다. 메일함을 확인해 주세요.',
    notFound: '등록되지 않은 이메일입니다.',
    socialOnlyGoogle:
      'Google로 가입한 계정입니다. 로그인 페이지에서 "구글로 계속하기"를 사용해 주세요.',
    rateLimited: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
    error: '오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
    invalidLink: '재설정 링크가 만료되었거나 유효하지 않습니다. 다시 요청해 주세요.',
    sessionExpired: '세션이 만료되었습니다. 다시 재설정 링크를 요청해 주세요.',
  },
  en: {
    subtitle: 'Forgot password',
    description: "We'll email you a link to reset your password",
    emailLabel: 'Email address',
    submit: 'Send reset link',
    backToLogin: 'Back to sign in',
    sent: 'We sent a reset link to your email. Please check your inbox.',
    notFound: 'This email is not registered.',
    socialOnlyGoogle:
      'This account was created with Google. Please use "Continue with Google" on the sign-in page.',
    rateLimited: 'Too many requests. Please try again later.',
    error: 'An error occurred. Please try again later.',
    invalidLink: 'The reset link is invalid or expired. Please request a new one.',
    sessionExpired: 'Your session expired. Please request a new reset link.',
  },
} as const;

export default function ForgotPasswordPage() {
  const locale = useLocale();
  const copy = COPY[locale as 'ko' | 'en'] ?? COPY.ko;
  const searchParams = useSearchParams();
  const initialError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    initialError === 'invalid_link'
      ? { type: 'error', text: copy.invalidLink }
      : initialError === 'session_expired'
        ? { type: 'error', text: copy.sessionExpired }
        : null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await requestPasswordReset({ email });

    switch (result.status) {
      case 'sent':
        setMessage({ type: 'success', text: copy.sent });
        setEmail('');
        break;
      case 'not_found':
        setMessage({ type: 'error', text: copy.notFound });
        break;
      case 'social_only':
        setMessage({ type: 'error', text: copy.socialOnlyGoogle });
        break;
      case 'rate_limited':
        setMessage({ type: 'error', text: copy.rateLimited });
        break;
      case 'error':
      default:
        setMessage({ type: 'error', text: copy.error });
        break;
    }
    setLoading(false);
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
          <p className="text-sm text-charcoal-soft text-center">{copy.description}</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm border border-gray-200 sm:rounded-2xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
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

            {message?.type === 'error' && (
              <div role="alert" className="text-sm text-danger-a11y">
                {message.text}
              </div>
            )}
            {message?.type === 'success' && (
              <output className="block text-sm text-success-a11y">{message.text}</output>
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
