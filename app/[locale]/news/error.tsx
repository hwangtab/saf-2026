'use client';

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

  return (
    <ErrorView
      icon="📰"
      title={t('title')}
      message={t('message')}
      backLink={{ href: '/news', label: t('backLabel') }}
      error={error}
      reset={reset}
    />
  );
}
