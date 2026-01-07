'use client';

import ExportedImage from 'next-image-export-optimizer';
import Link from 'next/link';
import { Artwork } from '@/lib/types';
import { memo } from 'react';

interface MasonryGalleryProps {
  artworks: Artwork[];
  forceGrid?: boolean;
}

function MasonryGallery({ artworks, forceGrid }: MasonryGalleryProps) {
  const isDisplayable = (value: string | undefined): value is string => Boolean(value);
  const useCenteredGrid = forceGrid || artworks.length <= 3;

  return (
    <div
      className={
        useCenteredGrid
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 pt-2 justify-items-center'
          : 'columns-1 md:columns-2 lg:columns-3 gap-6 px-4 pt-2'
      }
    >
      {artworks.map((artwork) => {
        const showMaterial = isDisplayable(artwork.material);
        const showSize = isDisplayable(artwork.size);

        return (
          <div
            key={artwork.id}
            id={`artwork-${artwork.id}`}
            className="break-inside-avoid mb-6 inline-block w-full"
          >
            <div className="bg-gray-100 shadow-sm transition-shadow hover:shadow-md group rounded-sm overflow-hidden">
              <Link href={`/artworks/${artwork.id}`} className="block h-full">
                <div className="relative w-full overflow-hidden aspect-[4/5]">
                  <div className="absolute inset-0 shimmer-loading" />
                  <ExportedImage
                    src={`/images/artworks/${artwork.image}`}
                    alt={`${artwork.title} - ${artwork.artist}`}
                    fill
                    className="relative object-cover transform transition-transform duration-300 group-hover:scale-105"
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
                  <p className="text-sm text-charcoal-muted mt-1 min-h-[1.25rem]">
                    {artwork.artist}
                  </p>
                  {(showMaterial || showSize) && (
                    <p className="text-xs text-charcoal-soft mt-2 line-clamp-1 min-h-[1rem]">
                      {showMaterial && artwork.material}
                      {showMaterial && showSize && ' · '}
                      {showSize && artwork.size}
                    </p>
                  )}
                  {artwork.sold && (
                    <p className="text-sm font-semibold text-red-600 mt-1">판매완료</p>
                  )}
                  {artwork.price && artwork.price !== '문의' && (
                    <p
                      className={`text-sm font-semibold mt-1 ${artwork.sold ? 'text-gray-600 line-through' : 'text-primary'}`}
                    >
                      {artwork.price}
                    </p>
                  )}
                </div>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default memo(MasonryGallery);
