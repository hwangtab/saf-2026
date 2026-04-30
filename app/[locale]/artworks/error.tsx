'use client';

import { Frown } from 'lucide-react';
import ErrorView from '@/components/common/ErrorView';
import { useTranslations } from 'next-intl';

export default function ArtworksError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('pageErrors.artworks');
  const tError = useTranslations('error');

  return (
    <ErrorView
      icon={<Frown className="h-16 w-16" />}
      title={t('title')}
      message={t('message')}
      backLink={{ href: '/artworks', label: t('backLabel') }}
      retryLabel={tError('retry')}
      homeLabel={tError('goHome')}
      error={error}
      reset={reset}
    />
  );
}
