'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { deleteArtist } from '@/app/actions/admin-artists';
import {
  AdminBadge,
  AdminCard,
  AdminCardHeader,
  AdminEmptyState,
  AdminInput,
} from '@/app/admin/_components/admin-ui';

type ArtistItem = {
  id: string;
  name_ko: string | null;
  name_en: string | null;
  profile_image: string | null;
  contact_email: string | null;
  artwork_count: number;
};

export function ArtistList({ artists }: { artists: ArtistItem[] }) {
  const [optimisticArtists, setOptimisticArtists] = useState(artists);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setOptimisticArtists(artists);
  }, [artists]);

  const handleDelete = async (id: string) => {
    if (!confirm('이 작가를 삭제하시겠습니까? 연결된 작품이 있으면 삭제할 수 없습니다.')) return;

    setOptimisticArtists((prev) => prev.filter((a) => a.id !== id));
    setProcessingId(id);
    setError(null);

    try {
      await deleteArtist(id);
    } catch (err: unknown) {
      setOptimisticArtists(artists);
      setError(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = optimisticArtists.filter((artist) => {
    if (!query) return true;
    const q = query.toLowerCase().replace(/\s+/g, '');
    const nameKo = (artist.name_ko || '').toLowerCase().replace(/\s+/g, '');
    const nameEn = (artist.name_en || '').toLowerCase().replace(/\s+/g, '');
    const email = (artist.contact_email || '').toLowerCase().replace(/\s+/g, '');
    return nameKo.includes(q) || nameEn.includes(q) || email.includes(q);
  });

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
              placeholder="이름, 이메일 검색..."
              aria-describedby="search-artists-description"
              className="h-10 border-0 py-2 pl-10"
            />
            <span id="search-artists-description" className="sr-only">
              작가 이름 또는 이메일로 검색할 수 있습니다. 현재 {filtered.length}명이 표시됩니다.
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
                  작가 정보
                </th>
                <th
                  scope="col"
                  className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  연락처
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  작품 수
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">관리</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-0">
                    <AdminEmptyState
                      title="검색 결과가 없습니다"
                      description="다른 검색어로 시도해보세요."
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((artist) => (
                  <tr key={artist.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          {artist.profile_image ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover ring-1 ring-gray-200"
                              src={artist.profile_image}
                              alt=""
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
                      {artist.contact_email || <span className="text-gray-300">-</span>}
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
                        <button
                          type="button"
                          onClick={() => handleDelete(artist.id)}
                          className="text-gray-400 hover:text-red-600 px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={processingId !== null}
                          aria-label={`${artist.name_ko} 작가 삭제`}
                        >
                          {processingId === artist.id ? '...' : '삭제'}
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
    </div>
  );
}
