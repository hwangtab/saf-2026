'use client';

import { useState } from 'react';
import { AdminBadge, AdminCard } from '@/app/admin/_components/admin-ui';
import type { ChangelogEntry } from '@/types';

type FilterType = 'all' | 'feat' | 'fix' | 'perf';

const TYPE_CONFIG: Record<string, { label: string; tone: 'info' | 'warning' | 'success' }> = {
  feat: { label: '새 기능', tone: 'info' },
  fix: { label: '버그 수정', tone: 'warning' },
  perf: { label: '성능 개선', tone: 'success' },
};

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'feat', label: '새 기능' },
  { value: 'fix', label: '버그 수정' },
  { value: 'perf', label: '성능 개선' },
];

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
}

function groupByDate(entries: ChangelogEntry[]): Record<string, ChangelogEntry[]> {
  const groups: Record<string, ChangelogEntry[]> = {};
  for (const entry of entries) {
    if (!groups[entry.date]) groups[entry.date] = [];
    groups[entry.date].push(entry);
  }
  return groups;
}

export function ChangelogList({ entries }: { entries: ChangelogEntry[] }) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filtered = filter === 'all' ? entries : entries.filter((e) => e.type === filter);
  const grouped = groupByDate(filtered);
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const counts = {
    all: entries.length,
    feat: entries.filter((e) => e.type === 'feat').length,
    fix: entries.filter((e) => e.type === 'fix').length,
    perf: entries.filter((e) => e.type === 'perf').length,
  };

  if (entries.length === 0) {
    return (
      <AdminCard className="p-12 text-center">
        <p className="text-sm text-slate-500">
          변경 이력이 없습니다. <code className="text-xs">npm run generate-changelog</code>를 실행해
          주세요.
        </p>
      </AdminCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filter === f.value
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.label}
            <span
              className={`ml-1.5 text-xs ${filter === f.value ? 'text-indigo-200' : 'text-slate-400'}`}
            >
              {counts[f.value]}
            </span>
          </button>
        ))}
      </div>

      {/* Grouped entries */}
      {dates.map((date) => (
        <div key={date}>
          <h3 className="mb-3 text-sm font-semibold text-slate-500">{formatDate(date)}</h3>
          <AdminCard className="divide-y divide-[var(--admin-border-soft)]">
            {grouped[date].map((entry) => {
              const config = TYPE_CONFIG[entry.type];
              return (
                <div key={entry.hash} className="px-5 py-4">
                  <div className="flex flex-wrap items-start gap-2">
                    <AdminBadge tone={config.tone}>{config.label}</AdminBadge>
                    {entry.scope && (
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {entry.scope}
                      </span>
                    )}
                    <span className="flex-1 text-sm font-medium text-slate-900">
                      {entry.subject}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-slate-400">{entry.hash}</span>
                  </div>
                  {entry.body && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-600">
                        상세 보기
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                        {entry.body}
                      </pre>
                    </details>
                  )}
                </div>
              );
            })}
          </AdminCard>
        </div>
      ))}

      {filtered.length === 0 && (
        <AdminCard className="p-8 text-center">
          <p className="text-sm text-slate-500">해당 카테고리의 변경 이력이 없습니다.</p>
        </AdminCard>
      )}
    </div>
  );
}
