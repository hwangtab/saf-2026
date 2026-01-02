'use client';

import Link from 'next/link';
import Image from 'next/image';
import { getAllArtworks, Artwork } from '@/content/saf2026-artworks';
import { useMemo, useCallback } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

interface RelatedArtworksProps {
  /** 현재 작품 ID (제외용, optional) */
  currentArtworkId?: string;
  /** 현재 작가명 (같은 작가 우선 표시용, optional) */
  currentArtist?: string;
}

// 슬라이더 설정
const ITEM_COUNT = 12;

/**
 * 작품 슬라이더 컴포넌트
 * - Embla Carousel 기반 터치/드래그 지원
 * - 자동 스크롤 + 수동 조작 가능
 */
export default function RelatedArtworksSlider({
  currentArtworkId,
  currentArtist,
}: RelatedArtworksProps = {}) {
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: 'start',
      dragFree: true,
      containScroll: false,
    },
    [
      Autoplay({
        delay: 0,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    ]
  );

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const relatedArtworks = useMemo(() => {
    const allArtworks = getAllArtworks();
    const otherArtworks = currentArtworkId
      ? allArtworks.filter((a) => a.id !== currentArtworkId)
      : allArtworks;

    // currentArtist가 있으면 같은 작가 우선
    if (currentArtist) {
      const sameArtistWorks = otherArtworks.filter((a) => a.artist === currentArtist);
      const otherArtistWorks = otherArtworks
        .filter((a) => a.artist !== currentArtist)
        .sort(() => Math.random() - 0.5);
      return [...sameArtistWorks, ...otherArtistWorks].slice(0, ITEM_COUNT);
    }

    // 없으면 전체 랜덤
    return [...otherArtworks].sort(() => Math.random() - 0.5).slice(0, ITEM_COUNT);
  }, [currentArtworkId, currentArtist]);

  if (relatedArtworks.length === 0) return null;

  return (
    <section className="w-full bg-gray-50 py-12 overflow-hidden">
      <div className="container-max mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-charcoal">다른 작품 보기</h2>
          <p className="text-gray-500 mt-1">더 많은 출품작을 감상하고 예술인을 응원하세요</p>
        </div>
        {/* 네비게이션 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={scrollPrev}
            className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors"
            aria-label="이전 작품"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            onClick={scrollNext}
            className="w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-100 transition-colors"
            aria-label="다음 작품"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Embla 슬라이더 */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-4 pl-4 sm:pl-5">
          {relatedArtworks.map((artwork) => (
            <ArtworkCard key={artwork.id} artwork={artwork} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ArtworkCard({ artwork }: { artwork: Artwork }) {
  return (
    <Link
      href={`/artworks/${artwork.id}`}
      className="flex-shrink-0 w-[160px] sm:w-[180px] md:w-[200px] group"
    >
      <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 shadow-sm group-hover:shadow-md transition-shadow">
        <Image
          src={`/images/artworks/${artwork.image}`}
          alt={`${artwork.title} - ${artwork.artist}`}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 640px) 160px, (max-width: 768px) 180px, 200px"
        />
        {artwork.sold && (
          <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-0.5 rounded text-xs font-bold">
            SOLD
          </div>
        )}
      </div>
      <div className="mt-3 px-1">
        <p className="text-sm font-medium text-charcoal truncate group-hover:text-primary transition-colors">
          {artwork.title}
        </p>
        <p className="text-xs text-gray-500 truncate">{artwork.artist}</p>
        <p className="text-sm font-semibold text-charcoal mt-1">{artwork.price}</p>
      </div>
    </Link>
  );
}
