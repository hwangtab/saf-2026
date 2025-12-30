'use client';

import { useState, useMemo } from 'react';
import MasonryGallery from './MasonryGallery';
import SortControls, { SortOption } from './SortControls';
import { Artwork } from '@/content/saf2026-artworks';
import { parsePrice } from '@/lib/parsePrice';

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

export default function ArtworkGalleryWithSort({ artworks }: ArtworkGalleryWithSortProps) {
    const [sortOption, setSortOption] = useState<SortOption>('artist-asc');

    const sortedArtworks = useMemo(
        () => sortArtworks(artworks, sortOption),
        [artworks, sortOption]
    );

    // 작가명순일 때만 작가 네비게이션 표시
    const showArtistNav = sortOption === 'artist-asc';

    return (
        <div>
            <SortControls value={sortOption} onChange={setSortOption} />
            <MasonryGallery artworks={sortedArtworks} showArtistNav={showArtistNav} />
        </div>
    );
}
