'use client';

import { memo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MasonryGallery from './MasonryGallery';
import ArtworkFilterControls from './ArtworkFilterControls';
import GalleryEmptyState from './gallery/GalleryEmptyState';
import { Artwork } from '@/types';
import { useArtworkFilter } from '@/lib/hooks/useArtworkFilter';
import { UI_STRINGS } from '@/lib/ui-strings';

interface ArtworkGalleryWithSortProps {
  artworks: Artwork[];
  initialArtist?: string;
}

function ArtworkGalleryWithSort({ artworks, initialArtist }: ArtworkGalleryWithSortProps) {
  const router = useRouter();

  const {
    sortOption,
    setSortOption,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    selectedArtist,
    filteredArtworks,
    sortedArtworks,
    uniqueArtists,
  } = useArtworkFilter(artworks, initialArtist);

  const handleArtistClick = useCallback(
    (artist: string) => {
      if (selectedArtist === artist) {
        router.push('/artworks', { scroll: false });
      } else {
        router.push(`/artworks/artist/${encodeURIComponent(artist)}`, { scroll: false });
      }
    },
    [selectedArtist, router]
  );

  const showArtistNav = sortOption === 'artist-asc' && !searchQuery;

  return (
    <>
      {/* Filter Controls - Fixed at top */}
      <ArtworkFilterControls
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortOption={sortOption}
        onSortOptionChange={setSortOption}
        showArtistNav={showArtistNav}
        uniqueArtists={uniqueArtists}
        selectedArtist={selectedArtist}
        onArtistClick={handleArtistClick}
      />

      {/* Gallery Content */}
      <div className="mt-8">
        {/* Search Results Message */}
        {searchQuery && (
          <div className="mb-6 container-max" role="status" aria-live="polite">
            <p className="text-gray-500">
              <span className="font-semibold text-primary">&apos;{searchQuery}&apos;</span>{' '}
              {UI_STRINGS.SEARCH.RESULT_PREFIX} {filteredArtworks.length}
              {UI_STRINGS.SEARCH.RESULT_SUFFIX}
            </p>
          </div>
        )}

        {/* Gallery or Empty State */}
        {filteredArtworks.length === 0 ? (
          <GalleryEmptyState onReset={() => setSearchQuery('')} />
        ) : (
          <MasonryGallery artworks={sortedArtworks} />
        )}
      </div>
    </>
  );
}

export default memo(ArtworkGalleryWithSort);
