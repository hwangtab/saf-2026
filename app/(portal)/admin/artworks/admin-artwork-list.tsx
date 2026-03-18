'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
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
import { resolveClientLocale } from '@/lib/client-locale';
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
  const locale = resolveClientLocale(pathname);
  const msg =
    locale === 'en'
      ? {
          deleted: 'Artwork deleted.',
          deleteError: 'An error occurred while deleting artwork.',
          statusRollback: 'Cafe24 sync failed. Status change was partially rolled back.',
          statusChanged: 'Artwork status updated.',
          statusError: 'An error occurred while updating status.',
          visibilityRollback: 'Cafe24 sync failed. Visibility change was partially rolled back.',
          shown: 'Artwork is now visible.',
          hidden: 'Artwork is now hidden.',
          visibilityError: 'An error occurred while updating visibility.',
          partialSuccess: (ok: number, failed: number) =>
            `Partial success: ${ok} succeeded, ${failed} rolled back.`,
          batchStatusChanged: 'Selected artwork statuses updated.',
          batchStatusError: 'An error occurred while updating statuses in batch.',
          batchShown: 'Selected artworks are now visible.',
          batchHidden: 'Selected artworks are now hidden.',
          batchVisibilityError: 'An error occurred while updating visibility in batch.',
          batchDeleted: 'Selected artworks deleted.',
          batchDeleteError: 'An error occurred during batch delete.',
          sortAscending: (label: string) => `Sort ${label} ascending`,
          sortDescending: (label: string) => `Sort ${label} descending`,
          truncatedNotice: (count: number) =>
            `There are many artworks, so only the latest ${count} entries are loaded.`,
          downloadAllArtworks: 'Download full artwork data',
          title: 'Artwork list',
          titleHelp:
            'Manage all artworks. You can change sales status and visibility or edit detailed information.',
          count: (count: number) => `${count}`,
          searchArtwork: 'Search artworks',
          searchPlaceholder: 'Search by artwork title or artist name...',
          searchDescription: (count: number) =>
            `You can search by artwork title or artist name. ${count} items are currently shown.`,
          allStatus: 'All status',
          available: 'Available',
          reserved: 'Reserved',
          sold: 'Sold',
          allVisibility: 'All visibility',
          visible: 'Visible',
          hiddenLabel: 'Hidden',
          defaultSort: 'Default sort',
          recentSort: 'Most recent',
          oldestSort: 'Oldest',
          selectedCount: (count: number) => `${count} selected`,
          changeStatus: 'Change status...',
          hide: 'Hide',
          show: 'Show',
          delete: 'Delete',
          processing: 'Processing...',
          artworkInfo: 'Artwork info',
          status: 'Status',
          category: 'Category',
          createdAt: 'Created',
          visibility: 'Visibility',
          manage: 'Manage',
          noSearchResult: 'No artworks found',
          zoomImage: 'Zoom image',
          unknownArtist: 'Unknown artist',
          cafe24SyncFailed: 'Shop sync failed',
          cafe24PendingAuth: 'Shop sync requires re-authorization',
          cafe24Warning: 'Shop sync warning',
          cafe24Syncing: 'Shop sync in progress',
          visibleNow: 'Visible',
          categoryChanged: 'Category updated.',
          categoryError: 'An error occurred while updating category.',
          noCategory: 'None',
          edit: 'Edit',
          deleteConfirmTitle: 'Confirm artwork deletion',
          deleteConfirmDescription: (title: string | undefined) =>
            `Delete '${title || '-'}'?\nYou can restore it later from admin activity logs.`,
          deleteConfirmText: 'Delete',
          batchDeleteTitle: 'Delete selected artworks',
          batchDeleteDescription: (count: number) =>
            `Delete all ${count} selected artworks?\nYou can restore them later from admin activity logs.`,
          batchDeleteText: (count: number) => `Delete ${count} artworks`,
          batchStatusTitle: 'Batch status update',
          batchStatusDescription: (count: number, status: string) =>
            `Change status of ${count} selected artworks to '${status}'?`,
          batchStatusConfirm: 'Update status',
          batchHideTitle: 'Batch hide',
          batchShowTitle: 'Batch show',
          batchHideDescription: (count: number) => `Set all ${count} selected artworks to hidden?`,
          batchShowDescription: (count: number) => `Set all ${count} selected artworks to visible?`,
          batchHideConfirm: 'Hide all',
          batchShowConfirm: 'Show all',
        }
      : {
          deleted: '작품을 삭제했습니다.',
          deleteError: '작품 삭제 중 오류가 발생했습니다.',
          statusRollback: '카페24 동기화에 실패해 상태 변경이 일부 롤백되었습니다.',
          statusChanged: '작품 상태를 변경했습니다.',
          statusError: '상태 변경 중 오류가 발생했습니다.',
          visibilityRollback: '카페24 동기화에 실패해 공개 상태 변경이 일부 롤백되었습니다.',
          shown: '작품을 공개 처리했습니다.',
          hidden: '작품을 숨김 처리했습니다.',
          visibilityError: '공개 상태 변경 중 오류가 발생했습니다.',
          partialSuccess: (ok: number, failed: number) =>
            `부분 성공: ${ok}건 성공, ${failed}건 롤백되었습니다.`,
          batchStatusChanged: '선택한 작품 상태를 변경했습니다.',
          batchStatusError: '일괄 상태 변경 중 오류가 발생했습니다.',
          batchShown: '선택한 작품을 공개 처리했습니다.',
          batchHidden: '선택한 작품을 숨김 처리했습니다.',
          batchVisibilityError: '일괄 공개 상태 변경 중 오류가 발생했습니다.',
          batchDeleted: '선택한 작품을 삭제했습니다.',
          batchDeleteError: '일괄 삭제 중 오류가 발생했습니다.',
          sortAscending: (label: string) => `${label} 오름차순 정렬`,
          sortDescending: (label: string) => `${label} 내림차순 정렬`,
          truncatedNotice: (count: number) => `작품 데이터가 많아 최근 ${count}건만 불러왔습니다.`,
          downloadAllArtworks: '전체 작품 데이터 다운받기',
          title: '작품 목록',
          titleHelp:
            '전체 작품을 관리합니다. 판매 상태와 공개 여부를 변경하거나 작품 상세 정보를 편집할 수 있습니다.',
          count: (count: number) => `${count}개`,
          searchArtwork: '작품 검색',
          searchPlaceholder: '작품명, 작가명 검색...',
          searchDescription: (count: number) =>
            `작품명 또는 작가명으로 검색할 수 있습니다. 현재 ${count}개가 표시됩니다.`,
          allStatus: '모든 상태',
          available: '판매 중',
          reserved: '예약됨',
          sold: '판매 완료',
          allVisibility: '모든 노출',
          visible: '공개',
          hiddenLabel: '숨김',
          defaultSort: '기본 정렬',
          recentSort: '최근 등록순',
          oldestSort: '오래된 등록순',
          selectedCount: (count: number) => `${count}개 선택됨`,
          changeStatus: '상태 변경...',
          hide: '숨김',
          show: '노출',
          delete: '삭제',
          processing: '처리 중...',
          artworkInfo: '작품 정보',
          status: '상태',
          category: '분류',
          createdAt: '등록일',
          visibility: '공개 여부',
          manage: '관리',
          noSearchResult: '검색된 작품이 없습니다',
          zoomImage: '이미지 확대하기',
          unknownArtist: '작가 미상',
          cafe24SyncFailed: '구매연동 오류',
          cafe24PendingAuth: '구매연동 재승인 필요',
          cafe24Warning: '구매연동 경고',
          cafe24Syncing: '구매연동 진행 중',
          visibleNow: '공개 중',
          categoryChanged: '카테고리를 변경했습니다.',
          categoryError: '카테고리 변경 중 오류가 발생했습니다.',
          noCategory: '없음',
          edit: '편집',
          deleteConfirmTitle: '작품 삭제 확인',
          deleteConfirmDescription: (title: string | undefined) =>
            `'${title || '-'}' 작품을 삭제하시겠습니까?\n삭제 후 관리자 활동 로그에서 복구할 수 있습니다.`,
          deleteConfirmText: '삭제하기',
          batchDeleteTitle: '선택 작품 일괄 삭제',
          batchDeleteDescription: (count: number) =>
            `선택한 ${count}개의 작품을 모두 삭제하시겠습니까?\n삭제 후 관리자 활동 로그에서 복구할 수 있습니다.`,
          batchDeleteText: (count: number) => `${count}개 작품 삭제`,
          batchStatusTitle: '일괄 상태 변경',
          batchStatusDescription: (count: number, status: string) =>
            `선택한 ${count}개 작품의 상태를 '${status}'(으)로 변경하시겠습니까?`,
          batchStatusConfirm: '상태 변경',
          batchHideTitle: '일괄 숨김 처리',
          batchShowTitle: '일괄 공개 처리',
          batchHideDescription: (count: number) =>
            `선택한 ${count}개 작품을 모두 숨김 처리하시겠습니까?`,
          batchShowDescription: (count: number) =>
            `선택한 ${count}개 작품을 모두 공개 처리하시겠습니까?`,
          batchHideConfirm: '숨김 처리',
          batchShowConfirm: '공개 처리',
        };
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
    if (sortKey !== key) return msg.sortAscending(label);
    return sortDirection === 'asc' ? msg.sortDescending(label) : msg.sortAscending(label);
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
      toast.success(msg.deleted);
      setDeleteConfirm(null);
    } catch (error) {
      setOptimisticArtworks(artworksRef.current);
      toast.error(
        locale === 'en' ? msg.deleteError : error instanceof Error ? error.message : msg.deleteError
      );
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
      const result = await batchUpdateArtworkStatus([id], newStatus);
      if (!result.success) {
        const source = artworksRef.current.find((item) => item.id === id);
        if (source) {
          setOptimisticArtworks((prev) =>
            prev.map((item) => (item.id === id ? { ...item, status: source.status } : item))
          );
        }
        toast.error(locale === 'en' ? msg.statusRollback : result.errors[0] || msg.statusRollback);
        return;
      }
      toast.success(msg.statusChanged);
    } catch (error) {
      setOptimisticArtworks(artworksRef.current);
      toast.error(
        locale === 'en' ? msg.statusError : error instanceof Error ? error.message : msg.statusError
      );
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
          locale === 'en' ? msg.visibilityRollback : result.errors[0] || msg.visibilityRollback
        );
        return;
      }
      toast.success(currentHidden ? msg.shown : msg.hidden);
    } catch (error) {
      setOptimisticArtworks(artworksRef.current);
      toast.error(
        locale === 'en'
          ? msg.visibilityError
          : error instanceof Error
            ? error.message
            : msg.visibilityError
      );
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
      toast.success(msg.categoryChanged);
    } catch (error) {
      setOptimisticArtworks(artworksRef.current);
      toast.error(
        locale === 'en'
          ? msg.categoryError
          : error instanceof Error
            ? error.message
            : msg.categoryError
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
      prev.map((item) =>
        targets.has(item.id) ? { ...item, status: status as ArtworkItem['status'] } : item
      )
    );

    try {
      const result = await batchUpdateArtworkStatus(selectedInFiltered, status);
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
        toast.warning(msg.partialSuccess(result.succeededIds.length, result.failedIds.length));
        return;
      }

      setSelectedIds(new Set());
      setBatchStatusConfirm(null);
      toast.success(msg.batchStatusChanged);
    } catch (error) {
      setOptimisticArtworks(artworksRef.current);
      toast.error(
        locale === 'en'
          ? msg.batchStatusError
          : error instanceof Error
            ? error.message
            : msg.batchStatusError
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
        toast.warning(msg.partialSuccess(result.succeededIds.length, result.failedIds.length));
        return;
      }

      setSelectedIds(new Set());
      setBatchHiddenConfirm(null);
      toast.success(isHidden ? msg.batchHidden : msg.batchShown);
    } catch (error) {
      setOptimisticArtworks(artworksRef.current);
      toast.error(
        locale === 'en'
          ? msg.batchVisibilityError
          : error instanceof Error
            ? error.message
            : msg.batchVisibilityError
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
      toast.success(msg.batchDeleted);
    } catch (error) {
      setOptimisticArtworks(artworksRef.current);
      toast.error(
        locale === 'en'
          ? msg.batchDeleteError
          : error instanceof Error
            ? error.message
            : msg.batchDeleteError
      );
    } finally {
      setBatchProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminCard className="overflow-hidden">
        {isTruncated && (
          <div className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-800">
            {msg.truncatedNotice(maxRows)}{' '}
            <span className="font-medium">{msg.downloadAllArtworks}</span>
          </div>
        )}
        {/* Header & Main Controls */}
        <AdminCardHeader>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              {msg.title}
              <AdminHelp>{msg.titleHelp}</AdminHelp>
            </h2>
            <AdminBadge tone="info">{msg.count(filtered.length)}</AdminBadge>
          </div>

          <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-[minmax(260px,1fr)_auto] sm:items-end">
            <div className="relative w-full sm:min-w-[320px]">
              <label htmlFor="search-artworks" className="sr-only">
                {msg.searchArtwork}
              </label>
              <AdminInput
                id="search-artworks"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={msg.searchPlaceholder}
                aria-describedby="search-artworks-description"
                className="h-10 border-0 pl-10 pr-3"
              />
              <span id="search-artworks-description" className="sr-only">
                {msg.searchDescription(filtered.length)}
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
                <option value="all">{msg.allStatus}</option>
                <option value="available">{msg.available}</option>
                <option value="reserved">{msg.reserved}</option>
                <option value="sold">{msg.sold}</option>
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
                <option value="all">{msg.allVisibility}</option>
                <option value="visible">{msg.visible}</option>
                <option value="hidden">{msg.hiddenLabel}</option>
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
                <option value="default">{msg.defaultSort}</option>
                <option value="recent">{msg.recentSort}</option>
                <option value="oldest">{msg.oldestSort}</option>
              </AdminSelect>
            </div>
          </div>
        </AdminCardHeader>

        {/* Batch Actions Toolbar (Visible only when selected) */}
        {selectedInFiltered.length > 0 && (
          <div className="flex flex-wrap items-center gap-4 border-b border-indigo-100 bg-indigo-50 px-6 py-4">
            <span className="text-sm font-medium text-indigo-900">
              {msg.selectedCount(selectedInFiltered.length)}
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
                <option value="">{msg.changeStatus}</option>
                <option value="available">{msg.available}</option>
                <option value="reserved">{msg.reserved}</option>
                <option value="sold">{msg.sold}</option>
              </AdminSelect>
              <Button
                variant="white"
                onClick={() => setBatchHiddenConfirm(true)}
                disabled={batchProcessing}
              >
                {msg.hide}
              </Button>
              <Button
                variant="white"
                onClick={() => setBatchHiddenConfirm(false)}
                disabled={batchProcessing}
              >
                {msg.show}
              </Button>
              <Button
                variant="white"
                onClick={() => setShowBatchDeleteConfirm(true)}
                disabled={batchProcessing}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                {msg.delete}
              </Button>
            </div>
            {batchProcessing && (
              <span className="text-xs text-indigo-600 animate-pulse">{msg.processing}</span>
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
                    aria-label={getSortAriaLabel(msg.artworkInfo, 'artwork_info')}
                  >
                    {msg.artworkInfo}
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
                    aria-label={getSortAriaLabel(msg.status, 'status')}
                  >
                    {msg.status}
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
                    aria-label={getSortAriaLabel(msg.category, 'category')}
                  >
                    {msg.category}
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
                    aria-label={getSortAriaLabel(msg.createdAt, 'created_at')}
                  >
                    {msg.createdAt}
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
                    aria-label={getSortAriaLabel(msg.visibility, 'visibility')}
                  >
                    {msg.visibility}
                    <span className="text-[11px] text-gray-400">{getSortArrow('visibility')}</span>
                  </button>
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">{msg.manage}</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-0">
                    <AdminEmptyState title={msg.noSearchResult} />
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
                          aria-label={artwork.images?.[0] ? msg.zoomImage : undefined}
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
                            {artwork.admin_product_name && (
                              <span className="ml-1.5 text-xs font-normal text-indigo-600">
                                [{artwork.admin_product_name}]
                              </span>
                            )}
                          </Link>
                          <div className="text-sm text-gray-500">
                            {artwork.artists?.name_ko || msg.unknownArtist}
                          </div>
                          {(artwork.cafe24_sync_status === 'failed' ||
                            artwork.cafe24_sync_status === 'pending_auth' ||
                            artwork.cafe24_sync_status === 'synced_with_warning' ||
                            artwork.cafe24_sync_status === 'syncing') && (
                            <div
                              className={`mt-1 text-xs ${
                                artwork.cafe24_sync_status === 'failed'
                                  ? 'text-red-600'
                                  : artwork.cafe24_sync_status === 'pending_auth'
                                    ? 'text-amber-600'
                                    : artwork.cafe24_sync_status === 'syncing'
                                      ? 'text-blue-600'
                                      : 'text-amber-600'
                              }`}
                              title={artwork.cafe24_sync_error || ''}
                            >
                              {artwork.cafe24_sync_status === 'failed' && msg.cafe24SyncFailed}
                              {artwork.cafe24_sync_status === 'pending_auth' &&
                                msg.cafe24PendingAuth}
                              {artwork.cafe24_sync_status === 'synced_with_warning' &&
                                msg.cafe24Warning}
                              {artwork.cafe24_sync_status === 'syncing' && msg.cafe24Syncing}
                            </div>
                          )}
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
                        <option value="available">{msg.available}</option>
                        <option value="reserved">{msg.reserved}</option>
                        <option value="sold">{msg.sold}</option>
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
                        <option value="">{msg.noCategory}</option>
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
                            : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                        }`}
                      >
                        {artwork.is_hidden ? msg.hiddenLabel : msg.visibleNow}
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
                          {msg.edit}
                        </Button>
                        <Button
                          variant="white"
                          size="sm"
                          onClick={() => setDeleteConfirm({ id: artwork.id, title: artwork.title })}
                          disabled={processingId === artwork.id}
                          className="text-gray-400 hover:text-red-600 hover:bg-red-50 px-2"
                        >
                          {msg.delete}
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
        title={msg.deleteConfirmTitle}
        description={msg.deleteConfirmDescription(deleteConfirm?.title)}
        confirmText={msg.deleteConfirmText}
        variant="danger"
        isLoading={!!processingId}
      />

      <AdminConfirmModal
        isOpen={showBatchDeleteConfirm}
        onClose={() => setShowBatchDeleteConfirm(false)}
        onConfirm={handleBatchDelete}
        title={msg.batchDeleteTitle}
        description={msg.batchDeleteDescription(selectedInFiltered.length)}
        confirmText={msg.batchDeleteText(selectedInFiltered.length)}
        variant="danger"
        isLoading={batchProcessing}
      />

      <AdminConfirmModal
        isOpen={!!batchStatusConfirm}
        onClose={() => setBatchStatusConfirm(null)}
        onConfirm={handleBatchStatus}
        title={msg.batchStatusTitle}
        description={msg.batchStatusDescription(
          selectedInFiltered.length,
          batchStatusConfirm === 'available'
            ? msg.available
            : batchStatusConfirm === 'reserved'
              ? msg.reserved
              : msg.sold
        )}
        confirmText={msg.batchStatusConfirm}
        variant="warning"
        isLoading={batchProcessing}
      />

      <AdminConfirmModal
        isOpen={batchHiddenConfirm !== null}
        onClose={() => setBatchHiddenConfirm(null)}
        onConfirm={handleBatchHidden}
        title={batchHiddenConfirm ? msg.batchHideTitle : msg.batchShowTitle}
        description={
          batchHiddenConfirm
            ? msg.batchHideDescription(selectedInFiltered.length)
            : msg.batchShowDescription(selectedInFiltered.length)
        }
        confirmText={batchHiddenConfirm ? msg.batchHideConfirm : msg.batchShowConfirm}
        variant="info"
        isLoading={batchProcessing}
      />
    </div>
  );
}
