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

export function createLocaleAlternates(path: string, locale: LocaleCode = 'ko', koOnly = false) {
  return {
    canonical: withLocalePrefix(path, locale),
    languages: {
      'ko-KR': withLocalePrefix(path, 'ko'),
      // 한국어 전용 콘텐츠: 영어 alternate 생략 (noindex 대상과 hreflang 충돌 방지)
      ...(!koOnly && { 'en-US': withLocalePrefix(path, 'en') }),
      'x-default': withLocalePrefix(path, 'ko'),
    },
  };
}
