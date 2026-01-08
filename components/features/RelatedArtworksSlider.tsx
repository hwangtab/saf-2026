'use client';

import { getAllArtworks } from '@/content/saf2026-artworks';
import { Artwork } from '@/types';
import { useMemo } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import AutoScroll from 'embla-carousel-auto-scroll';
import ArtworkCard from '@/components/ui/ArtworkCard';
import SawtoothDivider from '@/components/ui/SawtoothDivider';

interface RelatedArtworksProps {
  /** 현재 작품 ID (제외용, optional) */
  currentArtworkId?: string;
  /** 현재 작가명 (같은 작가 우선 표시용, optional) */
  currentArtist?: string;
}

// 슬라이더 설정
const ITEM_COUNT = 20;

/**
 * Seeded random number generator for deterministic shuffling.
 * Uses a simple mulberry32 algorithm.
 */
function seededRandom(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Shuffle array with a seeded random number generator.
 */
function shuffleWithSeed<T>(array: T[], seed: number): T[] {
  const result = [...array];
  const random = seededRandom(seed);
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 작품 슬라이더 컴포넌트
 * - Embla Carousel + Auto Scroll 플러그인
 * - 부드러운 연속 스크롤 + 터치/드래그 수동 조작
 * - 시드 기반 결정론적 셔플로 Hydration Mismatch 방지
 */
export default function RelatedArtworksSlider({
  currentArtworkId,
  currentArtist,
}: RelatedArtworksProps = {}) {
  const [emblaRef] = useEmblaCarousel(
    {
      loop: true,
      align: 'start',
      dragFree: true,
    },
    [
      AutoScroll({
        speed: 1,
        startDelay: 0,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    ]
  );

  // Create a deterministic seed from currentArtworkId
  const seed = useMemo(() => {
    if (!currentArtworkId) return 42; // default seed
    let hash = 0;
    for (let i = 0; i < currentArtworkId.length; i++) {
      const char = currentArtworkId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }, [currentArtworkId]);

  const relatedArtworks = useMemo(() => {
    const allArtworks = getAllArtworks();
    const otherArtworks = currentArtworkId
      ? allArtworks.filter((a) => a.id !== currentArtworkId)
      : allArtworks;

    let result: Artwork[] = [];

    if (currentArtist) {
      const sameArtistWorks = otherArtworks.filter((a) => a.artist === currentArtist);
      const otherArtistWorksFiltered = otherArtworks.filter((a) => a.artist !== currentArtist);

      // Deterministic shuffle using seed
      const shuffledOthers = shuffleWithSeed(otherArtistWorksFiltered, seed);

      result = [...sameArtistWorks, ...shuffledOthers].slice(0, ITEM_COUNT);
    } else {
      // Deterministic shuffle using seed
      result = shuffleWithSeed(otherArtworks, seed).slice(0, ITEM_COUNT);
    }

    return result;
  }, [currentArtworkId, currentArtist, seed]);

  // ... (existing imports)

  if (relatedArtworks.length === 0) return null;

  return (
    <section className="w-full bg-gray-50 py-12 relative">
      <SawtoothDivider position="top" colorClass="text-gray-50" />
      <div className="container-max mb-8">
        <h2 className="text-2xl font-bold text-charcoal">씨앗페 출품작 보기</h2>
        <p className="text-gray-500 mt-1">더 많은 출품작을 감상하고 예술인을 응원하세요</p>
      </div>

      {/* Embla 슬라이더 */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4 pl-4 sm:pl-5">
          {relatedArtworks.map((artwork) => (
            <ArtworkCard key={artwork.id} artwork={artwork} variant="slider" />
          ))}
        </div>
      </div>
    </section>
  );
}
