'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { deleteArtist } from '@/app/actions/admin-artists';
import SafeAvatarImage from '@/components/common/SafeAvatarImage';
import {
  AdminBadge,
  AdminCard,
  AdminCardHeader,
  AdminEmptyState,
  AdminInput,
} from '@/app/admin/_components/admin-ui';
import { AdminConfirmModal } from '@/app/admin/_components/AdminConfirmModal';
import Button from '@/components/ui/Button';

type ArtistItem = {
  id: string;
  name_ko: string | null;
  name_en: string | null;
  profile_image: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  user_id: string | null;
  artwork_count: number;
};

type SortKey = 'artist_info' | 'account_link' | 'artwork_count';
type SortDirection = 'asc' | 'desc';

export function ArtistList({ artists }: { artists: ArtistItem[] }) {
  const [optimisticArtists, setOptimisticArtists] = useState(artists);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('artist_info');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    setOptimisticArtists(artists);
  }, [artists]);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    const id = deleteTargetId;
    setDeleteTargetId(null);

    setOptimisticArtists((prev) => prev.filter((a) => a.id !== id));
    setProcessingId(id);
    setError(null);

    try {
      await deleteArtist(id);
      setError(null);
    } catch (err: unknown) {
      setOptimisticArtists(artists);
      setError(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = useMemo(() => {
    return optimisticArtists.filter((artist) => {
      if (!query) return true;
      const q = query.toLowerCase().replace(/\s+/g, '');
      const nameKo = (artist.name_ko || '').toLowerCase().replace(/\s+/g, '');
      const nameEn = (artist.name_en || '').toLowerCase().replace(/\s+/g, '');
      const phone = (artist.contact_phone || '').toLowerCase().replace(/\s+/g, '');
      const email = (artist.contact_email || '').toLowerCase().replace(/\s+/g, '');
      return nameKo.includes(q) || nameEn.includes(q) || phone.includes(q) || email.includes(q);
    });
  }, [optimisticArtists, query]);

  const sortedArtists = useMemo(() => {
    const sorted = [...filtered];

    const compareByArtistInfo = (a: ArtistItem, b: ArtistItem) => {
      const aNameKo = (a.name_ko || '').trim().toLowerCase();
      const bNameKo = (b.name_ko || '').trim().toLowerCase();
      const koCompare = aNameKo.localeCompare(bNameKo, 'ko');
      if (koCompare !== 0) return koCompare;

      const aNameEn = (a.name_en || '').trim().toLowerCase();
      const bNameEn = (b.name_en || '').trim().toLowerCase();
      return aNameEn.localeCompare(bNameEn, 'en');
    };

    sorted.sort((a, b) => {
      let result = 0;

      if (sortKey === 'artist_info') {
        result = compareByArtistInfo(a, b);
      } else if (sortKey === 'account_link') {
        result = Number(Boolean(a.user_id)) - Number(Boolean(b.user_id));
      } else {
        result = a.artwork_count - b.artwork_count;
      }

      if (result === 0) {
        result = compareByArtistInfo(a, b);
      }

      return sortDirection === 'asc' ? result : -result;
    });

    return sorted;
  }, [filtered, sortDirection, sortKey]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection('asc');
  };

  const getSortArrow = (key: SortKey) => {
    if (sortKey !== key) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  };

  const getSortAriaLabel = (label: string, key: SortKey) => {
    if (sortKey !== key) {
      return `${label} 오름차순 정렬`;
    }
    return sortDirection === 'asc' ? `${label} 내림차순 정렬` : `${label} 오름차순 정렬`;
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 p-1 hover:bg-red-100 rounded-full transition-colors"
            aria-label="오류 메시지 닫기"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      <AdminConfirmModal
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleDelete}
        title="작가 삭제 확인"
        description="이 작가를 삭제하시겠습니까? 연결된 작품이 있으면 삭제할 수 없습니다."
        confirmText="삭제하기"
        variant="danger"
      />

      <AdminCard className="overflow-hidden">
        {/* 통합 헤더 및 툴바 */}
        <AdminCardHeader>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">작가 목록</h2>
            <AdminBadge tone="info">{filtered.length}명</AdminBadge>
          </div>

          <div className="relative max-w-sm w-full">
            <label htmlFor="search-artists" className="sr-only">
              작가 검색
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
              id="search-artists"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름, 전화번호, 이메일 검색..."
              aria-describedby="search-artists-description"
              className="h-10 border-0 py-2 pl-10"
            />
            <span id="search-artists-description" className="sr-only">
              작가 이름, 전화번호 또는 이메일로 검색할 수 있습니다. 현재 {filtered.length}명이
              표시됩니다.
            </span>
          </div>
        </AdminCardHeader>

        {/* 테이블 영역 */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <button
                    type="button"
                    onClick={() => handleSort('artist_info')}
                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                    aria-label={getSortAriaLabel('작가 정보', 'artist_info')}
                  >
                    작가 정보
                    <span className="text-[11px] text-gray-400">{getSortArrow('artist_info')}</span>
                  </button>
                </th>
                <th
                  scope="col"
                  className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  전화번호
                </th>
                <th
                  scope="col"
                  className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  이메일
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <button
                    type="button"
                    onClick={() => handleSort('account_link')}
                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                    aria-label={getSortAriaLabel('계정 연결', 'account_link')}
                  >
                    계정 연결
                    <span className="text-[11px] text-gray-400">
                      {getSortArrow('account_link')}
                    </span>
                  </button>
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <button
                    type="button"
                    onClick={() => handleSort('artwork_count')}
                    className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                    aria-label={getSortAriaLabel('작품 수', 'artwork_count')}
                  >
                    작품 수
                    <span className="text-[11px] text-gray-400">
                      {getSortArrow('artwork_count')}
                    </span>
                  </button>
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">관리</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedArtists.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-0">
                    <AdminEmptyState
                      title="검색 결과가 없습니다"
                      description="다른 검색어로 시도해보세요."
                    />
                  </td>
                </tr>
              ) : (
                sortedArtists.map((artist) => (
                  <tr key={artist.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          {artist.profile_image ? (
                            <SafeAvatarImage
                              className="h-10 w-10 rounded-full object-cover ring-1 ring-gray-200"
                              src={artist.profile_image}
                              alt=""
                              width={40}
                              height={40}
                            />
                          ) : (
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 ring-1 ring-gray-200">
                              <svg
                                className="h-6 w-6 text-gray-400"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                            </span>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="font-medium text-gray-900">
                            {artist.name_ko || '이름 없음'}
                          </div>
                          {artist.name_en && (
                            <div className="text-gray-500 text-sm">{artist.name_en}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                      {artist.contact_phone || <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                      {artist.contact_email || <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {artist.user_id ? (
                        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                          연결됨
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                          미연결
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">
                        {artist.artwork_count} 작품
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end items-center gap-2">
                        <Link
                          href={`/admin/artists/${artist.id}`}
                          className="text-gray-500 hover:text-indigo-600 px-3 py-1.5 rounded-md hover:bg-indigo-50 transition-colors"
                        >
                          편집
                        </Link>
                        <Button
                          variant="white"
                          size="sm"
                          className="text-gray-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => setDeleteTargetId(artist.id)}
                          loading={processingId === artist.id}
                          disabled={processingId !== null}
                          aria-label={`${artist.name_ko} 작가 삭제`}
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
    </div>
  );
}
