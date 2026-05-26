import type { ChangelogEntry } from '@/types';

export type ChangelogFilterType = 'all' | 'feat' | 'fix' | 'perf' | 'refactor';

export const TYPE_CONFIG: Record<string, { label: string; tone: 'info' | 'warning' | 'success' }> =
  {
    feat: { label: '새 기능', tone: 'info' },
    fix: { label: '버그 수정', tone: 'warning' },
    perf: { label: '성능 개선', tone: 'success' },
    refactor: { label: '리팩토링', tone: 'info' },
  };

export const SCOPE_KO: Record<string, string> = {
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

export const TYPE_FALLBACK_KO: Record<ChangelogEntry['type'], string> = {
  feat: '새 기능 추가',
  fix: '버그 수정',
  perf: '성능 개선',
  refactor: '구조 개선',
};

export function containsKorean(text: string): boolean {
  return /[가-힣]/.test(text);
}

export function getScopeLabel(scope: string | null): string | null {
  if (!scope) return null;
  return SCOPE_KO[scope] || (containsKorean(scope) ? scope : null);
}

export function getFallbackSummary(entry: ChangelogEntry): string {
  if (containsKorean(entry.subject)) return entry.subject;
  const actionLabel = TYPE_FALLBACK_KO[entry.type] || '변경 사항 반영';
  const scopeLabel = getScopeLabel(entry.scope);
  return scopeLabel ? `${scopeLabel} ${actionLabel}` : actionLabel;
}

export function getDisplayTitle(entry: ChangelogEntry): string {
  const summary = entry.summary?.trim();
  if (summary) {
    if (containsKorean(summary)) return summary;
    if (containsKorean(entry.subject)) return entry.subject;
    return summary;
  }
  return getFallbackSummary(entry);
}

export function shouldShowSubject(entry: ChangelogEntry): boolean {
  if (!containsKorean(entry.subject)) return false;
  if (!entry.summary?.trim()) return false;
  return getDisplayTitle(entry) !== entry.subject;
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
}

export function groupByDate(entries: ChangelogEntry[]): Record<string, ChangelogEntry[]> {
  const groups: Record<string, ChangelogEntry[]> = {};
  for (const entry of entries) {
    if (!groups[entry.date]) groups[entry.date] = [];
    groups[entry.date].push(entry);
  }
  return groups;
}
