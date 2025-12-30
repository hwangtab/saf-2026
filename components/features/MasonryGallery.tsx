'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Artwork } from '@/content/saf2026-artworks';
import { useMemo, useState, useEffect } from 'react';

interface MasonryGalleryProps {
    artworks: Artwork[];
    showArtistNav?: boolean;
}

export default function MasonryGallery({ artworks, showArtistNav = true }: MasonryGalleryProps) {
    // Get unique artist names in order of appearance (already sorted by ㄱㄴㄷ)
    const uniqueArtists = useMemo(() => {
        const seen = new Set<string>();
        return artworks.filter(a => {
            if (seen.has(a.artist)) return false;
            seen.add(a.artist);
            return true;
        }).map(a => a.artist);
    }, [artworks]);

    // Track which artists appear first (for anchor)
    const firstArtworkByArtist = useMemo(() => {
        const map = new Map<string, string>();
        artworks.forEach(a => {
            if (!map.has(a.artist)) {
                map.set(a.artist, a.id);
            }
        });
        return map;
    }, [artworks]);

    const scrollToArtist = (artist: string) => {
        const artworkId = firstArtworkByArtist.get(artist);
        if (artworkId) {
            const element = document.getElementById(`artwork-${artworkId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    };

    // Columns state for responsive layout
    const [columns, setColumns] = useState(1);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const updateColumns = () => {
            if (window.innerWidth >= 1024) setColumns(3); // lg
            else if (window.innerWidth >= 768) setColumns(2); // md
            else setColumns(1);
        };

        updateColumns();
        window.addEventListener('resize', updateColumns);
        return () => window.removeEventListener('resize', updateColumns);
    }, []);

    // Distribute artworks into columns for Left-to-Right flow
    const distributedArtworks = useMemo(() => {
        const cols = Array.from({ length: columns }, () => [] as Array<Artwork & { originalIndex: number }>);
        artworks.forEach((art, i) => {
            cols[i % columns].push({ ...art, originalIndex: i });
        });
        return cols;
    }, [artworks, columns]);

    if (!mounted) return null;

    return (
        <div>
            {/* Artist Navigation - only shown when sorted by artist */}
            {showArtistNav && (
                <div className="sticky top-16 z-30 bg-gray-50/95 backdrop-blur-sm py-2 border-b border-gray-200">
                    <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 lg:grid-cols-11 gap-2 px-4">
                        {uniqueArtists.map((artist) => (
                            <button
                                key={artist}
                                onClick={() => scrollToArtist(artist)}
                                className="px-2 py-1.5 text-xs sm:text-sm font-medium bg-white border border-gray-200 rounded-full hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 text-center truncate"
                            >
                                {artist}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Gallery */}
            <div className="flex gap-6 p-4">
                {distributedArtworks.map((column, colIndex) => (
                    <div key={colIndex} className="flex-1 flex flex-col gap-6">
                        {column.map((artwork) => (
                            <motion.div
                                key={artwork.id}
                                id={`artwork-${artwork.id}`}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: (artwork.originalIndex % 20) * 0.05 }} // Limit delay to avoid too long waits on large lists
                                className="break-inside-avoid"
                            >
                                <Link href={`/artworks/${artwork.id}`} className="group block">
                                    <div className="relative overflow-hidden rounded-xl bg-gray-100 shadow-sm transition-shadow hover:shadow-md">
                                        <div className="relative w-full">
                                            <Image
                                                src={`/images/artworks/${artwork.image}`}
                                                alt={artwork.title}
                                                width={500}
                                                height={500}
                                                className="w-full h-auto object-cover transform transition-transform duration-500 group-hover:scale-105"
                                                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                                            {/* SOLD 배지 */}
                                            {artwork.sold && (
                                                <div className="absolute top-3 right-3 bg-red-600 text-white px-3 py-1 rounded-md font-bold text-sm shadow-md">
                                                    SOLD
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-4 bg-white">
                                            <h3 className="text-lg font-bold text-charcoal font-sans group-hover:text-primary transition-colors">
                                                {artwork.title}
                                            </h3>
                                            <p className="text-sm text-charcoal-muted mt-1">{artwork.artist}</p>
                                            {/* 재료 및 크기 표시 (정보가 있을 때만) */}
                                            {(artwork.material || artwork.size) &&
                                                (artwork.material !== '확인 중' || artwork.size !== '확인 중') &&
                                                (artwork.material !== '' || artwork.size !== '') && (
                                                    <p className="text-xs text-charcoal-soft mt-2">
                                                        {artwork.material && artwork.material !== '확인 중' && artwork.material}
                                                        {artwork.material && artwork.material !== '확인 중' &&
                                                            artwork.size && artwork.size !== '확인 중' && ' · '}
                                                        {artwork.size && artwork.size !== '확인 중' && artwork.size}
                                                    </p>
                                                )}
                                            {/* 판매완료 또는 가격 표시 */}
                                            {artwork.sold ? (
                                                <p className="text-sm font-semibold text-red-600 mt-1">판매완료</p>
                                            ) : artwork.price !== '문의' && artwork.price !== '확인 중' && (
                                                <p className="text-sm font-semibold text-primary mt-1">{artwork.price}</p>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

