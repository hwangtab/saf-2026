'use client';

import ErrorView from '@/components/common/ErrorView';
import { useTranslations } from 'next-intl';

export default function OurRealityError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('pageErrors.ourReality');

  return (
    <ErrorView
      icon="📊"
      title={t('title')}
      message={t('message')}
      backLink={{ href: '/our-reality', label: t('backLabel') }}
      error={error}
      reset={reset}
    />
  );
}
