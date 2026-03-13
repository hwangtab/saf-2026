'use client';

export type AppLocale = 'ko' | 'en';

const COOKIE_KEY = 'NEXT_LOCALE';

function readLocaleCookie(): AppLocale | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]+)`));
  if (!match) return null;
  return match[1] === 'en' ? 'en' : 'ko';
}

export function resolveClientLocale(pathname?: string | null): AppLocale {
  if (pathname?.startsWith('/en')) {
    return 'en';
  }
  return readLocaleCookie() ?? 'ko';
}
