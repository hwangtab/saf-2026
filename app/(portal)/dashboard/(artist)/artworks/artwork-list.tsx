'use client';

import { useCallback, useEffect, useOptimistic, useState, useTransition } from 'react';
import Link from 'next/link';
import { deleteArtwork } from '@/app/actions/artwork';
import Button from '@/components/ui/Button';
import SafeImage from '@/components/common/SafeImage';
import { ExternalLinkIcon } from '@/components/ui/Icons';
import { formatPriceForDisplay, resolveArtworkImageUrlForPreset } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/lib/hooks/useToast';
import { AdminBadge, AdminCard, AdminEmptyState } from '@/app/admin/_components/admin-ui';
import { AdminConfirmModal } from '@/app/admin/_components/AdminConfirmModal';
import { useLocale, useTranslations } from 'next-intl';

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
  const locale = useLocale();
  const t = useTranslations('dashboard.artworkList');
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
        ? t('flashWarningDefault')
        : flashType === 'error'
          ? t('flashErrorDefault')
          : t('flashSuccessDefault');
    const message = resolveServerMessage(flashMessage, fallback);
    if (flashType === 'warning') {
      toast.warning(message);
    } else if (flashType === 'error') {
      toast.error(message);
    } else {
      toast.success(message);
    }
    router.replace('/dashboard/artworks');
  }, [flashMessage, flashType, resolveServerMessage, router, t, toast]);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget;
    setDeleteTarget(null);
    setIsDeleting(id);
    startTransition(async () => {
      removeOptimistic(id);
      try {
        const result = await deleteArtwork(id);
        if (result.error) {
          toast.error(resolveServerMessage(result.message, t('deleteError')));
        } else {
          toast.success(t('deleteSuccess'));
          router.refresh();
        }
      } catch (error) {
        console.error('[artist-artwork-list] Artwork deletion failed:', error);
        toast.error(t('deleteError'));
      } finally {
        setIsDeleting(null);
      }
    });
  };

  if (optimisticArtworks.length === 0) {
    return (
      <AdminCard>
        <AdminEmptyState title={t('emptyTitle')} description={t('emptyDescription')}>
          <Button href="/dashboard/artworks/new">{t('firstArtwork')}</Button>
        </AdminEmptyState>
      </AdminCard>
    );
  }

  return (
    <>
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
                          {t('noImage')}
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
                        {artwork.is_hidden && <AdminBadge>{t('hidden')}</AdminBadge>}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                        <p className="truncate">{formatPriceForDisplay(artwork.price)}</p>
                        <p>
                          {artwork.status === 'sold' ? (
                            <span className="font-medium text-rose-600">{t('sold')}</span>
                          ) : artwork.status === 'reserved' ? (
                            <span className="font-medium text-amber-600">{t('reserved')}</span>
                          ) : (
                            <span className="font-medium text-emerald-600">{t('available')}</span>
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
                    title={t('preview')}
                  >
                    <ExternalLinkIcon />
                  </Link>
                  <Button href={`/dashboard/artworks/${artwork.id}/edit`} variant="white" size="sm">
                    {t('edit')}
                  </Button>
                  <Button
                    variant="white"
                    size="sm"
                    className="text-rose-600 hover:border-rose-200 hover:text-rose-700"
                    onClick={() => setDeleteTarget(artwork.id)}
                    loading={isDeleting === artwork.id}
                    disabled={!!isDeleting}
                  >
                    {t('delete')}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </AdminCard>

      <AdminConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={t('delete')}
        description={t('deleteConfirm')}
        variant="danger"
        isLoading={isDeleting !== null}
      />
    </>
  );
}
