'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ArtworkLightbox from '@/components/ui/ArtworkLightbox';
import {
  deleteAdminArtwork,
  batchUpdateArtworkStatus,
  batchToggleHidden,
  batchDeleteArtworks,
} from '@/app/actions/admin-artworks';
import {
  AdminBadge,
  AdminCard,
  AdminCardHeader,
  AdminEmptyState,
  AdminInput,
  AdminSelect,
} from '@/app/admin/_components/admin-ui';
import { useToast } from '@/lib/hooks/useToast';

type ArtworkItem = {
  id: string;
  title: string;
  status: 'available' | 'reserved' | 'sold' | 'hidden';
  is_hidden: boolean;
  images: string[] | null;
  artists: { name_ko: string | null } | null;
};

type StatusFilter = 'all' | 'available' | 'reserved' | 'sold';
type VisibilityFilter = 'all' | 'visible' | 'hidden';

type InitialArtworkFilters = {
  status?: string;
  visibility?: string;
  q?: string;
};

function normalizeStatusFilter(value: string | undefined): StatusFilter {
  if (value === 'available' || value === 'reserved' || value === 'sold') return value;
  return 'all';
}

function normalizeVisibilityFilter(value: string | undefined): VisibilityFilter {
  if (value === 'visible' || value === 'hidden') return value;
  return 'all';
}

function normalizeQuery(value: string | undefined): string {
  return (value || '').trim();
}

export function AdminArtworkList({
  artworks,
  initialFilters,
}: {
  artworks: ArtworkItem[];
  initialFilters?: InitialArtworkFilters;
}) {
  const toast = useToast();
  const [optimisticArtworks, setOptimisticArtworks] = useState(artworks);
  const initialStatusFilter = normalizeStatusFilter(initialFilters?.status);
  const initialVisibilityFilter = normalizeVisibilityFilter(initialFilters?.visibility);
  const initialQuery = normalizeQuery(initialFilters?.q);

  useEffect(() => {
    setOptimisticArtworks(artworks);
  }, [artworks]);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatusFilter);
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>(initialVisibilityFilter);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxData, setLightboxData] = useState<{
    images: string[];
    initialIndex: number;
    alt: string;
  } | null>(null);

  useEffect(() => {
    setQuery(initialQuery);
    setStatusFilter(initialStatusFilter);
    setVisibilityFilter(initialVisibilityFilter);
    setSelectedIds(new Set());
  }, [initialQuery, initialStatusFilter, initialVisibilityFilter]);

  // -- Filters --
  const filtered = optimisticArtworks.filter((artwork) => {
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

  // -- Handlers --
  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set([...selectedIds].filter((id) => !filteredIds.has(id))));
    } else {
      setSelectedIds(new Set([...selectedIds, ...filtered.map((a) => a.id)]));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 작품을 삭제하시겠습니까?')) return;
    setProcessingId(id);

    setOptimisticArtworks((prev) => prev.filter((item) => item.id !== id));

    try {
      await deleteAdminArtwork(id);
      toast.success('작품을 삭제했습니다.');
    } catch (error) {
      setOptimisticArtworks(artworks);
      toast.error(error instanceof Error ? error.message : '작품 삭제 중 오류가 발생했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!newStatus) return;
    setProcessingId(id);

    setOptimisticArtworks((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus as any } : item))
    );

    try {
      await batchUpdateArtworkStatus([id], newStatus);
      toast.success('작품 상태를 변경했습니다.');
    } catch (error) {
      setOptimisticArtworks(artworks);
      toast.error(error instanceof Error ? error.message : '상태 변경 중 오류가 발생했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleHiddenToggle = async (id: string, currentHidden: boolean) => {
    setProcessingId(id);

    setOptimisticArtworks((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_hidden: !currentHidden } : item))
    );

    try {
      await batchToggleHidden([id], !currentHidden);
      toast.success(currentHidden ? '작품을 공개 처리했습니다.' : '작품을 숨김 처리했습니다.');
    } catch (error) {
      setOptimisticArtworks(artworks);
      toast.error(
        error instanceof Error ? error.message : '공개 상태 변경 중 오류가 발생했습니다.'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleImageClick = (images: string[], title: string) => {
    setLightboxData({
      images: images || [],
      initialIndex: 0,
      alt: title,
    });
    setLightboxOpen(true);
  };

  const handleBatchStatus = async (status: string) => {
    if (selectedInFiltered.length === 0) return;
    if (!confirm(`선택한 ${selectedInFiltered.length}개 작품의 상태를 변경하시겠습니까?`)) return;
    setBatchProcessing(true);

    const targets = new Set(selectedInFiltered);
    setOptimisticArtworks((prev) =>
      prev.map((item) => (targets.has(item.id) ? { ...item, status: status as any } : item))
    );

    try {
      await batchUpdateArtworkStatus(selectedInFiltered, status);
      setSelectedIds(new Set());
      toast.success('선택한 작품 상태를 변경했습니다.');
    } catch (error) {
      setOptimisticArtworks(artworks);
      toast.error(
        error instanceof Error ? error.message : '일괄 상태 변경 중 오류가 발생했습니다.'
      );
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

    const targets = new Set(selectedInFiltered);
    setOptimisticArtworks((prev) =>
      prev.map((item) => (targets.has(item.id) ? { ...item, is_hidden: isHidden } : item))
    );

    try {
      await batchToggleHidden(selectedInFiltered, isHidden);
      setSelectedIds(new Set());
      toast.success(
        isHidden ? '선택한 작품을 숨김 처리했습니다.' : '선택한 작품을 공개 처리했습니다.'
      );
    } catch (error) {
      setOptimisticArtworks(artworks);
      toast.error(
        error instanceof Error ? error.message : '일괄 공개 상태 변경 중 오류가 발생했습니다.'
      );
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedInFiltered.length === 0) return;
    if (!confirm(`선택한 ${selectedInFiltered.length}개 작품을 삭제하시겠습니까?`)) return;
    setBatchProcessing(true);

    const targets = new Set(selectedInFiltered);
    setOptimisticArtworks((prev) => prev.filter((item) => !targets.has(item.id)));

    try {
      await batchDeleteArtworks(selectedInFiltered);
      setSelectedIds(new Set());
      toast.success('선택한 작품을 삭제했습니다.');
    } catch (error) {
      setOptimisticArtworks(artworks);
      toast.error(error instanceof Error ? error.message : '일괄 삭제 중 오류가 발생했습니다.');
    } finally {
      setBatchProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminCard className="overflow-hidden">
        {/* Header & Main Controls */}
        <AdminCardHeader>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">작품 목록</h2>
            <AdminBadge tone="info">{filtered.length}개</AdminBadge>
          </div>

          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-[minmax(260px,1fr)_auto] sm:items-end">
            <div className="relative w-full sm:min-w-[320px]">
              <label htmlFor="search-artworks" className="sr-only">
                작품 검색
              </label>
              <AdminInput
                id="search-artworks"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="작품명, 작가명 검색..."
                aria-describedby="search-artworks-description"
                className="h-10 border-0 pl-10 pr-3"
              />
              <span id="search-artworks-description" className="sr-only">
                작품명 또는 작가명으로 검색할 수 있습니다. 현재 {filtered.length}개가 표시됩니다.
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end">
              <AdminSelect
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(normalizeStatusFilter(e.target.value));
                  setSelectedIds(new Set());
                }}
                wrapperClassName="min-w-[120px]"
              >
                <option value="all">모든 상태</option>
                <option value="available">판매 중</option>
                <option value="reserved">예약됨</option>
                <option value="sold">판매 완료</option>
              </AdminSelect>
              <AdminSelect
                value={visibilityFilter}
                onChange={(e) => {
                  setVisibilityFilter(normalizeVisibilityFilter(e.target.value));
                  setSelectedIds(new Set());
                }}
                wrapperClassName="min-w-[120px]"
              >
                <option value="all">모든 노출</option>
                <option value="visible">공개</option>
                <option value="hidden">숨김</option>
              </AdminSelect>
            </div>
          </div>
        </AdminCardHeader>

        {/* Batch Actions Toolbar (Visible only when selected) */}
        {selectedInFiltered.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 border-b border-indigo-100 bg-indigo-50 px-6 py-4 animate-fade-in">
            <span className="text-sm font-medium text-indigo-900">
              {selectedInFiltered.length}개 선택됨
            </span>
            <div className="h-4 w-px bg-indigo-200"></div>
            <div className="flex items-center gap-2">
              <AdminSelect
                onChange={(e) => {
                  if (e.target.value) handleBatchStatus(e.target.value);
                  e.target.value = '';
                }}
                disabled={batchProcessing}
                className="border-indigo-200"
              >
                <option value="">상태 변경...</option>
                <option value="available">판매 중</option>
                <option value="reserved">예약됨</option>
                <option value="sold">판매 완료</option>
              </AdminSelect>
              <button
                onClick={() => handleBatchHidden(true)}
                disabled={batchProcessing}
                className="h-10 rounded border border-gray-300 bg-white px-3 text-sm text-gray-700 hover:bg-gray-50"
              >
                숨김
              </button>
              <button
                onClick={() => handleBatchHidden(false)}
                disabled={batchProcessing}
                className="h-10 rounded border border-gray-300 bg-white px-3 text-sm text-gray-700 hover:bg-gray-50"
              >
                노출
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={batchProcessing}
                className="h-10 rounded border border-red-300 bg-white px-3 text-sm text-red-600 hover:bg-red-50"
              >
                삭제
              </button>
            </div>
            {batchProcessing && (
              <span className="text-xs text-indigo-600 animate-pulse">처리 중...</span>
            )}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                  />
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  작품 정보
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  상태
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  공개 여부
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">관리</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-0">
                    <AdminEmptyState title="검색된 작품이 없습니다" />
                  </td>
                </tr>
              ) : (
                filtered.map((artwork) => (
                  <tr
                    key={artwork.id}
                    className={`hover:bg-gray-50 transition-colors ${selectedIds.has(artwork.id) ? 'bg-indigo-50/30' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(artwork.id)}
                        onChange={() => toggleSelect(artwork.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div
                          className={`h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-gray-100 border border-gray-200 ${
                            artwork.images?.[0] ? 'cursor-zoom-in' : ''
                          }`}
                          onClick={() => {
                            if (artwork.images?.[0]) {
                              handleImageClick(artwork.images || [], artwork.title);
                            }
                          }}
                          onKeyDown={(e) => {
                            if ((e.key === 'Enter' || e.key === ' ') && artwork.images?.[0]) {
                              e.preventDefault();
                              handleImageClick(artwork.images || [], artwork.title);
                            }
                          }}
                          role={artwork.images?.[0] ? 'button' : undefined}
                          tabIndex={artwork.images?.[0] ? 0 : undefined}
                          aria-label={artwork.images?.[0] ? '이미지 확대하기' : undefined}
                        >
                          {artwork.images?.[0] ? (
                            <img
                              className="h-full w-full object-cover"
                              src={artwork.images[0]}
                              alt=""
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
                          <Link
                            href={`/admin/artworks/${artwork.id}`}
                            className="font-medium text-gray-900 hover:text-indigo-600 hover:underline"
                          >
                            {artwork.title}
                          </Link>
                          <div className="text-sm text-gray-500">
                            {artwork.artists?.name_ko || '작가 미상'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <AdminSelect
                        wrapperClassName="min-w-28"
                        iconClassName="h-3.5 w-3.5"
                        value={artwork.status}
                        onChange={(e) => handleStatusChange(artwork.id, e.target.value)}
                        disabled={processingId === artwork.id}
                        className={`py-1 pl-2.5 pr-7 text-xs font-semibold ${
                          artwork.status === 'available'
                            ? 'border-green-200 bg-green-50 text-green-700 focus:border-green-400'
                            : artwork.status === 'reserved'
                              ? 'border-amber-200 bg-amber-50 text-amber-700 focus:border-amber-400'
                              : 'border-sky-200 bg-sky-50 text-sky-700 focus:border-sky-400'
                        }`}
                      >
                        <option value="available">판매 중</option>
                        <option value="reserved">예약됨</option>
                        <option value="sold">판매 완료</option>
                      </AdminSelect>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleHiddenToggle(artwork.id, artwork.is_hidden)}
                        disabled={processingId === artwork.id}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                          artwork.is_hidden
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        }`}
                      >
                        {artwork.is_hidden ? '숨김' : '공개 중'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/artworks/${artwork.id}`}
                          className="text-gray-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-indigo-50"
                        >
                          편집
                        </Link>
                        <button
                          onClick={() => handleDelete(artwork.id)}
                          disabled={processingId === artwork.id}
                          className="text-gray-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 disabled:opacity-50"
                        >
                          삭제
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
