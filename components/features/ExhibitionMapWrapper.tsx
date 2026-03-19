'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';

const KakaoMap = dynamic(() => import('@/components/features/KakaoMap'), { ssr: false });

interface ExhibitionMapWrapperProps {
  className?: string;
}

export default function ExhibitionMapWrapper({ className }: ExhibitionMapWrapperProps) {
  const t = useTranslations('common');

  return <KakaoMap className={className} loadingFallback={t('loadingMap')} />;
}
