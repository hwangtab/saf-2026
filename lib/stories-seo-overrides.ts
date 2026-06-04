/**
 * Stories SEO 메타 오버라이드 — 슬러그별로 SEO title / description을 별도 지정.
 *
 * 사용 맥락: 본문 H1과 SERP `<title>` 분리. 본문 title은 매거진 톤(짧고 매력적)을 유지하면서,
 * SEO title은 GSC Performance상 노출은 받지만 CTR 0인 검색어와 정확히 매칭하도록 키워드 풍부.
 *
 * GSC 데이터 기반 매핑 (3개월):
 * - "한정판 에디션" 5 노출 / 0 클릭
 * - "판화 뜻" 4 노출 / 0 클릭
 * - "넘버링 뜻" 1 노출 / 0 클릭
 * - "10호 크기" 1 노출 / 0 클릭
 * - "에디션 번호" 등 정의형 검색
 *
 * 신규 슬러그도 점진 추가 가능. 매핑 없는 슬러그는 자동으로 story.title / story.excerpt fallback.
 */
export interface StorySeoOverride {
  titleKo?: string;
  titleEn?: string;
  descriptionKo?: string;
  descriptionEn?: string;
}

export const STORIES_SEO_OVERRIDES: Record<string, StorySeoOverride> = {
  'editions-explained': {
    // GSC 2026-05-05~06-01: 746 imp / 4 click (CTR 0.54%). "에디션 뜻" 439 imp / CTR 0.46%.
    // SERP에서 즉시 답을 기대하는 정의형 검색이라 title을 짧고 직접적으로 정리.
    titleKo: '에디션 뜻 쉽게 정리 — 5/10·넘버링·한정판은 무슨 의미일까?',
    titleEn: 'Art Edition Explained — Open, Limited & Unique Editions, Numbering & AP/EA Meaning',
    descriptionKo:
      '에디션은 한정 발행 번호입니다. 5/10은 10점 중 5번째 작품이라는 뜻. 넘버링, 리미티드 에디션, 한정판이 가격에 미치는 영향을 쉽게 설명합니다.',
    descriptionEn:
      'What do open, limited, and unique editions mean? How to read edition numbers (5/10), what AP, EA, HC stand for — explained with real SAF artwork examples.',
  },
  'world-of-printmaking': {
    titleKo: '판화 뜻과 종류 — 원본이 여러 장이라고? 판화의 세계 | 씨앗페 매거진',
    titleEn: 'What Is Printmaking? Types of Prints Explained — SAF Magazine',
    descriptionKo:
      '판화의 뜻과 종류 정리 — 목판화·동판화·석판화·실크스크린의 차이, "원본이 여러 장"이라는 판화의 개념, 작가 서명과 에디션 번호의 의미.',
    descriptionEn:
      'What is printmaking and what makes a print "original"? Woodcut, etching, lithograph, silkscreen — the basics of edition art.',
  },
  'prints-vs-originals-and-edition-numbers': {
    titleKo: '넘버링 뜻 — 판화 에디션 번호 3/30·AP·EA·HC·PP 읽는 법',
    titleEn: 'How to Read Edition Numbers (1/100, AP, EA) — Prints vs Originals | SAF Magazine',
    descriptionKo:
      '작품 아래 적힌 3/30, AP, EA, HC, PP는 무엇을 뜻할까요? 판화 넘버링과 에디션 번호를 쉽게 읽는 법, 원화와의 차이를 정리했습니다.',
    descriptionEn:
      'Edition numbers explained — fraction format, AP, EA, HC. Why prints and originals differ in price, and what to verify before purchase.',
  },
  'reading-art-sizes-ho-vs-cm': {
    // GSC 2026-05-05~06-01: 336 imp / 1 click (CTR 0.30%, pos 5.4).
    // "10호 크기", "30호 사이즈", "30호 크기"처럼 즉답형 쿼리 CTR이 0%라 title/desc 첫머리에 답 배치.
    titleKo: '10호·30호 그림 크기 몇 cm? 작품 호수 사이즈 환산표 1~100호',
    titleEn: 'Korean Art Canvas Sizes (호) to cm — F/M/P Format Chart | SAF Magazine',
    descriptionKo:
      '10호는 53×45.5cm, 30호는 90×72.7cm. 그림 호수별 cm 크기, F·P·M 차이, 1호부터 100호까지 한눈에 정리했습니다.',
    descriptionEn:
      'Korean canvas size (호) to centimeter conversion. F/M/P/S format chart, plus space-by-space size recommendations for collectors.',
  },
  'choosing-by-medium': {
    titleKo: '유화·아크릴·판화 차이 — 재료로 작품 고르는 법 가이드 | 씨앗페 매거진',
    titleEn: 'Oil vs Acrylic vs Print — Choosing Art by Medium | SAF Magazine',
    descriptionKo:
      '유화·아크릴·수채·판화·드로잉의 특성과 차이 — 페인팅과 드로잉은 어떻게 다른가, 재료별 가격대·관리법·공간별 추천 가이드.',
    descriptionEn:
      'Oil, acrylic, watercolor, print, drawing — characteristics, price ranges, and how to choose by medium for your space.',
  },
  'art-glossary': {
    titleKo: '미술관 용어 사전 — 비엔날레·아트페어·레지던시·디아스포라 정리 | 씨앗페 매거진',
    titleEn: 'Art World Glossary — Biennale, Art Fair, Residency Explained | SAF Magazine',
    descriptionKo:
      '비엔날레·아트페어·레지던시·디아스포라·도큐멘타·휘트니. 미술관·전시·미술계에서 자주 쓰이는 핵심 용어를 한 번에 정리.',
    descriptionEn:
      'Biennale, art fair, residency, diaspora, documenta — essential art world terms in one place.',
  },
  'artwork-tax-guide': {
    // GSC: 358 imp / 7 click (CTR 1.96%, pos 6.7) — 노출 풍부하나 CTR 낮음. 검색 의도
    // ("미술품 세금", "양도소득세", "부가세") 매칭 키워드를 title 앞에 배치해 SERP CTR 직격.
    titleKo: '미술품 세금 가이드 — 작품 양도소득세·부가세·예술인 공제 | 씨앗페',
    titleEn: 'Korean Art Tax Guide — Capital Gains, VAT, Artist Deductions | SAF Magazine',
    // description은 story.excerpt fallback 사용 — 본문과 일치 보장 (실제 본문과 어긋난
    // 메타는 GSC quality flag 위험).
  },
  'archival-pigment-print-photography': {
    // GSC 2026-05-05~06-01: "피그먼트 뜻" 70 imp / 0 click. 초보 정의형 쿼리를 title 앞에 배치.
    titleKo: '피그먼트 뜻 — 아키벌 피그먼트 프린트와 사진 작품 보존 방식',
    titleEn: 'What Is Archival Pigment Print? Inkjet Photography Explained | SAF Magazine',
    descriptionKo:
      '피그먼트는 염료가 아닌 안료 잉크를 뜻합니다. 아키벌 피그먼트 프린트가 디지털 사진을 오래 보존하는 이유와 작품 구매 시 확인할 점을 정리했습니다.',
    descriptionEn:
      'How archival pigment prints work, their longevity, photo edition numbering, and collector tips.',
  },
  'meet-artist-kim-ju-ho': {
    // GSC: 85 imp / 0 click (CTR 0%) — story.title fallback "김주호: 흙과 불로 빚어내는 형상"이
    // 검색 의도("김주호 작가") 대비 매력도 낮음. 작가 정체성을 title 앞에 배치.
    titleKo: '도예 조각가 김주호 인터뷰 — 흙과 불로 빚어내는 형상 | 씨앗페 매거진',
    titleEn: 'Kim Ju-ho Interview — Forms Shaped by Clay and Fire | SAF Magazine',
    descriptionKo:
      '강화도에서 33년째 전업작가로 활동하는 도예 조각가 김주호. 테라코타와 철판으로 보통 사람들의 웃음과 욕망을 빚어내는 그의 이야기.',
    descriptionEn:
      "Kim Ju-ho, working full-time in Ganghwa Island for 33 years, shapes everyday people's joy and desire in terracotta and iron plate.",
  },
  'meet-artist-son-eunyeong': {
    // GSC: 26 imp / 0 click / pos 8.4 — "손은영" 검색어. 본문: 서양화→20년 공백→사진, 집과 정원.
    titleKo: '사진작가 손은영 인터뷰 — 서양화에서 사진으로, 집과 정원을 기록하다 | 씨앗페 매거진',
    titleEn:
      'Son Eunyeong Interview — From Painting to Photography, Documenting Homes and Gardens | SAF Magazine',
    descriptionKo:
      '서양화를 공부하고 20년간 붓을 놓은 손은영 작가. 아이들 사진에서 시작한 카메라가 그녀를 사진가의 길로 데려다 놓았다.',
    descriptionEn:
      'Son Eunyeong studied painting and set down her brush for 20 years. A camera bought to capture her children led her back to art — this time, through photography.',
  },
  'meet-artist-lee-eun-hwa': {
    // GSC: 21 imp / 0 click / pos 4.3 — "이은화" 검색어. 본문: 런던예대·소더비 석사, 언어와 감정 탐구.
    titleKo: '화가 이은화 인터뷰 — 런던에서 서울까지, 언어와 감정을 그리다 | 씨앗페 매거진',
    titleEn:
      'Lee Eun-hwa Interview — From London to Seoul, Painting Language and Human Emotion | SAF Magazine',
    descriptionKo:
      '런던 예술대학교와 소더비 인스티튜트를 거친 전방위 아티스트 이은화. 회화·설치·뉴미디어로 문자와 욕망, 인간의 감정을 탐구해 왔다.',
    descriptionEn:
      "Trained at University of the Arts London and Sotheby's Institute, Lee Eun-hwa explores language, desire, and emotion across painting, installation, and new media.",
  },
  'meet-artist-yoon-gyeom': {
    // GSC: 14 imp / 0 click / pos 10.3 — "윤겸" 검색어. 본문: 선의 반복이 숲이 되는 회화, 프레카리아트.
    titleKo: '화가 윤겸 인터뷰 — 선을 반복해 숲을 짓다, 불안 속 몰입의 회화 | 씨앗페 매거진',
    titleEn:
      'Yoon Gyeom Interview — Drawing Lines into Forests: Meditative Repetition in Painting | SAF Magazine',
    descriptionKo:
      '반복적으로 선을 그어 숲과 요새를 짓는 화가 윤겸. 불안 속에서 평온을 만드는 그 행위가 그림이 된다.',
    descriptionEn:
      'Yoon Gyeom draws line after line until they become forests and fortresses. A painter who builds calm out of anxiety through repetition.',
  },
  'meet-artist-jeong-geumhui': {
    // GSC: 12 imp / 0 click / pos 4.4 — "정금희" 검색어. pos 4.4면 title CTR 영향 직접.
    // 본문: 홍익대 사진학 박사, 부산 기반, 화락이토·동해선—역사 시리즈.
    titleKo: '사진가 정금희 인터뷰 — 화락이토·동해선, 부산의 풍경을 기록하다 | 씨앗페 매거진',
    titleEn:
      'Jeong Geumhui Interview — Flowers to Earth, Documenting Busan Railways | SAF Magazine',
    descriptionKo:
      '홍익대 사진학 박사이자 부산 기반의 사진가. 정금희는 동해선의 옛 역사부터 꽃과 흙의 순환까지, 일체유심조의 시선으로 부산·울산·경남의 풍경을 담아왔다.',
    descriptionEn:
      "Busan-based PhD photographer. From the stations of the East Sea Line to the cycle of flowers and earth, Jeong Geumhui captures southern Korea's landscapes.",
  },
  'meet-artist-park-bul-ttong': {
    // GSC: 14 imp / 0 click / pos 5.7 — "박불똥" 검색어. 본문: 민중미술, 1985년 경찰 폐쇄 전시, 포토몽타주.
    titleKo:
      '민중미술 작가 박불똥 인터뷰 — 1985년 경찰이 닫은 전시, 지금도 저항을 그린다 | 씨앗페 매거진',
    titleEn:
      'Park Bul-ttong Interview — Police-Shuttered in 1985, Still Painting Resistance | SAF Magazine',
    descriptionKo:
      '1985년 공권력으로 강제 폐쇄된 전시를 기획한 민중미술 작가 박불똥. 포토몽타주와 디지털아트로 시대의 모순을 기록해 온 그의 이야기.',
    descriptionEn:
      '1985: police shut down his exhibition. Decades later, Park Bul-ttong still records the contradictions of his era through photomontage and digital art.',
  },
  'meet-artist-jung-young-shin': {
    // GSC: 41 imp / 1 click / pos 7.6 — "정영신" 검색어. 1958년생, 오일장 기록 사진가·소설가.
    titleKo:
      '사진가·소설가 정영신 인터뷰 — 40년 오일장, 전국 600여 장터를 기록한 바람의 여행자 | 씨앗페 매거진',
    titleEn:
      'Jeong Yeongsin Interview — 40 Years at 600+ Rural Markets, Photographer & Novelist | SAF Magazine',
    descriptionKo:
      '1958년 전남 함평 출생. 40년째 전국 오일장을 탐구하는 기록사진가이자 소설가. 6백여 곳의 장터를 발로 누빈 바람의 여행자 정영신의 이야기.',
    descriptionEn:
      'Born 1958 in Hampyeong. For 40 years, Jeong Yeongsin has photographed over 600 rural markets across Korea — part documentarian, part novelist, always wandering.',
  },
};

/** 슬러그로 SEO 오버라이드 조회. 매핑 없으면 undefined. */
export function getStorySeoOverride(slug: string): StorySeoOverride | undefined {
  return STORIES_SEO_OVERRIDES[slug];
}
