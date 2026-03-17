'use client';

import { useState, useMemo } from 'react';
import { AdminBadge, AdminCard } from '@/app/admin/_components/admin-ui';
import type { ChangelogEntry } from '@/types';

type FilterType = 'all' | 'feat' | 'fix' | 'perf';

const PER_PAGE = 30;

const TYPE_CONFIG: Record<string, { label: string; tone: 'info' | 'warning' | 'success' }> = {
  feat: { label: '새 기능', tone: 'info' },
  fix: { label: '버그 수정', tone: 'warning' },
  perf: { label: '성능 개선', tone: 'success' },
};

const SCOPE_KO: Record<string, string> = {
  admin: '관리자',
  'admin-artworks': '작품관리',
  analytics: '분석',
  archive: '아카이브',
  artworks: '출품작',
  auth: '로그인',
  build: '빌드',
  cache: '캐시',
  cafe24: '카페24',
  consent: '약관동의',
  dashboard: '대시보드',
  data: '데이터',
  db: 'DB',
  detail: '상세페이지',
  feedback: '피드백',
  fonts: '글꼴',
  footer: '하단',
  gallery: '갤러리',
  i18n: '다국어',
  images: '이미지',
  legal: '법적문서',
  logs: '활동로그',
  onboarding: '가입',
  privacy: '개인정보',
  revenue: '매출',
  rsc: '서버컴포넌트',
  sales: '판매',
  search: '검색',
  seo: 'SEO',
  share: '공유',
  terms: '약관',
  trigger: '트리거',
  ui: '화면',
  video: '영상',
  web: '웹성능',
  webhook: '웹훅',
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
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () => (filter === 'all' ? entries : entries.filter((e) => e.type === filter)),
    [entries, filter]
  );

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const start = (page - 1) * PER_PAGE;
  const paged = filtered.slice(start, start + PER_PAGE);
  const grouped = groupByDate(paged);
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const counts = useMemo(
    () => ({
      all: entries.length,
      feat: entries.filter((e) => e.type === 'feat').length,
      fix: entries.filter((e) => e.type === 'fix').length,
      perf: entries.filter((e) => e.type === 'perf').length,
    }),
    [entries]
  );

  function handleFilterChange(f: FilterType) {
    setFilter(f);
    setPage(1);
  }

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
      {/* Filter pills + count */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => handleFilterChange(f.value)}
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
        <span className="ml-auto text-xs text-slate-400">
          총 {filtered.length}개 중 {start + 1}–{Math.min(start + PER_PAGE, filtered.length)}
        </span>
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
                        {SCOPE_KO[entry.scope] || entry.scope}
                      </span>
                    )}
                    <span className="flex-1 text-sm font-medium text-slate-900">
                      {entry.summary || entry.subject}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-slate-400">{entry.hash}</span>
                  </div>
                  {entry.summary && (
                    <p className="mt-1 pl-16 text-xs text-slate-400">{entry.subject}</p>
                  )}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="flex items-center justify-center gap-1 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            이전
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`min-w-[2.25rem] rounded-lg px-2 py-2 text-sm font-medium transition ${
                p === page
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
          >
            다음
          </button>
        </nav>
      )}
    </div>
  );
}
