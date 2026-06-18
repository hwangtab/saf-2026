'use client';

import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { shouldShowFooterSlider } from '@/lib/path-rules';

// Keep no-SSR slider isolated to avoid Server Component build errors.
const FooterSlider = dynamic(() => import('@/components/common/FooterSlider'), {
  ssr: false,
  loading: () => null,
});

export default function FooterSliderWrapper() {
  // FooterSlider는 ssr:false라 client mount 후 artworks fetch + RelatedArtworksSlider 렌더.
  // fetch 로딩 중 placeholder는 FooterSlider 쪽에서만 잡고,
  // 동적 import 지연·실패·0건이면 빈 460px 하단 여백을 남기지 않는다.
  const pathname = usePathname();
  if (!shouldShowFooterSlider(pathname)) return null;
  return <FooterSlider />;
}
