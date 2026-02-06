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
    } catch (err: any) {
      setError(err.message || '삭제 중 오류가 발생했습니다.');
    } finally {
      setProcessingId(null);
    }
  };

  if (artists.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-6 text-sm text-gray-500">
        등록된 작가가 없습니다.
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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg p-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="검색: 작가명/이메일"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작가
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                연락처
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                작품 수
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                관리
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtered.map((artist) => (
              <tr key={artist.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0">
                      {artist.profile_image ? (
                        <img
                          src={artist.profile_image}
                          alt=""
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
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {artist.contact_email || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {artist.artwork_count}점
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
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
