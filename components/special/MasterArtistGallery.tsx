import { memo } from 'react';
import { cn } from '@/lib/utils/cn';
import ArtworkCard from '@/components/ui/ArtworkCard';
import type { ArtworkListItem } from '@/types';

interface MasterArtistGalleryProps {
  artworks: ArtworkListItem[];
  returnTo: string;
  className?: string;
}

const MasterArtistGallery = memo(function MasterArtistGallery({
  artworks,
  returnTo,
  className,
}: MasterArtistGalleryProps) {
  if (!artworks || artworks.length === 0) {
    return null;
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-8 space-y-8">
        {artworks.map((artwork, index) => {
          const delayStyle = { animationDelay: `${index * 100}ms` };
          return (
            <div
              key={artwork.id}
              className="break-inside-avoid mb-8 animate-stamp opacity-0 bg-transparent"
              style={delayStyle}
            >
              <div className="group relative">
                <div className="relative overflow-hidden bg-charcoal">
                  <ArtworkCard
                    artwork={artwork}
                    variant="gallery"
                    theme="dark"
                    returnTo={returnTo}
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

export default MasterArtistGallery;
