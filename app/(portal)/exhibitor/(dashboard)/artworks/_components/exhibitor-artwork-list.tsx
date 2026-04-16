'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import SafeImage from '@/components/common/SafeImage';
import { deleteExhibitorArtwork } from '@/app/actions/exhibitor-artworks';
import { useToast } from '@/lib/hooks/useToast';
import { matchesAnySearch } from '@/lib/search-utils';
import { resolveArtworkImageUrlForPreset } from '@/lib/utils';
import {
  AdminBadge,
  AdminCard,
  AdminCardHeader,
  AdminEmptyState,
  AdminInput,
} from '@/app/admin/_components/admin-ui';
import { AdminConfirmModal } from '@/app/admin/_components/AdminConfirmModal';

const ArtworkLightbox = dynamic(() => import('@/components/ui/ArtworkLightbox'), { ssr: false });

type ArtworkItem = {
  id: string;
  title: string;
  status: 'available' | 'reserved' | 'sold' | 'hidden' | null;
  is_hidden: boolean | null;
  price: string | null;
  images: string[] | null;
  artists: { name_ko: string; owner_id?: string | null; id?: string } | null;
};

export function ExhibitorArtworkList({ artworks }: { artworks: ArtworkItem[] }) {
  const t = useTranslations('exhibitor.artworkList');
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxData, setLightboxData] = useState<{
    images: string[];
    initialIndex: number;
    alt: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const filtered = artworks.filter((artwork) => {
    if (!query.trim()) return true;
    return matchesAnySearch(query, [artwork.title, artwork.artists?.name_ko]);
  });

  const handleImageClick = (images: string[], title: string) => {
    const normalizedImages = (images || []).map((image) =>
      resolveArtworkImageUrlForPreset(image, 'detail')
    );
    if (!normalizedImages.length) return;

    setLightboxData({
      images: normalizedImages,
      initialIndex: 0,
      alt: title,
    });
    setLightboxOpen(true);
  };

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget;
    setDeleteTarget(null);
    setIsDeleting(id);
    try {
      await deleteExhibitorArtwork(id);
      toast.success(t('deleteSuccess'));
    } catch (error) {
      console.error('[exhibitor-artwork-list] Artwork deletion failed:', error);
      toast.error(t('deleteError'));
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminCard className="overflow-hidden">
        <AdminCardHeader>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">{t('title')}</h2>
            <AdminBadge tone="info">{t('count', { count: filtered.length })}</AdminBadge>
          </div>

          <div className="relative max-w-sm w-full">
            <label htmlFor="search-artworks" className="sr-only">
              {t('searchArtwork')}
            </label>
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg
                className="h-5 w-5 text-gray-400"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <AdminInput
              id="search-artworks"
              placeholder={t('searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 border-0 py-2 pl-10"
            />
          </div>
        </AdminCardHeader>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('artworkInfo')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('price')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('status')}
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">{t('manage')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-0">
                    <AdminEmptyState
                      title={query ? t('noSearchResult') : t('noArtwork')}
                      description={
                        query ? t('noSearchResultDescription') : t('noArtworkDescription')
                      }
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((artwork) => (
                  <tr key={artwork.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {artwork.images?.[0] ? (
                          <button
                            type="button"
                            className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100 cursor-pointer hover:opacity-80"
                            onClick={() => handleImageClick(artwork.images || [], artwork.title)}
                            aria-label={t('imagePreview', { title: artwork.title })}
                          >
                            <div className="absolute inset-1">
                              <SafeImage
                                src={resolveArtworkImageUrlForPreset(artwork.images[0], 'slider')}
                                alt={artwork.title}
                                fill
                                sizes="48px"
                                className="object-contain"
                              />
                            </div>
                          </button>
                        ) : (
                          <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-100">
                            <div className="flex h-full w-full items-center justify-center text-gray-300">
                              <svg
                                className="h-6 w-6"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                          </div>
                        )}
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">{artwork.title}</div>
                          <div className="text-sm text-gray-500">
                            {artwork.artists?.name_ko || t('unknownArtist')}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{artwork.price || '-'}</td>
                    <td className="px-6 py-4">
                      <AdminBadge
                        tone={
                          artwork.status === 'available'
                            ? 'success'
                            : artwork.status === 'reserved'
                              ? 'warning'
                              : artwork.status === 'hidden' || !artwork.status
                                ? 'info'
                                : 'default'
                        }
                      >
                        {artwork.status === 'available'
                          ? t('available')
                          : artwork.status === 'reserved'
                            ? t('reserved')
                            : artwork.status === 'hidden' || !artwork.status
                              ? t('hidden')
                              : t('sold')}
                      </AdminBadge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/exhibitor/artworks/${artwork.id}`}
                          className="rounded-md px-3 py-1.5 text-gray-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                        >
                          {t('edit')}
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(artwork.id)}
                          disabled={isDeleting === artwork.id}
                          className="rounded-md px-3 py-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isDeleting === artwork.id ? t('deleting') : t('delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </AdminCard>

      {lightboxData && (
        <ArtworkLightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          images={lightboxData.images}
          initialIndex={lightboxData.initialIndex}
          alt={lightboxData.alt}
        />
      )}

      <AdminConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={t('delete')}
        description={t('deleteConfirm')}
        variant="danger"
        isLoading={isDeleting !== null}
      />
    </div>
  );
}
