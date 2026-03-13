'use client';

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

  return (
    <ErrorView
      icon="😔"
      title={t('title')}
      message={t('message')}
      backLink={{ href: '/artworks', label: t('backLabel') }}
      error={error}
      reset={reset}
    />
  );
}
