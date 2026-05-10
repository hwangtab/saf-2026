/**
 * 영문 페이지 indexable 화이트리스트 — 단일 출처.
 *
 * [locale]/layout.tsx의 generateMetadata는 영문 페이지를 기본 robots: { index: false, follow: true }
 * 로 막아둠 (자동 번역 thin content 회피). 그러나 영문 본문이 직접 작성된 일부 페이지·매거진 글은
 * indexable로 풀어 해외 컬렉터 long-tail entry로 활용.
 *
 * Next.js metadata 머지 규칙: 페이지 generateMetadata에서 robots를 명시하면 layout robots 객체가
 * 통째로 교체됨. 따라서 indexable로 풀려는 페이지에서 robots: { index: true, follow: true,
 * googleBot: {...} } 형태로 명시 필요.
 *
 * 추가 시 주의사항:
 * - 자동 번역(getTranslations·copy.en) 페이지는 절대 화이트리스트에 넣지 말 것
 * - 영문 본문이 직접 hand-written이거나, body_en 컬럼에 충분한 영어 본문이 있는 경우만 허용
 * - 페이지 추가 시 production에서 영문 본문 직접 확인 + en/ko 양쪽 다 자연스러운지 검증
 */

import type { Metadata } from 'next';

/** 영문에서 indexable로 푼 정적 페이지 path 화이트리스트 */
export const EN_INDEXABLE_PAGES: ReadonlySet<string> = new Set(['/about']);

/** 영문에서 indexable로 푼 매거진 story slug 화이트리스트 */
export const EN_INDEXABLE_STORY_SLUGS: ReadonlySet<string> = new Set([
  'oh-yoon-estate-print-guide',
  'korean-documentary-landscape-photography',
  'newlywed-home-first-artwork-guide',
]);

/**
 * 영문 페이지의 robots 메타데이터를 결정.
 * - locale === 'en' && indexable === true → 색인 허용 + GoogleBot 디렉티브 명시
 * - 그 외 → undefined 반환 (layout의 기본 robots 사용)
 */
export function resolveEnRobots(
  locale: string,
  indexable: boolean
): Metadata['robots'] | undefined {
  if (locale !== 'en' || !indexable) return undefined;

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
