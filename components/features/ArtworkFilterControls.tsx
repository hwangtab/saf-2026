'use client';

import SearchBar from './SearchBar';
import FilterBar from './gallery/FilterBar';
import ArtistNavigation from './gallery/ArtistNavigation';
import { StatusFilter } from '@/lib/hooks/useArtworkFilter';
import { SortOption } from '@/types';
import { UI_STRINGS } from '@/lib/ui-strings';

interface ArtworkFilterControlsProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  sortOption: SortOption;
  onSortOptionChange: (value: SortOption) => void;
  showArtistNav: boolean;
  uniqueArtists?: string[];
  selectedArtist: string | null;
  onArtistClick?: (artist: string) => void;
}

export default function ArtworkFilterControls({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortOption,
  onSortOptionChange,
  showArtistNav,
  uniqueArtists = [],
  selectedArtist,
  onArtistClick,
}: ArtworkFilterControlsProps) {
  return (
    <>
      {/* FilterBar - Static position */}
      <div className="bg-gray-50 border-b border-gray-200/50">
        <div className="container-max">
          <div className="flex flex-col md:flex-row md:items-center gap-3 py-3">
            <div className="flex-1 min-w-0 md:max-w-md">
              <SearchBar
                value={searchQuery}
                onChange={onSearchChange}
                placeholder={UI_STRINGS.SEARCH.PLACEHOLDER_ARTWORKS}
              />
            </div>
            <FilterBar
              statusFilter={statusFilter}
              setStatusFilter={onStatusFilterChange}
              sortOption={sortOption}
              setSortOption={onSortOptionChange}
            />
          </div>
        </div>
      </div>

      {/* Artist Navigation */}
      {showArtistNav && (
        <div className="container-max my-4">
          <ArtistNavigation
            uniqueArtists={uniqueArtists}
            selectedArtist={selectedArtist}
            onArtistClick={onArtistClick || (() => {})}
          />
        </div>
      )}
    </>
  );
}
