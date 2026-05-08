'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { shouldShowFooterSlider } from '@/lib/path-rules';

// Keep no-SSR slider isolated to avoid Server Component build errors.
const FooterSlider = dynamic(() => import('@/components/common/FooterSlider'), {
  ssr: false,
});

export default function FooterSliderWrapper() {
  // FooterSlider는 ssr:false라 client mount 후 artworks fetch + RelatedArtworksSlider
  // 렌더. 그 시점에 약 460px height 추가되어 Footer SawtoothDivider svg 위치 변동 →
  // CLS 0.05 (stories 등 slider 표시 페이지에서 PSI CrUX 회귀 원인). slider 표시 페이지에서만
  // 미리 min-height 460px placeholder를 잡아 mount 후에도 layout 변동 없음.
  // shouldShowFooterSlider=false 페이지(메인·/artworks·portal 등)에선 null이라 placeholder도 없음.
  const pathname = usePathname();
  if (!shouldShowFooterSlider(pathname)) return null;
  return (
    <div className="min-h-[460px]">
      <FooterSlider />
    </div>
  );
}
