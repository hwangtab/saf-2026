/**
 * 매거진 토픽 클러스터 — 정의형 검색 의도를 공유하는 글 묶음.
 *
 * 배경: 크로스링크 기본 선택 로직("같은 category + published_at DESC 첫 3개")은
 * category를 넘나드는 topical cluster를 전혀 연결하지 못한다. "에디션 뜻" 클러스터
 * (buying-guide / art-knowledge 혼합)가 대표 사례. 각 페이지가 GSC에서 pos 6~10으로
 * 정체하는 이유 중 하나 = 내부 link equity가 ~80개 글에 희석.
 *
 * 이 파일은 curator 의도로 클러스터를 명시적으로 정의. selectRelatedStories가 이를 사용해
 * cluster 형제를 우선 추천하고, 나머지 슬롯을 category fallback으로 채운다.
 *
 * 슬러그 순서 = 링크 우선순위 (앞 슬러그가 먼저 추천됨).
 */

import type { Story } from '@/types';

export const STORY_CLUSTERS: Record<string, readonly string[]> = {
  'editions-prints': [
    'editions-explained',
    'world-of-printmaking',
    'prints-vs-originals-and-edition-numbers',
    'archival-pigment-print-photography',
    'print-vs-original-price-economics',
    'korean-contemporary-printmaking-saf',
    'oh-yoon-estate-print-guide',
  ],
  'sizes-and-mediums': [
    'reading-art-sizes-ho-vs-cm',
    'choosing-by-medium',
    'art-types-comparison-guide',
    'drawing-vs-painting',
  ],
};

/** 역인덱스: slug → clusterId. build 시 1회 계산. */
const SLUG_TO_CLUSTER: ReadonlyMap<string, string> = new Map(
  Object.entries(STORY_CLUSTERS).flatMap(([clusterId, slugs]) =>
    slugs.map((slug) => [slug, clusterId])
  )
);

/**
 * 클러스터 인지 related story 선택.
 *
 * 1. 같은 클러스터 형제를 cluster 정의 순서로 우선 채움 (current 제외)
 * 2. 남은 슬롯은 같은 category(pool 순서, 이미 선택된 것·current 제외)로 fill
 * 3. 클러스터 미소속 글은 기존 category slice와 100% 동일 결과
 */
export function selectRelatedStories(
  currentSlug: string,
  currentCategory: string,
  pool: readonly Story[],
  limit: number = 3
): Story[] {
  const selected: Story[] = [];
  const selectedSlugs = new Set<string>([currentSlug]);

  const clusterId = SLUG_TO_CLUSTER.get(currentSlug);
  if (clusterId) {
    const clusterSlugs = STORY_CLUSTERS[clusterId];
    const poolBySlug = new Map(pool.map((s) => [s.slug, s]));
    for (const slug of clusterSlugs) {
      if (selected.length >= limit) break;
      if (slug === currentSlug) continue;
      const story = poolBySlug.get(slug);
      if (story) {
        selected.push(story);
        selectedSlugs.add(slug);
      }
    }
  }

  if (selected.length < limit) {
    for (const story of pool) {
      if (selected.length >= limit) break;
      if (selectedSlugs.has(story.slug)) continue;
      if (story.category !== currentCategory) continue;
      selected.push(story);
      selectedSlugs.add(story.slug);
    }
  }

  return selected;
}
