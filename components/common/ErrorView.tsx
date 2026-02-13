'use client';

import { useEffect } from 'react';
import Button from '@/components/ui/Button';
import { UI_STRINGS } from '@/lib/ui-strings';

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
  backLink = { href: '/', label: UI_STRINGS.ERROR.GO_HOME },
  error,
  reset,
}: ErrorViewProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="text-center max-w-md mx-auto">
        <div className="text-6xl mb-6" role="img" aria-label="아이콘">
          {icon}
        </div>
        <h2 className="text-2xl font-bold mb-4 text-charcoal">{title}</h2>
        <p className="text-charcoal-muted mb-8 leading-relaxed text-balance">{message}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button onClick={reset} variant="primary">
            {UI_STRINGS.ERROR.RETRY}
          </Button>
          <Button href={backLink.href} variant="outline">
            {backLink.label}
          </Button>
        </div>
      </div>
    </div>
  );
}
