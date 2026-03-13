'use client';

import dynamic from 'next/dynamic';
import { useLocale } from 'next-intl';

const KakaoMap = dynamic(() => import('@/components/features/KakaoMap'), { ssr: false });

interface ExhibitionMapWrapperProps {
  className?: string;
}

export default function ExhibitionMapWrapper({ className }: ExhibitionMapWrapperProps) {
  const locale = useLocale();

  return (
    <KakaoMap
      className={className}
      loadingFallback={locale === 'en' ? 'Loading map...' : '지도를 불러오는 중...'}
    />
  );
}
