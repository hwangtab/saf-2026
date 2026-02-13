'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ArtworkCardData } from '@/types';
import RelatedArtworksSlider from '@/components/features/RelatedArtworksSlider';

const EXCLUDE_SLIDER_PATHS = ['/', '/artworks'];
const EXCLUDE_SLIDER_PREFIXES = ['/admin', '/dashboard', '/exhibitor', '/onboarding'];
const FOOTER_SLIDER_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedArtworks: ArtworkCardData[] | null = null;
let cachedAt = 0;

export default function FooterSlider() {
  const pathname = usePathname();
  const [artworks, setArtworks] = useState<ArtworkCardData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const showSlider =
    !EXCLUDE_SLIDER_PATHS.includes(pathname) &&
    !EXCLUDE_SLIDER_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  useEffect(() => {
    if (!showSlider) return;

    const now = Date.now();
    if (cachedArtworks && now - cachedAt < FOOTER_SLIDER_CACHE_TTL_MS) {
      setArtworks(cachedArtworks);
      return;
    }

    let cancelled = false;

    const fetchArtworks = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/artworks');
        if (response.ok) {
          const data = await response.json();
          if (cancelled) return;
          cachedArtworks = data;
          cachedAt = Date.now();
          setArtworks(data);
        }
      } catch (error) {
        console.error('Failed to fetch footer slider artworks:', error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchArtworks();

    return () => {
      cancelled = true;
    };
  }, [showSlider]);

  if (!showSlider || artworks.length === 0) return null;

  return (
    <div className={isLoading ? 'animate-pulse opacity-50' : ''}>
      <RelatedArtworksSlider artworks={artworks} />
    </div>
  );
}
