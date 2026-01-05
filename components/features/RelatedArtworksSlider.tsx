'use client';

import Link from 'next/link';
import Image from 'next/image';
import { getAllArtworks, Artwork } from '@/content/saf2026-artworks';
import { useState, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import AutoScroll from 'embla-carousel-auto-scroll';

interface RelatedArtworksProps {
  /** 현재 작품 ID (제외용, optional) */
  currentArtworkId?: string;
  /** 현재 작가명 (같은 작가 우선 표시용, optional) */
  currentArtist?: string;
}

// 슬라이더 설정
const ITEM_COUNT = 20;

/**
 * 작품 슬라이더 컴포넌트
 * - Embla Carousel + Auto Scroll 플러그인
 * - 부드러운 연속 스크롤 + 터치/드래그 수동 조작
 * - Hydration Mismatch 방지를 위해 클라이언트 사이드에서만 랜덤 정렬 수행
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

  const [relatedArtworks, setRelatedArtworks] = useState<Artwork[]>([]);

  useEffect(() => {
    const allArtworks = getAllArtworks();
    const otherArtworks = currentArtworkId
      ? allArtworks.filter((a) => a.id !== currentArtworkId)
      : allArtworks;

    let result: Artwork[] = [];

    // currentArtist가 있으면 같은 작가 우선
    if (currentArtist) {
      const sameArtistWorks = otherArtworks.filter((a) => a.artist === currentArtist);
      const otherArtistWorksFiltered = otherArtworks.filter((a) => a.artist !== currentArtist);

      // 랜덤 셔플
      const shuffledOthers = otherArtistWorksFiltered.sort(() => Math.random() - 0.5);

      result = [...sameArtistWorks, ...shuffledOthers].slice(0, ITEM_COUNT);
    } else {
      // 전체 랜덤
      result = [...otherArtworks].sort(() => Math.random() - 0.5).slice(0, ITEM_COUNT);
    }

    setRelatedArtworks(result);
  }, [currentArtworkId, currentArtist]);

  // 클라이언트 렌더링 전에는 아무것도 표시하지 않음 (Hydration Mismatch 방지)
  if (relatedArtworks.length === 0) return null;

  return (
    <section className="w-full bg-gray-50 py-12 overflow-hidden">
      <div className="container-max mb-8">
        <h2 className="text-2xl font-bold text-charcoal">씨앗페 출품작 보기</h2>
        <p className="text-gray-500 mt-1">더 많은 출품작을 감상하고 예술인을 응원하세요</p>
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
