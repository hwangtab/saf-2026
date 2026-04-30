'use client';

import { BarChart3 } from 'lucide-react';
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
  const tError = useTranslations('error');

  return (
    <ErrorView
      icon={<BarChart3 className="h-16 w-16" />}
      title={t('title')}
      message={t('message')}
      backLink={{ href: '/our-reality', label: t('backLabel') }}
      retryLabel={tError('retry')}
      homeLabel={tError('goHome')}
      error={error}
      reset={reset}
    />
  );
}
