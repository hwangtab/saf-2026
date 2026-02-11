'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { deleteArtwork } from '@/app/actions/artwork';
import Button from '@/components/ui/Button';
import { ExternalLinkIcon } from '@/components/ui/Icons';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/hooks/useToast';

type Artwork = {
  id: string;
  title: string;
  images: string[];
  price: string;
  status: 'available' | 'sold' | 'reserved' | 'hidden';
  is_hidden: boolean;
  created_at: string;
};

export function ArtworkList({
  artworks,
  flashMessage,
}: {
  artworks: Artwork[];
  flashMessage?: string | null;
}) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [optimisticArtworks, setOptimisticArtworks] = useState(artworks);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    setOptimisticArtworks(artworks);
  }, [artworks]);

  useEffect(() => {
    if (!flashMessage) return;
    toast.success(flashMessage);
    router.replace('/dashboard/artworks');
  }, [flashMessage, router, toast]);

  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 작품을 삭제하시겠습니까? 복구할 수 없습니다.')) return;

    setOptimisticArtworks((prev) => prev.filter((a) => a.id !== id));
    setIsDeleting(id);

    try {
      const result = await deleteArtwork(id);

      if (result.error) {
        setOptimisticArtworks(artworks);
        toast.error(result.message);
      } else {
        toast.success('작품이 삭제되었습니다.');
        router.refresh();
      }
    } catch (error) {
      setOptimisticArtworks(artworks);
      toast.error('삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(null);
    }
  };

  if (optimisticArtworks.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">등록된 작품이 없습니다</h3>
        <p className="mt-1 text-sm text-gray-500">
          새로운 작품을 등록하여 포트폴리오를 완성해보세요.
        </p>
        <div className="mt-6">
          <Button href="/dashboard/artworks/new">첫 작품 등록하기</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul role="list" className="divide-y divide-gray-200">
        {optimisticArtworks.map((artwork) => (
          <li key={artwork.id}>
            <div className="flex items-center px-4 py-5 sm:px-6">
              <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-16 w-16 rounded-md overflow-hidden bg-gray-100">
                    {artwork.images?.[0] ? (
                      <img
                        className="h-full w-full object-cover"
                        src={artwork.images[0]}
                        alt={artwork.title}
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/artworks/${artwork.id}/edit`}
                        className="font-medium text-indigo-600 truncate hover:underline"
                      >
                        {artwork.title}
                      </Link>
                      {artwork.is_hidden && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          숨김
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex text-sm text-gray-500">
                      <p className="truncate mr-4">{artwork.price}</p>
                      <p>
                        {artwork.status === 'sold' ? (
                          <span className="text-red-500 font-medium">판매 완료</span>
                        ) : artwork.status === 'reserved' ? (
                          <span className="text-amber-600 font-medium">예약됨</span>
                        ) : (
                          <span className="text-green-600">판매 중</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="ml-5 flex-shrink-0 flex gap-2">
                <Link
                  href={`/artworks/${artwork.id}`}
                  target="_blank"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-500"
                  title="미리보기"
                >
                  <ExternalLinkIcon />
                </Link>
                <Button href={`/dashboard/artworks/${artwork.id}/edit`} variant="white" size="sm">
                  수정
                </Button>
                <Button
                  variant="white"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:border-red-200"
                  onClick={() => handleDelete(artwork.id)}
                  loading={isDeleting === artwork.id}
                  disabled={!!isDeleting}
                >
                  삭제
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
