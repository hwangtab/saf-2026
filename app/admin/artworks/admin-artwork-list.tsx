'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  deleteAdminArtwork,
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

  // -- Filters --
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
    try {
      await deleteAdminArtwork(id);
      router.refresh();
    } finally {
      setProcessingId(null);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!newStatus) return;
    setProcessingId(id);
    const formData = new FormData();
    formData.append('status', newStatus);
    // Preserving is_hidden state is tricky without reading it,
    // but updateAdminArtwork usually handles partial updates or we assume form submission.
    // Here we invoke the server action directly if it supports it, or simulate form submission.
    // Ideally updateAdminArtwork should be cleaner.
    // For now, let's use the batch function for single item or direct server action call if suitable.
    // Actually updateAdminArtwork expects FormData. Let's use batch for single item update to be safe
    // or wrap it.
    // Simplified: Just use batch for single item for now to avoid FormData complexity here.
    try {
      await batchUpdateArtworkStatus([id], newStatus);
      router.refresh();
    } finally {
      setProcessingId(null);
    }
  };

  const handleHiddenToggle = async (id: string, currentHidden: boolean) => {
    setProcessingId(id);
    try {
      await batchToggleHidden([id], !currentHidden);
      router.refresh();
    } finally {
      setProcessingId(null);
    }
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
    if (!confirm(`선택한 ${selectedInFiltered.length}개 작품을 삭제하시겠습니까?`)) return;
    setBatchProcessing(true);
    try {
      await batchDeleteArtworks(selectedInFiltered);
      setSelectedIds(new Set());
      router.refresh();
    } finally {
      setBatchProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        {/* Header & Main Controls */}
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">작품 목록</h2>
            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
              {filtered.length}개
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative max-w-xs w-full">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="작품명, 작가명 검색..."
                className="block w-full rounded-md border-0 py-1.5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setSelectedIds(new Set());
                }}
                className="block rounded-md border-0 py-1.5 pl-3 pr-8 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
              >
                <option value="all">모든 상태</option>
                <option value="available">판매 중</option>
                <option value="reserved">예약됨</option>
                <option value="sold">판매 완료</option>
              </select>
              <select
                value={visibilityFilter}
                onChange={(e) => {
                  setVisibilityFilter(e.target.value);
                  setSelectedIds(new Set());
                }}
                className="block rounded-md border-0 py-1.5 pl-3 pr-8 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
              >
                <option value="all">모든 노출</option>
                <option value="visible">공개</option>
                <option value="hidden">숨김</option>
              </select>
            </div>
          </div>
        </div>

        {/* Batch Actions Toolbar (Visible only when selected) */}
        {selectedInFiltered.length > 0 && (
          <div className="bg-indigo-50 px-6 py-3 flex flex-wrap items-center gap-4 border-b border-indigo-100 animate-fade-in">
            <span className="text-sm font-medium text-indigo-900">
              {selectedInFiltered.length}개 선택됨
            </span>
            <div className="h-4 w-px bg-indigo-200"></div>
            <div className="flex items-center gap-2">
              <select
                onChange={(e) => {
                  if (e.target.value) handleBatchStatus(e.target.value);
                  e.target.value = '';
                }}
                disabled={batchProcessing}
                className="rounded border-gray-300 text-sm py-1"
              >
                <option value="">상태 변경...</option>
                <option value="available">판매 중</option>
                <option value="reserved">예약됨</option>
                <option value="sold">판매 완료</option>
              </select>
              <button
                onClick={() => handleBatchHidden(true)}
                disabled={batchProcessing}
                className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 text-gray-700"
              >
                숨김
              </button>
              <button
                onClick={() => handleBatchHidden(false)}
                disabled={batchProcessing}
                className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50 text-gray-700"
              >
                노출
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={batchProcessing}
                className="px-3 py-1 bg-white border border-red-300 rounded text-sm hover:bg-red-50 text-red-600"
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
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <svg
                        className="h-10 w-10 text-gray-300 mb-2"
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
                      <p>검색된 작품이 없습니다.</p>
                    </div>
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
                        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-gray-100 border border-gray-200">
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
                      <select
                        value={artwork.status}
                        onChange={(e) => handleStatusChange(artwork.id, e.target.value)}
                        disabled={processingId === artwork.id}
                        className={`block w-full rounded-md border-0 py-1 pl-2 text-xs font-medium ring-1 ring-inset focus:ring-2 focus:ring-indigo-600 ${
                          artwork.status === 'available'
                            ? 'text-green-700 ring-green-600/20 bg-green-50'
                            : artwork.status === 'reserved'
                              ? 'text-yellow-800 ring-yellow-600/20 bg-yellow-50'
                              : 'text-blue-700 ring-blue-600/20 bg-blue-50'
                        }`}
                      >
                        <option value="available">판매 중</option>
                        <option value="reserved">예약됨</option>
                        <option value="sold">판매 완료</option>
                      </select>
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
      </div>
    </div>
  );
}
