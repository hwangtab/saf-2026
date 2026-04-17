'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { resolveArtworkImageUrlForPreset } from '@/lib/utils';
import SafeImage from '@/components/common/SafeImage';
import type { UploadBucket, ImageUploadCopy } from './types';

const ArtworkLightbox = dynamic(() => import('@/components/ui/ArtworkLightbox'), { ssr: false });

type ImagePreviewProps = {
  bucket: UploadBucket;
  urls: string[];
  copy: ImageUploadCopy;
  onRemove: (index: number) => void;
};

export function ImagePreview({ bucket, urls, copy, onRemove }: ImagePreviewProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxData, setLightboxData] = useState<{
    images: string[];
    initialIndex: number;
    alt: string;
  } | null>(null);

  const handleImageClick = (index: number) => {
    setLightboxData({
      images: urls,
      initialIndex: index,
      alt: copy.imageAlt(index + 1),
    });
    setLightboxOpen(true);
  };

  return (
    <>
      {urls.map((url, index) => {
        const previewSrc =
          bucket === 'artworks' ? resolveArtworkImageUrlForPreset(url, 'slider') : url;
        return (
          <div
            key={index}
            className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200 group"
          >
            <div
              className="absolute inset-0 cursor-zoom-in z-0"
              onClick={() => handleImageClick(index)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleImageClick(index);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={copy.zoomImage}
            >
              <SafeImage
                src={previewSrc}
                alt={copy.previewAlt}
                fill
                className="object-cover"
                sizes="128px"
              />
            </div>
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="absolute top-1 right-1 bg-danger text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        );
      })}

      {lightboxData && (
        <ArtworkLightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          images={lightboxData.images}
          initialIndex={lightboxData.initialIndex}
          alt={lightboxData.alt}
        />
      )}
    </>
  );
}
