'use client';

import { memo, useState, useEffect, useRef } from 'react';
import { ArtworkListItem } from '@/types';
import ArtworkCard from '@/components/ui/ArtworkCard';

const BATCH_SIZE = 24;

interface MasonryGalleryProps {
  artworks: ArtworkListItem[];
}

function MasonryGallery({ artworks }: MasonryGalleryProps) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isLoadingRef = useRef(false);

  // Fix #1: Use stable primitives to detect real filter/sort changes,
  // not the artworks array reference (which can change on URL sync)
  const artworksKey = artworks.length > 0 ? artworks[0].id : '';
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: reset visible count when filter/sort changes
    setVisibleCount(BATCH_SIZE);
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
          setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, artworks.length));
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 pt-2">
      {visibleArtworks.map((artwork, index) => (
        <div
          key={artwork.id}
          id={`artwork-${artwork.id}`}
          className="w-full"
          style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 400px' }}
        >
          <ArtworkCard artwork={artwork} variant="gallery" priorityIndex={index} />
        </div>
      ))}
      {hasMore && <div ref={sentinelRef} className="col-span-full h-px" aria-hidden="true" />}
    </div>
  );
}

export default memo(MasonryGallery);
