'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import { deleteAdminArtwork, updateAdminArtwork } from '@/app/actions/admin-artworks';

type ArtworkItem = {
  id: string;
  title: string;
  status: 'available' | 'reserved' | 'sold' | 'hidden';
  is_hidden: boolean;
  images: string[] | null;
  artists: { name_ko: string | null } | null;
};

export function AdminArtworkList({ artworks }: { artworks: ArtworkItem[] }) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all');

  const handleDelete = async (id: string) => {
    if (!confirm('이 작품을 삭제하시겠습니까?')) return;
    setProcessingId(id);
    try {
      await deleteAdminArtwork(id);
    } finally {
      setProcessingId(null);
    }
  };

  if (artworks.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-6 text-sm text-gray-500">
        등록된 작품이 없습니다.
      </div>
    );
  }

  const filtered = artworks.filter((artwork) => {
    if (statusFilter !== 'all' && artwork.status !== statusFilter) return false;
    if (visibilityFilter === 'visible' && artwork.is_hidden) return false;
    if (visibilityFilter === 'hidden' && !artwork.is_hidden) return false;
    if (!query) return true;
    const q = query.toLowerCase().replace(/\s+/g, '');
    const title = artwork.title.toLowerCase().replace(/\s+/g, '');
    const artist = (artwork.artists?.name_ko || '').toLowerCase().replace(/\s+/g, '');
    return title.includes(q) || artist.includes(q);
  });

  return (
    <div className="space-y-4">
      <div className="bg-white shadow-sm rounded-lg p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색: 작품명/작가명"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">상태 전체</option>
            <option value="available">판매 중</option>
            <option value="reserved">예약됨</option>
            <option value="sold">판매 완료</option>
          </select>
          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">노출 전체</option>
            <option value="visible">노출</option>
            <option value="hidden">숨김</option>
          </select>
        </div>
      </div>
      {filtered.map((artwork) => (
        <form
          key={artwork.id}
          action={updateAdminArtwork.bind(null, artwork.id)}
          className="bg-white shadow-sm rounded-lg p-6 space-y-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 bg-gray-100 rounded-md overflow-hidden">
                {artwork.images?.[0] ? (
                  <img
                    src={artwork.images[0]}
                    alt={artwork.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xs text-gray-400">
                    No Image
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm text-gray-500">
                  {artwork.artists?.name_ko || '알 수 없음'}
                </div>
                <div className="text-lg font-medium text-gray-900">{artwork.title}</div>
              </div>
            </div>
            <Button
              type="button"
              variant="white"
              className="text-red-600"
              onClick={() => handleDelete(artwork.id)}
              loading={processingId === artwork.id}
              disabled={processingId !== null}
            >
              삭제
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm">
            <label className="flex items-center gap-2">
              <span className="text-gray-600">상태</span>
              <select
                name="status"
                defaultValue={artwork.status}
                className="rounded-md border border-gray-300 px-2 py-1"
              >
                <option value="available">판매 중</option>
                <option value="reserved">예약됨</option>
                <option value="sold">판매 완료</option>
              </select>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="is_hidden" defaultChecked={artwork.is_hidden} />
              <span className="text-gray-600">숨김</span>
            </label>
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="secondary">
              저장
            </Button>
          </div>
        </form>
      ))}
    </div>
  );
}
