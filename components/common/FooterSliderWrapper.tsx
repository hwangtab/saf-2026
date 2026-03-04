'use client';

import dynamic from 'next/dynamic';

// Keep no-SSR slider isolated to avoid Server Component build errors.
const FooterSlider = dynamic(() => import('@/components/common/FooterSlider'), {
  ssr: false,
});

export default function FooterSliderWrapper() {
  return <FooterSlider />;
}
