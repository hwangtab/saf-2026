'use client';

import { useEffect } from 'react';
import { setErrorHeaderActive } from '@/lib/error-header-signal';

interface ErrorViewProps {
  /** Visual indicator. Pass a lucide icon component or any ReactNode. */
  icon: React.ReactNode;
  title: string;
  message: string;
  backLink?: { href: string; label: string };
  error: Error & { digest?: string };
  reset: () => void;
  /** Label for the retry button. */
  retryLabel: string;
  /** Label for the fallback home link when `backLink` is not provided. */
  homeLabel: string;
}

export default function ErrorView({
  icon,
  title,
  message,
  backLink,
  error,
  reset,
  retryLabel,
  homeLabel,
}: ErrorViewProps) {
  const resolvedBackLink = backLink ?? { href: '/', label: homeLabel };

  useEffect(() => {
    console.error(error);
  }, [error]);

  // 에러 화면이 떠 있는 동안 헤더를 solid로 강제 — hero 라우트의 투명(흰 글씨) 헤더가
  // 흰 에러 배경에 묻히는 것 방지. 언마운트(reset/이동) 시 원복.
  useEffect(() => {
    setErrorHeaderActive(true);
    return () => setErrorHeaderActive(false);
  }, []);

  return (
    <div className="min-h-[100svh] flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto">
        <div className="mb-6 flex justify-center text-charcoal-muted" aria-hidden="true">
          {icon}
        </div>
        <h1 className="text-2xl font-bold mb-4 text-charcoal">{title}</h1>
        <p className="text-charcoal-muted mb-8 leading-relaxed text-balance">{message}</p>
        {/* 순수 HTML 사용 — Button/Link 컴포넌트는 next-intl 컨텍스트를 필요로 해 GlobalError 밖에서 충돌함 */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-strong px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
          >
            {retryLabel}
          </button>
          <a
            href={resolvedBackLink.href}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary px-6 py-3 text-sm font-bold text-primary-strong transition hover:bg-primary-surface"
          >
            {resolvedBackLink.label}
          </a>
        </div>
      </div>
    </div>
  );
}
