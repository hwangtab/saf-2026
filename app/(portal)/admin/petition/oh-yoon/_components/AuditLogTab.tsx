'use client';

import { useMemo, useState } from 'react';

import type { AdminAuditRow } from './types';

const ACTION_LABEL: Record<string, string> = {
  mask_message: '메시지 마스킹',
  unmask_message: '메시지 복원',
  delete_message: '메시지 삭제',
  csv_export_full: 'CSV 전체(PII)',
  csv_export_masked: 'CSV 마스킹',
  csv_export_committee: 'CSV 추진위원',
  mail_send_milestone: '메일 — 마일스톤',
  mail_send_d1: '메일 — D-1 안내',
  mail_send_result: '메일 — 결과 통지',
  mail_send_committee: '메일 — 추진위원',
  force_close_campaign: '청원 강제 마감',
  reopen_campaign: '청원 재개',
  manual_purge_pii: 'PII 수동 파기',
};

const ACTIONS = Object.keys(ACTION_LABEL);

export default function AuditLogTab({ audit }: { audit: AdminAuditRow[] }) {
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

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-2">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">전체 액션</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {ACTION_LABEL[a]}
            </option>
          ))}
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="행위자 이메일"
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <span className="ml-auto text-xs text-charcoal-muted">
          최근 100건 표시 · {filtered.length.toLocaleString('ko-KR')}건
        </span>
      </header>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-charcoal-muted">
          조건에 맞는 로그가 없습니다.
        </p>
      ) : (
        <div className="overflow-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-charcoal-muted">
              <tr>
                <th className="px-3 py-2.5 font-semibold">시각</th>
                <th className="px-3 py-2.5 font-semibold">행위자</th>
                <th className="px-3 py-2.5 font-semibold">액션</th>
                <th className="px-3 py-2.5 font-semibold">대상/상세</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.map((row) => (
                <tr key={row.id}>
                  <td className="px-3 py-2 text-charcoal-muted tabular-nums whitespace-nowrap">
                    {new Date(row.created_at).toLocaleString('ko-KR')}
                  </td>
                  <td className="px-3 py-2 text-charcoal-deep">{row.actor_email}</td>
                  <td className="px-3 py-2 text-charcoal">
                    {ACTION_LABEL[row.action] ?? row.action}
                  </td>
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
