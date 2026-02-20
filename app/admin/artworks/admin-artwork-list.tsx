'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ArtworkLightbox from '@/components/ui/ArtworkLightbox';
import SafeImage from '@/components/common/SafeImage';
import Button from '@/components/ui/Button';
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
  AdminHelp,
} from '@/app/admin/_components/admin-ui';
import { AdminConfirmModal } from '@/app/admin/_components/AdminConfirmModal';
import { useToast } from '@/lib/hooks/useToast';
import { matchesAnySearch } from '@/lib/search-utils';
import { resolveArtworkImageUrlForPreset } from '@/lib/utils';

type ArtworkItem = {
  id: string;
  title: string;
  status: 'available' | 'reserved' | 'sold' | 'hidden';
  is_hidden: boolean;
  images: string[] | null;
  created_at: string | null;
  artists: { name_ko: string | null } | null;
};

type StatusFilter = 'all' | 'available' | 'reserved' | 'sold';
type VisibilityFilter = 'all' | 'visible' | 'hidden';
type SortKey = 'artwork_info' | 'status' | 'visibility' | 'created_at';
type SortDirection = 'asc' | 'desc';
type SortFilter = 'default' | 'recent' | 'oldest';

type InitialArtworkFilters = {
  status?: string;
  visibility?: string;
  q?: string;
  sort?: string;
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

function normalizeSortFilter(value: string | undefined): SortFilter {
  if (value === 'recent' || value === 'oldest') return value;
  return 'default';
}

function getSortStateFromFilter(sortFilter: SortFilter): {
  key: SortKey;
  direction: SortDirection;
} {
  if (sortFilter === 'recent') {
    return { key: 'created_at', direction: 'desc' };
  }

  if (sortFilter === 'oldest') {
    return { key: 'created_at', direction: 'asc' };
  }

  return { key: 'artwork_info', direction: 'asc' };
}

function mapSortStateToFilter(sortKey: SortKey, sortDirection: SortDirection): SortFilter {
  if (sortKey !== 'created_at') return 'default';
  return sortDirection === 'desc' ? 'recent' : 'oldest';
}

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function AdminArtworkList({
  artworks,
  initialFilters,
}: {
  artworks: ArtworkItem[];
  initialFilters?: InitialArtworkFilters;
}) {
  const toast = useToast();
  const pathname = usePathname();
  const [optimisticArtworks, setOptimisticArtworks] = useState(artworks);
  const initialStatusFilter = normalizeStatusFilter(initialFilters?.status);
  const initialVisibilityFilter = normalizeVisibilityFilter(initialFilters?.visibility);
  const initialQuery = normalizeQuery(initialFilters?.q);
  const initialSortFilter = normalizeSortFilter(initialFilters?.sort);
  const initialSortState = getSortStateFromFilter(initialSortFilter);

  useEffect(() => {
    setOptimisticArtworks(artworks);
  }, [artworks]);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatusFilter);
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>(initialVisibilityFilter);
  const [sortFilter, setSortFilter] = useState<SortFilter>(initialSortFilter);
  const [sortKey, setSortKey] = useState<SortKey>(initialSortState.key);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortState.direction);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxData, setLightboxData] = useState<{
    images: string[];
    initialIndex: number;
    alt: string;
  } | null>(null);

  // Confirmation Modals State
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [batchStatusConfirm, setBatchStatusConfirm] = useState<string | null>(null);
  const [batchHiddenConfirm, setBatchHiddenConfirm] = useState<boolean | null>(null);

  useEffect(() => {
    setQuery(initialQuery);
    setStatusFilter(initialStatusFilter);
    setVisibilityFilter(initialVisibilityFilter);
    setSortFilter(initialSortFilter);
    const nextSortState = getSortStateFromFilter(initialSortFilter);
    setSortKey(nextSortState.key);
    setSortDirection(nextSortState.direction);
    setSelectedIds(new Set());
  }, [initialQuery, initialStatusFilter, initialVisibilityFilter, initialSortFilter]);

  const updateFilterParams = useCallback(
    (updates: {
      q?: string;
      status?: StatusFilter;
      visibility?: VisibilityFilter;
      sort?: SortFilter;
    }) => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);

      if ('q' in updates) {
        const q = updates.q?.trim();
        if (q) {
          params.set('q', q);
        } else {
          params.delete('q');
        }
      }

      if ('status' in updates) {
        const status = updates.status;
        if (status && status !== 'all') {
          params.set('status', status);
        } else {
          params.delete('status');
        }
      }

      if ('visibility' in updates) {
        const visibility = updates.visibility;
        if (visibility && visibility !== 'all') {
          params.set('visibility', visibility);
        } else {
          params.delete('visibility');
        }
      }

      if ('sort' in updates) {
        const sort = updates.sort;
        if (sort && sort !== 'default') {
          params.set('sort', sort);
        } else {
          params.delete('sort');
        }
      }

      const nextQuery = params.toString();
      const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      window.history.replaceState(window.history.state, '', nextUrl);
    },
    [pathname]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      const normalizedQuery = query.trim();
      if (typeof window === 'undefined') return;
      const currentQuery = normalizeQuery(
        new URLSearchParams(window.location.search).get('q') || undefined
      );
      if (normalizedQuery !== currentQuery) {
        updateFilterParams({ q: normalizedQuery || undefined });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, updateFilterParams]);

  // -- Filters --
  const filtered = useMemo(() => {
    return optimisticArtworks.filter((artwork) => {
      if (statusFilter !== 'all' && artwork.status !== statusFilter) return false;
      if (visibilityFilter === 'visible' && artwork.is_hidden) return false;
      if (visibilityFilter === 'hidden' && !artwork.is_hidden) return false;
      if (!query.trim()) return true;
      return matchesAnySearch(query, [artwork.title, artwork.artists?.name_ko]);
    });
  }, [optimisticArtworks, query, statusFilter, visibilityFilter]);

  const sortedArtworks = useMemo(() => {
    const sorted = [...filtered];
    const statusRank: Record<ArtworkItem['status'], number> = {
      available: 0,
      reserved: 1,
      sold: 2,
      hidden: 3,
    };

    const compareArtworkInfo = (a: ArtworkItem, b: ArtworkItem) => {
      const titleCompare = a.title.localeCompare(b.title, 'ko');
      if (titleCompare !== 0) return titleCompare;
      const artistA = a.artists?.name_ko || '';
      const artistB = b.artists?.name_ko || '';
      return artistA.localeCompare(artistB, 'ko');
    };

    const compareCreatedAt = (a: ArtworkItem, b: ArtworkItem) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return aTime - bTime;
    };

    sorted.sort((a, b) => {
      let result = 0;
      if (sortKey === 'artwork_info') {
        result = compareArtworkInfo(a, b);
      } else if (sortKey === 'status') {
        result = statusRank[a.status] - statusRank[b.status];
      } else if (sortKey === 'created_at') {
        result = compareCreatedAt(a, b);
      } else {
        result = Number(a.is_hidden) - Number(b.is_hidden);
      }

      if (result === 0) {
        result = compareArtworkInfo(a, b);
      }

      return sortDirection === 'asc' ? result : -result;
    });

    return sorted;
  }, [filtered, sortDirection, sortKey]);

  const filteredIds = new Set(filtered.map((a) => a.id));
  const selectedInFiltered = [...selectedIds].filter((id) => filteredIds.has(id));
  const allFilteredSelected = filtered.length > 0 && selectedInFiltered.length === filtered.length;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      const nextDirection: SortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(nextDirection);
      const nextSortFilter = mapSortStateToFilter(key, nextDirection);
      setSortFilter(nextSortFilter);
      updateFilterParams({ sort: nextSortFilter });
      return;
    }
    const nextDirection: SortDirection = key === 'created_at' ? 'desc' : 'asc';
    setSortKey(key);
    setSortDirection(nextDirection);
    const nextSortFilter = mapSortStateToFilter(key, nextDirection);
    setSortFilter(nextSortFilter);
    updateFilterParams({ sort: nextSortFilter });
  };

  const getSortArrow = (key: SortKey) => {
    if (sortKey !== key) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const getSortAriaLabel = (label: string, key: SortKey) => {
    if (sortKey !== key) return `${label} 오름차순 정렬`;
    return sortDirection === 'asc' ? `${label} 내림차순 정렬` : `${label} 오름차순 정렬`;
  };

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

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const { id } = deleteConfirm;
    setProcessingId(id);

    setOptimisticArtworks((prev) => prev.filter((item) => item.id !== id));

    try {
      await deleteAdminArtwork(id);
      toast.success('작품을 삭제했습니다.');
      setDeleteConfirm(null);
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
    const normalizedImages = (images || []).map((image) =>
      resolveArtworkImageUrlForPreset(image, 'detail')
    );
    const validImages = normalizedImages.filter((image) => image.trim().length > 0);
    if (validImages.length === 0) return;

    setLightboxData({
      images: validImages,
      initialIndex: 0,
      alt: title,
    });
    setLightboxOpen(true);
  };

  const handleBatchStatus = async () => {
    if (selectedInFiltered.length === 0 || !batchStatusConfirm) return;
    const status = batchStatusConfirm;
    setBatchProcessing(true);

    const targets = new Set(selectedInFiltered);
    setOptimisticArtworks((prev) =>
      prev.map((item) => (targets.has(item.id) ? { ...item, status: status as any } : item))
    );

    try {
      await batchUpdateArtworkStatus(selectedInFiltered, status);
      setSelectedIds(new Set());
      setBatchStatusConfirm(null);
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

  const handleBatchHidden = async () => {
    if (selectedInFiltered.length === 0 || batchHiddenConfirm === null) return;
    const isHidden = batchHiddenConfirm;
    setBatchProcessing(true);

    const targets = new Set(selectedInFiltered);
    setOptimisticArtworks((prev) =>
      prev.map((item) => (targets.has(item.id) ? { ...item, is_hidden: isHidden } : item))
    );

    try {
      await batchToggleHidden(selectedInFiltered, isHidden);
      setSelectedIds(new Set());
      setBatchHiddenConfirm(null);
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
    setBatchProcessing(true);

    const targets = new Set(selectedInFiltered);
    setOptimisticArtworks((prev) => prev.filter((item) => !targets.has(item.id)));

    try {
      await batchDeleteArtworks(selectedInFiltered);
      setSelectedIds(new Set());
      setShowBatchDeleteConfirm(false);
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
            <h2 className="text-lg font-semibold text-gray-900">
              작품 목록
              <AdminHelp>
                전체 작품을 관리합니다. 판매 상태와 공개 여부를 변경하거나 작품 상세 정보를 편집할
                수 있습니다.
              </AdminHelp>
            </h2>
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
            <div className="grid grid-cols-3 gap-3 sm:flex sm:justify-end">
              <AdminSelect
                value={statusFilter}
                onChange={(e) => {
                  const nextStatus = normalizeStatusFilter(e.target.value);
                  setStatusFilter(nextStatus);
                  updateFilterParams({ status: nextStatus });
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
                  const nextVisibility = normalizeVisibilityFilter(e.target.value);
                  setVisibilityFilter(nextVisibility);
                  updateFilterParams({ visibility: nextVisibility });
                  setSelectedIds(new Set());
                }}
                wrapperClassName="min-w-[120px]"
              >
                <option value="all">모든 노출</option>
                <option value="visible">공개</option>
                <option value="hidden">숨김</option>
              </AdminSelect>
              <AdminSelect
                value={sortFilter}
                onChange={(e) => {
                  const nextSort = normalizeSortFilter(e.target.value);
                  setSortFilter(nextSort);
                  const nextSortState = getSortStateFromFilter(nextSort);
                  setSortKey(nextSortState.key);
                  setSortDirection(nextSortState.direction);
                  updateFilterParams({ sort: nextSort });
                  setSelectedIds(new Set());
                }}
                wrapperClassName="min-w-[140px]"
              >
                <option value="default">기본 정렬</option>
                <option value="recent">최근 등록순</option>
                <option value="oldest">오래된 등록순</option>
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
                  if (e.target.value) setBatchStatusConfirm(e.target.value);
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
              <Button
                variant="white"
                onClick={() => setBatchHiddenConfirm(true)}
                disabled={batchProcessing}
              >
                숨김
              </Button>
              <Button
                variant="white"
                onClick={() => setBatchHiddenConfirm(false)}
                disabled={batchProcessing}
              >
                노출
              </Button>
              <Button
                variant="white"
                onClick={() => setShowBatchDeleteConfirm(true)}
                disabled={batchProcessing}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                삭제
              </Button>
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
                  <button
                    type="button"
                    onClick={() => handleSort('artwork_info')}
                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                    aria-label={getSortAriaLabel('작품 정보', 'artwork_info')}
                  >
                    작품 정보
                    <span className="text-[11px] text-gray-400">
                      {getSortArrow('artwork_info')}
                    </span>
                  </button>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <button
                    type="button"
                    onClick={() => handleSort('status')}
                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                    aria-label={getSortAriaLabel('상태', 'status')}
                  >
                    상태
                    <span className="text-[11px] text-gray-400">{getSortArrow('status')}</span>
                  </button>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <button
                    type="button"
                    onClick={() => handleSort('created_at')}
                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                    aria-label={getSortAriaLabel('등록일', 'created_at')}
                  >
                    등록일
                    <span className="text-[11px] text-gray-400">{getSortArrow('created_at')}</span>
                  </button>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <button
                    type="button"
                    onClick={() => handleSort('visibility')}
                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                    aria-label={getSortAriaLabel('공개 여부', 'visibility')}
                  >
                    공개 여부
                    <span className="text-[11px] text-gray-400">{getSortArrow('visibility')}</span>
                  </button>
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">관리</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-0">
                    <AdminEmptyState title="검색된 작품이 없습니다" />
                  </td>
                </tr>
              ) : (
                sortedArtworks.map((artwork) => (
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
                          className={`relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-gray-100 border border-gray-200 ${
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
                            <SafeImage
                              className="object-cover"
                              src={resolveArtworkImageUrlForPreset(artwork.images[0], 'slider')}
                              alt=""
                              fill
                              sizes="48px"
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
                      <span className="text-sm text-gray-500">
                        {formatDate(artwork.created_at)}
                      </span>
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
                        <Button
                          href={`/admin/artworks/${artwork.id}`}
                          variant="white"
                          size="sm"
                          className="px-2 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600"
                        >
                          편집
                        </Button>
                        <Button
                          variant="white"
                          size="sm"
                          onClick={() => setDeleteConfirm({ id: artwork.id, title: artwork.title })}
                          disabled={processingId === artwork.id}
                          className="text-gray-400 hover:text-red-600 hover:bg-red-50 px-2"
                        >
                          삭제
                        </Button>
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

      {/* Confirmation Modals */}
      <AdminConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="작품 삭제 확인"
        description={`'${deleteConfirm?.title}' 작품을 삭제하시겠습니까?\n삭제 후 관리자 활동 로그에서 복구할 수 있습니다.`}
        confirmText="삭제하기"
        variant="danger"
        isLoading={!!processingId}
      />

      <AdminConfirmModal
        isOpen={showBatchDeleteConfirm}
        onClose={() => setShowBatchDeleteConfirm(false)}
        onConfirm={handleBatchDelete}
        title="선택 작품 일괄 삭제"
        description={`선택한 ${selectedInFiltered.length}개의 작품을 모두 삭제하시겠습니까?\n삭제 후 관리자 활동 로그에서 복구할 수 있습니다.`}
        confirmText={`${selectedInFiltered.length}개 작품 삭제`}
        variant="danger"
        isLoading={batchProcessing}
      />

      <AdminConfirmModal
        isOpen={!!batchStatusConfirm}
        onClose={() => setBatchStatusConfirm(null)}
        onConfirm={handleBatchStatus}
        title="일괄 상태 변경"
        description={`선택한 ${selectedInFiltered.length}개 작품의 상태를 '${
          batchStatusConfirm === 'available'
            ? '판매 중'
            : batchStatusConfirm === 'reserved'
              ? '예약됨'
              : '판매 완료'
        }'(으)로 변경하시겠습니까?`}
        confirmText="상태 변경"
        variant="warning"
        isLoading={batchProcessing}
      />

      <AdminConfirmModal
        isOpen={batchHiddenConfirm !== null}
        onClose={() => setBatchHiddenConfirm(null)}
        onConfirm={handleBatchHidden}
        title={batchHiddenConfirm ? '일괄 숨김 처리' : '일괄 공개 처리'}
        description={`선택한 ${selectedInFiltered.length}개 작품을 모두 ${
          batchHiddenConfirm ? '숨김' : '공개'
        } 처리하시겠습니까?`}
        confirmText={batchHiddenConfirm ? '숨김 처리' : '공개 처리'}
        variant="info"
        isLoading={batchProcessing}
      />
    </div>
  );
}
