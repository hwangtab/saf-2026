/**
 * 영문 페이지 sitemap·hreflang 화이트리스트 — 단일 출처.
 *
 * 2026-05-11 i18n backfill 296 rows 후 정책 변경:
 * - 과거: layout에서 영문 전체 noindex + 이 화이트리스트로 일부만 index 허용
 * - 현재: layout robots 차단 제거 → 영문 기본 index 허용. 이 화이트리스트는 sitemap의
 *   `bilingualAlternates` (hreflang ko/en 양방향) 발행 대상.
 *
 * sitemap에 명시 발행되면 Google이 ko↔en alternate를 인지해:
 * 1. duplicate content penalty 차단
 * 2. 사용자 검색 언어에 맞는 변형 우선 노출
 * 3. 영문 검색 쿼리에 영문 페이지 인입
 *
 * 화이트리스트 외 페이지(작품 detail·매거진 detail·category·artist 등)는 각 generateMetadata
 * 에서 `isEn ? robots: { index: false }` 명시로 noindex 처리.
 *
 * 추가 시 주의사항:
 * - 영문 본문이 native level인 페이지만 추가
 * - 페이지별 generateMetadata에 robots noindex 없는지 확인 (없어야 sitemap 색인 의미 있음)
 */

import type { Metadata } from 'next';

/**
 * 영문에서 sitemap bilingualAlternates 발행 대상.
 * 핵심 정보 페이지 — i18n backfill로 native quality 확보됨.
 * '' = 홈.
 */
export const EN_INDEXABLE_PAGES: ReadonlySet<string> = new Set([
  '',
  '/about',
  '/our-reality',
  '/our-proof',
  '/transparency',
  '/petition/oh-yoon',
  // 오윤·박생광 특별전은 /artworks/artist/<이름>로 dispatch 통합 (영문 native 유지).
  // 인코딩 형태로 sitemap staticPaths의 path와 정확히 매칭 → bilingual alternate 발행.
  '/artworks/artist/%EC%98%A4%EC%9C%A4',
  '/artworks/artist/%EB%B0%95%EC%83%9D%EA%B4%91',
  '/archive',
  '/archive/2023',
  '/archive/2026',
  '/news',
  '/artworks',
  '/stories',
]);

/** 영문에서 indexable로 푼 매거진 story slug 화이트리스트 */
export const EN_INDEXABLE_STORY_SLUGS: ReadonlySet<string> = new Set([
  'oh-yoon-estate-print-guide',
  'korean-documentary-landscape-photography',
  'newlywed-home-first-artwork-guide',
]);

/**
 * 영문 페이지의 robots 메타데이터를 결정.
 * - locale === 'en' && indexable === true → 색인 허용 + GoogleBot 디렉티브 명시
 * - locale === 'en' && indexable === false → 명시 noindex (canonical=ko의 약한 신호 보강)
 * - locale === 'ko' → undefined (layout 기본 robots 사용)
 *
 * canonical만으로는 Google이 100% 따르지 않는 경우가 있어 noindex 메타 명시가 안전망.
 * 외부 링크로 발견된 비-EN_INDEXABLE 영문 페이지가 색인되는 시나리오 차단.
 */
export function resolveEnRobots(
  locale: string,
  indexable: boolean
): Metadata['robots'] | undefined {
  if (locale !== 'en') return undefined;

  if (indexable) {
    return {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large',
        'max-video-preview': -1,
      },
    };
  }

  return {
    index: false,
    follow: true,
  };
}
