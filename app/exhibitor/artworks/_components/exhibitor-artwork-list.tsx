'use client';

import { useState } from 'react';
import Image from 'next/image';
import ArtworkLightbox from '@/components/ui/ArtworkLightbox';
import { deleteExhibitorArtwork } from '@/app/actions/exhibitor-artworks';
import { useToast } from '@/lib/hooks/useToast';
import {
  AdminBadge,
  AdminCard,
  AdminCardHeader,
  AdminEmptyState,
  AdminInput,
} from '@/app/admin/_components/admin-ui';

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
    if (!query) return true;
    const q = query.toLowerCase();
    const title = artwork.title.toLowerCase();
    const artist = (artwork.artists?.name_ko || '').toLowerCase();
    return title.includes(q) || artist.includes(q);
  });

  const handleImageClick = (images: string[], title: string) => {
    if (!images.length) return;
    setLightboxData({
      images,
      initialIndex: 0,
      alt: title,
    });
    setLightboxOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 작품을 삭제하시겠습니까?')) return;
    setIsDeleting(id);
    try {
      await deleteExhibitorArtwork(id);
      toast.success('작품이 삭제되었습니다.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '삭제 실패');
    } finally {
      setIsDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminCard className="overflow-hidden">
        <AdminCardHeader>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">등록된 작품</h2>
            <AdminBadge tone="info">{filtered.length}개</AdminBadge>
          </div>
          <div className="w-full sm:w-72">
            <AdminInput
              placeholder="작품명 또는 작가명 검색..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </AdminCardHeader>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  작품 정보
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  가격
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="relative px-6 py-3">
                  <span className="sr-only">관리</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-0">
                    <AdminEmptyState
                      title={query ? '검색 결과가 없습니다.' : '등록된 작품이 없습니다.'}
                      description={
                        query
                          ? '다른 검색어로 시도해보세요.'
                          : '새로운 작품을 등록하여 전시를 시작해보세요.'
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
                          className={`h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-gray-100 border border-gray-200 ${
                            artwork.images?.[0] ? 'cursor-pointer hover:opacity-80' : ''
                          }`}
                          onClick={() =>
                            artwork.images?.[0] && handleImageClick(artwork.images, artwork.title)
                          }
                        >
                          {artwork.images?.[0] ? (
                            <Image
                              src={artwork.images[0]}
                              alt={artwork.title}
                              width={48}
                              height={48}
                              className="h-full w-full object-cover"
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
                            {artwork.artists?.name_ko || '작가 미상'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{artwork.price || '-'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          artwork.status === 'available'
                            ? 'bg-green-100 text-green-800'
                            : artwork.status === 'reserved'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {artwork.status === 'available'
                          ? '판매 중'
                          : artwork.status === 'reserved'
                            ? '예약됨'
                            : '판매 완료'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleDelete(artwork.id)}
                          disabled={isDeleting === artwork.id}
                          className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        >
                          {isDeleting === artwork.id ? '삭제 중...' : '삭제'}
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
