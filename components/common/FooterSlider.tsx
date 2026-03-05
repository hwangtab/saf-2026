'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import RelatedArtworksSlider from '@/components/features/RelatedArtworksSlider';
import { shouldShowFooterSlider } from '@/lib/path-rules';
import type { ArtworkCardData } from '@/types';

const FOOTER_SLIDER_SESSION_CACHE_KEY = 'footer-slider-artworks-cache-v1';
const FOOTER_SLIDER_SESSION_CACHE_TTL_MS = 15 * 1000;

type FooterSliderSessionCache = {
  cachedAt: number;
  artworks: ArtworkCardData[];
};

function loadSessionCache(): FooterSliderSessionCache | null {
  try {
    const raw = sessionStorage.getItem(FOOTER_SLIDER_SESSION_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FooterSliderSessionCache>;
    if (!Array.isArray(parsed.artworks) || typeof parsed.cachedAt !== 'number') {
      return null;
    }
    return {
      cachedAt: parsed.cachedAt,
      artworks: parsed.artworks,
    };
  } catch {
    return null;
  }
}

function saveSessionCache(artworks: ArtworkCardData[]): void {
  try {
    const payload: FooterSliderSessionCache = {
      cachedAt: Date.now(),
      artworks,
    };
    sessionStorage.setItem(FOOTER_SLIDER_SESSION_CACHE_KEY, JSON.stringify(payload));
  } catch {
    return;
  }
}

export default function FooterSlider() {
  const pathname = usePathname();
  const [artworks, setArtworks] = useState<ArtworkCardData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const hasHydratedArtworksRef = useRef(false);

  const showSlider = shouldShowFooterSlider(pathname);

  useEffect(() => {
    if (!showSlider) return;

    const cached = loadSessionCache();
    const now = Date.now();
    if (cached && now - cached.cachedAt < FOOTER_SLIDER_SESSION_CACHE_TTL_MS) {
      setArtworks(cached.artworks);
      if (cached.artworks.length > 0) {
        hasHydratedArtworksRef.current = true;
      }
      return;
    }

    let cancelled = false;

    const fetchArtworks = async () => {
      if (!hasHydratedArtworksRef.current) {
        setIsLoading(true);
      }
      try {
        const response = await fetch('/api/artworks', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          if (cancelled) return;
          setArtworks(data);
          saveSessionCache(data);
          if (Array.isArray(data) && data.length > 0) {
            hasHydratedArtworksRef.current = true;
          }
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
  }, [showSlider, pathname]);

  if (!showSlider || artworks.length === 0) return null;

  return (
    <div className={isLoading ? 'animate-pulse opacity-50' : ''}>
      <RelatedArtworksSlider artworks={artworks} />
    </div>
  );
}
