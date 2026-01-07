import { useState, useMemo } from 'react';
import { Artwork } from '@/content/saf2026-artworks';
import { SortOption } from '@/lib/types';
import { parsePrice } from '@/lib/parsePrice';

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

export function useArtworkFilter(artworks: Artwork[]) {
  const [sortOption, setSortOption] = useState<SortOption>('artist-asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);

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

    // Artist Filter
    if (selectedArtist) {
      result = result.filter((a) => a.artist === selectedArtist);
    }

    return result;
  }, [artworks, searchQuery, statusFilter, selectedArtist]);

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
