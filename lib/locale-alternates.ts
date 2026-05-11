import { SITE_URL } from '@/lib/constants';

export type LocaleCode = 'ko' | 'en';

const normalizePath = (path: string): string => {
  if (!path) return '/';
  if (path === '/') return '/';
  return path.startsWith('/') ? path : `/${path}`;
};

const withLocalePrefix = (path: string, locale: LocaleCode): string => {
  const normalized = normalizePath(path);
  if (locale === 'ko') return `${SITE_URL}${normalized === '/' ? '' : normalized}`;
  return `${SITE_URL}/en${normalized === '/' ? '' : normalized}`;
};

export function buildLocaleUrl(path: string, locale: LocaleCode): string {
  return withLocalePrefix(path, locale);
}

/**
 * 2026-05-11 fdf91485 정책 전환: 영문 핵심 페이지 색인 허용 — i18n backfill 296 rows 완료 후.
 *
 * 이전(2026-04 ~ 2026-05-10): 영문 전체 noindex, en hreflang 미발행, canonical 항상 KO.
 * 현재: 영문 색인 페이지에 self-canonical + 양방향 hreflang 발행. KO-only 페이지(작품 detail·
 *      매거진 detail body_en 부재·category·artist·terms·privacy 등)는 ko canonical 유지로
 *      Google에 "/en은 KO의 변형, 색인은 KO 쪽만" 시그널 (consolidation).
 *
 * @param path - 페이지 경로 (예: '/our-reality')
 * @param locale - 현재 페이지 locale (canonical 결정)
 * @param koOnly - true면 /en 변형 없음 (KO canonical + ko hreflang only, en 발행 안 함)
 *                작품 detail·매거진 body_en 부재·category 페이지 등 thin content 회피용
 */
export function createLocaleAlternates(path: string, locale: LocaleCode = 'ko', koOnly = false) {
  const koUrl = withLocalePrefix(path, 'ko');
  const enUrl = withLocalePrefix(path, 'en');
  // koOnly: 양 locale 모두 KO canonical로 consolidate.
  // 양방향: self-canonical (Google 권고 — canonical이 indexable이어야 hreflang 효력).
  const canonicalUrl = koOnly ? koUrl : locale === 'en' ? enUrl : koUrl;
  return {
    canonical: canonicalUrl,
    languages: koOnly
      ? {
          'ko-KR': koUrl,
          'x-default': koUrl,
        }
      : {
          'ko-KR': koUrl,
          'en-US': enUrl,
          'x-default': koUrl,
        },
  };
}
