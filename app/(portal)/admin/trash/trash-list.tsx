'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  purgeActivityTrashLog,
  revertActivityLog,
  type ActivityLogEntry,
} from '@/app/actions/admin-logs';
import { AdminCard, AdminEmptyState } from '@/app/admin/_components/admin-ui';
import { AdminConfirmModal } from '@/app/admin/_components/AdminConfirmModal';
import Button from '@/components/ui/Button';
import { useToast } from '@/lib/hooks/useToast';
import { resolveClientLocale } from '@/lib/client-locale';

type LocaleCode = 'ko' | 'en';

type TrashListProps = {
  logs: ActivityLogEntry[];
  currentPage: number;
  totalPages: number;
  total: number;
};

function formatDate(value: string | null | undefined, locale: LocaleCode) {
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

function getTargetTypeLabel(type: string | null, locale: LocaleCode) {
  switch (type) {
    case 'artwork':
      return locale === 'en' ? 'Artwork' : '작품';
    case 'artist':
      return locale === 'en' ? 'Artist' : '작가';
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

function getTargetDisplayName(log: ActivityLogEntry, locale: LocaleCode) {
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
        ? locale === 'en'
          ? `${namedItems[0]} and ${namedItems.length - 1} more`
          : `${namedItems[0]} 외 ${namedItems.length - 1}건`
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

const TRASH_COPY: Record<
  LocaleCode,
  {
    restoreError: string;
    restoreSuccess: string;
    purgeSuccess: string;
    purgePartial: (failed: number) => string;
    purgeError: string;
    emptyTitle: string;
    emptyDescription: string;
    restoreModalTitle: string;
    restoreModalConfirm: string;
    restoreModalDescription: string;
    restoreReasonLabel: string;
    restoreReasonPlaceholder: string;
    purgeModalTitle: string;
    purgeModalConfirm: string;
    purgeModalDescription: string;
    purgeReasonLabel: string;
    purgeReasonPlaceholder: string;
    colDeletedAt: string;
    colTarget: string;
    colExpireAt: string;
    colStatus: string;
    colAction: string;
    expired: string;
    retained: string;
    daysLeft: (days: number) => string;
    restore: string;
    restoreExpired: string;
    purge: string;
    total: (total: number, page: number, totalPages: number) => string;
    prev: string;
    next: string;
  }
> = {
  ko: {
    restoreError: '복원 중 오류가 발생했습니다.',
    restoreSuccess: '휴지통 항목을 복원했습니다.',
    purgeSuccess: '휴지통 항목을 영구 삭제했습니다.',
    purgePartial: (failed: number) => `영구 삭제 완료(일부 스토리지 ${failed}건 삭제 실패)`,
    purgeError: '영구 삭제 중 오류가 발생했습니다.',
    emptyTitle: '휴지통이 비어 있습니다',
    emptyDescription: '삭제된 항목이 생기면 이 페이지에서 복원 또는 영구 삭제할 수 있습니다.',
    restoreModalTitle: '휴지통 복원 확인',
    restoreModalConfirm: '복원하기',
    restoreModalDescription: '휴지통 항목을 복원하시겠습니까? 복원 사유를 입력해주세요.',
    restoreReasonLabel: '복원 사유',
    restoreReasonPlaceholder: '예: 실수로 삭제한 항목 복원',
    purgeModalTitle: '휴지통 영구 삭제 확인',
    purgeModalConfirm: '영구 삭제',
    purgeModalDescription:
      '휴지통 항목을 영구 삭제하면 복구할 수 없습니다. 영구 삭제 사유를 입력해주세요.',
    purgeReasonLabel: '영구 삭제 사유',
    purgeReasonPlaceholder: '예: 보관 기간 종료 전 수동 정리',
    colDeletedAt: '삭제 시각',
    colTarget: '대상',
    colExpireAt: '보관 만료',
    colStatus: '상태',
    colAction: '조치',
    expired: '만료됨',
    retained: '보관 중',
    daysLeft: (days: number) => `${days}일 남음`,
    restore: '복원',
    restoreExpired: '복원 만료',
    purge: '영구 삭제',
    total: (total: number, page: number, totalPages: number) =>
      `총 ${total}건 (페이지 ${page} / ${totalPages})`,
    prev: '이전',
    next: '다음',
  },
  en: {
    restoreError: 'An error occurred while restoring.',
    restoreSuccess: 'Trash item restored.',
    purgeSuccess: 'Trash item permanently deleted.',
    purgePartial: (failed: number) =>
      `Permanent delete completed (failed to delete ${failed} storage item(s))`,
    purgeError: 'An error occurred while permanently deleting.',
    emptyTitle: 'Trash is empty',
    emptyDescription:
      'When deleted items appear, you can restore or permanently delete them on this page.',
    restoreModalTitle: 'Confirm restore from trash',
    restoreModalConfirm: 'Restore',
    restoreModalDescription: 'Do you want to restore this trash item? Please enter a reason.',
    restoreReasonLabel: 'Reason for restore',
    restoreReasonPlaceholder: 'e.g., Restore an item deleted by mistake',
    purgeModalTitle: 'Confirm permanent delete from trash',
    purgeModalConfirm: 'Permanently delete',
    purgeModalDescription:
      'If you permanently delete a trash item, it cannot be restored. Please enter a reason.',
    purgeReasonLabel: 'Reason for permanent delete',
    purgeReasonPlaceholder: 'e.g., Manual cleanup before retention period ends',
    colDeletedAt: 'Deleted at',
    colTarget: 'Target',
    colExpireAt: 'Retention expires',
    colStatus: 'Status',
    colAction: 'Action',
    expired: 'Expired',
    retained: 'Retained',
    daysLeft: (days: number) => `${days} days left`,
    restore: 'Restore',
    restoreExpired: 'Restore expired',
    purge: 'Permanently delete',
    total: (total: number, page: number, totalPages: number) =>
      `Total ${total} records (page ${page} / ${totalPages})`,
    prev: 'Previous',
    next: 'Next',
  },
};

export function TrashList({ logs, currentPage, totalPages, total }: TrashListProps) {
  const pathname = usePathname();
  const locale = resolveClientLocale(pathname);
  const copy = TRASH_COPY[locale];
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
        toast.error(locale === 'en' ? copy.restoreError : result.message || copy.restoreError);
        return;
      }
      toast.success(copy.restoreSuccess);
      setRestoreTargetId(null);
      setRestoreReason('');
      router.refresh();
    } catch (error) {
      const message =
        locale === 'en'
          ? copy.restoreError
          : error instanceof Error
            ? error.message
            : copy.restoreError;
      toast.error(message);
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
        toast.warning(copy.purgePartial(failed));
      } else {
        toast.success(copy.purgeSuccess);
      }
      setPurgeTargetId(null);
      setPurgeReason('');
      router.refresh();
    } catch (error) {
      const message =
        locale === 'en'
          ? copy.purgeError
          : error instanceof Error
            ? error.message
            : copy.purgeError;
      toast.error(message);
    } finally {
      setIsPurging(false);
    }
  };

  if (logs.length === 0) {
    return (
      <AdminCard>
        <AdminEmptyState title={copy.emptyTitle} description={copy.emptyDescription} />
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
        title={copy.restoreModalTitle}
        confirmText={copy.restoreModalConfirm}
        variant="warning"
        isLoading={isRestoring}
        description={copy.restoreModalDescription}
      >
        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {copy.restoreReasonLabel} <span className="text-red-500">*</span>
          </label>
          <textarea
            value={restoreReason}
            onChange={(e) => setRestoreReason(e.target.value)}
            rows={3}
            placeholder={copy.restoreReasonPlaceholder}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
        title={copy.purgeModalTitle}
        confirmText={copy.purgeModalConfirm}
        variant="danger"
        isLoading={isPurging}
        description={copy.purgeModalDescription}
      >
        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {copy.purgeReasonLabel} <span className="text-red-500">*</span>
          </label>
          <textarea
            value={purgeReason}
            onChange={(e) => setPurgeReason(e.target.value)}
            rows={3}
            placeholder={copy.purgeReasonPlaceholder}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </AdminConfirmModal>

      <AdminCard className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {copy.colDeletedAt}
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {copy.colTarget}
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {copy.colExpireAt}
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {copy.colStatus}
              </th>
              <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {copy.colAction}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {logs.map((log) => {
              const daysLeft = getDaysLeft(log.trash_expires_at);
              const isExpired = daysLeft !== null ? daysLeft <= 0 : false;
              const targetLink = getTargetLink(log);
              const targetName = getTargetDisplayName(log, locale);

              return (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {formatDate(log.created_at, locale)}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-slate-800">
                    <div className="space-y-0.5">
                      {targetLink ? (
                        <Link href={targetLink} className="text-indigo-600 hover:underline">
                          {getTargetTypeLabel(log.target_type, locale)}
                        </Link>
                      ) : (
                        <div>{getTargetTypeLabel(log.target_type, locale)}</div>
                      )}
                      <div className="text-xs text-slate-600">{targetName}</div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {formatDate(log.trash_expires_at, locale)}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                    {isExpired ? (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                        {copy.expired}
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        {copy.retained} {daysLeft !== null ? copy.daysLeft(daysLeft) : ''}
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
                          {copy.restore}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">{copy.restoreExpired}</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setPurgeTargetId(log.id)}
                        className="rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                      >
                        {copy.purge}
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
        <p className="text-sm text-gray-500">{copy.total(total, currentPage, totalPages)}</p>
        <div className="flex gap-2">
          {currentPage > 1 && (
            <Button variant="white" href={getPageHref(currentPage - 1)}>
              {copy.prev}
            </Button>
          )}
          {currentPage < totalPages && (
            <Button variant="white" href={getPageHref(currentPage + 1)}>
              {copy.next}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
