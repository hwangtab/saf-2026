'use client';

import Link from 'next/link';
import Image from 'next/image';
import { getAllArtworks, Artwork } from '@/content/saf2026-artworks';
import { useMemo } from 'react';

interface RelatedArtworksProps {
  currentArtworkId: string;
  currentArtist: string;
}

/**
 * 다른 작품 슬라이더 컴포넌트
 * - 같은 작가의 다른 작품 우선 표시
 * - 나머지는 랜덤 작품으로 채움
 * - CSS 기반 무한 자동 스크롤
 */
export default function RelatedArtworksSlider({
  currentArtworkId,
  currentArtist,
}: RelatedArtworksProps) {
  const relatedArtworks = useMemo(() => {
    const allArtworks = getAllArtworks();
    const otherArtworks = allArtworks.filter((a) => a.id !== currentArtworkId);

    // 1. 같은 작가의 다른 작품
    const sameArtistWorks = otherArtworks.filter((a) => a.artist === currentArtist);

    // 2. 다른 작가 작품 (랜덤 셔플)
    const otherArtistWorks = otherArtworks
      .filter((a) => a.artist !== currentArtist)
      .sort(() => Math.random() - 0.5);

    // 3. 같은 작가 우선, 총 12개 이상 확보 (무한 스크롤용)
    const combined = [...sameArtistWorks, ...otherArtistWorks].slice(0, 12);

    // 무한 스크롤을 위해 배열을 두 번 반복
    return [...combined, ...combined];
  }, [currentArtworkId, currentArtist]);

  if (relatedArtworks.length === 0) return null;

  return (
    <section className="w-full bg-gray-50 pt-16 pb-12 overflow-hidden">
      <div className="container-max mb-8">
        <h2 className="text-2xl font-bold text-charcoal">다른 작품 보기</h2>
        <p className="text-gray-500 mt-1">더 많은 출품작을 감상하고 예술인을 응원하세요</p>
      </div>

      {/* 슬라이더 트랙 */}
      <div className="relative">
        <div className="flex gap-4 animate-scroll hover:pause-animation">
          {relatedArtworks.map((artwork, index) => (
            <ArtworkCard key={`${artwork.id}-${index}`} artwork={artwork} />
          ))}
        </div>
      </div>

      {/* 좌우 그라데이션 페이드 */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-gray-50 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-gray-50 to-transparent" />
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
