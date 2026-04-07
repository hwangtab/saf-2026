'use client';

import { useEffect } from 'react';
import Button from '@/components/ui/Button';

interface ErrorViewProps {
  icon: string;
  title: string;
  message: string;
  backLink?: { href: string; label: string };
  error: Error & { digest?: string };
  reset: () => void;
  /** Override the retry button label. Defaults to '다시 시도하기'. */
  retryLabel?: string;
  /** Override the fallback home link label when backLink is not provided. Defaults to '홈으로 돌아가기'. */
  homeLabel?: string;
}

export default function ErrorView({
  icon,
  title,
  message,
  backLink,
  error,
  reset,
  retryLabel = '다시 시도하기',
  homeLabel = '홈으로 돌아가기',
}: ErrorViewProps) {
  const resolvedBackLink = backLink ?? { href: '/', label: homeLabel };

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto">
        <div className="text-6xl mb-6" aria-hidden="true">
          {icon}
        </div>
        <h1 className="text-2xl font-bold mb-4 text-charcoal">{title}</h1>
        <p className="text-charcoal-muted mb-8 leading-relaxed text-balance">{message}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={reset} variant="primary">
            {retryLabel}
          </Button>
          <Button href={resolvedBackLink.href} variant="outline">
            {resolvedBackLink.label}
          </Button>
        </div>
      </div>
    </div>
  );
}
