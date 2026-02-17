import { memo } from 'react';
import { cn } from '@/lib/utils';
import ArtworkCard from '@/components/ui/ArtworkCard';
import type { ArtworkListItem } from '@/types';

interface OhYoonGalleryProps {
  artworks: ArtworkListItem[];
  className?: string;
}

const getGridClass = (index: number) => {
  const patternIndex = index % 10;

  if (patternIndex === 0) return 'md:col-span-6 md:row-span-2';
  if (patternIndex === 1) return 'md:col-span-6';
  if (patternIndex === 2) return 'md:col-span-6';

  if (patternIndex === 3) return 'md:col-span-8';
  if (patternIndex === 4) return 'md:col-span-4';

  if (patternIndex === 5) return 'md:col-span-4';
  if (patternIndex === 6) return 'md:col-span-4';
  if (patternIndex === 7) return 'md:col-span-4';

  if (patternIndex === 8) return 'md:col-span-6 md:row-span-2';
  if (patternIndex === 9) return 'md:col-span-6';

  return 'md:col-span-4';
};

const getRotationClass = (index: number) => {
  const rotIndex = index % 4;
  if (rotIndex === 1) return 'rotate-1';
  if (rotIndex === 3) return '-rotate-1';
  return 'rotate-0';
};

const OhYoonGallery = memo(function OhYoonGallery({ artworks, className }: OhYoonGalleryProps) {
  if (!artworks || artworks.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 auto-rows-min grid-flow-dense',
        className
      )}
    >
      {artworks.map((artwork, index) => {
        const gridClass = getGridClass(index);
        const rotationClass = getRotationClass(index);

        return (
          <div
            key={artwork.id}
            className={cn(
              'relative transition-transform duration-500 hover:z-10 hover:scale-[1.02] hover:rotate-0',
              gridClass,
              rotationClass
            )}
          >
            <ArtworkCard artwork={artwork} variant="gallery" className="h-full w-full" />
          </div>
        );
      })}
    </div>
  );
});

export default OhYoonGallery;
