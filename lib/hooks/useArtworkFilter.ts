import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Artwork, SortOption } from '@/types';
import { parsePrice } from '@/lib/parsePrice';
import { useDebounce } from './useDebounce';

export type StatusFilter = 'all' | 'selling' | 'sold';

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

export function useArtworkFilter(artworks: Artwork[], initialArtist?: string) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize state from URL params or initial prop
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

  // Debounce search query for performance (300ms delay)
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Function to update URL params
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

      // Replace URL without reloading the page
      router.replace(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  // Sync state changes to URL
  useEffect(() => {
    const currentSort = (searchParams.get('sort') as SortOption) || 'artist-asc';
    const currentQ = searchParams.get('q') || '';
    const currentStatus = (searchParams.get('status') as StatusFilter) || 'all';
    const currentArtist = searchParams.get('artist');

    // Only update if state differs from URL to avoid loop/redundant updates
    // Note: We use debouncedSearchQuery for URL update to avoid too many history entries/updates while typing
    const paramsToUpdate: any = {};
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
    sortOption,
    debouncedSearchQuery,
    statusFilter,
    selectedArtist,
    searchParams,
    updateUrlParams,
  ]);

  // Handle URL changes (back/forward button)
  useEffect(() => {
    const urlSort = (searchParams.get('sort') as SortOption) || 'artist-asc';
    const urlQ = searchParams.get('q') || '';
    const urlStatus = (searchParams.get('status') as StatusFilter) || 'all';
    const urlArtist = searchParams.get('artist') || null;

    if (urlSort !== sortOption) setSortOption(urlSort);
    // For search query, we want to update it only if it's significantly different to avoid conflict with typing
    // But since we debounce URL updates, if URL changes externally (back button), we should accept it
    if (urlQ !== searchQuery && urlQ !== debouncedSearchQuery) setSearchQuery(urlQ);
    if (urlStatus !== statusFilter) setStatusFilter(urlStatus);
    if (urlArtist !== selectedArtist) setSelectedArtist(urlArtist);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Depend on searchParams to react to URL changes

  // 1. 필터링 (검색어 + 판매상태)
  const filteredArtworks = useMemo(() => {
    let result = artworks;

    // Status Filter
    if (statusFilter === 'selling') {
      result = result.filter((a) => !a.sold);
    } else if (statusFilter === 'sold') {
      result = result.filter((a) => a.sold === true);
    }

    // Search Filter (uses debounced value)
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim();
      result = result.filter(
        (artwork) =>
          artwork.title.toLowerCase().includes(query) ||
          artwork.artist.toLowerCase().includes(query) ||
          artwork.description?.toLowerCase().includes(query)
      );
    }

    // Artist Filter
    if (selectedArtist) {
      result = result.filter((a) => a.artist === selectedArtist);
    }

    return result;
  }, [artworks, debouncedSearchQuery, statusFilter, selectedArtist]);

  // 2. 정렬 적용
  const sortedArtworks = useMemo(
    () => sortArtworks(filteredArtworks, sortOption),
    [filteredArtworks, sortOption]
  );

  const uniqueArtists = useMemo(() => {
    const seen = new Set<string>();
    const artists: string[] = [];
    const source = [...artworks].sort((a, b) => a.artist.localeCompare(b.artist, 'ko-KR'));

    for (const artwork of source) {
      if (!seen.has(artwork.artist)) {
        seen.add(artwork.artist);
        artists.push(artwork.artist);
      }
    }

    return artists;
  }, [artworks]);

  return {
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
  };
}
