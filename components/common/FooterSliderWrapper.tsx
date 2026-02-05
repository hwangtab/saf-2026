'use client';

import { usePathname } from 'next/navigation';
import type { ArtworkCardData } from '@/types';
import RelatedArtworksSlider from '@/components/features/RelatedArtworksSlider';

// 슬라이더 제외 경로 (정확히 일치하는 경로만)
const EXCLUDE_SLIDER_PATHS = ['/', '/artworks'];

interface FooterSliderWrapperProps {
  artworks: ArtworkCardData[];
}

export default function FooterSliderWrapper({ artworks }: FooterSliderWrapperProps) {
  const pathname = usePathname();
  // /artworks 목록 페이지만 제외, /artworks/[id] 상세 페이지는 표시
  const showSlider = !EXCLUDE_SLIDER_PATHS.includes(pathname);

  if (!showSlider) return null;

  return <RelatedArtworksSlider artworks={artworks} />;
}
