'use client';

import Link from 'next/link';
import Image from 'next/image';
import { getAllArtworks, Artwork } from '@/content/saf2026-artworks';
import { useMemo, useId } from 'react';

interface RelatedArtworksProps {
  /** 현재 작품 ID (제외용, optional) */
  currentArtworkId?: string;
  /** 현재 작가명 (같은 작가 우선 표시용, optional) */
  currentArtist?: string;
}

// 슬라이더 설정
const CARD_WIDTH = 200; // px
const GAP = 16; // gap-4 = 1rem = 16px
const ITEM_COUNT = 12;

/**
 * 작품 슬라이더 컴포넌트
 * - currentArtist가 있으면 같은 작가 우선 표시
 * - 없으면 랜덤 작품 표시
 * - CSS 기반 무한 자동 스크롤
 */
export default function RelatedArtworksSlider({
  currentArtworkId,
  currentArtist,
}: RelatedArtworksProps = {}) {
  const uniqueId = useId();
  const animationName = `marquee-${uniqueId.replace(/:/g, '')}`;

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

  // 정확한 슬라이드 너비 계산
  const slideWidth = (CARD_WIDTH + GAP) * relatedArtworks.length;
  const animationDuration = `${relatedArtworks.length * 3}s`;

  return (
    <section className="w-full bg-gray-50 py-12 overflow-hidden">
      <div className="container-max mb-8">
        <h2 className="text-2xl font-bold text-charcoal">다른 작품 보기</h2>
        <p className="text-gray-500 mt-1">더 많은 출품작을 감상하고 예술인을 응원하세요</p>
      </div>

      {/* 동적 keyframes 정의 */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes ${animationName} {
              0% { transform: translateX(0); }
              100% { transform: translateX(-${slideWidth}px); }
            }
          `,
        }}
      />

      {/* 슬라이더 트랙 */}
      <div className="relative slider-track">
        <div
          className="flex gap-4"
          style={{
            animationName: animationName,
            animationDuration: animationDuration,
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
          }}
        >
          {/* 첫 번째 세트 */}
          {relatedArtworks.map((artwork, index) => (
            <ArtworkCard key={`first-${artwork.id}-${index}`} artwork={artwork} />
          ))}
          {/* 두 번째 세트 (무한 루프용) */}
          {relatedArtworks.map((artwork, index) => (
            <ArtworkCard key={`second-${artwork.id}-${index}`} artwork={artwork} />
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
      className="flex-shrink-0 group"
      style={{ width: `${CARD_WIDTH}px` }}
    >
      <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 shadow-sm group-hover:shadow-md transition-shadow">
        <Image
          src={`/images/artworks/${artwork.image}`}
          alt={`${artwork.title} - ${artwork.artist}`}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes={`${CARD_WIDTH}px`}
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
