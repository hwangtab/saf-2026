import { memo } from 'react';
import dynamic from 'next/dynamic';
import { Artwork } from '@/types';
import ArtworkCard from '@/components/ui/ArtworkCard';

const VirtualizedGallery = dynamic(() => import('./VirtualizedGallery'), {
  ssr: false,
});

const VIRTUALIZATION_THRESHOLD = 50;

interface MasonryGalleryProps {
  artworks: Artwork[];
}

function MasonryGallery({ artworks }: MasonryGalleryProps) {
  // Use virtualization for large lists
  if (artworks.length > VIRTUALIZATION_THRESHOLD) {
    return <VirtualizedGallery artworks={artworks} />;
  }

  // Simple grid for small lists (filtered results)
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
