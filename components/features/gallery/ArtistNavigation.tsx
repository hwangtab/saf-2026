import { memo, useCallback } from 'react';
import { UI_STRINGS } from '@/lib/ui-strings';

interface ArtistButtonProps {
  artist: string;
  isSelected: boolean;
  onClick: (artist: string) => void;
}

const ArtistButton = memo(function ArtistButton({
  artist,
  isSelected,
  onClick,
}: ArtistButtonProps) {
  const handleClick = useCallback(() => onClick(artist), [artist, onClick]);

  return (
    <button
      onClick={handleClick}
      aria-label={`${artist} ${UI_STRINGS.A11Y.VIEW_ARTIST}`}
      aria-pressed={isSelected}
      className={`px-2 py-1.5 text-xs sm:text-sm font-medium border rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 text-center truncate ${
        isSelected
          ? 'bg-charcoal text-white border-charcoal'
          : 'bg-white border-gray-200 hover:border-primary hover:text-primary hover:bg-primary/5'
      }`}
    >
      {artist}
    </button>
  );
});

interface ArtistNavigationProps {
  uniqueArtists: string[];
  selectedArtist: string | null;
  onArtistClick: (artist: string) => void;
}

function ArtistNavigation({ uniqueArtists, selectedArtist, onArtistClick }: ArtistNavigationProps) {
  return (
    <div className="hidden md:block py-4">
      <div className="grid grid-cols-2 md:grid-cols-9 lg:grid-cols-11 gap-2">
        {uniqueArtists.map((artist) => (
          <ArtistButton
            key={artist}
            artist={artist}
            isSelected={selectedArtist === artist}
            onClick={onArtistClick}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(ArtistNavigation);
