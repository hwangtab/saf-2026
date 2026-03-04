'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  purgeActivityTrashLog,
  revertActivityLog,
  type ActivityLogEntry,
} from '@/app/actions/admin-logs';
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

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTargetTypeLabel(type: string | null) {
  switch (type) {
    case 'artwork':
      return '작품';
    case 'artist':
      return '작가';
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

function getTargetDisplayName(log: ActivityLogEntry) {
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
        ? `${namedItems[0]} 외 ${namedItems.length - 1}건`
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
        toast.error(result.message || '복원 중 오류가 발생했습니다.');
        return;
      }
      toast.success('휴지통 항목을 복원했습니다.');
      setRestoreTargetId(null);
      setRestoreReason('');
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : '복원 중 오류가 발생했습니다.';
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
        toast.warning(`영구 삭제 완료(일부 스토리지 ${failed}건 삭제 실패)`);
      } else {
        toast.success('휴지통 항목을 영구 삭제했습니다.');
      }
      setPurgeTargetId(null);
      setPurgeReason('');
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : '영구 삭제 중 오류가 발생했습니다.';
      toast.error(message);
    } finally {
      setIsPurging(false);
    }
  };

  if (logs.length === 0) {
    return (
      <AdminCard>
        <AdminEmptyState
          title="휴지통이 비어 있습니다"
          description="삭제된 항목이 생기면 이 페이지에서 복원 또는 영구 삭제할 수 있습니다."
        />
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
        title="휴지통 복원 확인"
        confirmText="복원하기"
        variant="warning"
        isLoading={isRestoring}
        description="휴지통 항목을 복원하시겠습니까? 복원 사유를 입력해주세요."
      >
        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            복원 사유 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={restoreReason}
            onChange={(e) => setRestoreReason(e.target.value)}
            rows={3}
            placeholder="예: 실수로 삭제한 항목 복원"
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
        title="휴지통 영구 삭제 확인"
        confirmText="영구 삭제"
        variant="danger"
        isLoading={isPurging}
        description="휴지통 항목을 영구 삭제하면 복구할 수 없습니다. 영구 삭제 사유를 입력해주세요."
      >
        <div className="mt-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            영구 삭제 사유 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={purgeReason}
            onChange={(e) => setPurgeReason(e.target.value)}
            rows={3}
            placeholder="예: 보관 기간 종료 전 수동 정리"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
      </AdminConfirmModal>

      <AdminCard className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                삭제 시각
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                대상
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                보관 만료
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                상태
              </th>
              <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                조치
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {logs.map((log) => {
              const daysLeft = getDaysLeft(log.trash_expires_at);
              const isExpired = daysLeft !== null ? daysLeft <= 0 : false;
              const targetLink = getTargetLink(log);
              const targetName = getTargetDisplayName(log);

              return (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-slate-800">
                    <div className="space-y-0.5">
                      {targetLink ? (
                        <Link href={targetLink} className="text-indigo-600 hover:underline">
                          {getTargetTypeLabel(log.target_type)}
                        </Link>
                      ) : (
                        <div>{getTargetTypeLabel(log.target_type)}</div>
                      )}
                      <div className="text-xs text-slate-600">{targetName}</div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {formatDate(log.trash_expires_at)}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                    {isExpired ? (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                        만료됨
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        보관 중 {daysLeft !== null ? `${daysLeft}일 남음` : ''}
                      </span>
                    )}
                  </td>
                  <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex justify-end gap-2">
                      {!isExpired ? (
                        <button
                          onClick={() => setRestoreTargetId(log.id)}
                          className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
                        >
                          복원
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">복원 만료</span>
                      )}
                      <button
                        onClick={() => setPurgeTargetId(log.id)}
                        className="rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                      >
                        영구 삭제
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
          총 {total}건 (페이지 {currentPage} / {totalPages})
        </p>
        <div className="flex gap-2">
          {currentPage > 1 && (
            <Button variant="white" href={getPageHref(currentPage - 1)}>
              이전
            </Button>
          )}
          {currentPage < totalPages && (
            <Button variant="white" href={getPageHref(currentPage + 1)}>
              다음
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
