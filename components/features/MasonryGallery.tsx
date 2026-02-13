import { memo } from 'react';
import { ArtworkListItem } from '@/types';
import ArtworkCard from '@/components/ui/ArtworkCard';

interface MasonryGalleryProps {
  artworks: ArtworkListItem[];
}

function MasonryGallery({ artworks }: MasonryGalleryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 pt-2">
      {artworks.map((artwork) => (
        <div key={artwork.id} id={`artwork-${artwork.id}`} className="w-full">
          <ArtworkCard artwork={artwork} variant="gallery" />
        </div>
      ))}
    </div>
  );
}

export default memo(MasonryGallery);
