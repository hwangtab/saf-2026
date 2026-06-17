/**
 * Listing 페이지 hero 이미지 큐레이션.
 *
 * 옵션 Z 정책: artist/story detail은 DB-driven 자동, listing은 정적 큐레이션 +
 * fallback으로 listing 자체 데이터의 첫 이미지를 사용. manual override가 있으면
 * 우선 적용 (운영자가 시즌 큐레이션 작품으로 hero를 고정하고 싶을 때).
 *
 * 사용 패턴:
 *   const heroImage = getHeroOverride('artworks') ?? pickFirstImage(items);
 *   <PageHero customBackgroundImage={heroImage} ... />
 */

/**
 * Ambient hero motion policy.
 *
 * PageHeroBackground의 breathing motion은 customBackgroundImage가 있는 공개 서사/탐색
 * 페이지에만 허용한다. utility/legal/checkout/admin 페이지는 작업 집중도가 우선이므로 정적
 * hero를 유지한다.
 */
export const HERO_AMBIENT_MOTION_POLICY = {
  allow: 'brand/narrative/listing/detail',
  static: 'utility/legal/checkout/admin',
} as const;

/**
 * 매뉴얼 큐레이션 매핑 — pageKey → image URL.
 *
 * pageKey 컨벤션:
 * - 'artworks'                       — /artworks listing
 * - 'artworks/category/painting'     — /artworks/category/회화
 * - 'collections'                    — /collections listing
 * - 'collections/living-room'        — /collections/<slug> detail
 * - 'stories'                        — /stories listing
 * - 'stories/guide'                  — /stories/guide
 * - 'stories/category/artist-story'  — /stories/category/artist-story
 * - 'news'                           — /news listing
 *
 * 비워두면 페이지가 listing 데이터의 첫 이미지를 자동 사용.
 * 시즌 큐레이션이 필요할 때만 매핑 추가.
 */
export const HERO_CURATION_OVERRIDES: Record<string, string> = {
  // /artworks listing — 자동 DB-driven 첫 작품(현재 박생광)이 의도에 부적합. 다양한 작품
  // 구매 메시지에 어울리는 정적 큐레이션 자산으로 override.
  artworks: '/images/hero/3.jpg',
  // 공간 큐레이션 landing — 소장/배치 맥락이 읽히는 정물형 작품으로 고정.
  collections: '/images/hero/11.jpg',
  // 캠페인 스토리텔링 페이지 — public/images/hero/N.jpg 작가 작품 큐레이션
  about: '/images/hero/8.jpg',
  'our-reality': '/images/hero/16.jpg',
  'our-proof': '/images/hero/15.jpg',
  transparency: '/images/hero/9.jpg',
  changelog: '/images/hero/6.jpg',
  // 컬렉팅 용어 가이드 — 텍스트 위계가 살아나는 어두운 여백 중심 이미지.
  'stories/guide': '/images/hero/10.jpg',
  // /news는 자동 DB-driven fallback 사용 — 첫 article thumbnail(현재 월간 믹싱 "왜
  // 예술인은 고금리 대출을 받을 수 밖에 없나")이 사용자 선호. 원래 검증 시 NONE이었던 건
  // ISR/timing 이슈로 추정. override 제거.
  // Archive — 2023은 실제 전시 사진, 2026은 작품 큐레이션
  archive: '/images/hero/2.jpg',
  'archive/2026': '/images/hero/13.jpg',
  'archive/2023': '/images/saf2023/IMG_0292.webp',
};

export function getHeroOverride(pageKey: string): string | undefined {
  return HERO_CURATION_OVERRIDES[pageKey];
}

/**
 * Items 배열에서 첫 hero-적합 이미지 추출. find().image와 동등하지만 일관된 정책
 * (이미지가 있고 추출 가능한 첫 element)을 코드 위치에서 명확히.
 */
export function pickListingHeroImage<T>(
  items: T[] | undefined | null,
  extractImage: (item: T) => string | null | undefined
): string | undefined {
  if (!items?.length) return undefined;
  for (const item of items) {
    const url = extractImage(item);
    if (url) return url;
  }
  return undefined;
}
