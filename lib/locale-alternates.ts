import { SITE_URL } from '@/lib/constants';

const normalizePath = (path: string): string => {
  if (!path) return '/';
  if (path === '/') return '/';
  return path.startsWith('/') ? path : `/${path}`;
};

const withLocalePrefix = (path: string, locale: 'ko' | 'en'): string => {
  const normalized = normalizePath(path);
  if (locale === 'ko') return `${SITE_URL}${normalized === '/' ? '' : normalized}`;
  return `${SITE_URL}/en${normalized === '/' ? '' : normalized}`;
};

export function createLocaleAlternates(path: string) {
  return {
    canonical: withLocalePrefix(path, 'ko'),
    languages: {
      'ko-KR': withLocalePrefix(path, 'ko'),
      'en-US': withLocalePrefix(path, 'en'),
      'x-default': withLocalePrefix(path, 'ko'),
    },
  };
}
