'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { Artwork } from '@/types';
import ArtworkCard from '@/components/ui/ArtworkCard';

interface VirtualizedGalleryProps {
  artworks: Artwork[];
}

export default function VirtualizedGallery({ artworks }: VirtualizedGalleryProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [scrollMargin, setScrollMargin] = useState(0);

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

  // Update scrollMargin on mount and resize
  useEffect(() => {
    if (parentRef.current) {
      setScrollMargin(parentRef.current.offsetTop);
    }
  }, []);

  // Use window virtualizer to use the main browser scrollbar
  const virtualizer = useWindowVirtualizer({
    count: rows.length,
    estimateSize: () => 420, // Estimated row height
    overscan: 2,
    scrollMargin,
  });

  return (
    <div ref={parentRef} className="px-4">
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
              transform: `translateY(${virtualRow.start - virtualizer.options.scrollMargin}px)`,
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
