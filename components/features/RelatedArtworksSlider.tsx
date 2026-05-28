'use client';

import type { ArtworkCardData } from '@/types';
import { useEffect, useMemo, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import AutoScroll from 'embla-carousel-auto-scroll';
import { useTranslations } from 'next-intl';
import ArtworkCard from '@/components/ui/ArtworkCard';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';

interface RelatedArtworksProps {
  artworks?: ArtworkCardData[];
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
  artworks = [],
  currentArtworkId,
  currentArtist,
}: RelatedArtworksProps = {}) {
  const t = useTranslations('relatedArtworksSlider');
  const copy = {
    title: t('title'),
    description: t('description'),
    play: t('play'),
    pause: t('pause'),
    playAria: t('playAria'),
    pauseAria: t('pauseAria'),
  };

  const [isPaused, setIsPaused] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: 'start',
      dragFree: true,
    },
    [
      AutoScroll({
        // speed를 낮추면 프레임당 이동 거리가 줄어 compositor 부담 감소 + 시각적으로 더 부드러움
        speed: 0.8,
        startDelay: 0,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    ]
  );

  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (!emblaApi) return;

    const plugins = emblaApi.plugins();
    if (!('autoScroll' in plugins)) return;

    const autoScroll = plugins.autoScroll;
    // WCAG 2.2.2: prefers-reduced-motion 사용자에게는 auto-scroll 자체를 시작하지 않음.
    // 사용자가 Play 버튼을 명시적으로 누르더라도 isPaused 상태에서 보존.
    if (isPaused || prefersReducedMotion) {
      autoScroll.stop();
      return;
    }
    autoScroll.play();
  }, [emblaApi, isPaused, prefersReducedMotion]);

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
    const otherArtworks = currentArtworkId
      ? artworks.filter((a) => a.id !== currentArtworkId)
      : artworks;

    let result: ArtworkCardData[] = [];

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
  }, [artworks, currentArtworkId, currentArtist, seed]);

  // ... (existing imports)

  if (relatedArtworks.length === 0) return null;

  return (
    // Gallery White Cube: 작품 ↔ 관련 작품 사이는 hairline divider가 도록 톤에 어울림.
    // 톱니는 Footer/Hero 같은 큰 챕터 경계 전용.
    <section className="w-full bg-gray-50 py-12 pb-20 relative border-t border-gray-200">
      <div className="container-max mb-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-charcoal">{copy.title}</h2>
            <p className="text-charcoal-soft mt-1">{copy.description}</p>
          </div>
          <div className="self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setIsPaused((prev) => !prev)}
              className="rounded-md border border-charcoal/20 bg-white px-3 py-1.5 text-xs font-medium text-charcoal hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-pressed={isPaused}
              aria-label={isPaused ? copy.playAria : copy.pauseAria}
            >
              {isPaused ? copy.play : copy.pause}
            </button>
          </div>
        </div>
      </div>

      {/* Embla 슬라이더 — will-change-transform으로 트랙을 GPU 합성 레이어로 명시 승격 */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4 pl-4 sm:pl-5 will-change-transform">
          {relatedArtworks.map((artwork) => (
            <ArtworkCard key={artwork.id} artwork={artwork} variant="slider" />
          ))}
        </div>
      </div>
    </section>
  );
}
