'use client';

import { useCallback, useEffect, useOptimistic, useState, useTransition } from 'react';
import Link from 'next/link';
import { deleteArtwork } from '@/app/actions/artwork';
import Button from '@/components/ui/Button';
import SafeImage from '@/components/common/SafeImage';
import { ExternalLinkIcon } from '@/components/ui/Icons';
import { formatPriceForDisplay, resolveArtworkImageUrlForPreset } from '@/lib/utils';
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from '@/lib/hooks/useToast';
import { AdminBadge, AdminCard, AdminEmptyState } from '@/app/admin/_components/admin-ui';
import { resolveClientLocale } from '@/lib/client-locale';

type LocaleCode = 'ko' | 'en';

const ARTWORK_LIST_COPY: Record<
  LocaleCode,
  {
    flashSuccessDefault: string;
    flashWarningDefault: string;
    flashErrorDefault: string;
    deleteConfirm: string;
    deleteError: string;
    deleteSuccess: string;
    emptyTitle: string;
    emptyDescription: string;
    firstArtwork: string;
    hidden: string;
    sold: string;
    reserved: string;
    available: string;
    preview: string;
    edit: string;
    delete: string;
    noImage: string;
  }
> = {
  ko: {
    flashSuccessDefault: '작업이 완료되었습니다.',
    flashWarningDefault: '확인이 필요합니다.',
    flashErrorDefault: '오류가 발생했습니다.',
    deleteConfirm: '정말 이 작품을 삭제하시겠습니까? 관리자 활동 로그에서 복구할 수 있습니다.',
    deleteError: '삭제 중 오류가 발생했습니다.',
    deleteSuccess: '작품을 삭제했습니다.',
    emptyTitle: '등록된 작품이 없습니다',
    emptyDescription: '새로운 작품을 등록하여 포트폴리오를 완성해보세요.',
    firstArtwork: '첫 작품 등록하기',
    hidden: '숨김',
    sold: '판매 완료',
    reserved: '예약됨',
    available: '판매 중',
    preview: '미리보기',
    edit: '수정',
    delete: '삭제',
    noImage: '이미지 없음',
  },
  en: {
    flashSuccessDefault: 'Completed successfully.',
    flashWarningDefault: 'Requires attention.',
    flashErrorDefault: 'An error occurred.',
    deleteConfirm:
      'Are you sure you want to delete this artwork? You can restore it from admin activity logs.',
    deleteError: 'An error occurred while deleting.',
    deleteSuccess: 'Artwork deleted.',
    emptyTitle: 'No artworks registered',
    emptyDescription: 'Add a new artwork to complete your portfolio.',
    firstArtwork: 'Add your first artwork',
    hidden: 'Hidden',
    sold: 'Sold',
    reserved: 'Reserved',
    available: 'Available',
    preview: 'Preview',
    edit: 'Edit',
    delete: 'Delete',
    noImage: 'No image',
  },
};

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
  const pathname = usePathname();
  const locale = resolveClientLocale(pathname);
  const copy = ARTWORK_LIST_COPY[locale];
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [optimisticArtworks, removeOptimistic] = useOptimistic(
    artworks,
    (state, idToRemove: string) => state.filter((a) => a.id !== idToRemove)
  );
  const router = useRouter();
  const toast = useToast();

  const resolveServerMessage = useCallback(
    (message: string | null | undefined, fallback: string) => {
      if (!message) return fallback;
      if (locale === 'en' && /[가-힣]/.test(message)) return fallback;
      return message;
    },
    [locale]
  );

  useEffect(() => {
    if (!flashMessage) return;
    const fallback =
      flashType === 'warning'
        ? copy.flashWarningDefault
        : flashType === 'error'
          ? copy.flashErrorDefault
          : copy.flashSuccessDefault;
    const message = resolveServerMessage(flashMessage, fallback);
    if (flashType === 'warning') {
      toast.warning(message);
    } else if (flashType === 'error') {
      toast.error(message);
    } else {
      toast.success(message);
    }
    router.replace('/dashboard/artworks');
  }, [
    copy.flashErrorDefault,
    copy.flashSuccessDefault,
    copy.flashWarningDefault,
    flashMessage,
    flashType,
    resolveServerMessage,
    router,
    toast,
  ]);

  const handleDelete = async (id: string) => {
    if (!confirm(copy.deleteConfirm)) return;

    setIsDeleting(id);
    startTransition(async () => {
      removeOptimistic(id);
      try {
        const result = await deleteArtwork(id);
        if (result.error) {
          toast.error(resolveServerMessage(result.message, copy.deleteError));
        } else {
          toast.success(copy.deleteSuccess);
          router.refresh();
        }
      } catch (error) {
        console.error('[artist-artwork-list] Artwork deletion failed:', error);
        toast.error(copy.deleteError);
      } finally {
        setIsDeleting(null);
      }
    });
  };

  if (optimisticArtworks.length === 0) {
    return (
      <AdminCard>
        <AdminEmptyState title={copy.emptyTitle} description={copy.emptyDescription}>
          <Button href="/dashboard/artworks/new">{copy.firstArtwork}</Button>
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
                        {copy.noImage}
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
                      {artwork.is_hidden && <AdminBadge>{copy.hidden}</AdminBadge>}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      <p className="truncate">{formatPriceForDisplay(artwork.price)}</p>
                      <p>
                        {artwork.status === 'sold' ? (
                          <span className="font-medium text-rose-600">{copy.sold}</span>
                        ) : artwork.status === 'reserved' ? (
                          <span className="font-medium text-amber-600">{copy.reserved}</span>
                        ) : (
                          <span className="font-medium text-emerald-600">{copy.available}</span>
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
                  rel="noopener noreferrer"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  title={copy.preview}
                >
                  <ExternalLinkIcon />
                </Link>
                <Button href={`/dashboard/artworks/${artwork.id}/edit`} variant="white" size="sm">
                  {copy.edit}
                </Button>
                <Button
                  variant="white"
                  size="sm"
                  className="text-rose-600 hover:border-rose-200 hover:text-rose-700"
                  onClick={() => handleDelete(artwork.id)}
                  loading={isDeleting === artwork.id}
                  disabled={!!isDeleting}
                >
                  {copy.delete}
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </AdminCard>
  );
}
