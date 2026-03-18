'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { revertActivityLog } from '@/app/actions/admin-logs';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import { AdminCard } from '@/app/admin/_components/admin-ui';
import { AdminConfirmModal } from '@/app/admin/_components/AdminConfirmModal';
import { useToast } from '@/lib/hooks/useToast';
import { resolveClientLocale } from '@/lib/client-locale';
import {
  formatActionDescription,
  formatDate,
  formatDiffValue,
  formatIdentifier,
  formatIdentifierLabel,
  getActionReason,
  getActorDisplay,
  getActorRoleLabel,
  getDiffItems,
  getFieldLabel,
  getLogTargetDisplayName,
  getSnapshotIdWarnings,
  getTargetLink,
  getTargetTypeLabel,
  LOGS_UI,
  type LogsListProps,
} from './_utils';

export function LogsList({ logs, currentPage, totalPages, total }: LogsListProps) {
  const pathname = usePathname();
  const locale = resolveClientLocale(pathname);
  const copy = LOGS_UI[locale];
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const getPageHref = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    return `/admin/logs?${params.toString()}`;
  };

  const [revertTargetId, setRevertTargetId] = useState<string | null>(null);
  const [revertReason, setRevertReason] = useState('');

  const handleRevert = async () => {
    if (!revertTargetId || !revertReason.trim()) return;
    const logId = revertTargetId;
    const reason = revertReason.trim();

    setRevertTargetId(null);
    setRevertReason('');

    try {
      const result = await revertActivityLog(logId, reason);
      if (!result.success) {
        toast.error(locale === 'en' ? copy.revertError : result.message || copy.revertError);
        return;
      }
      toast.success(copy.revertSuccess);
      router.refresh();
    } catch (error) {
      const message =
        locale === 'en'
          ? copy.revertError
          : error instanceof Error
            ? error.message
            : copy.revertError;
      toast.error(message);
    }
  };

  if (logs.length === 0) {
    return (
      <div className="space-y-4">
        <AdminCard className="p-8 text-center">
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">{copy.noLogsTitle}</h3>
          <p className="mt-1 text-sm text-gray-500">{copy.noLogsDescription}</p>
        </AdminCard>
        <p className="text-sm text-gray-500">{copy.totalZero}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AdminConfirmModal
        isOpen={!!revertTargetId}
        onClose={() => {
          setRevertTargetId(null);
          setRevertReason('');
        }}
        onConfirm={handleRevert}
        title={copy.revertModalTitle}
        confirmText={copy.revertConfirmText}
        variant="warning"
        isLoading={false}
        description={copy.revertDescription}
      >
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {copy.revertReasonLabel} <span className="text-red-500">*</span>
          </label>
          <textarea
            value={revertReason}
            onChange={(e) => setRevertReason(e.target.value)}
            placeholder={copy.revertReasonPlaceholder}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            autoFocus
          />
        </div>
      </AdminConfirmModal>

      <AdminCard className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {copy.headerTime}
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                {copy.headerActor}
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {copy.headerAction}
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {copy.headerTarget}
              </th>
              <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {copy.headerOperation}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {logs.map((log) => {
              const link = getTargetLink(log);
              const diffItems = getDiffItems(log);
              const totalDiffCount = diffItems.reduce((sum, item) => sum + item.changes.length, 0);
              const canShowDiff = totalDiffCount > 0;
              const isExpanded = expandedLogId === log.id;
              const targetDisplayName = getLogTargetDisplayName(log, locale);
              const snapshotWarnings = getSnapshotIdWarnings(log);
              const actionReason = getActionReason(log, locale);

              return (
                <Fragment key={log.id}>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(log.created_at, locale)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell">
                      {getActorDisplay(log, locale)}
                      <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                        {getActorRoleLabel(log.actor_role, locale)}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{formatActionDescription(log, locale)}</span>
                          {canShowDiff && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                              {copy.changesCount(totalDiffCount)}
                            </span>
                          )}
                        </div>
                        {actionReason ? (
                          <p className="text-xs text-slate-500 break-all">
                            {actionReason.label}: {actionReason.value}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {link ? (
                        <div className="space-y-0.5">
                          <Link href={link} className="text-indigo-600 hover:underline">
                            {getTargetTypeLabel(log.target_type, locale)}
                          </Link>
                          <div className="text-xs text-slate-600">{targetDisplayName}</div>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <div>{getTargetTypeLabel(log.target_type, locale)}</div>
                          <div className="text-xs text-slate-600">{targetDisplayName}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex justify-end gap-2">
                        {canShowDiff && (
                          <button
                            type="button"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            {isExpanded ? copy.hideChanges : copy.showChanges}
                          </button>
                        )}
                        {log.reversible && !log.reverted_at ? (
                          <button
                            type="button"
                            onClick={() => setRevertTargetId(log.id)}
                            className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
                            title={copy.revertTitle}
                          >
                            {copy.revertButton}
                          </button>
                        ) : log.reverted_at ? (
                          <span className="text-xs text-green-700">{copy.reverted}</span>
                        ) : (
                          <span
                            className="text-xs text-gray-400"
                            title={copy.revertUnavailableTitle}
                          >
                            {copy.revertUnavailable}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && canShowDiff && (
                    <tr className="bg-slate-50">
                      <td colSpan={5} className="px-4 sm:px-6 py-4">
                        <div className="space-y-3">
                          <div className="text-xs font-semibold text-slate-700">
                            {copy.diffTitle}
                          </div>
                          {(snapshotWarnings.missingInAfter.length > 0 ||
                            snapshotWarnings.addedInAfter.length > 0) && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                              {snapshotWarnings.missingInAfter.length > 0 && (
                                <div>
                                  {copy.missingInAfter(snapshotWarnings.missingInAfter.length)}
                                </div>
                              )}
                              {snapshotWarnings.addedInAfter.length > 0 && (
                                <div>{copy.addedInAfter(snapshotWarnings.addedInAfter.length)}</div>
                              )}
                            </div>
                          )}
                          {diffItems.map((item) => (
                            <div
                              key={item.itemId}
                              className="rounded-md border border-slate-200 bg-white"
                            >
                              <div className="border-b border-slate-200 px-3 py-2 text-xs font-medium text-slate-600">
                                {copy.target}:{' '}
                                {item.itemLabel ||
                                  copy.nameMissing(formatIdentifierLabel(item.itemId, locale))}
                                {item.itemLabel ? (
                                  <span className="ml-2 text-slate-500">
                                    {copy.identifier(formatIdentifier(item.itemId, locale))}
                                  </span>
                                ) : null}
                              </div>
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-xs">
                                  <thead className="bg-slate-50 text-slate-500">
                                    <tr>
                                      <th className="px-3 py-2 text-left font-medium">
                                        {copy.colField}
                                      </th>
                                      <th className="px-3 py-2 text-left font-medium">
                                        {copy.colBefore}
                                      </th>
                                      <th className="px-3 py-2 text-left font-medium">
                                        {copy.colAfter}
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {item.changes.map((change) => (
                                      <tr
                                        key={`${item.itemId}-${change.field}`}
                                        className="border-t border-slate-100"
                                      >
                                        <td className="px-3 py-2 text-slate-700">
                                          {getFieldLabel(change.field, locale, log.target_type)}
                                        </td>
                                        <td className="px-3 py-2 text-rose-700 whitespace-pre-wrap break-all">
                                          {formatDiffValue(change.before, change.field, locale)}
                                        </td>
                                        <td className="px-3 py-2 text-emerald-700 whitespace-pre-wrap break-all">
                                          {formatDiffValue(change.after, change.field, locale)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </AdminCard>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{copy.totalCount(total, currentPage, totalPages)}</p>
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
