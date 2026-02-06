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

  // Clear selection when filters change
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setSelectedIds(new Set());
  };

  const handleVisibilityFilterChange = (value: string) => {
    setVisibilityFilter(value);
    setSelectedIds(new Set());
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setSelectedIds(new Set());
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
      <div className="bg-white shadow-sm rounded-lg p-8 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
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
        <h3 className="mt-2 text-sm font-medium text-gray-900">등록된 작품이 없습니다</h3>
        <p className="mt-1 text-sm text-gray-500">작가가 작품을 등록하면 여기에 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white shadow-sm rounded-lg p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="검색: 작품명/작가명"
            aria-label="작품 검색"
            className="w-full sm:flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            aria-label="상태 필터"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">상태 전체</option>
            <option value="available">판매 중</option>
            <option value="reserved">예약됨</option>
            <option value="sold">판매 완료</option>
          </select>
          <select
            value={visibilityFilter}
            onChange={(e) => handleVisibilityFilterChange(e.target.value)}
            aria-label="노출 필터"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
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
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {batchProcessing && (
                <span className="text-sm text-gray-500 flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4 text-indigo-600"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  처리 중...
                </span>
              )}
              <select
                onChange={(e) => {
                  if (e.target.value) handleBatchStatus(e.target.value);
                  e.target.value = '';
                }}
                disabled={batchProcessing}
                aria-label="상태 일괄 변경"
                className="rounded-md border border-gray-300 px-3 py-2 text-sm disabled:opacity-50 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">상태 변경...</option>
                <option value="available">판매 중</option>
                <option value="reserved">예약됨</option>
                <option value="sold">판매 완료</option>
              </select>
              <div className="flex gap-2">
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
            </div>
          )}
        </div>
      </div>

      {/* Artwork List */}
      {filtered.map((artwork) => (
        <form
          key={artwork.id}
          action={updateAdminArtwork.bind(null, artwork.id)}
          className="bg-white shadow-sm rounded-lg p-4"
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

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-2">
                <span className="text-gray-600">상태</span>
                <select
                  name="status"
                  defaultValue={artwork.status}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
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
            <Button type="submit" variant="secondary" size="sm" disabled={batchProcessing}>
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
