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
    titleKo: '한정판 에디션 뜻과 종류 — 원화·한정판·오픈 에디션 차이 | 씨앗페 매거진',
    titleEn:
      'What Are Limited Editions? Original vs Limited vs Open Editions Explained | SAF Magazine',
    descriptionKo:
      '한정판 에디션이란? 원화와 판화의 차이, 에디션 번호 읽는 법까지. 미술 작품을 구매하기 전 반드시 알아야 할 에디션 개념을 정리합니다.',
    descriptionEn:
      'What does "limited edition" mean in art? Original vs limited vs open editions, edition numbering basics, and what to check before buying.',
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
    titleKo: '에디션 넘버링 읽는 법 — 판화와 원화의 차이, 1/100·AP·EA 의미 | 씨앗페 매거진',
    titleEn: 'How to Read Edition Numbers (1/100, AP, EA) — Prints vs Originals | SAF Magazine',
    descriptionKo:
      '판화 에디션 넘버링(1/100, AP, EA, HC) 뜻과 읽는 법, 판화와 원화의 차이, 가격이 형성되는 원리, 컬렉팅 시 체크포인트까지.',
    descriptionEn:
      'Edition numbers explained — fraction format, AP, EA, HC. Why prints and originals differ in price, and what to verify before purchase.',
  },
  'reading-art-sizes-ho-vs-cm': {
    titleKo: '10호 30호 100호 크기 cm — 호수 ↔ 센티미터 환산표 | 씨앗페 매거진',
    titleEn: 'Korean Art Canvas Sizes (호) to cm — Conversion Chart | SAF Magazine',
    descriptionKo:
      '10호는 53×45.5cm, 30호는 91×72.7cm. 한국 미술 호수(F·M·P·S 형식별) ↔ 센티미터 환산표와 공간별 권장 작품 크기 가이드.',
    descriptionEn:
      'Korean canvas size (호) to centimeter conversion. F/M/P/S format chart, plus space-by-space size recommendations for collectors.',
  },
  'choosing-by-medium': {
    titleKo: '유화·아크릴·판화 차이 — 재료로 작품 고르는 법 가이드 | 씨앗페 매거진',
    titleEn: 'Oil vs Acrylic vs Print — Choosing Art by Medium | SAF Magazine',
    descriptionKo:
      '유화·아크릴·수채·판화·드로잉의 특성과 차이. 가격대·관리법·공간별 추천까지, 재료를 알면 작품 고르는 눈이 달라집니다.',
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
};

/** 슬러그로 SEO 오버라이드 조회. 매핑 없으면 undefined. */
export function getStorySeoOverride(slug: string): StorySeoOverride | undefined {
  return STORIES_SEO_OVERRIDES[slug];
}
