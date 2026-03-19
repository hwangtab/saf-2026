'use client';

import { useEffect } from 'react';
import Button from '@/components/ui/Button';
import { useTranslations } from 'next-intl';

interface ErrorViewProps {
  icon: string;
  title: string;
  message: string;
  backLink?: { href: string; label: string };
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorView({
  icon,
  title,
  message,
  backLink,
  error,
  reset,
}: ErrorViewProps) {
  const tError = useTranslations('error');
  const resolvedBackLink = backLink ?? { href: '/', label: tError('goHome') };

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto">
        <div className="text-6xl mb-6" role="img" aria-label="icon">
          {icon}
        </div>
        <h2 className="text-2xl font-bold mb-4 text-charcoal">{title}</h2>
        <p className="text-charcoal-muted mb-8 leading-relaxed text-balance">{message}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={reset} variant="primary">
            {tError('retry')}
          </Button>
          <Button href={resolvedBackLink.href} variant="outline">
            {resolvedBackLink.label}
          </Button>
        </div>
      </div>
    </div>
  );
}
