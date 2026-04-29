'use client';

import { memo, useState, useEffect, useRef } from 'react';
import { ArtworkListItem } from '@/types';
import ArtworkCard from '@/components/ui/ArtworkCard';

// 초기 SSR HTML 페이로드 절감용 — 카드당 ~20KB 마크업 × 12 = 240KB 절약.
// 모바일 첫 화면(1열·6점)·데스크톱(3열·4행=12점) 모두 충분히 채움.
// IntersectionObserver(rootMargin=400px)가 스크롤 임박 즉시 다음 12점 로드해 UX 지연 최소화.
const INITIAL_BATCH = 12;
// 추가 로드 단위 — 사용자가 스크롤 시 한 번에 더 많이 가져와 IO 호출 빈도 감소.
const ADDITIONAL_BATCH = 24;

interface MasonryGalleryProps {
  artworks: ArtworkListItem[];
}

function MasonryGallery({ artworks }: MasonryGalleryProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_BATCH);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);

  // Fix #1: Use stable primitives to detect real filter/sort changes,
  // not the artworks array reference (which can change on URL sync)
  const artworksKey = artworks.length > 0 ? artworks[0].id : '';
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: reset visible count when filter/sort changes
    setVisibleCount(INITIAL_BATCH);
  }, [artworksKey, artworks.length]);

  // Fix #5: Guard against cascade loading — use a ref to prevent
  // re-firing before the new batch has rendered and pushed the sentinel down
  useEffect(() => {
    isLoadingRef.current = false;
  }, [visibleCount]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || visibleCount >= artworks.length) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isLoadingRef.current) {
          isLoadingRef.current = true;
          setVisibleCount((prev) => Math.min(prev + ADDITIONAL_BATCH, artworks.length));
        }
      },
      { rootMargin: '400px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [artworks.length, visibleCount]);

  const visibleArtworks = artworks.slice(0, visibleCount);
  const hasMore = visibleCount < artworks.length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
      {visibleArtworks.map((artwork, index) => (
        <div key={artwork.id} id={`artwork-${artwork.id}`} className="w-full">
          <ArtworkCard artwork={artwork} variant="gallery" priorityIndex={index} />
        </div>
      ))}
      {hasMore && <div ref={sentinelRef} className="col-span-full h-px" aria-hidden="true" />}
    </div>
  );
}

export default memo(MasonryGallery);
