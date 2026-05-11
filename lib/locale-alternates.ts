import { SITE_URL } from '@/lib/constants';
import { EN_INDEXABLE_PAGES } from '@/lib/en-indexable';

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

// EN_INDEXABLE_PAGES 화이트리스트(2026-05-11 i18n backfill 후 정책)에 포함된 페이지는
// 양방향 hreflang(ko-KR + en-US + x-default) 발행. 그 외 페이지는 ko-only.
// canonical은 호출 시 전달된 locale에 따라 결정 — locale 인자 생략 시 기본 'ko' (기존 호환).
//
// koOnly 파라미터는 더 이상 동작에 영향 없음 (sitemap이 단일 출처 — EN_INDEXABLE 화이트리스트).
// 향후 영문 운영 페이지 추가 시 lib/en-indexable.ts의 화이트리스트에 추가하면 자동 반영.
export function createLocaleAlternates(path: string, locale: LocaleCode = 'ko', _koOnly?: boolean) {
  void _koOnly;
  const normalized = normalizePath(path);
  // EN_INDEXABLE_PAGES는 '/about'·'' 형태 (홈은 빈 문자열). normalize 결과의 '/'를 ''로 매핑.
  const lookupPath = normalized === '/' ? '' : normalized;
  const isEnIndexable = EN_INDEXABLE_PAGES.has(lookupPath);

  const koUrl = withLocalePrefix(path, 'ko');
  const enUrl = withLocalePrefix(path, 'en');

  if (isEnIndexable) {
    return {
      canonical: locale === 'en' ? enUrl : koUrl,
      languages: {
        'ko-KR': koUrl,
        'en-US': enUrl,
        'x-default': koUrl,
      },
    };
  }

  // 비-EN_INDEXABLE: ko 단일 색인 — 영문 페이지는 canonical=ko로 자동 색인 제외.
  return {
    canonical: koUrl,
    languages: {
      'ko-KR': koUrl,
      'x-default': koUrl,
    },
  };
}
