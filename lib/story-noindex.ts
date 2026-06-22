/**
 * 검색 noindex 처리할 매거진 story slug — 단일 출처.
 *
 * 2026-06-22 GSC 색인 위생 정리: Google이 색인 거부한(Crawled/Discovered - not indexed)
 * thin·중복 매거진 12편. 전부 최근 28일 클릭 0(검색 트래픽 0)으로 확정 — noindex로 잃을
 * 트래픽은 없고, 크롤 예산 회복 + 도메인 품질 신호 개선이 이득. follow:true는 유지해
 * 내부링크 equity는 계속 흐르게 한다.
 *
 * 적용처(두 곳을 반드시 함께 — sitemap 색인요청 vs 메타 noindex 모순은 신호 충돌, 2026-06 교훈):
 * - app/[locale]/stories/[slug]/page.tsx generateMetadata → robots { index:false, follow:true }
 * - app/sitemap.ts → 발행 제외
 *
 * 해제: 콘텐츠를 차별화·실수요 보강해 개선한 뒤 이 Set에서 slug를 빼면 색인 복귀.
 * 캠페인 핵심(bank-vs-mutual-aid-comparison·testimonials-narrative)은 의도적으로 제외(개선 대상).
 */
export const NOINDEX_STORY_SLUGS: ReadonlySet<string> = new Set([
  // 양산형 occasion/gift thin
  'art-gifts-for-life-milestones',
  'art-gifts-for-newborns-and-first-birthdays',
  'art-for-business-openings-by-industry',
  'one-painting-one-change',
  '7-mistakes-first-time-collectors',
  // 구매가이드 중복 (first-art-buyer-price-guide 등 기존 강글과 겹침)
  'online-art-buying-guide',
  'first-art-collection-under-400k',
  'korean-art-market-guide-2026',
  // art-knowledge thin
  'what-is-an-artist-profession',
  'art-without-museums',
  'do-you-need-art-education-to-collect',
  'saf-three-year-journey',
]);

export function isStoryNoindex(slug: string): boolean {
  return NOINDEX_STORY_SLUGS.has(slug);
}
