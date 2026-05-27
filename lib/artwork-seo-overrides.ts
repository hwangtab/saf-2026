/**
 * Artwork 페이지 SEO 메타 오버라이드 — 작품 ID별로 SEO title을 별도 지정.
 *
 * 사용 맥락: 유명 작고 작가의 작품이 작가 이름 검색(정보탐색 의도)에 상위 랭크될 때,
 * generic `{작품명} · {작가명} · ₩{가격}` 제목은 의도 불일치로 클릭 0이 됨.
 * 해당 작품만 작가·맥락 forward 제목으로 교체하고, 전역 titleStatusSuffix 규칙은 유지.
 *
 * description은 generic 유지 — 가격·재고 같은 실시간 데이터가 metaDescription에 있어야
 * product-intent 매칭이 강하므로 override하지 않음.
 *
 * GSC 데이터 기반 매핑 (2026-05):
 * - "오윤" 174 imp / 0 click / pos 3.4 → 무호도(45dac49b) generic 제목이 작가 정보탐색 의도 미매칭.
 */
export interface ArtworkSeoOverride {
  titleKo?: string;
  titleEn?: string;
}

export const ARTWORK_SEO_OVERRIDES: Record<string, ArtworkSeoOverride> = {
  // 무호도 — 오윤 (사후판화 목판, 1985). "오윤" 쿼리 pos 3.4 / 174노출 / 0클릭.
  // "오윤" 검색자는 작가 정보탐색 의도 → 가격표 제목 대신 작가·매체 맥락으로 교체.
  '45dac49b-e8f2-4aea-8b86-8452dba853c0': {
    titleKo: '무호도 — 오윤의 민중미술 목판화',
    titleEn: 'Tiger Dance — Woodcut by Oh Yoon, Korean Minjung Art',
  },
};

export function getArtworkSeoOverride(id: string): ArtworkSeoOverride | undefined {
  return ARTWORK_SEO_OVERRIDES[id];
}
