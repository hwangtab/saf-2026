'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocale } from 'next-intl';
import SafeImage from '@/components/common/SafeImage';
import Button from '@/components/ui/Button';
import dynamic from 'next/dynamic';
import {
  resolveArtworkImageUrl,
  resolveArtworkImageUrlForPreset,
  resolveOptimizedArtworkImageUrl,
} from '@/lib/utils';
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

const SWIPE_THRESHOLD = 50;

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
          prevImage: 'Previous image',
          nextImage: 'Next image',
        }
      : {
          zoomImage: '이미지 확대하기',
          zoomHint: '확대하기',
          viewInRoom: '내 벽에 걸어보기',
          sold: '판매완료',
          reserved: '예약중',
          prevImage: '이전 이미지',
          nextImage: '다음 이미지',
        };

  const [isOpen, setIsOpen] = useState(false);
  const [isRoomOpen, setIsRoomOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const safeImages = useMemo(() => (images?.length ? images : ['']), [images]);
  const totalImages = safeImages.length;
  const hasMultiple = totalImages > 1;

  // wrap-around prev/next — 작품 carousel은 무한 순환이 자연스러움
  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + totalImages) % totalImages);
  }, [totalImages]);
  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % totalImages);
  }, [totalImages]);

  // touch swipe — touchstart X 저장 → touchend diff. 임계값 이상이면 prev/next.
  // 동시에 swipe 발생 시 onClick(lightbox 열기) 차단을 위한 ref 플래그.
  const touchStartXRef = useRef<number | null>(null);
  const swipedRef = useRef(false);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
    swipedRef.current = false;
  }, []);
  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const startX = touchStartXRef.current;
      if (startX === null || !hasMultiple) return;
      const endX = e.changedTouches[0]?.clientX ?? startX;
      const diff = endX - startX;
      if (Math.abs(diff) > SWIPE_THRESHOLD) {
        swipedRef.current = true;
        if (diff > 0) goPrev();
        else goNext();
      }
      touchStartXRef.current = null;
    },
    [goPrev, goNext, hasMultiple]
  );

  // keyboard ←/→ — carousel 컨테이너에 focus가 있을 때만 동작 (전역 listener 회피).
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!hasMultiple) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      }
    },
    [goPrev, goNext, hasMultiple]
  );

  // 인접 이미지 prefetch — currentIndex 변경 시 다음 이미지를 미리 fetch해 swap 매끄럽게.
  useEffect(() => {
    if (!hasMultiple) return;
    const nextIdx = (currentIndex + 1) % totalImages;
    const nextSrc = resolveArtworkImageUrlForPreset(safeImages[nextIdx] || '', 'detail');
    if (!nextSrc) return;
    const img = new Image();
    img.src = nextSrc;
  }, [currentIndex, hasMultiple, safeImages, totalImages]);

  const handlePrefetch = useCallback(() => {
    import('@/components/features/virtual-gallery/VirtualGalleryPortal');
  }, []);
  const canPreview = !isNonWall && !parseArtworkSize(size || '').isDefault;

  const alt = `${title} - ${artist}`;
  const currentImage = safeImages[currentIndex] || '';
  const src = resolveArtworkImageUrlForPreset(currentImage, 'detail');
  const mobileSrc = resolveArtworkImageUrlForPreset(currentImage, 'slider');
  // DPR 2x (Retina) 대응 — detail(1600w)을 1x, hero(1920w)를 2x
  const desktop1x = src;
  const desktop2x = resolveOptimizedArtworkImageUrl(currentImage, { width: 1920, quality: 80 });
  const isRemoteImage = src.startsWith('http');
  const resolvedImages = safeImages.map((img) => resolveArtworkImageUrl(img));
  // LCP 보존: 첫 번째 이미지(index=0)만 priority/eager — 다른 인덱스는 lazy로
  const isLcpImage = currentIndex === 0;

  const openLightbox = () => {
    // swipe로 인덱스 변경한 직후 touchend 끝에 발생하는 ghost click 차단
    if (swipedRef.current) {
      swipedRef.current = false;
      return;
    }
    setIsOpen(true);
  };

  return (
    <>
      <div className="relative w-full">
        <button
          type="button"
          className="group relative block w-full aspect-[4/5] text-left shadow-sm cursor-zoom-in overflow-hidden rounded-lg bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y focus-visible:ring-offset-2"
          onClick={openLightbox}
          onKeyDown={handleKeyDown}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          aria-label={copy.zoomImage}
        >
          {isRemoteImage ? (
            // LCP 최적화: 첫 이미지만 eager+high. carousel 이동 시 src 교체로 layout shift 0.
            // SafeImage 대신 raw <picture>+<img>를 쓰는 이유: <source media srcset>로 모바일/데스크톱
            // 별도 URL을 제공해 LCP critical path에서 viewport별 최적 이미지를 즉시 받기 위함.
            // SafeImage(next/image)는 모바일/데스크톱 srcset이 동일 base URL의 size 변형이라 같은
            // 효과를 낼 수 없음. URL은 이미 resolveArtworkImageUrlForPreset로 Supabase render →
            // Vercel optimize 호환 형태로 변환된 상태라 SafeImage의 toRawSupabaseUrl 변환도 불필요.
            <picture key={currentIndex}>
              <source media="(min-width: 768px)" srcSet={`${desktop1x} 1x, ${desktop2x} 2x`} />
              {}
              {}
              <img
                src={mobileSrc}
                alt={alt}
                width={1600}
                height={2000}
                loading={isLcpImage ? 'eager' : 'lazy'}
                fetchPriority={isLcpImage ? 'high' : 'auto'}
                decoding={isLcpImage ? 'sync' : 'async'}
                className="absolute inset-0 h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </picture>
          ) : (
            <SafeImage
              key={currentIndex}
              src={src}
              alt={alt}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-contain transition-transform duration-300 group-hover:scale-[1.02]"
              priority={isLcpImage}
            />
          )}

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
        </button>

        {/* Sold / Reserved Badge — button 바깥(형제)으로 분리. nested button 회피 + pointer-events-none */}
        {sold && (
          <div className="absolute top-4 right-4 z-10 bg-danger-a11y text-white px-4 py-2 rounded-lg font-bold text-lg shadow-lg transform rotate-3 pointer-events-none">
            {copy.sold}
          </div>
        )}
        {reserved && !sold && (
          <div className="absolute top-4 right-4 z-10 bg-charcoal-deep text-white px-4 py-2 rounded-lg font-bold text-lg shadow-lg transform rotate-3 pointer-events-none">
            {copy.reserved}
          </div>
        )}

        {/* Carousel 컨트롤 — 이미지 2장 이상일 때만 노출 */}
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              aria-label={copy.prevImage}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-charcoal-deep shadow-md backdrop-blur-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y focus-visible:ring-offset-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              aria-label={copy.nextImage}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/85 text-charcoal-deep shadow-md backdrop-blur-sm transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y focus-visible:ring-offset-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>

            {/* 인덱스 카운터 — 우하단, 갤러리 톤(charcoal-deep 반투명) */}
            <div
              aria-live="polite"
              className="absolute bottom-3 right-3 z-20 rounded-full bg-charcoal-deep/75 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm"
            >
              {currentIndex + 1} / {totalImages}
            </div>
          </>
        )}
      </div>

      {/* View in Room Button */}
      {canPreview && (
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- prefetch용 hover 트리거; 실제 버튼은 내부 Button 컴포넌트
        <div onMouseEnter={handlePrefetch} className="mt-3">
          <Button
            type="button"
            onClick={() => setIsRoomOpen(true)}
            variant="outline"
            className="w-full"
            leadingIcon={
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
            }
          >
            {copy.viewInRoom}
          </Button>
        </div>
      )}

      {isOpen && (
        <ArtworkLightbox
          open={isOpen}
          close={() => setIsOpen(false)}
          images={resolvedImages}
          initialIndex={currentIndex}
          alt={alt}
        />
      )}

      {isRoomOpen && (
        <VirtualGalleryPortal
          imageUrl={resolveArtworkImageUrl(safeImages[0] || '')}
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
