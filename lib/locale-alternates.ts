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

// 영문 사이트는 운영하지 않음 — canonical은 항상 ko URL.
// /en/* 페이지는 layout에서 noindex 처리되며, en hreflang 미발행으로 시그널 정리.
//
// @deprecated locale·koOnly 파라미터는 더 이상 동작에 영향 없음 (2026-04 영문 색인 정리).
// 신규 호출부는 createLocaleAlternates(path) 단일 인자로 작성. 17개 기존 호출자는 점진적으로 정리 가능.
// 향후 영문 운영을 재개할 경우 이 함수만 되돌리면 호출부 변경 없이 복구 가능하도록 시그니처는 유지.
export function createLocaleAlternates(path: string, _locale?: LocaleCode, _koOnly?: boolean) {
  void _locale;
  void _koOnly;
  const koUrl = withLocalePrefix(path, 'ko');
  return {
    canonical: koUrl,
    languages: {
      'ko-KR': koUrl,
      'x-default': koUrl,
    },
  };
}
