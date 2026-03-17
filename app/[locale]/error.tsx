'use client';

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

  return (
    <ErrorView
      icon="🏠"
      title={t('title')}
      message={t('message')}
      backLink={{ href: '/', label: t('backLabel') }}
      error={error}
      reset={reset}
    />
  );
}
