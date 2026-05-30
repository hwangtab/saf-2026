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
  // 나를 안는다 — 이윤엽 (2025). "안는다" 쿼리 pos 4.5 / 114노출 / 0클릭.
  // TOP 5 안인데 click 0% — generic title('나를 안는다 · 이윤엽 · ₩X')이 검색 의도와 mismatch.
  // 작품 주제(자기 위로·치유)를 title 앞에 배치해 검색 의도 매칭 강화.
  '4ad4b66b-21da-45c2-a0ca-36c36cf7714d': {
    titleKo: '나를 안는다 — 이윤엽 작가 다색 목판화, 자기 위로의 회화',
    titleEn: 'I Embrace Myself — Multicolor Woodcut by Lee Yoonyeop, Self-Compassion in Art',
  },
  // 눈밭01 — 홍진희 (2024, 한지에 면사 자수). "눈밭" 쿼리 pos 1.0 / 18노출 / 0클릭.
  // 1위인데 click 0%는 검색자가 작품을 인식하지 못한다는 결정적 신호. 매체+계절+감성 명시.
  'f5c45d1a-e192-4dfd-81fb-5f62a12930f8': {
    titleKo: '눈밭01 — 홍진희 한지·면사 자수 2024, 겨울 풍경의 침묵',
    titleEn: 'Snowfield 01 — Hong Jinhee, Cotton Thread on Hanji 2024, Silence of Winter',
  },
  '6b224b3d-2768-4c04-bd6c-6a2588c4e52d': {
    titleKo: '눈밭02 — 홍진희 한지·면사 자수 2024, 겨울 풍경의 침묵',
    titleEn: 'Snowfield 02 — Hong Jinhee, Cotton Thread on Hanji 2024, Silence of Winter',
  },
  // 정글 도서관의 카바리 — 천지수 (2025). "카바리" 쿼리 pos 7.9 / 14노출 / 0클릭.
  // 작가 이력(이태리 미술대전 대상) 강조로 SERP CTR 회복.
  '1797d8a7-e641-4690-a255-39d5afd1f323': {
    titleKo: '정글 도서관의 카바리 — 천지수 유화 2025, 이태리 미술대전 대상 작가',
    titleEn: 'Cabari of the Jungle Library — Cheon Jisu, Oil on Canvas 2025 (Italian Art Prize)',
  },
  // 인생, 그 헛헛함에 대하여 — 남진현 (2026). "헛헛함" 쿼리 pos 3.9 / 13노출 / 0클릭.
  // 작품의 정서적 주제를 title에 즉시 노출.
  '3b89272e-18aa-4c18-844c-0245bc97b5e9': {
    titleKo: '인생, 그 헛헛함에 대하여 — 남진현 작가 아크릴 회화 2026, 존재의 무게',
    titleEn: 'On the Hollow of Life — Nam Jinhyun, Acrylic on Canvas 2026',
  },
  // Over the Dream-2 — 이수철 (2011). "이수철" 쿼리 pos 11.3 / 7노출 / 0클릭. Page 2 push 후보.
  '9ac6db07-f334-4898-9189-00218aefe537': {
    titleKo: 'Over the Dream-2 — 이수철 작가 사진 2011, 꿈 너머의 풍경',
    titleEn: 'Over the Dream-2 — Photograph by Lee Sucheol 2011, Beyond the Dream',
  },
  // 탈방 — 조신욱 (2022, 수채화). "탈방" 쿼리 pos 11.3 / 9노출 / 1 click.
  'f191466f-e6aa-4b91-a2d3-ef0a6c270c02': {
    titleKo: '탈방 — 조신욱 작가 수채화 2022, 일상의 균열을 그리다',
    titleEn: 'Talbang — Watercolor by Cho Sinuk 2022, Fractures of the Everyday',
  },
  // 행복한 나날 2020 — 이윤엽 (2020, 다색 목판화). "행복한 나날" pos 3.1 / 11imp / 0 click.
  '844d9a04-779f-4a9e-832e-77b70fcfbf0b': {
    titleKo: '행복한 나날 2020 — 이윤엽 다색 목판화, 일상에 머무는 빛',
    titleEn: 'Happy Days 2020 — Multicolor Woodcut by Lee Yoonyeop, Light in the Everyday',
  },
  // Free will — 한미영 (2024, 아크릴+금박+왁스). "한미영" pos 3.7 / 7imp / 0 click.
  'f5f65a98-2516-4904-9917-7392b1e47d13': {
    titleKo: 'Free will — 한미영 아크릴·금박·왁스 회화 2024, 자유의지의 시각화',
    titleEn: 'Free Will — Han Miyoung, Acrylic + Gold Leaf + Wax 2024, Visualizing Free Will',
  },
};

export function getArtworkSeoOverride(id: string): ArtworkSeoOverride | undefined {
  return ARTWORK_SEO_OVERRIDES[id];
}
