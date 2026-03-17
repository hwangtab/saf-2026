'use client';

import ErrorView from '@/components/common/ErrorView';
import { useTranslations } from 'next-intl';

export default function ArchiveError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('pageErrors.archive');

  return (
    <ErrorView
      icon="📚"
      title={t('title')}
      message={t('message')}
      backLink={{ href: '/archive', label: t('backLabel') }}
      error={error}
      reset={reset}
    />
  );
}
