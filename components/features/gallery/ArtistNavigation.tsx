'use client';

import { memo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { ArtistName } from '@/lib/artworkUtils';

interface ArtistButtonProps {
  artistKey: string;
  displayName: string;
  isSelected: boolean;
  onClick: (artist: string) => void;
  ariaLabelSuffix: string;
}

const ArtistButton = memo(function ArtistButton({
  artistKey,
  displayName,
  isSelected,
  onClick,
  ariaLabelSuffix,
}: ArtistButtonProps) {
  const handleClick = useCallback(() => onClick(artistKey), [artistKey, onClick]);

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`${displayName} ${ariaLabelSuffix}`}
      aria-pressed={isSelected}
      className={`px-2 py-1.5 text-xs sm:text-sm font-medium border rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 text-center truncate ${
        isSelected
          ? 'bg-charcoal text-white border-charcoal'
          : 'bg-white border-gray-200 hover:border-primary hover:text-primary hover:bg-primary/5'
      }`}
    >
      {displayName}
    </button>
  );
});

interface ArtistNavigationProps {
  uniqueArtists: ArtistName[];
  selectedArtist: string | null;
  onArtistClick: (artist: string) => void;
  locale: string;
}

function ArtistNavigation({
  uniqueArtists,
  selectedArtist,
  onArtistClick,
  locale,
}: ArtistNavigationProps) {
  const tA11y = useTranslations('a11y');

  return (
    <div className="hidden md:block py-4">
      <div className="grid grid-cols-2 md:grid-cols-9 lg:grid-cols-11 gap-2">
        {uniqueArtists.map((artist) => (
          <ArtistButton
            key={artist.ko}
            artistKey={artist.ko}
            displayName={locale === 'en' ? artist.en : artist.ko}
            isSelected={selectedArtist === artist.ko}
            onClick={onArtistClick}
            ariaLabelSuffix={tA11y('viewArtist')}
          />
        ))}
      </div>
    </div>
  );
}

export default memo(ArtistNavigation);
