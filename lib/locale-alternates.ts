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

export function createLocaleAlternates(path: string, locale: LocaleCode = 'ko') {
  return {
    canonical: withLocalePrefix(path, locale),
    languages: {
      'ko-KR': withLocalePrefix(path, 'ko'),
      'en-US': withLocalePrefix(path, 'en'),
      'x-default': withLocalePrefix(path, 'ko'),
    },
  };
}
