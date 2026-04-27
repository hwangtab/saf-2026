'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import type { AdminAuditRow } from './types';

const ACTION_LABEL_KEYS: Record<string, string> = {
  mask_message: 'auditActionMaskMessage',
  unmask_message: 'auditActionUnmaskMessage',
  delete_message: 'auditActionDeleteMessage',
  csv_export_full: 'auditActionCsvFull',
  csv_export_masked: 'auditActionCsvMasked',
  csv_export_committee: 'auditActionCsvCommittee',
  mail_send_milestone: 'auditActionMailMilestone',
  mail_send_d1: 'auditActionMailD1',
  mail_send_result: 'auditActionMailResult',
  mail_send_committee: 'auditActionMailCommittee',
  force_close_campaign: 'auditActionForceClose',
  reopen_campaign: 'auditActionReopen',
  manual_purge_pii: 'auditActionPurge',
};

const ACTIONS = Object.keys(ACTION_LABEL_KEYS);

export default function AuditLogTab({ audit }: { audit: AdminAuditRow[] }) {
  const t = useTranslations('admin.petition');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return audit.filter((row) => {
      if (actionFilter && row.action !== actionFilter) return false;
      if (q && !row.actor_email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [audit, actionFilter, search]);

  function actionLabel(action: string): string {
    const key = ACTION_LABEL_KEYS[action];
    return key ? t(key) : action;
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-2">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">{t('auditFilterAll')}</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {actionLabel(a)}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('auditSearchPlaceholder')}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <span className="ml-auto text-xs text-charcoal-muted">
          {t('auditCountLine', { count: filtered.length.toLocaleString('ko-KR') })}
        </span>
      </header>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-charcoal-muted">
          {t('auditEmpty')}
        </p>
      ) : (
        <div className="overflow-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-charcoal-muted">
              <tr>
                <th className="px-3 py-2.5 font-semibold">{t('auditColTime')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('auditColActor')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('auditColAction')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('auditColTarget')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 text-charcoal-muted tabular-nums whitespace-nowrap">
                    {new Date(row.created_at).toLocaleString('ko-KR')}
                  </td>
                  <td className="px-3 py-2 text-charcoal-deep">{row.actor_email}</td>
                  <td className="px-3 py-2 text-charcoal">{actionLabel(row.action)}</td>
                  <td className="px-3 py-2 text-charcoal-muted text-xs break-all">
                    {row.target_id && (
                      <span className="mr-2 text-[10px] font-mono text-charcoal-muted">
                        {row.target_id.slice(0, 8)}…
                      </span>
                    )}
                    {row.details ? (
                      <code className="font-mono text-[11px]">{JSON.stringify(row.details)}</code>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
