'use client';

import { Home } from 'lucide-react';
import ErrorView from '@/components/common/ErrorView';
import { useTranslations } from 'next-intl';

export default function HomeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('pageErrors.home');
  const tError = useTranslations('error');

  return (
    <ErrorView
      icon={<Home className="h-16 w-16" />}
      title={t('title')}
      message={t('message')}
      backLink={{ href: '/', label: t('backLabel') }}
      retryLabel={tError('retry')}
      homeLabel={tError('goHome')}
      error={error}
      reset={reset}
    />
  );
}
