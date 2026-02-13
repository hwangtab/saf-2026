'use client';

import { useState } from 'react';
import SafeImage from '@/components/common/SafeImage';
import ArtworkLightbox from '@/components/ui/ArtworkLightbox';
import { resolveArtworkImageUrl, resolveArtworkImageUrlForPreset } from '@/lib/utils';

interface ArtworkImageProps {
  images: string[];
  title: string;
  artist: string;
  sold?: boolean;
}

export default function ArtworkImage({ images, title, artist, sold }: ArtworkImageProps) {
  const [isOpen, setIsOpen] = useState(false);
  const alt = `${title} - ${artist}`;
  const firstImage = images?.[0] || '';
  const src = resolveArtworkImageUrlForPreset(firstImage, 'detail');
  const resolvedImages = (images || []).map((img) => resolveArtworkImageUrl(img));

  return (
    <>
      <div
        className="relative shadow-sm cursor-zoom-in group overflow-hidden rounded-lg bg-gray-50"
        onClick={() => setIsOpen(true)}
        role="button"
        aria-label="이미지 확대하기"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setIsOpen(true);
          }
        }}
      >
        <SafeImage
          src={src}
          alt={alt}
          width={1000}
          height={1000}
          className="w-full h-auto object-contain max-h-[80vh] transition-transform duration-300 group-hover:scale-[1.02]"
          loading="eager"
        />

        {/* Zoom Hint Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/10 pointer-events-none">
          <div className="bg-black/50 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-sm shadow-lg flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-transform">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
              />
            </svg>
            확대하기
          </div>
        </div>

        {/* SOLD Badge */}
        {sold && (
          <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-lg shadow-lg transform rotate-3 pointer-events-none">
            SOLD
          </div>
        )}
      </div>

      <ArtworkLightbox
        open={isOpen}
        close={() => setIsOpen(false)}
        images={resolvedImages}
        initialIndex={0}
        alt={alt}
      />
    </>
  );
}
