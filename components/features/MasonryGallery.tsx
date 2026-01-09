import { Artwork } from '@/types';
import ArtworkCard from '@/components/ui/ArtworkCard';

interface MasonryGalleryProps {
  artworks: Artwork[];
  forceGrid?: boolean;
}

export default function MasonryGallery({ artworks, forceGrid }: MasonryGalleryProps) {
  const useCenteredGrid = forceGrid || artworks.length <= 3;

  return (
    <div
      className={
        useCenteredGrid
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 pt-2 justify-items-center'
          : 'columns-1 md:columns-2 lg:columns-3 gap-6 px-4 pt-2'
      }
    >
      {artworks.map((artwork) => (
        <div
          key={artwork.id}
          id={`artwork-${artwork.id}`}
          className="break-inside-avoid mb-6 inline-block w-full"
        >
          <ArtworkCard artwork={artwork} variant="gallery" />
        </div>
      ))}
    </div>
  );
}
