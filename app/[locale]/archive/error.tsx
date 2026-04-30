'use client';

import { BookOpen } from 'lucide-react';
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
  const tError = useTranslations('error');

  return (
    <ErrorView
      icon={<BookOpen className="h-16 w-16" />}
      title={t('title')}
      message={t('message')}
      backLink={{ href: '/archive', label: t('backLabel') }}
      retryLabel={tError('retry')}
      homeLabel={tError('goHome')}
      error={error}
      reset={reset}
    />
  );
}
