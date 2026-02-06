'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import {
  deleteAdminArtwork,
  updateAdminArtwork,
  batchUpdateArtworkStatus,
  batchToggleHidden,
  batchDeleteArtworks,
} from '@/app/actions/admin-artworks';

type ArtworkItem = {
  id: string;
  title: string;
  status: 'available' | 'reserved' | 'sold' | 'hidden';
  is_hidden: boolean;
  images: string[] | null;
  artists: { name_ko: string | null } | null;
};

export function AdminArtworkList({ artworks }: { artworks: ArtworkItem[] }) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleDelete = async (id: string) => {
    if (!confirm('이 작품을 삭제하시겠습니까?')) return;
    setProcessingId(id);
    try {
      await deleteAdminArtwork(id);
      router.refresh();
    } finally {
      setProcessingId(null);
    }
  };

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

  const filteredIds = new Set(filtered.map((a) => a.id));
  const selectedInFiltered = [...selectedIds].filter((id) => filteredIds.has(id));
  const allFilteredSelected = filtered.length > 0 && selectedInFiltered.length === filtered.length;

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set([...selectedIds].filter((id) => !filteredIds.has(id))));
    } else {
      setSelectedIds(new Set([...selectedIds, ...filtered.map((a) => a.id)]));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleBatchStatus = async (status: string) => {
    if (selectedInFiltered.length === 0) return;
    if (!confirm(`선택한 ${selectedInFiltered.length}개 작품의 상태를 변경하시겠습니까?`)) return;

    setBatchProcessing(true);
    try {
      await batchUpdateArtworkStatus(selectedInFiltered, status);
      setSelectedIds(new Set());
      router.refresh();
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleBatchHidden = async (isHidden: boolean) => {
    if (selectedInFiltered.length === 0) return;
    const action = isHidden ? '숨김' : '노출';
    if (!confirm(`선택한 ${selectedInFiltered.length}개 작품을 ${action} 처리하시겠습니까?`))
      return;

    setBatchProcessing(true);
    try {
      await batchToggleHidden(selectedInFiltered, isHidden);
      setSelectedIds(new Set());
      router.refresh();
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedInFiltered.length === 0) return;
    if (
      !confirm(
        `선택한 ${selectedInFiltered.length}개 작품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`
      )
    )
      return;

    setBatchProcessing(true);
    try {
      await batchDeleteArtworks(selectedInFiltered);
      setSelectedIds(new Set());
      router.refresh();
    } finally {
      setBatchProcessing(false);
    }
  };

  if (artworks.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-6 text-sm text-gray-500">
        등록된 작품이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
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

      {/* Batch Operations Bar */}
      <div className="bg-white shadow-sm rounded-lg p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleSelectAll}
                className="rounded"
              />
              <span className="text-gray-600">전체 선택</span>
            </label>
            {selectedInFiltered.length > 0 && (
              <span className="text-sm text-indigo-600 font-medium">
                {selectedInFiltered.length}개 선택됨
              </span>
            )}
          </div>

          {selectedInFiltered.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <select
                onChange={(e) => {
                  if (e.target.value) handleBatchStatus(e.target.value);
                  e.target.value = '';
                }}
                disabled={batchProcessing}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              >
                <option value="">상태 변경...</option>
                <option value="available">판매 중</option>
                <option value="reserved">예약됨</option>
                <option value="sold">판매 완료</option>
              </select>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleBatchHidden(true)}
                disabled={batchProcessing}
              >
                숨김
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleBatchHidden(false)}
                disabled={batchProcessing}
              >
                노출
              </Button>
              <Button
                type="button"
                variant="white"
                size="sm"
                className="text-red-600"
                onClick={handleBatchDelete}
                disabled={batchProcessing}
              >
                삭제
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Artwork List */}
      {filtered.map((artwork) => (
        <form
          key={artwork.id}
          action={updateAdminArtwork.bind(null, artwork.id)}
          className="bg-white shadow-sm rounded-lg p-6 space-y-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <input
                type="checkbox"
                checked={selectedIds.has(artwork.id)}
                onChange={() => toggleSelect(artwork.id)}
                className="rounded mt-1"
              />
              <div className="h-16 w-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
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
                <Link
                  href={`/admin/artworks/${artwork.id}`}
                  className="text-lg font-medium text-gray-900 hover:text-blue-600"
                >
                  {artwork.title}
                </Link>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" href={`/admin/artworks/${artwork.id}`}>
                편집
              </Button>
              <Button
                type="button"
                variant="white"
                className="text-red-600"
                onClick={() => handleDelete(artwork.id)}
                loading={processingId === artwork.id}
                disabled={processingId !== null || batchProcessing}
              >
                삭제
              </Button>
            </div>
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
            <Button type="submit" variant="secondary" disabled={batchProcessing}>
              저장
            </Button>
          </div>
        </form>
      ))}

      {/* Summary */}
      <div className="text-sm text-gray-500">
        총 {filtered.length}개의 작품
        {filtered.length !== artworks.length && ` (전체 ${artworks.length}개 중)`}
      </div>
    </div>
  );
}
