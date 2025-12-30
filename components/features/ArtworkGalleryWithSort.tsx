'use client';

import { useState, useMemo } from 'react';
import MasonryGallery from './MasonryGallery';
import SortControls, { SortOption } from './SortControls';
import SearchBar from './SearchBar';
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
    const [searchQuery, setSearchQuery] = useState('');

    // 1. 검색어 필터링
    const filteredArtworks = useMemo(() => {
        if (!searchQuery.trim()) return artworks;

        const query = searchQuery.toLowerCase().trim();
        return artworks.filter(artwork =>
            artwork.title.toLowerCase().includes(query) ||
            artwork.artist.toLowerCase().includes(query) ||
            artwork.material?.toLowerCase().includes(query) ||
            artwork.description?.toLowerCase().includes(query)
        );
    }, [artworks, searchQuery]);

    // 2. 정렬 적용
    const sortedArtworks = useMemo(
        () => sortArtworks(filteredArtworks, sortOption),
        [filteredArtworks, sortOption]
    );

    // 작가명순일 때만 작가 네비게이션 표시 (검색어가 없을 때만)
    const showArtistNav = sortOption === 'artist-asc' && !searchQuery;

    return (
        <div>
            {/* Controls Section */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-between sticky top-[60px] z-20 bg-gray-50/95 backdrop-blur-sm py-4 border-b border-gray-200/50 container-max">
                <SearchBar
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="작가명, 작품명, 재료 등을 검색해보세요"
                />
                <SortControls value={sortOption} onChange={setSortOption} />
            </div>

            {/* Results Message */}
            {searchQuery && (
                <div className="mb-6 container-max">
                    <p className="text-gray-500">
                        <span className="font-semibold text-primary">'{searchQuery}'</span> 검색 결과: {filteredArtworks.length}개
                    </p>
                </div>
            )}

            {/* No Results State */}
            {filteredArtworks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
                <MasonryGallery artworks={sortedArtworks} showArtistNav={showArtistNav} />
            )}
        </div>
    );
}
