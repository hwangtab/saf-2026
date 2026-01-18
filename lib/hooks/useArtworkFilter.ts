import { useState, useMemo, useEffect, useCallback, useRef, useTransition } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Artwork, SortOption } from '@/types';
import { useDebounce } from './useDebounce';
import { sortArtworks, extractUniqueArtists } from '@/lib/artworkUtils';

export type StatusFilter = 'all' | 'selling' | 'sold';

export function useArtworkFilter(artworks: Artwork[], initialArtist?: string) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const [sortOption, setSortOption] = useState<SortOption>(
    (searchParams.get('sort') as SortOption) || 'artist-asc'
  );
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    (searchParams.get('status') as StatusFilter) || 'all'
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
    selectedArtist,
  });

  useEffect(() => {
    stateRef.current = {
      sortOption,
      searchQuery,
      debouncedSearchQuery,
      statusFilter,
      selectedArtist,
    };
  }, [sortOption, searchQuery, debouncedSearchQuery, statusFilter, selectedArtist]);

  const updateUrlParams = useCallback(
    (params: { sort?: SortOption; q?: string; status?: StatusFilter; artist?: string | null }) => {
      const newSearchParams = new URLSearchParams(searchParams.toString());

      if (params.sort) {
        if (params.sort === 'artist-asc') newSearchParams.delete('sort');
        else newSearchParams.set('sort', params.sort);
      }

      if (params.q !== undefined) {
        if (!params.q) newSearchParams.delete('q');
        else newSearchParams.set('q', params.q);
      }

      if (params.status) {
        if (params.status === 'all') newSearchParams.delete('status');
        else newSearchParams.set('status', params.status);
      }

      if (params.artist !== undefined) {
        if (!params.artist) newSearchParams.delete('artist');
        else newSearchParams.set('artist', params.artist);
      }

      // Use startTransition to prevent Suspense fallback (loading.tsx) from showing
      // This keeps the search input focused during URL updates
      startTransition(() => {
        router.replace(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams, startTransition]
  );

  // Sync selectedArtist with initialArtist prop
  // This effect intentionally updates state based on prop changes for URL/prop synchronization
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: sync state with prop for URL navigation
    setSelectedArtist(initialArtist || null);
  }, [initialArtist]);

  useEffect(() => {
    if (initialArtist) return;

    const currentSort = (searchParams.get('sort') as SortOption) || 'artist-asc';
    const currentQ = searchParams.get('q') || '';
    const currentStatus = (searchParams.get('status') as StatusFilter) || 'all';
    const currentArtist = searchParams.get('artist');

    const paramsToUpdate: Partial<{
      sort: SortOption;
      q: string;
      status: StatusFilter;
      artist: string | null;
    }> = {};
    let shouldUpdate = false;

    if (sortOption !== currentSort) {
      paramsToUpdate.sort = sortOption;
      shouldUpdate = true;
    }

    if (debouncedSearchQuery !== currentQ) {
      paramsToUpdate.q = debouncedSearchQuery;
      shouldUpdate = true;
    }

    if (statusFilter !== currentStatus) {
      paramsToUpdate.status = statusFilter;
      shouldUpdate = true;
    }

    if (selectedArtist !== currentArtist) {
      paramsToUpdate.artist = selectedArtist;
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      updateUrlParams(paramsToUpdate);
    }
  }, [
    initialArtist,
    sortOption,
    debouncedSearchQuery,
    statusFilter,
    selectedArtist,
    searchParams,
    updateUrlParams,
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
    const urlArtist = searchParams.get('artist') || null;

    const effectiveArtist = initialArtist || urlArtist;

    const {
      sortOption: currentSort,
      searchQuery: currentQuery,
      debouncedSearchQuery: currentDebouncedQuery,
      statusFilter: currentStatus,
      selectedArtist: currentArtist,
    } = stateRef.current;

    // Sync state with URL params - intentional setState in useEffect for URL synchronization
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: bidirectional sync with URL params
    if (urlSort !== currentSort) setSortOption(urlSort);
    if (urlQ !== currentQuery && urlQ !== currentDebouncedQuery) setSearchQuery(urlQ);
    if (urlStatus !== currentStatus) setStatusFilter(urlStatus);
    if (effectiveArtist !== currentArtist) setSelectedArtist(effectiveArtist);
  }, [searchParams, initialArtist]);

  const filteredArtworks = useMemo(() => {
    let result = artworks;

    if (statusFilter === 'selling') {
      result = result.filter((a) => !a.sold);
    } else if (statusFilter === 'sold') {
      result = result.filter((a) => a.sold === true);
    }

    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim();
      result = result.filter(
        (artwork) =>
          artwork.title.toLowerCase().includes(query) ||
          artwork.artist.toLowerCase().includes(query) ||
          artwork.description?.toLowerCase().includes(query)
      );
    }

    if (selectedArtist) {
      result = result.filter((a) => a.artist === selectedArtist);
    }

    return result;
  }, [artworks, debouncedSearchQuery, statusFilter, selectedArtist]);

  const sortedArtworks = useMemo(
    () => sortArtworks(filteredArtworks, sortOption),
    [filteredArtworks, sortOption]
  );

  const uniqueArtists = useMemo(() => extractUniqueArtists(artworks), [artworks]);

  return useMemo(
    () => ({
      sortOption,
      setSortOption,
      searchQuery,
      setSearchQuery,
      statusFilter,
      setStatusFilter,
      selectedArtist,
      setSelectedArtist,
      filteredArtworks,
      sortedArtworks,
      uniqueArtists,
    }),
    [
      sortOption,
      searchQuery,
      statusFilter,
      selectedArtist,
      filteredArtworks,
      sortedArtworks,
      uniqueArtists,
    ]
  );
}
