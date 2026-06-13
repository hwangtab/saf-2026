'use client';

import { memo, useCallback, useState, useTransition } from 'react';
// 필터 적용 시 scrollToTop 호출하지 않음 — FilterBar가 sticky라 사용자가 보고 있던
// 그리드 위치를 잃지 않고 자리에서 결과만 즉시 교체되는 것이 정상 UX.
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { SlidersHorizontal } from 'lucide-react';
import MasonryGallery from './MasonryGallery';
import SearchBar from './SearchBar';
import FilterBar from './gallery/FilterBar';
import CategoryFilter from './gallery/CategoryFilter';
import PriceRangeFilter from './gallery/PriceRangeFilter';
import SizeBucketFilter from './gallery/SizeBucketFilter';
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
    sizeBucket,
    setSizeBucket,
    selectedArtist,
    filteredArtworks,
    sortedArtworks,
    uniqueArtists,
    categoryCounts,
    priceBucketCounts,
    sizeBucketCounts,
  } = useArtworkFilter(artworks, initialArtist);

  const totalPricedCount = priceBucketCounts.reduce((acc, b) => acc + b.count, 0);

  // 모바일 필터 토글 (2026-06-12 감사) — 과거 768px 미만에서 카테고리·가격·사이즈 필터가
  // 완전히 숨겨져, 소셜 유입(대부분 모바일) 구매자가 450여 점을 검색·정렬만으로 탐색해야 했음.
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const activeFilterCount = [categoryFilter, priceBucket, sizeBucket].filter(Boolean).length;

  // Handler for artist button click - navigate to artist page (다른 페이지로 navigate라 기본 scroll-to-top 유지)
  const handleArtistClick = useCallback(
    (artist: string) => {
      const nextPath =
        selectedArtist === artist ? '/artworks' : `/artworks/artist/${encodeURIComponent(artist)}`;

      startNavigationTransition(() => {
        router.push(nextPath);
      });
    },
    [selectedArtist, router, startNavigationTransition]
  );

  // 작가명순일 때만 작가 네비게이션 표시
  const showArtistNav = sortOption === 'artist-asc' && !searchQuery;

  return (
    <div>
      {/* Sticky 영역은 검색 + 정렬만 — sticky 바를 얇게 유지해 스크롤 중 화면 가림 최소화.
          카테고리·가격·사이즈 필터는 아래 일반 스크롤 영역으로 분리(스크롤하면 자연스럽게 사라짐). */}
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
              setStatusFilter={setStatusFilter}
              sortOption={sortOption}
              setSortOption={setSortOption}
            />
          </div>
        </div>
      </div>

      {/* 카테고리·가격·사이즈 필터 — sticky 아님(일반 스크롤). 데스크탑은 항상 노출,
          모바일은 '필터' 토글 버튼으로 펼침 (적용 중 필터 개수 배지로 발견성 확보). */}
      {(categoryCounts.length > 0 || totalPricedCount > 0 || sizeBucketCounts.length > 0) && (
        <>
          <div className="md:hidden bg-gray-50 border-b border-gray-200/50">
            <div className="container-max py-2">
              <button
                type="button"
                onClick={() => setShowMobileFilters((v) => !v)}
                aria-expanded={showMobileFilters}
                aria-controls="gallery-detail-filters"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-gray-200 bg-canvas-soft px-4 py-2 text-sm font-medium text-charcoal"
              >
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                {showMobileFilters ? tSearch('filtersHide') : tSearch('filtersShow')}
                {activeFilterCount > 0 && (
                  <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-primary-strong px-1.5 py-0.5 text-xs font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>
          <div
            id="gallery-detail-filters"
            className={clsx(
              showMobileFilters ? 'block' : 'hidden',
              'md:block bg-gray-50 border-b border-gray-200/50'
            )}
          >
            <div className="container-max pt-3">
              {/* Category Filter */}
              {categoryCounts.length > 0 && (
                <div className="pb-3">
                  <CategoryFilter
                    categories={categoryCounts}
                    selected={categoryFilter}
                    onSelect={setCategoryFilter}
                    totalCount={artworks.length}
                  />
                </div>
              )}

              {/* Price Range Filter */}
              {totalPricedCount > 0 && (
                <div className="pb-3">
                  <PriceRangeFilter
                    buckets={priceBucketCounts}
                    selected={priceBucket}
                    onSelect={setPriceBucket}
                    totalCount={totalPricedCount}
                  />
                </div>
              )}

              {/* Size Bucket Filter — 0건 구간은 동적 숨김 */}
              {sizeBucketCounts.length > 0 && (
                <div className="pb-3">
                  <SizeBucketFilter
                    buckets={sizeBucketCounts}
                    selected={sizeBucket}
                    onSelect={setSizeBucket}
                    totalCount={artworks.length}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}

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
            <p className="text-charcoal-soft">
              <span className="font-semibold text-primary-strong">&apos;{searchQuery}&apos;</span>{' '}
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
              setSizeBucket(null);
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
