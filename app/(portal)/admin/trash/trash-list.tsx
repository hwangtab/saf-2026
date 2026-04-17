'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { purgeActivityTrashLog, revertActivityLog } from '@/app/actions/admin-log-revert';
import type { ActivityLogEntry } from '@/app/actions/admin-logs';
import { AdminCard, AdminEmptyState } from '@/app/admin/_components/admin-ui';
import { AdminConfirmModal } from '@/app/admin/_components/AdminConfirmModal';
import Button from '@/components/ui/Button';
import { useToast } from '@/lib/hooks/useToast';

type TrashListProps = {
  logs: ActivityLogEntry[];
  currentPage: number;
  totalPages: number;
  total: number;
};

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTargetTypeLabel(type: string | null, t: (key: string) => string) {
  switch (type) {
    case 'artwork':
      return t('targetTypeArtwork');
    case 'artist':
      return t('targetTypeArtist');
    default:
      return type || '-';
  }
}

function getTargetLink(log: ActivityLogEntry): string | null {
  if (log.target_type === 'artwork') return '/admin/artworks';
  if (log.target_type === 'artist') return '/admin/artists';
  return null;
}

function toObject(value: unknown): Record<string, unknown> | null {
  if (!value || Array.isArray(value) || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function toObjectList(value: unknown): Record<string, unknown>[] | null {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is Record<string, unknown> => !!item && typeof item === 'object'
    );
  }

  const objectValue = toObject(value);
  if (!objectValue) return null;
  if (!Array.isArray(objectValue.items)) return null;

  return objectValue.items.filter(
    (item): item is Record<string, unknown> => !!item && typeof item === 'object'
  );
}

function getSnapshotDisplayName(snapshot: Record<string, unknown> | null): string | null {
  if (!snapshot) return null;

  const title = typeof snapshot.title === 'string' ? snapshot.title : null;
  const nameKo = typeof snapshot.name_ko === 'string' ? snapshot.name_ko : null;
  const name = typeof snapshot.name === 'string' ? snapshot.name : null;
  const artistName = typeof snapshot.artist_name === 'string' ? snapshot.artist_name : null;
  const representativeName =
    typeof snapshot.representative_name === 'string' ? snapshot.representative_name : null;

  return title || nameKo || name || artistName || representativeName || null;
}

function getTargetDisplayName(
  log: ActivityLogEntry,
  t: (key: string, params?: Record<string, string | number | Date>) => string
) {
  const details = log.metadata as Record<string, unknown> | null;
  const targetName = typeof details?.target_name === 'string' ? details.target_name : null;
  if (targetName) return targetName;

  const targetNamesRaw =
    details?.target_names &&
    typeof details.target_names === 'object' &&
    !Array.isArray(details.target_names)
      ? (details.target_names as Record<string, unknown>)
      : null;
  const mappedTargetName =
    targetNamesRaw && typeof targetNamesRaw[log.target_id] === 'string'
      ? (targetNamesRaw[log.target_id] as string)
      : null;
  if (mappedTargetName) return mappedTargetName;

  const title = typeof details?.title === 'string' ? details.title : null;
  const name = typeof details?.name === 'string' ? details.name : null;
  if (title || name) return title || name;

  const beforeList = toObjectList(log.before_snapshot);
  if (beforeList && beforeList.length > 0) {
    const exactMatch =
      beforeList.find((item) => typeof item.id === 'string' && item.id === log.target_id) || null;
    const exactName = getSnapshotDisplayName(exactMatch);
    if (exactName) return exactName;

    if (beforeList.length === 1) {
      const singleName = getSnapshotDisplayName(beforeList[0]);
      if (singleName) return singleName;
    }

    const namedItems = beforeList
      .map((item) => getSnapshotDisplayName(item))
      .filter((value): value is string => !!value);
    if (namedItems.length > 0) {
      return namedItems.length > 1
        ? t('andMore', { name: namedItems[0], count: namedItems.length - 1 })
        : namedItems[0];
    }
  }

  const beforeSnapshot = toObject(log.before_snapshot);
  const snapshotName = getSnapshotDisplayName(beforeSnapshot);
  if (snapshotName) return snapshotName;

  return log.target_id;
}

function getDaysLeft(expiresAt: string | null) {
  if (!expiresAt) return null;
  const expires = new Date(expiresAt).getTime();
  if (Number.isNaN(expires)) return null;
  const diffMs = expires - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function TrashList({ logs, currentPage, totalPages, total }: TrashListProps) {
  const locale = useLocale();
  const t = useTranslations('admin.trash');
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [restoreTargetId, setRestoreTargetId] = useState<string | null>(null);
  const [purgeTargetId, setPurgeTargetId] = useState<string | null>(null);
  const [restoreReason, setRestoreReason] = useState('');
  const [purgeReason, setPurgeReason] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  const getPageHref = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    return `/admin/trash?${params.toString()}`;
  };

  const handleRestore = async () => {
    if (!restoreTargetId || !restoreReason.trim()) return;
    const logId = restoreTargetId;
    const reason = restoreReason.trim();

    setIsRestoring(true);
    try {
      const result = await revertActivityLog(logId, reason);
      if (!result.success) {
        toast.error(locale === 'en' ? t('restoreError') : result.message || t('restoreError'));
        return;
      }
      toast.success(t('restoreSuccess'));
      setRestoreTargetId(null);
      setRestoreReason('');
      router.refresh();
    } catch {
      toast.error(t('restoreError'));
    } finally {
      setIsRestoring(false);
    }
  };

  const handlePurge = async () => {
    if (!purgeTargetId || !purgeReason.trim()) return;
    const logId = purgeTargetId;
    const reason = purgeReason.trim();

    setIsPurging(true);
    try {
      const result = await purgeActivityTrashLog(logId, reason);
      const failed = typeof result?.failed === 'number' ? result.failed : 0;
      if (failed > 0) {
        toast.warning(t('purgePartial', { failed }));
      } else {
        toast.success(t('purgeSuccess'));
      }
      setPurgeTargetId(null);
      setPurgeReason('');
      router.refresh();
    } catch {
      toast.error(t('purgeError'));
    } finally {
      setIsPurging(false);
    }
  };

  if (logs.length === 0) {
    return (
      <AdminCard>
        <AdminEmptyState title={t('emptyTitle')} description={t('emptyDescription')} />
      </AdminCard>
    );
  }

  return (
    <div className="space-y-4">
      <AdminConfirmModal
        isOpen={!!restoreTargetId}
        onClose={() => {
          setRestoreTargetId(null);
          setRestoreReason('');
        }}
        onConfirm={handleRestore}
        title={t('restoreModalTitle')}
        confirmText={t('restoreModalConfirm')}
        variant="warning"
        isLoading={isRestoring}
        description={t('restoreModalDescription')}
      >
        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t('restoreReasonLabel')} <span className="text-red-500">*</span>
          </label>
          <textarea
            value={restoreReason}
            onChange={(e) => setRestoreReason(e.target.value)}
            rows={3}
            placeholder={t('restoreReasonPlaceholder')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          />
        </div>
      </AdminConfirmModal>

      <AdminConfirmModal
        isOpen={!!purgeTargetId}
        onClose={() => {
          setPurgeTargetId(null);
          setPurgeReason('');
        }}
        onConfirm={handlePurge}
        title={t('purgeModalTitle')}
        confirmText={t('purgeModalConfirm')}
        variant="danger"
        isLoading={isPurging}
        description={t('purgeModalDescription')}
      >
        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t('purgeReasonLabel')} <span className="text-red-500">*</span>
          </label>
          <textarea
            value={purgeReason}
            onChange={(e) => setPurgeReason(e.target.value)}
            rows={3}
            placeholder={t('purgeReasonPlaceholder')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          />
        </div>
      </AdminConfirmModal>

      <AdminCard className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('colDeletedAt')}
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('colTarget')}
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('colExpireAt')}
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('colStatus')}
              </th>
              <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('colAction')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {logs.map((log) => {
              const daysLeft = getDaysLeft(log.trash_expires_at);
              const isExpired = daysLeft !== null ? daysLeft <= 0 : false;
              const targetLink = getTargetLink(log);
              const targetName = getTargetDisplayName(log, t);

              return (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(log.created_at, locale)}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-gray-800">
                    <div className="space-y-0.5">
                      {targetLink ? (
                        <Link href={targetLink} className="text-indigo-600 hover:underline">
                          {getTargetTypeLabel(log.target_type, t)}
                        </Link>
                      ) : (
                        <div>{getTargetTypeLabel(log.target_type, t)}</div>
                      )}
                      <div className="text-xs text-gray-600">{targetName}</div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {formatDate(log.trash_expires_at, locale)}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                    {isExpired ? (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                        {t('expired')}
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        {t('retained')} {daysLeft !== null ? t('daysLeft', { days: daysLeft }) : ''}
                      </span>
                    )}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex justify-end gap-2">
                      {!isExpired ? (
                        <button
                          type="button"
                          onClick={() => setRestoreTargetId(log.id)}
                          className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
                        >
                          {t('restore')}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">{t('restoreExpired')}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setPurgeTargetId(log.id)}
                        className="rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                      >
                        {t('purge')}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </AdminCard>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {t('total', { total, page: currentPage, totalPages })}
        </p>
        <div className="flex gap-2">
          {currentPage > 1 && (
            <Button variant="white" href={getPageHref(currentPage - 1)}>
              {t('prev')}
            </Button>
          )}
          {currentPage < totalPages && (
            <Button variant="white" href={getPageHref(currentPage + 1)}>
              {t('next')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
