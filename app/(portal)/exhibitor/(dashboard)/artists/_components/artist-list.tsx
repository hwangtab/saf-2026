'use client';

import { useOptimistic, useState, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { deleteExhibitorArtist } from '@/app/actions/exhibitor-artists';
import SafeAvatarImage from '@/components/common/SafeAvatarImage';
import {
  AdminBadge,
  AdminCard,
  AdminCardHeader,
  AdminEmptyState,
  AdminInput,
} from '@/app/admin/_components/admin-ui';
import { matchesAnySearch } from '@/lib/search-utils';
import { resolveClientLocale } from '@/lib/client-locale';

type LocaleCode = 'ko' | 'en';

const EXHIBITOR_ARTIST_LIST_COPY: Record<
  LocaleCode,
  {
    deleteConfirm: string;
    deleteError: string;
    closeError: string;
    title: string;
    count: (count: number) => string;
    searchArtist: string;
    searchPlaceholder: string;
    searchDescription: (count: number) => string;
    artistInfo: string;
    contact: string;
    artworkCount: string;
    manage: string;
    noSearchResult: string;
    noSearchResultDescription: string;
    unnamed: string;
    artworkCountValue: (count: number) => string;
    edit: string;
    delete: string;
    deleteArtistAria: (name: string) => string;
  }
> = {
  ko: {
    deleteConfirm: '이 작가를 삭제하시겠습니까? 연결된 작품이 있으면 삭제할 수 없습니다.',
    deleteError: '삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    closeError: '오류 메시지 닫기',
    title: '작가 목록',
    count: (count: number) => `${count}명`,
    searchArtist: '작가 검색',
    searchPlaceholder: '이름, 이메일 검색...',
    searchDescription: (count: number) =>
      `작가 이름 또는 이메일로 검색할 수 있습니다. 현재 ${count}명이 표시됩니다.`,
    artistInfo: '작가 정보',
    contact: '연락처',
    artworkCount: '작품 수',
    manage: '관리',
    noSearchResult: '검색 결과가 없습니다',
    noSearchResultDescription: '다른 검색어로 시도해보세요.',
    unnamed: '이름 없음',
    artworkCountValue: (count: number) => `${count} 작품`,
    edit: '편집',
    delete: '삭제',
    deleteArtistAria: (name: string) => `${name} 작가 삭제`,
  },
  en: {
    deleteConfirm:
      'Do you want to delete this artist? Deletion is blocked if linked artworks exist.',
    deleteError: 'An error occurred while deleting. Please try again.',
    closeError: 'Close error message',
    title: 'Artist list',
    count: (count: number) => `${count}`,
    searchArtist: 'Search artists',
    searchPlaceholder: 'Search by name or email...',
    searchDescription: (count: number) =>
      `Search artists by name or email. ${count} currently shown.`,
    artistInfo: 'Artist info',
    contact: 'Contact',
    artworkCount: 'Artwork count',
    manage: 'Manage',
    noSearchResult: 'No search results',
    noSearchResultDescription: 'Try a different keyword.',
    unnamed: 'Unnamed',
    artworkCountValue: (count: number) => `${count} artworks`,
    edit: 'Edit',
    delete: 'Delete',
    deleteArtistAria: (name: string) => `Delete artist ${name}`,
  },
};

type ArtistItem = {
  id: string;
  name_ko: string | null;
  name_en: string | null;
  profile_image: string | null;
  contact_email: string | null;
  artwork_count: number;
};

export function ArtistList({ artists }: { artists: ArtistItem[] }) {
  const pathname = usePathname();
  const locale = resolveClientLocale(pathname);
  const copy = EXHIBITOR_ARTIST_LIST_COPY[locale];
  const [, startTransition] = useTransition();
  const [optimisticArtists, removeOptimistic] = useOptimistic(
    artists,
    (state, idToRemove: string) => state.filter((a) => a.id !== idToRemove)
  );
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async (id: string) => {
    if (!confirm(copy.deleteConfirm)) return;

    setProcessingId(id);
    setError(null);
    startTransition(async () => {
      removeOptimistic(id);
      try {
        await deleteExhibitorArtist(id);
        router.refresh();
      } catch {
        setError(copy.deleteError);
      } finally {
        setProcessingId(null);
      }
    });
  };

  const filtered = optimisticArtists.filter((artist) => {
    if (!query.trim()) return true;
    return matchesAnySearch(query, [artist.name_ko, artist.name_en, artist.contact_email]);
  });

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm flex items-center justify-between">
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
            aria-label={copy.closeError}
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
        <AdminCardHeader>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">{copy.title}</h2>
            <AdminBadge tone="info">{copy.count(filtered.length)}</AdminBadge>
          </div>

          <div className="relative max-w-sm w-full">
            <label htmlFor="search-artists" className="sr-only">
              {copy.searchArtist}
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
              placeholder={copy.searchPlaceholder}
              aria-describedby="search-artists-description"
              className="h-10 border-0 py-2 pl-10"
            />
            <span id="search-artists-description" className="sr-only">
              {copy.searchDescription(filtered.length)}
            </span>
          </div>
        </AdminCardHeader>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {copy.artistInfo}
                </th>
                <th
                  scope="col"
                  className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {copy.contact}
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {copy.artworkCount}
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">{copy.manage}</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-0">
                    <AdminEmptyState
                      title={copy.noSearchResult}
                      description={copy.noSearchResultDescription}
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
                            {artist.name_ko || copy.unnamed}
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
                        {copy.artworkCountValue(artist.artwork_count)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end items-center gap-2">
                        <Link
                          href={`/exhibitor/artists/${artist.id}`}
                          className="text-gray-500 hover:text-indigo-600 px-3 py-1.5 rounded-md hover:bg-indigo-50 transition-colors"
                        >
                          {copy.edit}
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(artist.id)}
                          className="text-gray-400 hover:text-red-600 px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={processingId !== null}
                          aria-label={copy.deleteArtistAria(artist.name_ko || copy.unnamed)}
                        >
                          {processingId === artist.id ? '...' : copy.delete}
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
