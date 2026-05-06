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

  // 필터 적용 후 페이지 상단으로 부드럽게 스크롤. 사용자가 깊이 스크롤한 상태에서
  // 필터를 누르면 결과가 화면 밖에 있어 혼란스러운 UX를 방지.
  // prefers-reduced-motion 사용자에겐 즉시 점프 (브라우저 자동 처리).
  const scrollToTop = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Handler for artist button click - navigate to artist page (scroll: 기본값 → top)
  const handleArtistClick = useCallback(
    (artist: string) => {
      const nextPath =
        selectedArtist === artist ? '/artworks' : `/artworks/artist/${encodeURIComponent(artist)}`;

      startNavigationTransition(() => {
        // scroll: false 제거 — 다른 페이지로 navigate 시 새 페이지 상단부터 보여야 정상 UX
        router.push(nextPath);
      });
    },
    [selectedArtist, router, startNavigationTransition]
  );

  // 로컬 state 필터 setter 래핑 — 적용 직후 상단으로 스크롤
  const handleSortChange = useCallback(
    (opt: typeof sortOption) => {
      setSortOption(opt);
      scrollToTop();
    },
    [setSortOption, scrollToTop]
  );
  const handleStatusChange = useCallback(
    (opt: typeof statusFilter) => {
      setStatusFilter(opt);
      scrollToTop();
    },
    [setStatusFilter, scrollToTop]
  );
  const handleCategoryChange = useCallback(
    (opt: typeof categoryFilter) => {
      setCategoryFilter(opt);
      scrollToTop();
    },
    [setCategoryFilter, scrollToTop]
  );
  const handlePriceChange = useCallback(
    (opt: typeof priceBucket) => {
      setPriceBucket(opt);
      scrollToTop();
    },
    [setPriceBucket, scrollToTop]
  );

  // 작가명순일 때만 작가 네비게이션 표시
  const showArtistNav = sortOption === 'artist-asc' && !searchQuery;

  return (
    <div>
      {/* FilterBar — 데스크톱에선 헤더 아래 sticky, 모바일에선 normal scroll로 chrome stack 최소화 */}
      <div className="md:sticky md:top-[calc(4rem+env(safe-area-inset-top,0px))] left-0 right-0 z-30 bg-gray-50 border-b border-gray-200/50">
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
              setStatusFilter={handleStatusChange}
              sortOption={sortOption}
              setSortOption={handleSortChange}
            />
          </div>

          {/* Category Filter — 모바일에선 숨김 (ArtistNavigation과 동일 정책, 768px 미만 chrome 단순화) */}
          {categoryCounts.length > 0 && (
            <div className="hidden md:block pb-3">
              <CategoryFilter
                categories={categoryCounts}
                selected={categoryFilter}
                onSelect={handleCategoryChange}
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
                onSelect={handlePriceChange}
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
