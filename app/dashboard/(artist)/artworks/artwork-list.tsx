'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { deleteArtwork } from '@/app/actions/artwork';
import Button from '@/components/ui/Button';
import SafeImage from '@/components/common/SafeImage';
import { ExternalLinkIcon } from '@/components/ui/Icons';
import { formatPriceForDisplay, resolveArtworkImageUrlForPreset } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/hooks/useToast';
import { AdminBadge, AdminCard, AdminEmptyState } from '@/app/admin/_components/admin-ui';

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
  flashType = 'success',
}: {
  artworks: Artwork[];
  flashMessage?: string | null;
  flashType?: 'success' | 'warning' | 'error' | null;
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
    if (flashType === 'warning') {
      toast.warning(flashMessage);
    } else if (flashType === 'error') {
      toast.error(flashMessage);
    } else {
      toast.success(flashMessage);
    }
    router.replace('/dashboard/artworks');
  }, [flashMessage, flashType, router, toast]);

  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 작품을 삭제하시겠습니까? 관리자 활동 로그에서 복구할 수 있습니다.'))
      return;

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
      <AdminCard>
        <AdminEmptyState
          title="등록된 작품이 없습니다"
          description="새로운 작품을 등록하여 포트폴리오를 완성해보세요."
        >
          <Button href="/dashboard/artworks/new">첫 작품 등록하기</Button>
        </AdminEmptyState>
      </AdminCard>
    );
  }

  return (
    <AdminCard className="overflow-hidden">
      <ul role="list" className="divide-y divide-[var(--admin-border-soft)]">
        {optimisticArtworks.map((artwork) => (
          <li key={artwork.id}>
            <div className="flex flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                <div className="flex items-center">
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-[var(--admin-border)] bg-slate-100">
                    {artwork.images?.[0] ? (
                      <SafeImage
                        className="object-cover"
                        src={resolveArtworkImageUrlForPreset(artwork.images[0], 'slider')}
                        alt={artwork.title}
                        fill
                        sizes="64px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/dashboard/artworks/${artwork.id}/edit`}
                        className="truncate text-sm font-semibold text-slate-900 hover:text-indigo-700 hover:underline"
                      >
                        {artwork.title}
                      </Link>
                      {artwork.is_hidden && <AdminBadge>숨김</AdminBadge>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      <p className="truncate">{formatPriceForDisplay(artwork.price)}</p>
                      <p>
                        {artwork.status === 'sold' ? (
                          <span className="font-medium text-rose-600">판매 완료</span>
                        ) : artwork.status === 'reserved' ? (
                          <span className="font-medium text-amber-600">예약됨</span>
                        ) : (
                          <span className="font-medium text-emerald-600">판매 중</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2 lg:ml-5">
                <Link
                  href={`/artworks/${artwork.id}`}
                  target="_blank"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
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
                  className="text-rose-600 hover:border-rose-200 hover:text-rose-700"
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
    </AdminCard>
  );
}
