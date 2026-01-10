'use client';

import dynamic from 'next/dynamic';

const KakaoMap = dynamic(() => import('@/components/features/KakaoMap'), {
  ssr: false,
  loading: () => (
    <div className="min-h-[400px] animate-pulse bg-gray-100 rounded-lg flex items-center justify-center">
      <p className="text-charcoal-muted">지도를 불러오는 중...</p>
    </div>
  ),
});

interface ExhibitionMapWrapperProps {
  className?: string;
}

export default function ExhibitionMapWrapper({ className }: ExhibitionMapWrapperProps) {
  return <KakaoMap className={className} />;
}
