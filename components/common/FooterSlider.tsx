'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ArtworkCardData } from '@/types';
import RelatedArtworksSlider from '@/components/features/RelatedArtworksSlider';

// 슬라이더 제외 경로 (정확히 일치하는 경로만) - 홈(/)과 작품 목록(/artworks)에서는 표시하지 않음
const EXCLUDE_SLIDER_PATHS = ['/', '/artworks'];

export default function FooterSlider() {
  const pathname = usePathname();
  const [artworks, setArtworks] = useState<ArtworkCardData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // /artworks 목록 페이지만 제외, /artworks/[id] 상세 페이지는 표시
  const showSlider = !EXCLUDE_SLIDER_PATHS.includes(pathname);

  useEffect(() => {
    if (!showSlider) return;

    const fetchArtworks = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/artworks');
        if (response.ok) {
          const data = await response.json();
          setArtworks(data);
        }
      } catch (error) {
        console.error('Failed to fetch footer slider artworks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArtworks();
  }, [showSlider]);

  if (!showSlider || artworks.length === 0) return null;

  return (
    <div className={isLoading ? 'animate-pulse opacity-50' : ''}>
      <RelatedArtworksSlider artworks={artworks} />
    </div>
  );
}
