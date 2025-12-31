'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Artwork } from '@/content/saf2026-artworks';
import { useMemo, memo } from 'react';

interface MasonryGalleryProps {
  artworks: Artwork[];
  showArtistNav?: boolean;
}

function MasonryGallery({ artworks, showArtistNav = true }: MasonryGalleryProps) {
  // Only compute artist navigation data when needed (showArtistNav=true)
  const uniqueArtists = useMemo(() => {
    if (!showArtistNav) return [];
    const seen = new Set<string>();
    return artworks
      .filter((a) => {
        if (seen.has(a.artist)) return false;
        seen.add(a.artist);
        return true;
      })
      .map((a) => a.artist);
  }, [artworks, showArtistNav]);

  // Track which artists appear first (for anchor) - only when showArtistNav=true
  const firstArtworkByArtist = useMemo(() => {
    if (!showArtistNav) return new Map<string, string>();
    const map = new Map<string, string>();
    artworks.forEach((a) => {
      if (!map.has(a.artist)) {
        map.set(a.artist, a.id);
      }
    });
    return map;
  }, [artworks, showArtistNav]);

  const scrollToArtist = (artist: string) => {
    const artworkId = firstArtworkByArtist.get(artist);
    if (artworkId) {
      const element = document.getElementById(`artwork-${artworkId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <div>
      {/* Artist Navigation - only shown when sorted by artist */}
      {showArtistNav && (
        <div className="sticky top-[calc(4rem+env(safe-area-inset-top,0px))] z-30 bg-gray-50/95 backdrop-blur-sm py-4 mb-8 border-b border-gray-200">
          <div className="flex flex-wrap gap-2 px-4 justify-center">
            {uniqueArtists.map((artist) => (
              <button
                key={artist}
                onClick={() => scrollToArtist(artist)}
                className="px-3 py-2 min-h-[44px] text-sm font-medium bg-white border border-gray-200 rounded-full hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 text-center truncate flex items-center justify-center"
                aria-label={`${artist} 작가 작품으로 이동`}
              >
                {artist}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Gallery using CSS Columns */}
      <div className="columns-1 md:columns-2 lg:columns-3 gap-6 px-4">
        {artworks.map((artwork) => (
          <div
            key={artwork.id}
            id={`artwork-${artwork.id}`}
            className="break-inside-avoid mb-6 animate-fade-in-up"
          >
            <Link href={`/artworks/${artwork.id}`} className="group block h-full">
              <div className="relative bg-gray-100 shadow-sm transition-shadow hover:shadow-md">
                <div className="relative w-full">
                  <Image
                    src={`/images/artworks/${artwork.image}`}
                    alt={`${artwork.title} - ${artwork.artist}`}
                    width={500}
                    height={500}
                    className="w-full h-auto object-cover transform transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                  {/* SOLD 배지 */}
                  {artwork.sold && (
                    <div className="absolute top-3 right-3 bg-red-600 text-white px-3 py-1 rounded-md font-bold text-sm shadow-md">
                      SOLD
                    </div>
                  )}
                </div>

                <div className="p-4 bg-white">
                  <h3 className="text-lg font-bold text-charcoal font-sans group-hover:text-primary transition-colors">
                    {artwork.title}
                  </h3>
                  <p className="text-sm text-charcoal-muted mt-1">{artwork.artist}</p>
                  {/* 재료 및 크기 표시 (정보가 있을 때만) */}
                  {(artwork.material || artwork.size) &&
                    (artwork.material !== '확인 중' || artwork.size !== '확인 중') &&
                    (artwork.material !== '' || artwork.size !== '') && (
                      <p className="text-xs text-charcoal-soft mt-2">
                        {artwork.material && artwork.material !== '확인 중' && artwork.material}
                        {artwork.material &&
                          artwork.material !== '확인 중' &&
                          artwork.size &&
                          artwork.size !== '확인 중' &&
                          ' · '}
                        {artwork.size && artwork.size !== '확인 중' && artwork.size}
                      </p>
                    )}
                  {/* 판매완료 또는 가격 표시 */}
                  {artwork.sold ? (
                    <p className="text-sm font-semibold text-red-600 mt-1">판매완료</p>
                  ) : (
                    artwork.price !== '문의' &&
                    artwork.price !== '확인 중' && (
                      <p className="text-sm font-semibold text-primary mt-1">{artwork.price}</p>
                    )
                  )}
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(MasonryGallery);
