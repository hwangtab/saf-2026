'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { revertActivityLog } from '@/app/actions/admin-logs';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import Button from '@/components/ui/Button';
import { AdminCard } from '@/app/admin/_components/admin-ui';
import { AdminConfirmModal } from '@/app/admin/_components/AdminConfirmModal';
import { useToast } from '@/lib/hooks/useToast';
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
  getLogTargetDisplayNameWithT,
  getSnapshotIdWarnings,
  getTargetLink,
  getTargetTypeLabel,
  type LocaleCode,
  type LogsListProps,
} from './_utils';

export function LogsList({ logs, currentPage, totalPages, total }: LogsListProps) {
  const locale = useLocale() as LocaleCode;
  const t = useTranslations('admin.logs');
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
        toast.error(locale === 'en' ? t('revertError') : result.message || t('revertError'));
        return;
      }
      toast.success(t('revertSuccess'));
      router.refresh();
    } catch (error) {
      const message =
        locale === 'en'
          ? t('revertError')
          : error instanceof Error
            ? error.message
            : t('revertError');
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
          <h3 className="mt-2 text-sm font-medium text-gray-900">{t('noLogsTitle')}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('noLogsDescription')}</p>
        </AdminCard>
        <p className="text-sm text-gray-500">{t('totalZero')}</p>
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
        title={t('revertModalTitle')}
        confirmText={t('revertConfirmText')}
        variant="warning"
        isLoading={false}
        description={t('revertDescription')}
      >
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('revertReasonLabel')} <span className="text-red-500">*</span>
          </label>
          <textarea
            value={revertReason}
            onChange={(e) => setRevertReason(e.target.value)}
            placeholder={t('revertReasonPlaceholder')}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            autoFocus
          />
        </div>
      </AdminConfirmModal>

      <AdminCard className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('headerTime')}
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                {t('headerActor')}
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('headerAction')}
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('headerTarget')}
              </th>
              <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('headerOperation')}
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
              const targetDisplayName = getLogTargetDisplayNameWithT(log, t);
              const snapshotWarnings = getSnapshotIdWarnings(log);
              const actionReason = getActionReason(log, locale, t);

              return (
                <Fragment key={log.id}>
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(log.created_at, locale)}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell">
                      {getActorDisplay(log, t)}
                      <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                        {getActorRoleLabel(log.actor_role, t)}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{formatActionDescription(log, locale)}</span>
                          {canShowDiff && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                              {t('changesCount', { count: totalDiffCount })}
                            </span>
                          )}
                        </div>
                        {actionReason ? (
                          <p className="text-xs text-gray-500 break-all">
                            {actionReason.label}: {actionReason.value}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {link ? (
                        <div className="space-y-0.5">
                          <Link href={link} className="text-indigo-600 hover:underline">
                            {getTargetTypeLabel(log.target_type, t)}
                          </Link>
                          <div className="text-xs text-gray-600">{targetDisplayName}</div>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <div>{getTargetTypeLabel(log.target_type, t)}</div>
                          <div className="text-xs text-gray-600">{targetDisplayName}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex justify-end gap-2">
                        {canShowDiff && (
                          <button
                            type="button"
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            {isExpanded ? t('hideChanges') : t('showChanges')}
                          </button>
                        )}
                        {log.reversible && !log.reverted_at ? (
                          <button
                            type="button"
                            onClick={() => setRevertTargetId(log.id)}
                            className="rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
                            title={t('revertTitle')}
                          >
                            {t('revertButton')}
                          </button>
                        ) : log.reverted_at ? (
                          <span className="text-xs text-green-700">{t('reverted')}</span>
                        ) : (
                          <span
                            className="text-xs text-gray-400"
                            title={t('revertUnavailableTitle')}
                          >
                            {t('revertUnavailable')}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && canShowDiff && (
                    <tr className="bg-gray-50">
                      <td colSpan={5} className="px-4 sm:px-6 py-4">
                        <div className="space-y-3">
                          <div className="text-xs font-semibold text-gray-700">
                            {t('diffTitle')}
                          </div>
                          {(snapshotWarnings.missingInAfter.length > 0 ||
                            snapshotWarnings.addedInAfter.length > 0) && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                              {snapshotWarnings.missingInAfter.length > 0 && (
                                <div>
                                  {t('missingInAfter', {
                                    count: snapshotWarnings.missingInAfter.length,
                                  })}
                                </div>
                              )}
                              {snapshotWarnings.addedInAfter.length > 0 && (
                                <div>
                                  {t('addedInAfter', {
                                    count: snapshotWarnings.addedInAfter.length,
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                          {diffItems.map((item) => (
                            <div
                              key={item.itemId}
                              className="rounded-md border border-gray-200 bg-white"
                            >
                              <div className="border-b border-gray-200 px-3 py-2 text-xs font-medium text-gray-600">
                                {t('target')}:{' '}
                                {item.itemLabel ||
                                  t('nameMissing', {
                                    idLabel: formatIdentifierLabel(item.itemId, t),
                                  })}
                                {item.itemLabel ? (
                                  <span className="ml-2 text-gray-500">
                                    {t('identifier', { value: formatIdentifier(item.itemId, t) })}
                                  </span>
                                ) : null}
                              </div>
                              <div className="overflow-x-auto">
                                <table className="min-w-full text-xs">
                                  <thead className="bg-gray-50 text-gray-500">
                                    <tr>
                                      <th className="px-3 py-2 text-left font-medium">
                                        {t('colField')}
                                      </th>
                                      <th className="px-3 py-2 text-left font-medium">
                                        {t('colBefore')}
                                      </th>
                                      <th className="px-3 py-2 text-left font-medium">
                                        {t('colAfter')}
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {item.changes.map((change) => (
                                      <tr
                                        key={`${item.itemId}-${change.field}`}
                                        className="border-t border-gray-100"
                                      >
                                        <td className="px-3 py-2 text-gray-700">
                                          {getFieldLabel(change.field, t, log.target_type)}
                                        </td>
                                        <td className="px-3 py-2 text-rose-700 whitespace-pre-wrap break-all">
                                          {formatDiffValue(change.before, change.field, t)}
                                        </td>
                                        <td className="px-3 py-2 text-emerald-700 whitespace-pre-wrap break-all">
                                          {formatDiffValue(change.after, change.field, t)}
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
        <p className="text-sm text-gray-500">
          {t('totalCount', { total, current: currentPage, pages: totalPages })}
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
