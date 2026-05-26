'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { AdminBadge, AdminCard } from '@/app/admin/_components/admin-ui';
import {
  TYPE_CONFIG,
  SCOPE_KO,
  formatDate,
  groupByDate,
  getDisplayTitle,
  shouldShowSubject,
} from '@/lib/changelog';
import type { ChangelogEntry } from '@/types';

type FilterType = 'all' | 'feat' | 'fix' | 'perf' | 'refactor';

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'feat', label: '새 기능' },
  { value: 'fix', label: '버그 수정' },
  { value: 'perf', label: '성능 개선' },
  { value: 'refactor', label: '리팩토링' },
];

interface ChangelogListProps {
  entries: ChangelogEntry[];
  filter: FilterType;
  page: number;
  totalPages: number;
  totalFiltered: number;
  counts: Record<FilterType, number>;
}

export function ChangelogList({
  entries,
  filter,
  page,
  totalPages,
  totalFiltered,
  counts,
}: ChangelogListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const navigate = useCallback(
    (params: { filter?: FilterType; page?: number }) => {
      const sp = new URLSearchParams(searchParams.toString());
      if (params.filter !== undefined) {
        if (params.filter === 'all') sp.delete('filter');
        else sp.set('filter', params.filter);
        sp.delete('page'); // reset page on filter change
      }
      if (params.page !== undefined) {
        if (params.page <= 1) sp.delete('page');
        else sp.set('page', String(params.page));
      }
      const qs = sp.toString();
      router.push(qs ? `?${qs}` : '?');
    },
    [router, searchParams]
  );

  const grouped = groupByDate(entries);
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const PER_PAGE = 30;
  const start = (page - 1) * PER_PAGE;

  if (counts.all === 0) {
    return (
      <AdminCard className="p-12 text-center">
        <p className="text-sm text-gray-500">
          변경 이력이 없습니다. <code className="text-xs">npm run generate-changelog</code>를 실행해
          주세요.
        </p>
      </AdminCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter pills + count */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            type="button"
            key={f.value}
            onClick={() => navigate({ filter: f.value })}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filter === f.value
                ? 'bg-primary-a11y text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
            <span
              className={`ml-1.5 text-xs ${filter === f.value ? 'text-primary-soft' : 'text-gray-400'}`}
            >
              {counts[f.value]}
            </span>
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">
          총 {totalFiltered}개 중 {start + 1}–{Math.min(start + PER_PAGE, totalFiltered)}
        </span>
      </div>

      {/* Grouped entries */}
      {dates.map((date) => (
        <div key={date}>
          <h3 className="mb-3 text-sm font-semibold text-gray-500">{formatDate(date)}</h3>
          <AdminCard className="divide-y divide-[var(--admin-border-soft)]">
            {grouped[date].map((entry) => {
              const config = TYPE_CONFIG[entry.type] || {
                label: entry.type,
                tone: 'info' as const,
              };
              return (
                <div key={entry.hash} className="px-5 py-4">
                  <div className="flex flex-wrap items-start gap-2">
                    <AdminBadge tone={config.tone}>{config.label}</AdminBadge>
                    {entry.scope && (
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {SCOPE_KO[entry.scope] || entry.scope}
                      </span>
                    )}
                    <span className="flex-1 text-sm font-medium text-gray-900">
                      {getDisplayTitle(entry)}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-gray-400">{entry.hash}</span>
                  </div>
                  {shouldShowSubject(entry) && (
                    <p className="mt-1 pl-16 text-xs text-gray-400">{entry.subject}</p>
                  )}
                  {entry.body && (
                    <details className="mt-2 pl-16">
                      <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">
                        상세 보기
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs leading-relaxed text-gray-600">
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

      {entries.length === 0 && (
        <AdminCard className="p-8 text-center">
          <p className="text-sm text-gray-500">해당 카테고리의 변경 이력이 없습니다.</p>
        </AdminCard>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-1 pt-2">
          <button
            type="button"
            onClick={() => navigate({ page: page - 1 })}
            disabled={page === 1}
            className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            이전
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              type="button"
              key={p}
              onClick={() => navigate({ page: p })}
              className={`min-w-[2.25rem] rounded-lg px-2 py-2 text-sm font-medium transition ${
                p === page
                  ? 'bg-primary-a11y text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            onClick={() => navigate({ page: page + 1 })}
            disabled={page === totalPages}
            className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            다음
          </button>
        </nav>
      )}
    </div>
  );
}
