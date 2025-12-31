'use client';

import { useState, useMemo, memo } from 'react';
import MasonryGallery from './MasonryGallery';
import SortControls, { SortOption } from './SortControls';
import SearchBar from './SearchBar';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { Artwork } from '@/content/saf2026-artworks';
import { parsePrice } from '@/lib/parsePrice';
import { scrollToElement } from '@/lib/scroll';

interface ArtworkGalleryWithSortProps {
  artworks: Artwork[];
}

function sortArtworks(artworks: Artwork[], sortOption: SortOption): Artwork[] {
  const sorted = [...artworks];

  switch (sortOption) {
    case 'artist-asc':
      return sorted.sort((a, b) => a.artist.localeCompare(b.artist, 'ko-KR'));

    case 'title-asc':
      return sorted.sort((a, b) => a.title.localeCompare(b.title, 'ko-KR'));

    case 'price-desc':
      return sorted.sort((a, b) => {
        const priceA = parsePrice(a.price);
        const priceB = parsePrice(b.price);
        // Infinity (문의/확인중)는 맨 뒤로
        if (priceA === Infinity && priceB === Infinity) return 0;
        if (priceA === Infinity) return 1;
        if (priceB === Infinity) return -1;
        return priceB - priceA; // 높은 가격 먼저
      });

    case 'price-asc':
      return sorted.sort((a, b) => {
        const priceA = parsePrice(a.price);
        const priceB = parsePrice(b.price);
        // Infinity (문의/확인중)는 맨 뒤로
        if (priceA === Infinity && priceB === Infinity) return 0;
        if (priceA === Infinity) return 1;
        if (priceB === Infinity) return -1;
        return priceA - priceB; // 낮은 가격 먼저
      });

    default:
      return sorted;
  }
}

function ArtworkGalleryWithSort({ artworks }: ArtworkGalleryWithSortProps) {
  const [sortOption, setSortOption] = useState<SortOption>('artist-asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'selling' | 'sold'>('all');

  // 1. 필터링 (검색어 + 판매상태)
  const filteredArtworks = useMemo(() => {
    let result = artworks;

    // Status Filter
    if (statusFilter === 'selling') {
      result = result.filter((a) => !a.sold);
    } else if (statusFilter === 'sold') {
      result = result.filter((a) => a.sold === true);
    }

    // Search Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (artwork) =>
          artwork.title.toLowerCase().includes(query) ||
          artwork.artist.toLowerCase().includes(query) ||
          artwork.description?.toLowerCase().includes(query)
      );
    }

    return result;
  }, [artworks, searchQuery, statusFilter]);

  // 2. 정렬 적용
  const sortedArtworks = useMemo(
    () => sortArtworks(filteredArtworks, sortOption),
    [filteredArtworks, sortOption]
  );

  // 3. 작가 네비게이션 로직 (이동됨)
  const uniqueArtists = useMemo(() => {
    const seen = new Set<string>();
    return sortedArtworks
      .filter((a) => {
        if (seen.has(a.artist)) return false;
        seen.add(a.artist);
        return true;
      })
      .map((a) => a.artist);
  }, [sortedArtworks]);

  // Track which artists appear first (for anchor)
  const firstArtworkByArtist = useMemo(() => {
    const map = new Map<string, string>();
    sortedArtworks.forEach((a) => {
      if (!map.has(a.artist)) {
        map.set(a.artist, a.id);
      }
    });
    return map;
  }, [sortedArtworks]);

  const scrollToArtist = (artist: string) => {
    const artworkId = firstArtworkByArtist.get(artist);
    if (artworkId) {
      // Use centralized scroll utility with header-aware offset
      scrollToElement(`artwork-${artworkId}`, 150); // Additional offset for sticky controls
    }
  };

  // 4. Infinite Scroll Integration
  const {
    visibleData: visibleArtworks,
    observerTarget,
    hasMore,
  } = useInfiniteScroll(sortedArtworks, {
    initialCount: 20, // Start with 20 items
    batchSize: 20, // Load 20 more at a time
    threshold: 0.1, // Trigger when 10% of sentinel is visible
  });

  // 작가명순일 때만 작가 네비게이션 표시 (검색어가 없을 때만, 전체보기일 때만 권장하지만 강제하진 않음)
  const showArtistNav = sortOption === 'artist-asc' && !searchQuery;

  return (
    <div>
      {/* Controls & Nav Section (Combined Sticky) */}
      <div className="md:sticky md:top-[calc(4rem+env(safe-area-inset-top,0px))] z-40 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200/50">
        <div className="container-max">
          {/* Search & Sort Controls */}
          <div className="flex flex-col gap-3 py-3">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="작가명, 작품명으로 검색해보세요"
            />

            <div className="flex flex-row items-center justify-between gap-2 w-full">
              {/* Status Filter Buttons */}
              <div
                role="radiogroup"
                aria-label="판매 상태 필터"
                className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm"
              >
                <button
                  role="radio"
                  aria-checked={statusFilter === 'all'}
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-charcoal text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  전체
                </button>
                <button
                  role="radio"
                  aria-checked={statusFilter === 'selling'}
                  onClick={() => setStatusFilter('selling')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    statusFilter === 'selling'
                      ? 'bg-charcoal text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  판매중
                </button>
                <button
                  role="radio"
                  aria-checked={statusFilter === 'sold'}
                  onClick={() => setStatusFilter('sold')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    statusFilter === 'sold'
                      ? 'bg-charcoal text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  판매완료
                </button>
              </div>

              <SortControls value={sortOption} onChange={setSortOption} />
            </div>
          </div>

          {/* Artist Navigation - Hidden on mobile, visible on desktop */}
          {showArtistNav && (
            <div className="hidden md:block pb-4 pt-1">
              <div className="grid grid-cols-2 md:grid-cols-9 lg:grid-cols-11 gap-2">
                {uniqueArtists.map((artist) => (
                  <button
                    key={artist}
                    onClick={() => scrollToArtist(artist)}
                    aria-label={`${artist} 작가 작품으로 이동`}
                    className="px-2 py-1.5 text-xs sm:text-sm font-medium bg-white border border-gray-200 rounded-full hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 text-center truncate"
                  >
                    {artist}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Message */}
      {searchQuery && (
        <div className="mb-6 container-max mt-6" role="status" aria-live="polite">
          <p className="text-gray-500">
            <span className="font-semibold text-primary">&apos;{searchQuery}&apos;</span> 검색 결과:{' '}
            {filteredArtworks.length}개
          </p>
        </div>
      )}

      {/* No Results State */}
      {filteredArtworks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">검색 결과가 없습니다</h3>
          <p className="text-gray-500 mb-6">다른 키워드로 검색해보거나, 모든 작품을 둘러보세요.</p>
          <button
            onClick={() => setSearchQuery('')}
            className="px-6 py-2 bg-charcoal text-white rounded-full hover:bg-black transition-colors"
          >
            전체 목록 보기
          </button>
        </div>
      ) : (
        <div className={showArtistNav ? 'mt-6' : ''}>
          <MasonryGallery artworks={visibleArtworks} />
          {/* Sentinel for Infinite Scroll - only needed if there are more items */}
          {hasMore && (
            <div
              ref={observerTarget}
              className="h-20 w-full flex items-center justify-center p-4"
              role="status"
            >
              <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" />
              <span className="sr-only">Loading more artworks...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(ArtworkGalleryWithSort);
