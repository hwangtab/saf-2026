import { UI_STRINGS } from '@/lib/ui-strings';

interface ArtistNavigationProps {
  uniqueArtists: string[];
  selectedArtist: string | null;
  onArtistClick: (artist: string) => void;
}

export default function ArtistNavigation({
  uniqueArtists,
  selectedArtist,
  onArtistClick,
}: ArtistNavigationProps) {
  return (
    <div className="hidden md:block pb-4 pt-1">
      <div className="grid grid-cols-2 md:grid-cols-9 lg:grid-cols-11 gap-2">
        {uniqueArtists.map((artist) => (
          <button
            key={artist}
            onClick={() => onArtistClick(artist)}
            aria-label={`${artist} ${UI_STRINGS.A11Y.VIEW_ARTIST}`}
            aria-pressed={selectedArtist === artist}
            className={`px-2 py-1.5 text-xs sm:text-sm font-medium border rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 text-center truncate ${
              selectedArtist === artist
                ? 'bg-charcoal text-white border-charcoal'
                : 'bg-white border-gray-200 hover:border-primary hover:text-primary hover:bg-primary/5'
            }`}
          >
            {artist}
          </button>
        ))}
      </div>
    </div>
  );
}
