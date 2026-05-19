'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

const KakaoMap = dynamic(() => import('@/components/features/KakaoMap'), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-[400px] w-full items-center justify-center rounded-lg bg-canvas text-sm text-charcoal-soft"
      role="status"
      aria-busy="true"
    />
  ),
});

interface ExhibitionMapWrapperProps {
  className?: string;
}

export default function ExhibitionMapWrapper({ className }: ExhibitionMapWrapperProps) {
  const t = useTranslations('common');

  return <KakaoMap className={className} loadingFallback={t('loadingMap')} />;
}
