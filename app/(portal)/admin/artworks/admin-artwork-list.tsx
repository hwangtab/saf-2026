'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import SafeImage from '@/components/common/SafeImage';
import Button from '@/components/ui/Button';
import {
  deleteAdminArtwork,
  batchUpdateArtworkStatus,
  batchToggleHidden,
  batchDeleteArtworks,
  updateArtworkCategory,
} from '@/app/actions/admin-artworks';
import { ARTWORK_CATEGORIES } from '@/types';
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
import {
  formatDate,
  getSortStateFromFilter,
  mapSortStateToFilter,
  normalizeQuery,
  normalizeSortFilter,
  normalizeStatusFilter,
  normalizeVisibilityFilter,
  type ArtworkItem,
  type InitialArtworkFilters,
  type SortDirection,
  type SortFilter,
  type SortKey,
  type StatusFilter,
  type VisibilityFilter,
} from './_utils';

const ArtworkLightbox = dynamic(() => import('@/components/ui/ArtworkLightbox'), { ssr: false });

export function AdminArtworkList({
  artworks,
  isTruncated = false,
  maxRows = 0,
  initialFilters,
}: {
  artworks: ArtworkItem[];
  isTruncated?: boolean;
  maxRows?: number;
  initialFilters?: InitialArtworkFilters;
}) {
  const toast = useToast();
  const pathname = usePathname();
  const locale = useLocale() as 'ko' | 'en';
  const t = useTranslations('admin.artworks');
  const artworksRef = useRef(artworks);
  artworksRef.current = artworks;
  const [optimisticArtworks, setOptimisticArtworks] = useState(artworks);

  useEffect(() => {
    setOptimisticArtworks(artworks);
  }, [artworks]);
  const initialStatusFilter = normalizeStatusFilter(initialFilters?.status);
  const initialVisibilityFilter = normalizeVisibilityFilter(initialFilters?.visibility);
  const initialQuery = normalizeQuery(initialFilters?.q);
  const initialSortFilter = normalizeSortFilter(initialFilters?.sort);
  const initialSortState = getSortStateFromFilter(initialSortFilter);

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
      return matchesAnySearch(query, [
        artwork.title,
        artwork.artists?.name_ko,
        artwork.admin_product_name,
      ]);
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
      const collatorLocale = locale === 'en' ? 'en' : 'ko';
      const titleCompare = a.title.localeCompare(b.title, collatorLocale);
      if (titleCompare !== 0) return titleCompare;
      const artistA = a.artists?.name_ko || '';
      const artistB = b.artists?.name_ko || '';
      return artistA.localeCompare(artistB, collatorLocale);
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
      } else if (sortKey === 'category') {
        const catA = a.category || '';
        const catB = b.category || '';
        if (!catA && catB) result = 1;
        else if (catA && !catB) result = -1;
        else result = catA.localeCompare(catB, 'ko');
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
  }, [filtered, locale, sortDirection, sortKey]);

  const { filteredIds, selectedInFiltered, allFilteredSelected } = useMemo(() => {
    const ids = new Set(filtered.map((a) => a.id));
    const inFiltered = [...selectedIds].filter((id) => ids.has(id));
    return {
      filteredIds: ids,
      selectedInFiltered: inFiltered,
      allFilteredSelected: filtered.length > 0 && inFiltered.length === filtered.length,
    };
  }, [filtered, selectedIds]);

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
    if (sortKey !== key) return t('sortAscending', { label });
    return sortDirection === 'asc' ? t('sortDescending', { label }) : t('sortAscending', { label });
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
      toast.success(t('deleted'));
      setDeleteConfirm(null);
    } catch {
      setOptimisticArtworks(artworksRef.current);
      toast.error(t('deleteError'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    if (!newStatus) return;
    setProcessingId(id);

    setOptimisticArtworks((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: newStatus as ArtworkItem['status'] } : item
      )
    );

    try {
      const result = await batchUpdateArtworkStatus(
        [id],
        newStatus as 'available' | 'sold' | 'reserved' | 'hidden'
      );
      if (!result.success) {
        const source = artworksRef.current.find((item) => item.id === id);
        if (source) {
          setOptimisticArtworks((prev) =>
            prev.map((item) => (item.id === id ? { ...item, status: source.status } : item))
          );
        }
        toast.error(
          locale === 'en' ? t('statusRollback') : result.errors[0] || t('statusRollback')
        );
        return;
      }
      toast.success(t('statusChanged'));
    } catch {
      setOptimisticArtworks(artworksRef.current);
      toast.error(t('statusError'));
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
      const result = await batchToggleHidden([id], !currentHidden);
      if (!result.success) {
        const source = artworksRef.current.find((item) => item.id === id);
        if (source) {
          setOptimisticArtworks((prev) =>
            prev.map((item) => (item.id === id ? { ...item, is_hidden: source.is_hidden } : item))
          );
        }
        toast.error(
          locale === 'en' ? t('visibilityRollback') : result.errors[0] || t('visibilityRollback')
        );
        return;
      }
      toast.success(currentHidden ? t('shown') : t('hidden'));
    } catch {
      setOptimisticArtworks(artworksRef.current);
      toast.error(t('visibilityError'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleCategoryChange = async (id: string, newCategory: string) => {
    const category = newCategory || null;
    const current = optimisticArtworks.find((a) => a.id === id)?.category ?? null;
    if (category === current) return;
    setProcessingId(id);

    setOptimisticArtworks((prev) =>
      prev.map((item) => (item.id === id ? { ...item, category } : item))
    );

    try {
      await updateArtworkCategory(id, category);
      toast.success(t('categoryChanged'));
    } catch {
      setOptimisticArtworks(artworksRef.current);
      toast.error(t('categoryError'));
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
      prev.map((item) =>
        targets.has(item.id) ? { ...item, status: status as ArtworkItem['status'] } : item
      )
    );

    try {
      const result = await batchUpdateArtworkStatus(
        selectedInFiltered,
        status as 'available' | 'sold' | 'reserved' | 'hidden'
      );
      if (!result.success) {
        const failedIdSet = new Set(result.failedIds);
        const sourceMap = new Map(artworksRef.current.map((item) => [item.id, item]));
        setOptimisticArtworks((prev) =>
          prev.map((item) => {
            if (!failedIdSet.has(item.id)) return item;
            const source = sourceMap.get(item.id);
            return source ? { ...item, status: source.status } : item;
          })
        );
        setSelectedIds(new Set(result.failedIds));
        setBatchStatusConfirm(null);
        toast.warning(
          t('partialSuccess', { ok: result.succeededIds.length, failed: result.failedIds.length })
        );
        return;
      }

      setSelectedIds(new Set());
      setBatchStatusConfirm(null);
      toast.success(t('batchStatusChanged'));
    } catch {
      setOptimisticArtworks(artworksRef.current);
      toast.error(t('batchStatusError'));
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
      const result = await batchToggleHidden(selectedInFiltered, isHidden);
      if (!result.success) {
        const failedIdSet = new Set(result.failedIds);
        const sourceMap = new Map(artworksRef.current.map((item) => [item.id, item]));
        setOptimisticArtworks((prev) =>
          prev.map((item) => {
            if (!failedIdSet.has(item.id)) return item;
            const source = sourceMap.get(item.id);
            return source ? { ...item, is_hidden: source.is_hidden } : item;
          })
        );
        setSelectedIds(new Set(result.failedIds));
        setBatchHiddenConfirm(null);
        toast.warning(
          t('partialSuccess', { ok: result.succeededIds.length, failed: result.failedIds.length })
        );
        return;
      }

      setSelectedIds(new Set());
      setBatchHiddenConfirm(null);
      toast.success(isHidden ? t('batchHidden') : t('batchShown'));
    } catch {
      setOptimisticArtworks(artworksRef.current);
      toast.error(t('batchVisibilityError'));
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
      toast.success(t('batchDeleted'));
    } catch {
      setOptimisticArtworks(artworksRef.current);
      toast.error(t('batchDeleteError'));
    } finally {
      setBatchProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminCard className="overflow-hidden">
        {isTruncated && (
          <div className="border-b border-charcoal-deep/20 bg-charcoal-deep/5 px-6 py-3 text-sm text-charcoal-deep">
            {t('truncatedNotice', { count: maxRows })}{' '}
            <span className="font-medium">{t('downloadAllArtworks')}</span>
          </div>
        )}
        {/* Header & Main Controls */}
        <AdminCardHeader>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('title')}
              <AdminHelp>{t('titleHelp')}</AdminHelp>
            </h2>
            <AdminBadge tone="info">{t('count', { count: filtered.length })}</AdminBadge>
          </div>

          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-[minmax(260px,1fr)_auto] sm:items-end">
            <div className="relative w-full sm:min-w-[320px]">
              <label htmlFor="search-artworks" className="sr-only">
                {t('searchArtwork')}
              </label>
              <AdminInput
                id="search-artworks"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                aria-describedby="search-artworks-description"
                className="h-10 border-0 pl-10 pr-3"
              />
              <span id="search-artworks-description" className="sr-only">
                {t('searchDescription', { count: filtered.length })}
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
                <option value="all">{t('allStatus')}</option>
                <option value="available">{t('available')}</option>
                <option value="reserved">{t('reserved')}</option>
                <option value="sold">{t('sold')}</option>
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
                <option value="all">{t('allVisibility')}</option>
                <option value="visible">{t('visible')}</option>
                <option value="hidden">{t('hiddenLabel')}</option>
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
                <option value="default">{t('defaultSort')}</option>
                <option value="recent">{t('recentSort')}</option>
                <option value="oldest">{t('oldestSort')}</option>
              </AdminSelect>
            </div>
          </div>
        </AdminCardHeader>

        {/* Batch Actions Toolbar (Visible only when selected) */}
        {selectedInFiltered.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 border-b border-primary-soft bg-primary-surface px-6 py-4">
            <span className="text-sm font-medium text-primary-strong">
              {t('selectedCount', { count: selectedInFiltered.length })}
            </span>
            <div className="h-4 w-px bg-primary-soft"></div>
            <div className="flex items-center gap-2">
              <AdminSelect
                onChange={(e) => {
                  if (e.target.value) setBatchStatusConfirm(e.target.value);
                  e.target.value = '';
                }}
                disabled={batchProcessing}
                className="border-primary-soft"
              >
                <option value="">{t('changeStatus')}</option>
                <option value="available">{t('available')}</option>
                <option value="reserved">{t('reserved')}</option>
                <option value="sold">{t('sold')}</option>
              </AdminSelect>
              <Button
                variant="white"
                onClick={() => setBatchHiddenConfirm(true)}
                disabled={batchProcessing}
              >
                {t('hide')}
              </Button>
              <Button
                variant="white"
                onClick={() => setBatchHiddenConfirm(false)}
                disabled={batchProcessing}
              >
                {t('show')}
              </Button>
              <Button
                variant="white"
                onClick={() => setShowBatchDeleteConfirm(true)}
                disabled={batchProcessing}
                className="text-danger-a11y hover:text-danger-a11y hover:bg-danger/10 border-danger/30"
              >
                {t('delete')}
              </Button>
            </div>
            {batchProcessing && (
              <span className="text-xs text-primary-a11y animate-pulse">{t('processing')}</span>
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
                    className="rounded border-gray-300 text-primary-a11y focus:ring-primary-a11y"
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
                    aria-label={getSortAriaLabel(t('artworkInfo'), 'artwork_info')}
                  >
                    {t('artworkInfo')}
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
                    aria-label={getSortAriaLabel(t('status'), 'status')}
                  >
                    {t('status')}
                    <span className="text-[11px] text-gray-400">{getSortArrow('status')}</span>
                  </button>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <button
                    type="button"
                    onClick={() => handleSort('category')}
                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                    aria-label={getSortAriaLabel(t('category'), 'category')}
                  >
                    {t('category')}
                    <span className="text-[11px] text-gray-400">{getSortArrow('category')}</span>
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
                    aria-label={getSortAriaLabel(t('createdAt'), 'created_at')}
                  >
                    {t('createdAt')}
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
                    aria-label={getSortAriaLabel(t('visibility'), 'visibility')}
                  >
                    {t('visibility')}
                    <span className="text-[11px] text-gray-400">{getSortArrow('visibility')}</span>
                  </button>
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">{t('manage')}</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-0">
                    <AdminEmptyState title={t('noSearchResult')} />
                  </td>
                </tr>
              ) : (
                sortedArtworks.map((artwork) => (
                  <tr
                    key={artwork.id}
                    className={`hover:bg-gray-50 transition-colors ${selectedIds.has(artwork.id) ? 'bg-primary-surface/30' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(artwork.id)}
                        onChange={() => toggleSelect(artwork.id)}
                        className="rounded border-gray-300 text-primary-a11y focus:ring-primary-a11y"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- role="button"+tabIndex가 조건부 spread로 처리됨 (ESLint 정적 분석 한계) */}
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
                          {...(artwork.images?.[0]
                            ? { role: 'button', tabIndex: 0, 'aria-label': t('zoomImage') }
                            : {})}
                        >
                          {artwork.images?.[0] ? (
                            <div className="absolute inset-1">
                              <SafeImage
                                className="object-contain"
                                src={resolveArtworkImageUrlForPreset(artwork.images[0], 'slider')}
                                alt=""
                                fill
                                sizes="48px"
                              />
                            </div>
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
                            className="font-medium text-gray-900 hover:text-primary-a11y hover:underline"
                          >
                            {artwork.title}
                            {artwork.admin_product_name && (
                              <span className="ml-1.5 text-xs font-normal text-primary-a11y">
                                [{artwork.admin_product_name}]
                              </span>
                            )}
                          </Link>
                          <div className="text-sm text-gray-500">
                            {artwork.artists?.name_ko || t('unknownArtist')}
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
                            ? 'border-success/30 bg-success/10 text-success-a11y focus:border-success/60'
                            : artwork.status === 'reserved'
                              ? 'border-charcoal-deep/20 bg-gray-100 text-charcoal-deep focus:border-charcoal-deep/40'
                              : 'border-primary-soft bg-primary-surface text-primary-strong focus:border-primary/60'
                        }`}
                      >
                        <option value="available">{t('available')}</option>
                        <option value="reserved">{t('reserved')}</option>
                        <option value="sold">{t('sold')}</option>
                      </AdminSelect>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <AdminSelect
                        wrapperClassName="min-w-24"
                        iconClassName="h-3.5 w-3.5"
                        value={artwork.category || ''}
                        onChange={(e) => handleCategoryChange(artwork.id, e.target.value)}
                        disabled={processingId === artwork.id}
                        className="py-1 pl-2.5 pr-7 text-xs"
                      >
                        <option value="">{t('noCategory')}</option>
                        {ARTWORK_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </AdminSelect>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500">
                        {formatDate(artwork.created_at, locale)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleHiddenToggle(artwork.id, artwork.is_hidden)}
                        disabled={processingId === artwork.id}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                          artwork.is_hidden
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            : 'bg-primary-surface text-primary-strong hover:bg-primary-soft'
                        }`}
                      >
                        {artwork.is_hidden ? t('hiddenLabel') : t('visibleNow')}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Button
                          href={`/admin/artworks/${artwork.id}`}
                          variant="white"
                          size="sm"
                          className="px-2 text-gray-500 hover:bg-primary-surface hover:text-primary-a11y"
                        >
                          {t('edit')}
                        </Button>
                        <Button
                          variant="white"
                          size="sm"
                          onClick={() => setDeleteConfirm({ id: artwork.id, title: artwork.title })}
                          disabled={processingId === artwork.id}
                          className="text-gray-400 hover:text-danger-a11y hover:bg-danger/10 px-2"
                        >
                          {t('delete')}
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
        title={t('deleteConfirmTitle')}
        description={t('deleteConfirmDescription', { title: deleteConfirm?.title || '-' })}
        confirmText={t('deleteConfirmText')}
        variant="danger"
        isLoading={!!processingId}
      />

      <AdminConfirmModal
        isOpen={showBatchDeleteConfirm}
        onClose={() => setShowBatchDeleteConfirm(false)}
        onConfirm={handleBatchDelete}
        title={t('batchDeleteTitle')}
        description={t('batchDeleteDescription', { count: selectedInFiltered.length })}
        confirmText={t('batchDeleteText', { count: selectedInFiltered.length })}
        variant="danger"
        isLoading={batchProcessing}
      />

      <AdminConfirmModal
        isOpen={!!batchStatusConfirm}
        onClose={() => setBatchStatusConfirm(null)}
        onConfirm={handleBatchStatus}
        title={t('batchStatusTitle')}
        description={t('batchStatusDescription', {
          count: selectedInFiltered.length,
          status:
            batchStatusConfirm === 'available'
              ? t('available')
              : batchStatusConfirm === 'reserved'
                ? t('reserved')
                : t('sold'),
        })}
        confirmText={t('batchStatusConfirm')}
        variant="warning"
        isLoading={batchProcessing}
      />

      <AdminConfirmModal
        isOpen={batchHiddenConfirm !== null}
        onClose={() => setBatchHiddenConfirm(null)}
        onConfirm={handleBatchHidden}
        title={batchHiddenConfirm ? t('batchHideTitle') : t('batchShowTitle')}
        description={
          batchHiddenConfirm
            ? t('batchHideDescription', { count: selectedInFiltered.length })
            : t('batchShowDescription', { count: selectedInFiltered.length })
        }
        confirmText={batchHiddenConfirm ? t('batchHideConfirm') : t('batchShowConfirm')}
        variant="info"
        isLoading={batchProcessing}
      />
    </div>
  );
}
