'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { AdminBadge, AdminCard } from '@/app/admin/_components/admin-ui';
import type { ChangelogEntry } from '@/types';

type FilterType = 'all' | 'feat' | 'fix' | 'perf' | 'refactor';

const TYPE_CONFIG: Record<string, { label: string; tone: 'info' | 'warning' | 'success' }> = {
  feat: { label: '새 기능', tone: 'info' },
  fix: { label: '버그 수정', tone: 'warning' },
  perf: { label: '성능 개선', tone: 'success' },
  refactor: { label: '리팩토링', tone: 'info' },
};

const SCOPE_KO: Record<string, string> = {
  ArtworkCard: '작품카드',
  Header: '헤더',
  Safari: 'Safari',
  a11y: '접근성',
  admin: '관리자',
  'admin-artworks': '작품관리',
  'admin-dashboard': '관리자홈',
  'admin-logs': '활동로그',
  'admin-queue': '대기열',
  'admin-ui': '관리자UI',
  'admin-users': '사용자관리',
  analytics: '분석',
  arch: '아키텍처',
  archive: '아카이브',
  'artist-edit': '작가수정',
  artworks: '출품작',
  auth: '로그인',
  build: '빌드',
  cache: '캐시',
  cafe24: '카페24',
  changelog: '개발이력',
  charts: '차트',
  consent: '약관동의',
  content: '콘텐츠',
  core: '핵심',
  csp: 'CSP',
  dashboard: '대시보드',
  data: '데이터',
  db: 'DB',
  detail: '상세페이지',
  exhibitor: '출품자',
  feedback: '피드백',
  font: '글꼴',
  fonts: '글꼴',
  footer: '하단',
  gallery: '갤러리',
  geo: '지역',
  'geo-aeo': '지역필터',
  header: '헤더',
  hero: '히어로',
  home: '홈',
  hooks: '훅',
  i18n: '다국어',
  iOS: 'iOS',
  images: '이미지',
  layout: '레이아웃',
  legal: '법적문서',
  lint: '린트',
  loading: '로딩',
  logs: '활동로그',
  migration: '마이그레이션',
  mobile: '모바일',
  nav: '내비게이션',
  news: '뉴스',
  'not-found': '404',
  onboarding: '가입',
  'our-reality': '우리의현실',
  perf: '성능',
  portal: '포털',
  privacy: '개인정보',
  revalidation: '캐시갱신',
  revenue: '매출',
  rsc: '서버컴포넌트',
  sales: '판매',
  script: '스크립트',
  search: '검색',
  seo: 'SEO',
  'seo,a11y': 'SEO·접근성',
  share: '공유',
  special: '특별',
  supabase: 'Supabase',
  terminology: '용어',
  terms: '약관',
  test: '테스트',
  transparency: '투명성',
  trigger: '트리거',
  types: '타입',
  ui: '화면',
  ux: 'UX',
  video: '영상',
  web: '웹성능',
  webhook: '웹훅',
};

const FILTERS: { value: FilterType; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'feat', label: '새 기능' },
  { value: 'fix', label: '버그 수정' },
  { value: 'perf', label: '성능 개선' },
  { value: 'refactor', label: '리팩토링' },
];

const TYPE_FALLBACK_KO: Record<ChangelogEntry['type'], string> = {
  feat: '새 기능 추가',
  fix: '버그 수정',
  perf: '성능 개선',
  refactor: '구조 개선',
};

function containsKorean(text: string): boolean {
  return /[가-힣]/.test(text);
}

function getScopeLabel(scope: string | null): string | null {
  if (!scope) return null;
  return SCOPE_KO[scope] || (containsKorean(scope) ? scope : null);
}

function getFallbackSummary(entry: ChangelogEntry): string {
  if (containsKorean(entry.subject)) return entry.subject;
  const actionLabel = TYPE_FALLBACK_KO[entry.type] || '변경 사항 반영';
  const scopeLabel = getScopeLabel(entry.scope);
  return scopeLabel ? `${scopeLabel} ${actionLabel}` : actionLabel;
}

function getDisplayTitle(entry: ChangelogEntry): string {
  const summary = entry.summary?.trim();
  if (summary) {
    if (containsKorean(summary)) return summary;
    if (containsKorean(entry.subject)) return entry.subject;
    return summary;
  }
  return getFallbackSummary(entry);
}

function shouldShowSubject(entry: ChangelogEntry): boolean {
  if (!containsKorean(entry.subject)) return false;
  if (!entry.summary?.trim()) return false;
  return getDisplayTitle(entry) !== entry.subject;
}

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
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
            <span
              className={`ml-1.5 text-xs ${filter === f.value ? 'text-indigo-200' : 'text-gray-400'}`}
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
                  ? 'bg-indigo-600 text-white shadow-sm'
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
