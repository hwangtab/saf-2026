'use client';

import { useState, useCallback } from 'react';
import { useLocale } from 'next-intl';
import SafeImage from '@/components/common/SafeImage';
import Button from '@/components/ui/Button';
import dynamic from 'next/dynamic';
import { resolveArtworkImageUrl, resolveArtworkImageUrlForPreset } from '@/lib/utils';
import { parseArtworkSize } from '@/lib/utils/parseArtworkSize';

const NON_WALL_CATEGORIES = ['조각', '도자/공예'];

const ArtworkLightbox = dynamic(() => import('@/components/ui/ArtworkLightbox'), {
  ssr: false,
});

const VirtualGalleryPortal = dynamic(
  () => import('@/components/features/virtual-gallery/VirtualGalleryPortal'),
  { ssr: false }
);

interface ArtworkImageProps {
  images: string[];
  title: string;
  artist: string;
  sold?: boolean;
  reserved?: boolean;
  size?: string;
  category?: string;
}

export default function ArtworkImage({
  images,
  title,
  artist,
  sold,
  reserved,
  size,
  category,
}: ArtworkImageProps) {
  const locale = useLocale();
  const isNonWall = NON_WALL_CATEGORIES.includes(category || '');

  const copy =
    locale === 'en'
      ? {
          zoomImage: 'Zoom image',
          zoomHint: 'Zoom',
          viewInRoom: 'Preview on Wall',
          sold: 'SOLD',
          reserved: 'Reserved',
        }
      : {
          zoomImage: '이미지 확대하기',
          zoomHint: '확대하기',
          viewInRoom: '내 벽에 걸어보기',
          sold: '판매완료',
          reserved: '예약중',
        };

  const [isOpen, setIsOpen] = useState(false);
  const [isRoomOpen, setIsRoomOpen] = useState(false);

  const handlePrefetch = useCallback(() => {
    import('@/components/features/virtual-gallery/VirtualGalleryPortal');
  }, []);
  const canPreview = !isNonWall && !parseArtworkSize(size || '').isDefault;

  const alt = `${title} - ${artist}`;
  const firstImage = images?.[0] || '';
  const src = resolveArtworkImageUrlForPreset(firstImage, 'detail');
  const resolvedImages = (images || []).map((img) => resolveArtworkImageUrl(img));

  return (
    <>
      <button
        type="button"
        className="relative block w-full text-left shadow-sm cursor-zoom-in group overflow-hidden rounded-lg bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y focus-visible:ring-offset-2"
        onClick={() => setIsOpen(true)}
        aria-label={copy.zoomImage}
      >
        <SafeImage
          src={src}
          alt={alt}
          width={1000}
          height={1000}
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="w-full h-auto object-contain max-h-[80vh] transition-transform duration-300 group-hover:scale-[1.02]"
          priority
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
            {copy.zoomHint}
          </div>
        </div>

        {/* Sold / Reserved Badge */}
        {sold && (
          <div className="absolute top-4 right-4 bg-danger-a11y text-white px-4 py-2 rounded-lg font-bold text-lg shadow-lg transform rotate-3 pointer-events-none">
            {copy.sold}
          </div>
        )}
        {reserved && !sold && (
          <div className="absolute top-4 right-4 bg-sun text-white px-4 py-2 rounded-lg font-bold text-lg shadow-lg transform rotate-3 pointer-events-none">
            {copy.reserved}
          </div>
        )}
      </button>

      {/* View in Room Button */}
      {canPreview && (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- prefetch용 hover 트리거; 실제 버튼은 내부 Button 컴포넌트
        <div onMouseEnter={handlePrefetch} className="mt-3">
          <Button
            type="button"
            onClick={() => setIsRoomOpen(true)}
            variant="outline"
            className="w-full"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
              />
            </svg>
            {copy.viewInRoom}
          </Button>
        </div>
      )}

      {isOpen && (
        <ArtworkLightbox
          open={isOpen}
          close={() => setIsOpen(false)}
          images={resolvedImages}
          initialIndex={0}
          alt={alt}
        />
      )}

      {isRoomOpen && (
        <VirtualGalleryPortal
          imageUrl={resolveArtworkImageUrl(firstImage)}
          dimensions={parseArtworkSize(size || '')}
          title={title}
          artist={artist}
          onClose={() => setIsRoomOpen(false)}
          locale={locale}
        />
      )}
    </>
  );
}
