'use client';

import { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Artwork } from '@/types';
import ArtworkCard from '@/components/ui/ArtworkCard';

interface VirtualizedGalleryProps {
  artworks: Artwork[];
}

export default function VirtualizedGallery({ artworks }: VirtualizedGalleryProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Calculate columns based on breakpoints
  const columns = useMemo(() => {
    if (typeof window === 'undefined') return 3;
    if (window.innerWidth < 768) return 1;
    if (window.innerWidth < 1024) return 2;
    return 3;
  }, []);

  // Group artworks into rows
  const rows = useMemo(() => {
    const result: Artwork[][] = [];
    for (let i = 0; i < artworks.length; i += columns) {
      result.push(artworks.slice(i, i + columns));
    }
    return result;
  }, [artworks, columns]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 420, // Estimated row height (4:5 aspect + padding)
    overscan: 2, // Render 2 extra rows above/below viewport
  });

  return (
    <div ref={parentRef} className="h-[calc(100vh-200px)] overflow-auto px-4">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualRow.size}px`,
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rows[virtualRow.index].map((artwork) => (
                <div key={artwork.id} id={`artwork-${artwork.id}`} className="w-full">
                  <ArtworkCard artwork={artwork} variant="gallery" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
