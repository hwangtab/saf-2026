'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';

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
  backLink = { href: '/', label: '홈으로 돌아가기' },
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
            다시 시도하기
          </Button>
          <Link href={backLink.href}>
            <Button variant="outline">{backLink.label}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
