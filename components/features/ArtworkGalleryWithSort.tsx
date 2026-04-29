'use client';

import { memo, useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import MasonryGallery from './MasonryGallery';
import SearchBar from './SearchBar';
import FilterBar from './gallery/FilterBar';
import CategoryFilter from './gallery/CategoryFilter';
import PriceRangeFilter from './gallery/PriceRangeFilter';
import ArtistNavigation from './gallery/ArtistNavigation';
import GalleryEmptyState from './gallery/GalleryEmptyState';
import { ArtworkListItem } from '@/types';
import { useArtworkFilter } from '@/lib/hooks/useArtworkFilter';
import { useLocale, useTranslations } from 'next-intl';

interface ArtworkGalleryWithSortProps {
  artworks: ArtworkListItem[];
  initialArtist?: string;
}

function ArtworkGalleryWithSort({ artworks, initialArtist }: ArtworkGalleryWithSortProps) {
  const locale = useLocale();
  const tSearch = useTranslations('search');
  const router = useRouter();
  const [, startNavigationTransition] = useTransition();

  const {
    sortOption,
    setSortOption,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    priceBucket,
    setPriceBucket,
    selectedArtist,
    filteredArtworks,
    sortedArtworks,
    uniqueArtists,
    categoryCounts,
    priceBucketCounts,
  } = useArtworkFilter(artworks, initialArtist);

  const totalPricedCount = priceBucketCounts.reduce((acc, b) => acc + b.count, 0);

  // Handler for artist button click - navigate to artist page
  const handleArtistClick = useCallback(
    (artist: string) => {
      const nextPath =
        selectedArtist === artist ? '/artworks' : `/artworks/artist/${encodeURIComponent(artist)}`;

      startNavigationTransition(() => {
        router.push(nextPath, { scroll: false });
      });
    },
    [selectedArtist, router, startNavigationTransition]
  );

  // 작가명순일 때만 작가 네비게이션 표시
  const showArtistNav = sortOption === 'artist-asc' && !searchQuery;

  return (
    <div>
      {/* Sticky FilterBar - Sticks below header after scrolling */}
      <div className="sticky top-[calc(4rem+env(safe-area-inset-top,0px))] left-0 right-0 z-30 bg-gray-50 border-b border-gray-200/50">
        <div className="container-max">
          {/* Search & Sort Controls - Single row on desktop, stacked on mobile */}
          <div className="flex flex-col md:flex-row md:items-center gap-3 py-3">
            <div className="flex-1 min-w-0 md:max-w-md">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder={tSearch('placeholderArtworks')}
              />
            </div>

            <FilterBar
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              sortOption={sortOption}
              setSortOption={setSortOption}
            />
          </div>

          {/* Category Filter — 모바일에선 숨김 (ArtistNavigation과 동일 정책, 768px 미만 chrome 단순화) */}
          {categoryCounts.length > 0 && (
            <div className="hidden md:block pb-3">
              <CategoryFilter
                categories={categoryCounts}
                selected={categoryFilter}
                onSelect={setCategoryFilter}
                totalCount={artworks.length}
              />
            </div>
          )}

          {/* Price Range Filter — 모바일에선 숨김 */}
          {totalPricedCount > 0 && (
            <div className="hidden md:block pb-3">
              <PriceRangeFilter
                buckets={priceBucketCounts}
                selected={priceBucket}
                onSelect={setPriceBucket}
                totalCount={totalPricedCount}
              />
            </div>
          )}
        </div>
      </div>

      {/* Content below sticky FilterBar */}
      <div>
        {/* Artist Navigation - Normal scroll (disappears on scroll) */}
        {showArtistNav && (
          <div className="container-max mb-4">
            <ArtistNavigation
              uniqueArtists={uniqueArtists}
              selectedArtist={selectedArtist}
              onArtistClick={handleArtistClick}
              locale={locale}
            />
          </div>
        )}

        {/* Results Message */}
        {searchQuery && (
          <div className="mb-6 container-max mt-6" role="status" aria-live="polite">
            <p className="text-gray-500">
              <span className="font-semibold text-primary">&apos;{searchQuery}&apos;</span>{' '}
              {locale === 'en'
                ? `${filteredArtworks.length} ${tSearch('resultPrefix')}`
                : `${tSearch('resultPrefix')} ${filteredArtworks.length}${tSearch('resultSuffix')}`}
            </p>
          </div>
        )}

        {/* No Results State */}
        {filteredArtworks.length === 0 ? (
          <GalleryEmptyState
            onReset={() => {
              setSearchQuery('');
              setCategoryFilter(null);
              setPriceBucket(null);
            }}
          />
        ) : (
          <MasonryGallery artworks={sortedArtworks} />
        )}
      </div>
    </div>
  );
}

export default memo(ArtworkGalleryWithSort);
