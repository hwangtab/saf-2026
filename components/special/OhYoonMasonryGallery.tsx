import { memo } from 'react';
import { cn } from '@/lib/utils';
import ArtworkCard from '@/components/ui/ArtworkCard';
import type { ArtworkListItem } from '@/types';

interface OhYoonMasonryGalleryProps {
  artworks: ArtworkListItem[];
  className?: string;
}

const OhYoonMasonryGallery = memo(function OhYoonMasonryGallery({
  artworks,
  className,
}: OhYoonMasonryGalleryProps) {
  if (!artworks || artworks.length === 0) {
    return null;
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Masonry Layout using CSS Columns */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-8 space-y-8">
        {artworks.map((artwork, index) => {
          // Staggered delay for "stamp" effect
          const delayStyle = { animationDelay: `${index * 100}ms` };

          return (
            <div
              key={artwork.id}
              className="break-inside-avoid mb-8 animate-stamp opacity-0 bg-transparent"
              style={delayStyle}
            >
              {/* 
                Artwork Card Wrapper 
                Overriding default card styles for "Dark Mode" focus
              */}
              <div className="group relative">
                {/* Image Container - Removed shadows/borders for "illuminated in dark" look */}
                <div className="relative overflow-hidden bg-[#2a3032]">
                  <ArtworkCard
                    artwork={artwork}
                    variant="gallery"
                    theme="dark"
                    returnTo="/special/oh-yoon"
                    className="!bg-transparent !shadow-none !rounded-none"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default OhYoonMasonryGallery;
