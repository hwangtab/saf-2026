/**
 * 정전(canonical) hub story slug 집합.
 *
 * 배경: `/stories/category/[category]` 카테고리 페이지는 published_at desc로 정렬됨.
 *   거장 hub 글(`saf-2026-painters`·`korean-contemporary-printmaking-saf` 등)이
 *   최신 큐레이션 글에 밀려 fold 아래로 내려가면서 카테고리 navigational query의
 *   link equity가 fold 위 thin content에 분산됨.
 *
 * 이 집합으로 category page 정렬에서 hub 글을 top에 결정론적으로 끌어올림 →
 * SEO authority concentration. ARTWORK_MEDIUM_HUB(매체 매핑)와 별개로
 * 카테고리 페이지 정렬에만 사용.
 *
 * Hub 선정 기준 (Sprint 8·19·20·21·22에서 매핑 hub로 채택된 글 + 거장급 introductory 글):
 *   - art-knowledge: 매체별 종합 큐레이션 hub + 입문 가이드(dansaekhwa-intro 등)
 *   - buying-guide: entry-level commerce hub (first-time-buying-art 등)
 *   - artist-story: 원래 hub 부재였으나, 오윤 40주기 매거진(거장 클러스터 종합 hub) 1편
 *     승격. 해당 글은 published_at이 오래돼 카테고리 fold 아래로 묻혀 있어 hub 승격으로만
 *     top 노출 가능 — 다른 작가 글은 여전히 hub 아님.
 */

export const CANONICAL_HUB_SLUGS = new Set<string>([
  // art-knowledge — 매체·주제 hub
  'saf-2026-painters',
  'saf-2026-photographers',
  'saf-2026-sculpture-and-ceramics',
  'korean-painting-tradition-meets-modern',
  'korean-contemporary-printmaking-saf',
  'korean-documentary-landscape-photography',
  'hanji-aesthetics-in-contemporary-art',
  'ottchil-korean-lacquer-art',
  'stone-pigment-seokchae-aesthetics',
  'gold-leaf-in-korean-contemporary-art',
  'minjung-art-intro',
  'dansaekhwa-intro',
  'drawing-vs-painting',
  'agriculture-labor-korean-art',
  'korean-shamanism-art',
  'janji-painting-an-eunkyung',
  'archival-pigment-print-photography',
  'digital-meets-traditional',
  'how-mutual-aid-fund-works',
  // buying-guide — entry-level commerce hub
  'first-time-buying-art',
  'first-art-buyer-price-guide',
  'art-pricing-factors',
  'print-vs-original-price-economics',
  'prints-vs-originals-and-edition-numbers',
  'budget-guide-10k-to-5m',
  'saf-under-one-million',
  // artist-story — 거장 클러스터 hub (단일). 오윤 40주기 매거진은 #49·#50·#53과 판화
  //   hub를 묶는 작가 종합 정전 글이지만 published_at(2026-04-07)이 오래돼 '작가 이야기'
  //   카테고리(published_at desc) fold 아래로 묻혀 있었다. hub로 승격해 그 카테고리에서
  //   결정론적 top 노출 → "오윤" navigational query authority 집중. 홈/stories featured는
  //   hub끼리 published_at desc라 이 오래된 글이 top을 침범하지 않음(카테고리 단독 hub).
  'oh-yun-40th-anniversary',
]);

/** 정전 hub 글 여부. category page 정렬 우선순위 결정에 사용. */
export function isCanonicalHub(slug: string): boolean {
  return CANONICAL_HUB_SLUGS.has(slug);
}
