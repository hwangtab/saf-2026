'use client';

import { memo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MasonryGallery from './MasonryGallery';
import SearchBar from './SearchBar';
import FilterBar from './gallery/FilterBar';
import ArtistNavigation from './gallery/ArtistNavigation';
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

  // Handler for artist button click - navigate to artist page
  const handleArtistClick = useCallback(
    (artist: string) => {
      if (selectedArtist === artist) {
        // If same artist is clicked, go back to main artworks page
        router.push('/artworks', { scroll: false });
      } else {
        // Navigate to artist's dedicated page
        router.push(`/artworks/artist/${encodeURIComponent(artist)}`, { scroll: false });
      }
    },
    [selectedArtist, router]
  );

  // 작가명순일 때만 작가 네비게이션 표시
  const showArtistNav = sortOption === 'artist-asc' && !searchQuery;

  // Use grid layout when artist is selected (few items)
  const useGridLayout = !!selectedArtist;

  return (
    <div>
      {/* Controls & Nav Section (Combined Sticky) */}
      <div className="md:sticky md:top-[calc(4rem+env(safe-area-inset-top,0px))] z-30 bg-gray-50 border-b border-gray-200/50">
        <div className="container-max">
          {/* Search & Sort Controls - Single row on desktop, stacked on mobile */}
          <div className="flex flex-col md:flex-row md:items-center gap-3 py-3">
            <div className="flex-1 min-w-0 md:max-w-md">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={UI_STRINGS.SEARCH.PLACEHOLDER_ARTWORKS}
              />
            </div>

            <FilterBar
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              sortOption={sortOption}
              setSortOption={setSortOption}
            />
          </div>

          {/* Artist Navigation - Hidden on mobile, visible on desktop */}
          {showArtistNav && (
            <ArtistNavigation
              uniqueArtists={uniqueArtists}
              selectedArtist={selectedArtist}
              onArtistClick={handleArtistClick}
            />
          )}
        </div>
      </div>

      {/* Results Message */}
      {searchQuery && (
        <div className="mb-6 container-max mt-6" role="status" aria-live="polite">
          <p className="text-gray-500">
            <span className="font-semibold text-primary">&apos;{searchQuery}&apos;</span>{' '}
            {UI_STRINGS.SEARCH.RESULT_PREFIX} {filteredArtworks.length}
            {UI_STRINGS.SEARCH.RESULT_SUFFIX}
          </p>
        </div>
      )}

      {/* No Results State */}
      {filteredArtworks.length === 0 ? (
        <GalleryEmptyState onReset={() => setSearchQuery('')} />
      ) : (
        <div className={showArtistNav ? 'mt-6' : ''}>
          <MasonryGallery artworks={sortedArtworks} forceGrid={useGridLayout} />
        </div>
      )}
    </div>
  );
}

export default memo(ArtworkGalleryWithSort);
