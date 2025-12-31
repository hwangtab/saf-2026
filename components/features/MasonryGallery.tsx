'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Artwork } from '@/content/saf2026-artworks';
import { memo, useEffect, useState, useMemo } from 'react';

interface MasonryGalleryProps {
  artworks: Artwork[];
}

function MasonryGallery({ artworks }: MasonryGalleryProps) {
  const [columns, setColumns] = useState(0); // Default to 0 to indicate unknown
  const [mounted, setMounted] = useState(false);

  // Helper function to check if a value is displayable
  const isDisplayable = (value: string | undefined): value is string =>
    Boolean(value && value !== '확인 중' && value !== '');

  // Determine column count based on window width using matchMedia
  useEffect(() => {
    setMounted(true);

    // Check current width immediately
    const checkWidth = () => {
      if (window.matchMedia('(min-width: 1024px)').matches) {
        setColumns(3);
      } else if (window.matchMedia('(min-width: 768px)').matches) {
        setColumns(2);
      } else {
        setColumns(1);
      }
    };

    checkWidth();

    // Add listeners
    const mediaQueryLg = window.matchMedia('(min-width: 1024px)');
    const mediaQueryMd = window.matchMedia('(min-width: 768px)');

    const handler = () => checkWidth();

    mediaQueryLg.addEventListener('change', handler);
    mediaQueryMd.addEventListener('change', handler);

    return () => {
      mediaQueryLg.removeEventListener('change', handler);
      mediaQueryMd.removeEventListener('change', handler);
    };
  }, []);

  // Distribute artworks into columns
  const columnArtworks = useMemo(() => {
    if (columns === 0) return []; // Should not happen if rendering logic handles 0
    const cols: Artwork[][] = Array.from({ length: columns }, () => []);
    artworks.forEach((artwork, index) => {
      cols[index % columns].push(artwork);
    });
    return cols;
  }, [artworks, columns]);

  // Render CSS Grid Fallback while determining columns (SSR or initial client render)
  // This ensures responsive layout via CSS before JS takes over
  if (!mounted || columns === 0) {
    // Return a simple CSS column layout for SSR/initial render to avoid CLS
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 pt-2">
        {artworks.slice(0, 12).map((artwork) => (
          <ArtworkCard key={artwork.id} artwork={artwork} isDisplayable={isDisplayable} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-6 px-4 pt-2 items-start">
      {columnArtworks.map((col, colIndex) => (
        <div key={colIndex} className="flex-1 flex flex-col gap-6">
          {col.map((artwork) => (
            <ArtworkCard key={artwork.id} artwork={artwork} isDisplayable={isDisplayable} />
          ))}
        </div>
      ))}
    </div>
  );
}

// Extract Card for reuse and cleaner code
const ArtworkCard = ({
  artwork,
  isDisplayable,
}: {
  artwork: Artwork;
  isDisplayable: (val?: string) => val is string;
}) => {
  const showMaterial = isDisplayable(artwork.material);
  const showSize = isDisplayable(artwork.size);

  return (
    <div
      id={`artwork-${artwork.id}`}
      className="w-full bg-gray-100 shadow-sm transition-shadow hover:shadow-md group rounded-sm overflow-hidden"
    >
      <Link href={`/artworks/${artwork.id}`} className="block h-full">
        <div className="relative w-full">
          <Image
            src={`/images/artworks/${artwork.image}`}
            alt={`${artwork.title} - ${artwork.artist}`}
            width={500}
            height={500}
            className="w-full h-auto object-cover transform transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
          {artwork.sold && (
            <div className="absolute top-3 right-3 bg-red-600 text-white px-3 py-1 rounded-md font-bold text-sm shadow-md z-10">
              SOLD
            </div>
          )}
        </div>

        <div className="p-4 bg-white">
          <h3 className="text-lg font-bold text-charcoal font-sans group-hover:text-primary transition-colors duration-300 break-keep">
            {artwork.title}
          </h3>
          <p className="text-sm text-charcoal-muted mt-1">{artwork.artist}</p>
          {(showMaterial || showSize) && (
            <p className="text-xs text-charcoal-soft mt-2 line-clamp-1">
              {showMaterial && artwork.material}
              {showMaterial && showSize && ' · '}
              {showSize && artwork.size}
            </p>
          )}
          {artwork.sold ? (
            <p className="text-sm font-semibold text-red-600 mt-1">판매완료</p>
          ) : (
            artwork.price !== '문의' &&
            artwork.price !== '확인 중' && (
              <p className="text-sm font-semibold text-primary mt-1">{artwork.price}</p>
            )
          )}
        </div>
      </Link>
    </div>
  );
};

export default memo(MasonryGallery);
