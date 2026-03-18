'use client';

import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
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
import { resolveClientLocale } from '@/lib/client-locale';

const ArtworkLightbox = dynamic(() => import('@/components/ui/ArtworkLightbox'), { ssr: false });

type LocaleCode = 'ko' | 'en';

const EXHIBITOR_ARTWORK_LIST_COPY: Record<
  LocaleCode,
  {
    deleteConfirm: string;
    deleteSuccess: string;
    deleteError: string;
    title: string;
    count: (count: number) => string;
    searchArtwork: string;
    searchPlaceholder: string;
    artworkInfo: string;
    price: string;
    status: string;
    manage: string;
    noSearchResult: string;
    noArtwork: string;
    noSearchResultDescription: string;
    noArtworkDescription: string;
    unknownArtist: string;
    available: string;
    reserved: string;
    sold: string;
    edit: string;
    deleting: string;
    delete: string;
  }
> = {
  ko: {
    deleteConfirm: '정말 이 작품을 삭제하시겠습니까?',
    deleteSuccess: '작품을 삭제했습니다.',
    deleteError: '삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    title: '등록된 작품',
    count: (count: number) => `${count}개`,
    searchArtwork: '작품 검색',
    searchPlaceholder: '작품명 또는 작가명 검색...',
    artworkInfo: '작품 정보',
    price: '가격',
    status: '상태',
    manage: '관리',
    noSearchResult: '검색 결과가 없습니다.',
    noArtwork: '등록된 작품이 없습니다.',
    noSearchResultDescription: '다른 검색어로 시도해보세요.',
    noArtworkDescription: '새로운 작품을 등록하여 전시를 시작해보세요.',
    unknownArtist: '작가 미상',
    available: '판매 중',
    reserved: '예약됨',
    sold: '판매 완료',
    edit: '편집',
    deleting: '삭제 중...',
    delete: '삭제',
  },
  en: {
    deleteConfirm: 'Are you sure you want to delete this artwork?',
    deleteSuccess: 'Artwork deleted.',
    deleteError: 'An error occurred while deleting. Please try again shortly.',
    title: 'Registered artworks',
    count: (count: number) => `${count}`,
    searchArtwork: 'Search artworks',
    searchPlaceholder: 'Search by artwork title or artist name...',
    artworkInfo: 'Artwork info',
    price: 'Price',
    status: 'Status',
    manage: 'Manage',
    noSearchResult: 'No search results.',
    noArtwork: 'No artworks registered.',
    noSearchResultDescription: 'Try a different keyword.',
    noArtworkDescription: 'Register a new artwork to start your exhibition.',
    unknownArtist: 'Unknown artist',
    available: 'Available',
    reserved: 'Reserved',
    sold: 'Sold',
    edit: 'Edit',
    deleting: 'Deleting...',
    delete: 'Delete',
  },
};

type ArtworkItem = {
  id: string;
  title: string;
  status: 'available' | 'reserved' | 'sold' | 'hidden';
  is_hidden: boolean;
  price: string | null;
  images: string[] | null;
  artists: { name_ko: string | null } | null;
};

export function ExhibitorArtworkList({ artworks }: { artworks: ArtworkItem[] }) {
  const pathname = usePathname();
  const locale = resolveClientLocale(pathname);
  const copy = EXHIBITOR_ARTWORK_LIST_COPY[locale];
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

  const handleDelete = async (id: string) => {
    if (!confirm(copy.deleteConfirm)) return;
    setIsDeleting(id);
    try {
      await deleteExhibitorArtwork(id);
      toast.success(copy.deleteSuccess);
    } catch (error) {
      console.error('[exhibitor-artwork-list] Artwork deletion failed:', error);
      toast.error(copy.deleteError);
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminCard className="overflow-hidden">
        <AdminCardHeader>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">{copy.title}</h2>
            <AdminBadge tone="info">{copy.count(filtered.length)}</AdminBadge>
          </div>

          <div className="relative max-w-sm w-full">
            <label htmlFor="search-artworks" className="sr-only">
              {copy.searchArtwork}
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
              placeholder={copy.searchPlaceholder}
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
                  {copy.artworkInfo}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {copy.price}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {copy.status}
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">{copy.manage}</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-0">
                    <AdminEmptyState
                      title={query ? copy.noSearchResult : copy.noArtwork}
                      description={
                        query ? copy.noSearchResultDescription : copy.noArtworkDescription
                      }
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((artwork) => (
                  <tr key={artwork.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div
                          className={`relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-gray-100 border border-gray-200 ${
                            artwork.images?.[0] ? 'cursor-pointer hover:opacity-80' : ''
                          }`}
                          onClick={() =>
                            artwork.images?.[0] && handleImageClick(artwork.images, artwork.title)
                          }
                        >
                          {artwork.images?.[0] ? (
                            <SafeImage
                              src={resolveArtworkImageUrlForPreset(artwork.images[0], 'slider')}
                              alt={artwork.title}
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-gray-300">
                              <svg
                                className="h-6 w-6"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={1.5}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">{artwork.title}</div>
                          <div className="text-sm text-gray-500">
                            {artwork.artists?.name_ko || copy.unknownArtist}
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
                              : 'default'
                        }
                      >
                        {artwork.status === 'available'
                          ? copy.available
                          : artwork.status === 'reserved'
                            ? copy.reserved
                            : copy.sold}
                      </AdminBadge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/exhibitor/artworks/${artwork.id}`}
                          className="rounded-md px-3 py-1.5 text-gray-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                        >
                          {copy.edit}
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(artwork.id)}
                          disabled={isDeleting === artwork.id}
                          className="rounded-md px-3 py-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isDeleting === artwork.id ? copy.deleting : copy.delete}
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
    </div>
  );
}
