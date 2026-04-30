'use client';

import { Newspaper } from 'lucide-react';
import ErrorView from '@/components/common/ErrorView';
import { useTranslations } from 'next-intl';

export default function NewsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('pageErrors.news');
  const tError = useTranslations('error');

  return (
    <ErrorView
      icon={<Newspaper className="h-16 w-16" />}
      title={t('title')}
      message={t('message')}
      backLink={{ href: '/news', label: t('backLabel') }}
      retryLabel={tError('retry')}
      homeLabel={tError('goHome')}
      error={error}
      reset={reset}
    />
  );
}
