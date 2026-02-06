'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { deleteArtist } from '@/app/actions/admin-artists';

type ArtistItem = {
  id: string;
  name_ko: string | null;
  name_en: string | null;
  profile_image: string | null;
  contact_email: string | null;
  artwork_count: number;
};

export function ArtistList({ artists }: { artists: ArtistItem[] }) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('이 작가를 삭제하시겠습니까? 연결된 작품이 있으면 삭제할 수 없습니다.')) return;
    setProcessingId(id);
    setError(null);
    try {
      await deleteArtist(id);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  if (artists.length === 0) {
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
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">등록된 작가가 없습니다</h3>
        <p className="mt-1 text-sm text-gray-500">승인된 작가가 있으면 여기에 표시됩니다.</p>
      </div>
    );
  }

  const filtered = artists.filter((artist) => {
    if (!query) return true;
    const q = query.toLowerCase().replace(/\s+/g, '');
    const nameKo = (artist.name_ko || '').toLowerCase().replace(/\s+/g, '');
    const nameEn = (artist.name_en || '').toLowerCase().replace(/\s+/g, '');
    const email = (artist.contact_email || '').toLowerCase().replace(/\s+/g, '');
    return nameKo.includes(q) || nameEn.includes(q) || email.includes(q);
  });

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-4 text-red-500 hover:text-red-700"
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

      <div className="bg-white shadow-sm rounded-lg p-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="검색: 작가명/이메일"
          aria-label="작가 검색"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
        />
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작가
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                연락처
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작품 수
              </th>
              <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                관리
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtered.map((artist) => (
              <tr key={artist.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0">
                      {artist.profile_image ? (
                        <img
                          src={artist.profile_image}
                          alt={`${artist.name_ko || '작가'} 프로필`}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-sm">
                          ?
                        </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <Link
                        href={`/admin/artists/${artist.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600"
                      >
                        {artist.name_ko || '(이름 없음)'}
                      </Link>
                      {artist.name_en && (
                        <div className="text-sm text-gray-500">{artist.name_en}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">
                  {artist.contact_email || '-'}
                </td>
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {artist.artwork_count}점
                </td>
                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" href={`/admin/artists/${artist.id}`}>
                      편집
                    </Button>
                    <Button
                      variant="white"
                      className="text-red-600"
                      onClick={() => handleDelete(artist.id)}
                      loading={processingId === artist.id}
                      disabled={processingId !== null}
                    >
                      삭제
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="text-sm text-gray-500">총 {filtered.length}명의 작가</div>
    </div>
  );
}
