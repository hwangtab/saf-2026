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
 * 매뉴얼 큐레이션 매핑 — pageKey → image URL.
 *
 * pageKey 컨벤션:
 * - 'artworks'                       — /artworks listing
 * - 'artworks/category/painting'     — /artworks/category/회화
 * - 'stories'                        — /stories listing
 * - 'stories/category/artist-story'  — /stories/category/artist-story
 * - 'news'                           — /news listing
 *
 * 비워두면 페이지가 listing 데이터의 첫 이미지를 자동 사용.
 * 시즌 큐레이션이 필요할 때만 매핑 추가.
 */
export const HERO_CURATION_OVERRIDES: Record<string, string> = {
  // 'artworks': '/images/hero/artworks-featured.webp',
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
