/**
 * Artwork.category(매체) → 정전(canonical) art-knowledge hub slug 매핑.
 *
 * 배경: artwork detail page의 '관련 매거진' 슬롯은 작가 매칭 stories만 사용.
 *   판화 작품 진입 트래픽이 판화 hub(`korean-contemporary-printmaking-saf`)로
 *   흐를 결정론적 경로가 없음 — recency 정렬에 의존.
 *
 * 이 맵으로 artwork.category 기반 매체 hub를 한 슬롯 보장 → 매체 hub의 link equity
 * inflow 강화. 카테고리 미매핑 작품은 null 반환 → 회귀 0.
 *
 * 매체 데이터 (Supabase artworks.category, 2026-05-28 기준):
 *   회화 198 · 판화 40 · 드로잉 38 · 사진 36 · 한국화 25 · 사후판화 18
 *   아트프린트 16 · 혼합매체 14 · 조각 10 · 디지털아트 10 · 도자공예 9
 *
 * Hub 실재 확인은 lib/supabase-data.ts SELECT 또는 ContentStrategy 검토 시 재확인.
 */

export const ARTWORK_MEDIUM_HUB: Record<string, string> = {
  회화: 'saf-2026-painters',
  한국화: 'korean-painting-tradition-meets-modern',
  드로잉: 'drawing-vs-painting',
  혼합매체: 'saf-2026-painters',
  판화: 'korean-contemporary-printmaking-saf',
  사후판화: 'korean-contemporary-printmaking-saf',
  아트프린트: 'prints-vs-originals-and-edition-numbers',
  사진: 'korean-documentary-landscape-photography',
  조각: 'saf-2026-sculpture-and-ceramics',
  도자공예: 'saf-2026-sculpture-and-ceramics',
  디지털아트: 'digital-meets-traditional',
};

/** category로 매체 hub slug 조회. 미매핑 카테고리는 null. */
export function getMediumHubSlug(category: string | null | undefined): string | null {
  if (!category) return null;
  return ARTWORK_MEDIUM_HUB[category] ?? null;
}
