'use client';

import { memo } from 'react';
import Link from 'next/link';
import ExportedImage from 'next-image-export-optimizer';
import { Artwork } from '@/types';
import { cn } from '@/lib/utils';

type ArtworkCardVariant = 'gallery' | 'slider';

interface ArtworkCardProps {
  artwork: Artwork;
  variant?: ArtworkCardVariant;
  className?: string;
}

/**
 * Shared artwork card component with two variants:
 * - gallery: Full card for MasonryGallery with material/size info
 * - slider: Compact card for RelatedArtworksSlider
 */
function ArtworkCard({ artwork, variant = 'gallery', className }: ArtworkCardProps) {
  const isDisplayable = (value: string | undefined): value is string => Boolean(value);
  const showMaterial = isDisplayable(artwork.material);
  const showSize = isDisplayable(artwork.size);

  if (variant === 'slider') {
    return (
      <Link
        href={`/artworks/${artwork.id}`}
        className={cn('flex-shrink-0 w-[160px] sm:w-[180px] md:w-[200px] group', className)}
      >
        <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-100 shadow-sm group-hover:shadow-md transition-shadow">
          <ExportedImage
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

  // Gallery variant (default)
  return (
    <div className="bg-gray-100 shadow-sm transition-shadow hover:shadow-md group rounded-sm overflow-hidden">
      <Link href={`/artworks/${artwork.id}`} className="block h-full">
        <div className="relative w-full overflow-hidden aspect-[4/5]">
          <div className="absolute inset-0 shimmer-loading" />
          <ExportedImage
            src={`/images/artworks/${artwork.image}`}
            alt={`${artwork.title} - ${artwork.artist}`}
            loading="lazy"
            fill
            className="object-cover transform transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) calc(100vw - 2rem), (max-width: 1024px) calc(50vw - 1.5rem), calc(33vw - 1rem)"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 pointer-events-none" />
          {artwork.sold && (
            <div className="absolute top-3 right-3 bg-red-600 text-white px-3 py-1 rounded-md font-bold text-sm shadow-md">
              SOLD
            </div>
          )}
        </div>

        <div className="p-4 bg-white">
          <h2 className="text-lg font-bold text-charcoal font-sans group-hover:text-primary transition-colors duration-300 break-keep line-clamp-2 min-h-[3.5rem]">
            {artwork.title}
          </h2>
          <p className="text-sm text-charcoal-muted mt-1 min-h-[1.25rem]">{artwork.artist}</p>
          <p className="text-xs text-charcoal-soft mt-2 line-clamp-1 min-h-[1rem]">
            {showMaterial || showSize ? (
              <>
                {showMaterial && artwork.material}
                {showMaterial && showSize && ' · '}
                {showSize && artwork.size}
              </>
            ) : (
              '\u00A0'
            )}
          </p>

          {artwork.price && artwork.price !== '문의' ? (
            <p
              className={`text-sm font-semibold mt-1 ${artwork.sold ? 'text-gray-600 line-through' : 'text-primary'}`}
            >
              {artwork.price}
            </p>
          ) : (
            <p className="text-sm font-semibold mt-1 min-h-[1.25rem]">{'\u00A0'}</p>
          )}
        </div>
      </Link>
    </div>
  );
}

export default memo(ArtworkCard);
