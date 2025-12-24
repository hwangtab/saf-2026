'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Artwork } from '@/content/saf2026-artworks';

interface MasonryGalleryProps {
    artworks: Artwork[];
}

export default function MasonryGallery({ artworks }: MasonryGalleryProps) {
    return (
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6 p-4">
            {artworks.map((artwork, index) => (
                <motion.div
                    key={artwork.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: (index % 10) * 0.05 }}
                    className="break-inside-avoid mb-6"
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
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                            </div>

                            <div className="p-4 bg-white">
                                <h3 className="text-lg font-bold text-charcoal font-sans group-hover:text-primary transition-colors">
                                    {artwork.title}
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">{artwork.artist}</p>
                                {(artwork.material !== '확인 중' || artwork.size !== '확인 중') && (
                                    <p className="text-xs text-gray-400 mt-2">
                                        {artwork.material !== '확인 중' && artwork.material}
                                        {artwork.material !== '확인 중' && artwork.size !== '확인 중' && ' · '}
                                        {artwork.size !== '확인 중' && artwork.size}
                                    </p>
                                )}
                                {artwork.price !== '문의' && artwork.price !== '확인 중' && (
                                    <p className="text-sm font-semibold text-primary mt-1">{artwork.price}</p>
                                )}
                            </div>
                        </div>
                    </Link>
                </motion.div>
            ))}
        </div>
    );
}
