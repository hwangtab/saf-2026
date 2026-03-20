import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { ArtworkListItem, SortOption } from '@/types';
import { matchesAnySearch } from '@/lib/search-utils';
import { useDebounce } from './useDebounce';
import { sortArtworks, extractUniqueArtists } from '@/lib/artworkUtils';

/** Status filter options for artwork gallery */
export type StatusFilter = 'all' | 'selling' | 'sold';

/** Category with artwork count */
export interface CategoryCount {
  value: string;
  count: number;
}

/**
 * Custom hook for artwork filtering, sorting, and URL synchronization.
 *
 * @description
 * This hook manages the complete state for artwork gallery filtering:
 * - **Sorting**: By artist name, price, or year (ascending/descending)
 * - **Search**: Full-text search with debouncing (300ms)
 * - **Status Filter**: Show all, selling only, or sold only
 * - **Category Filter**: Filter by artwork category
 * - **Artist Selection**: Filter by specific artist
 *
 * The hook also handles **bidirectional URL synchronization**:
 * - State changes are reflected in URL query parameters
 * - URL changes (browser back/forward) update the component state
 *
 * @param artworks - Array of artwork data to filter
 * @param initialArtist - Optional initial artist filter (e.g., from dynamic route)
 *
 * @returns Object containing:
 * - `filteredArtworks` - Sorted and filtered artworks array
 * - `uniqueArtists` - List of unique artist names for navigation
 * - `categoryCounts` - Categories with artwork counts
 * - State values and setters for sort, search, status, category, and artist
 *
 * @example
 * ```tsx
 * const {
 *   filteredArtworks,
 *   searchQuery,
 *   setSearchQuery,
 *   sortOption,
 *   setSortOption,
 *   categoryFilter,
 *   setCategoryFilter,
 * } = useArtworkFilter(artworks);
 * ```
 */
export function useArtworkFilter(artworks: ArtworkListItem[], initialArtist?: string) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [sortOption, setSortOption] = useState<SortOption>(
    (searchParams.get('sort') as SortOption) || 'artist-asc'
  );
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    (searchParams.get('status') as StatusFilter) || 'all'
  );
  const [categoryFilter, setCategoryFilter] = useState<string | null>(
    searchParams.get('category') || null
  );
  const [selectedArtist, setSelectedArtist] = useState<string | null>(
    initialArtist || searchParams.get('artist') || null
  );

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Keep track of latest state for URL sync to avoid dependency loops
  const stateRef = useRef({
    sortOption,
    searchQuery,
    debouncedSearchQuery,
    statusFilter,
    categoryFilter,
    selectedArtist,
  });

  useEffect(() => {
    stateRef.current = {
      sortOption,
      searchQuery,
      debouncedSearchQuery,
      statusFilter,
      categoryFilter,
      selectedArtist,
    };
  }, [sortOption, searchQuery, debouncedSearchQuery, statusFilter, categoryFilter, selectedArtist]);

  // Sync selectedArtist with initialArtist prop
  // This effect intentionally updates state based on prop changes for URL/prop synchronization
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: sync state with prop for URL navigation
    setSelectedArtist(initialArtist || null);
  }, [initialArtist]);

  // State → URL sync: build URL entirely from React state to avoid stale searchParams issues.
  // window.history.replaceState doesn't update useSearchParams(), so we never read from it for URL construction.
  useEffect(() => {
    if (initialArtist) return;

    const params = new URLSearchParams();
    if (sortOption !== 'artist-asc') params.set('sort', sortOption);
    if (debouncedSearchQuery) params.set('q', debouncedSearchQuery);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (categoryFilter) params.set('category', categoryFilter);
    if (selectedArtist) params.set('artist', selectedArtist);

    const search = params.toString();
    const nextUrl = search ? `${pathname}?${search}` : pathname;

    if (typeof window !== 'undefined') {
      window.history.replaceState(window.history.state, '', nextUrl);
    }
  }, [
    initialArtist,
    pathname,
    sortOption,
    debouncedSearchQuery,
    statusFilter,
    categoryFilter,
    selectedArtist,
  ]);

  const prevSearchParamsStr = useRef(searchParams.toString());

  useEffect(() => {
    const currentSearchParamsStr = searchParams.toString();

    if (currentSearchParamsStr === prevSearchParamsStr.current && !initialArtist) {
      return;
    }
    prevSearchParamsStr.current = currentSearchParamsStr;

    const urlSort = (searchParams.get('sort') as SortOption) || 'artist-asc';
    const urlQ = searchParams.get('q') || '';
    const urlStatus = (searchParams.get('status') as StatusFilter) || 'all';
    const urlCategory = searchParams.get('category') || null;
    const urlArtist = searchParams.get('artist') || null;

    const effectiveArtist = initialArtist || urlArtist;

    const {
      sortOption: currentSort,
      searchQuery: currentQuery,
      debouncedSearchQuery: currentDebouncedQuery,
      statusFilter: currentStatus,
      categoryFilter: currentCategory,
      selectedArtist: currentArtist,
    } = stateRef.current;

    // Sync state with URL params - intentional setState in useEffect for URL synchronization
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: bidirectional sync with URL params
    if (urlSort !== currentSort) setSortOption(urlSort);
    if (urlQ !== currentQuery && urlQ !== currentDebouncedQuery) setSearchQuery(urlQ);
    if (urlStatus !== currentStatus) setStatusFilter(urlStatus);
    if (urlCategory !== currentCategory) setCategoryFilter(urlCategory);
    if (effectiveArtist !== currentArtist) setSelectedArtist(effectiveArtist);
  }, [searchParams, initialArtist]);

  // Compute category counts from all artworks (before filtering)
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const artwork of artworks) {
      const cat = artwork.category;
      if (cat) {
        counts.set(cat, (counts.get(cat) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);
  }, [artworks]);

  const filteredArtworks = useMemo(() => {
    let result = artworks;

    if (statusFilter === 'selling') {
      result = result.filter((a) => !a.sold);
    } else if (statusFilter === 'sold') {
      result = result.filter((a) => a.sold === true);
    }

    if (categoryFilter) {
      result = result.filter((a) => a.category === categoryFilter);
    }

    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.trim();
      result = result.filter((artwork) =>
        matchesAnySearch(query, [
          artwork.title,
          artwork.title_en,
          artwork.artist,
          artwork.artist_en,
          artwork.description,
        ])
      );
    }

    if (selectedArtist) {
      result = result.filter((a) => a.artist === selectedArtist);
    }

    return result;
  }, [artworks, debouncedSearchQuery, statusFilter, categoryFilter, selectedArtist]);

  const sortedArtworks = useMemo(
    () => sortArtworks(filteredArtworks, sortOption),
    [filteredArtworks, sortOption]
  );

  const uniqueArtists = useMemo(() => extractUniqueArtists(artworks), [artworks]);

  // Handle search query change - clear selected artist if search is active
  const handleSetSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setSelectedArtist(null);
    }
  }, []);

  return useMemo(
    () => ({
      sortOption,
      setSortOption,
      searchQuery,
      setSearchQuery: handleSetSearchQuery,
      statusFilter,
      setStatusFilter,
      categoryFilter,
      setCategoryFilter,
      selectedArtist,
      setSelectedArtist,
      filteredArtworks,
      sortedArtworks,
      uniqueArtists,
      categoryCounts,
    }),
    [
      sortOption,
      searchQuery,
      handleSetSearchQuery,
      statusFilter,
      categoryFilter,
      selectedArtist,
      filteredArtworks,
      sortedArtworks,
      uniqueArtists,
      categoryCounts,
    ]
  );
}
