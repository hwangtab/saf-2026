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
  // Cycle 6 — TOP 1-3 ranking이면서 0 click인 catastrophic CTR 작품 8건 보강.
  // 내 손끝에 은하수 — 김주호 (2020, 질구이 조각). pos 1.8 / 21imp / 0 click.
  '36cad3b5-9a79-4a76-9b68-f6fb9dd5fe0d': {
    titleKo: '내 손끝에 은하수 — 김주호 질구이 조각 2020, 손끝의 우주',
    titleEn: 'Galaxy at My Fingertips — Kim Jooho, Earthenware Sculpture 2020',
  },
  // 사랑만들기 — 김주호 (2013, 8T 철판 조각). pos 5.2 / 25imp / 0 click.
  'db1d7b02-60e2-4e23-b893-10eb68da15c7': {
    titleKo: '사랑만들기 — 김주호 8T 철판 조각 2013, 사랑의 형태를 빚다',
    titleEn: 'Making Love — Kim Jooho, 8T Steel Plate Sculpture 2013',
  },
  // 언덕위의 집 — 손은영 (2024, archival pigment print). pos 1.2 / 12imp / 0 click.
  'f4ad6271-5dbe-4184-b77c-753998d4b4f6': {
    titleKo: '언덕위의 집 — 손은영 다큐멘터리 사진 2024, 사라지는 풍경의 기록',
    titleEn: 'House on the Hill — Son Eunyoung, Documentary Photograph 2024',
  },
  // 화락이토花落以土 #15 — 정금희 (2018, archival pigment print). pos 1.1 / 12imp / 0 click.
  '7623bfa5-e44e-4b58-8ce8-a0b6786ba510': {
    titleKo: '화락이토 #15 — 정금희 다큐멘터리 사진 2018, 꽃이 흙으로 돌아가다',
    titleEn: 'Flowers Return to Earth #15 — Jeong Geumhee, Documentary Photograph 2018',
  },
  // 춤2 — 오윤 (1985, 한지 목판화). pos 3.1 / 12imp / 0 click. 한국 민중미술 거장 사후판화.
  '1cb51984-cc53-49e2-bf93-1eb4e00f780a': {
    titleKo: '춤2 — 오윤 한지 목판화 1985, 한국 민중미술의 정전',
    titleEn: 'Dance 2 — Oh Yoon, Woodcut on Hanji 1985, Korean Minjung Art Classic',
  },
  // 낮도깨비 — 오윤 (1985, 한지 목판화·수채). pos 8.0 / 36imp / 0 click.
  'b3838f14-0601-4e2a-a502-4b099ecd50ad': {
    titleKo: '낮도깨비 — 오윤 한지 목판화·수채 1985, 한국 민중미술 사후판화',
    titleEn: 'Daytime Goblin — Oh Yoon, Hand-Colored Woodcut on Hanji 1985, Minjung Art',
  },
  // Pink fortress — 윤겸 (2024, oil on canvas). pos 2.6 / 8imp / 0 click.
  'fe024496-e15c-4b2b-9686-c48558ce2f9e': {
    titleKo: 'Pink fortress — 윤겸 작가 유화 2024, 분홍빛 요새의 정서',
    titleEn: 'Pink Fortress — Yoon Gyeom, Oil on Canvas 2024',
  },
  // 속리산 돌거북 — 민정기 (2025, 캔버스에 유채). pos 2.3 / 8imp / 0 click. 민중미술 1세대 거장.
  '5c76728c-bcf4-4640-831c-a817fabe8e50': {
    titleKo: '속리산 돌거북 — 민정기 유화 2025, 한국 민중미술 1세대 거장의 풍경',
    titleEn: 'Stone Turtle of Songnisan — Min Joung-Ki, Oil on Canvas 2025, Minjung Art Master',
  },
  // Cycle 9 — long-tail 3-9imp page 1 0-click 작품 11건 보강.
  // 칼노래 — 오윤 (1985, 한지 목판화·수채). pos 4.0 / 5imp / 0 click.
  '4c920878-32dd-4727-ab03-6eda996597d5': {
    titleKo: '칼노래 — 오윤 한지 목판화·수채 1985, 한국 민중미술 사후판화',
    titleEn: 'Song of the Blade — Oh Yoon, Hand-Colored Woodcut on Hanji 1985, Minjung Art',
  },
  // 봄의소리1 — 오윤 (1983). pos 1.0 / 4imp / 0 click.
  '7f154b6f-a158-49ef-877f-618f9da166c1': {
    titleKo: '봄의소리1 — 오윤 한지 목판화·수채 1983, 한국 민중미술 사후판화',
    titleEn: 'Sound of Spring 1 — Oh Yoon, Hand-Colored Woodcut on Hanji 1983, Minjung Art',
  },
  // 팔엽일화 — 오윤 (1985). pos 1.0 / 4imp / 0 click.
  '1350256c-5137-4a99-afcc-043e4c72287b': {
    titleKo: '팔엽일화 — 오윤 한지 목판화·수채 1985, 한국 민중미술 사후판화',
    titleEn: 'Lotus of Eight Petals — Oh Yoon, Hand-Colored Woodcut on Hanji 1985, Minjung Art',
  },
  // Ottogi Earthy Rainbow Matte — 양순열 (2021, car paint on resin). pos 4.4 / 6imp / 0 click.
  '760c97d0-b2c9-4382-b21c-def0baa0ec5a': {
    titleKo: 'Ottogi Earthy Rainbow Matte — 양순열 카페인트·레진 조각 2021, 오뚝이의 모성',
    titleEn: 'Ottogi Earthy Rainbow Matte — Yang Sunyeol, Car Paint on Resin 2021, Motherhood',
  },
  // Ottogi_Mother Ya-ho — 양순열 (2014, car paint on resin). pos 8.0 / 3imp / 0 click.
  '91a78fd6-ed6d-4c36-856c-e5f3c00f691c': {
    titleKo: 'Ottogi Mother Ya-ho — 양순열 카페인트·레진 조각 2014, 확장된 모성',
    titleEn: 'Ottogi Mother Ya-ho — Yang Sunyeol, Car Paint on Resin 2014, Extended Motherhood',
  },
  // GreenForest — 윤겸 (2016). pos 7.6 / 8imp / 0 click.
  '5d7b6368-f4a7-4ddb-a733-68c78278db0b': {
    titleKo: 'GreenForest — 윤겸 작가 회화 2016, 평온과 반복의 숲',
    titleEn: 'GreenForest — Yoon Gyeom, 2016, Serenity in Repetition',
  },
  // 야형화접도 — 신예리 (2023, 먹 한지에 분채). pos 8.1 / 7imp / 0 click. "야형" 검색.
  '3f992cc3-41d7-477c-b70f-eb298df20a1a': {
    titleKo: '야형화접도(夜螢花蝶圖) — 신예리 한지 분채 2023, 한국화 전통 채색화',
    titleEn: 'Night Fireflies and Butterflies — Shin Yeri, Korean Mineral Color on Hanji 2023',
  },
  // 놀이터 n'2 — 최혜수 (2023, 시멘트·금박·왁스·아크릴). pos 2.7 / 7imp / 0 click. EN 페이지.
  'ab859f7f-bab1-480c-a5dd-975ca179d6bb': {
    titleKo: '놀이터 n°2 — 최혜수 시멘트·금박·왁스 조각 2023, 벨기에 왕립 미술대 출신',
    titleEn: 'Playground n°2 — Choe Hyesu, Cement·Gold Leaf·Wax 2023, Royal Academy Brussels',
  },
  // 놀이터 n'3 — 최혜수 (2023). pos 1.0 / 5imp / 0 click.
  '7b724018-6f43-4830-a13b-d00a255e54c9': {
    titleKo: '놀이터 n°3 — 최혜수 시멘트·금박·왁스 조각 2023, 벨기에 왕립 미술대 출신',
    titleEn: 'Playground n°3 — Choe Hyesu, Cement·Gold Leaf·Wax 2023, Royal Academy Brussels',
  },
  // 시지프스의 연인 — 이익태 (2025, acrylic·알루미늄). pos 4.3 / 5imp / 0 click. "시지프스 갤러리" 검색.
  'e0fac99d-26b6-46a2-8098-c3e9382ab9e8': {
    titleKo: '시지프스의 연인 — 이익태 아크릴·알루미늄 2025, 한국 1세대 다큐 사진가의 회화',
    titleEn: 'Lover of Sisyphus — Lee Iktae, Acrylic and Aluminum 2025',
  },
  // #01_S1707SP — 강레아 (2017, 한지 피그먼트 프린트). pos 5.3 / 3imp / 0 click.
  '56c2c3f3-d237-4556-aca7-b64b3d4fcea3': {
    titleKo: '#01 S1707SP — 강레아 한지 피그먼트 프린트 2017, 사진과 한지의 만남',
    titleEn: '#01 S1707SP — Kang Lea, Pigment Print on Hanji 2017, Photography Meets Korean Paper',
  },
};

export function getArtworkSeoOverride(id: string): ArtworkSeoOverride | undefined {
  return ARTWORK_SEO_OVERRIDES[id];
}
