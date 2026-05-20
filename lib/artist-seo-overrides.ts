/**
 * Artist 페이지 SEO 메타 오버라이드 — 작가별로 SEO title을 별도 지정.
 *
 * 사용 맥락: 일반 작가는 `artistArtworks.metaTitleWithCategory` 같은 generic message로 충분하지만,
 * 일부 작가는 특별 컨텍스트(현재 진행 중인 캠페인·청원·기획전 등)가 있어 SERP CTR 직격
 * 키워드가 필요. 메시지 키 분기보다 작가별 override가 우아함.
 *
 * description은 generic fallback 유지 — 가격대·재고 같은 실시간 데이터가 metaDescription에
 * 포함돼야 user intent 매칭이 강한데, override 정적 description은 그걸 잃는다.
 *
 * GSC 데이터 기반 매핑 (2026-04~05):
 * - "오윤 작가" 95 imp / 2 click — 청원 효과로 노출 폭증, generic title이 청원 의도 매칭 약함.
 *
 * 신규 작가도 점진 추가 가능. 매핑 없으면 자동으로 generic metaTitle fallback.
 */
export interface ArtistSeoOverride {
  titleKo?: string;
  titleEn?: string;
}

export const ARTIST_SEO_OVERRIDES: Record<string, ArtistSeoOverride> = {
  오윤: {
    // 1974년 구의동 벽화 멸실 위기 → /petition/oh-yoon 청원 진행 중 (2026-05-25 마감).
    // generic title이 단순 "오윤의 작품 N점" 형태라 청원·벽화 검색 의도 매칭 약함.
    titleKo: '오윤 — 한국 민중미술 거장, 구의동 벽화 청원 진행 중 | 씨앗페',
    titleEn: 'Oh Yoon — Korean Minjung Art Master, Mural Petition Active | SAF Online',
  },

  // ─── GSC 2026-04-19~05-16: 0-click 작가 페이지 orides ───────────────────────
  // 합계 ~342 imp / 0 click. generic title("조문호의 사진 작품 N점 | 씨앗페")이
  // 작가 정체성 검색 의도 대비 매력도 낮아 SERP CTR 0. 작가별 핵심 컨텍스트를
  // title 앞에 배치해 CTR 1~3% 진입 목표.

  조문호: {
    // GSC: 46 imp / 0 click / pos 6.9 — 다큐 사진가, 동자동 쪽방촌 거주하며 소외 계층 기록.
    titleKo: '조문호 — 청량리·쪽방촌 기록 다큐멘터리 사진가 | 씨앗페',
    titleEn: "Jo Munho — Documentary Photographer of Korea's Urban Margins | SAF Online",
  },
  박불똥: {
    // GSC: 38 imp / 0 click / pos 7.1 — 민중미술, 1985년 공권력 폐쇄 전시. story override와
    // 중복 피해 작가 페이지는 포토몽타주·비엔날레 활동 강조.
    titleKo: '박불똥 — 민중미술·포토몽타주, 1985년 공권력이 닫은 전시의 작가 | 씨앗페',
    titleEn:
      'Park Bulttong — Minjung Artist, Photomontage, Police-Shut Exhibition 1985 | SAF Online',
  },
  윤겸: {
    // GSC: 35 imp / 0 click / pos 5.1 — 회복과 평온의 유화, Serenity Fortress 시리즈.
    titleKo: '윤겸 — 반복과 평온의 유화, 요새와 숲을 그리는 화가 | 씨앗페',
    titleEn: 'Yoon Gyeom — Oils of Serenity, Painter of Fortresses and Forests | SAF Online',
  },
  고자영: {
    // GSC: 29 imp / 0 click / pos 6.7 — 서울대 박사, 정원·식물 소재로 자아 탐구.
    titleKo: '고자영 — 정원·식물로 자아를 탐구하는 서울대 박사 회화 작가 | 씨앗페',
    titleEn: 'Go Jayeong — SNU PhD, Paintings of Gardens and the Inner Self | SAF Online',
  },
  신연진: {
    // GSC: 26 imp / 0 click / pos 4.6 (+ EN duplicate 20 imp) — 홍익대 회화, 일상·감정의 콜라주 회화.
    titleKo: '신연진 — 일상과 감정의 콜라주 회화, 홍익대 | 씨앗페',
    titleEn: 'Sin Yeonjin — Collage Paintings of Everyday Life and Subtle Emotion | SAF Online',
  },
  박성완: {
    // GSC: 25 imp / 0 click / pos 3.7 — 광주 중심 활동, 촛불광장·봄광주, 굵고 힘 있는 필치.
    titleKo: '박성완 — 광주의 일상과 공동체 기억, 힘 있는 붓의 회화 | 씨앗페',
    titleEn: 'Park Seongwan — Gwangju Community Memory, Bold Figurative Painting | SAF Online',
  },
  민정기: {
    // GSC: 24 imp / 0 click / pos 9.6 — 현실과 발언 창립회원, 이발소그림, 산수·화훼화.
    titleKo: '민정기 — 현실과 발언 창립, 이발소그림에서 산수·화훼까지 | 씨앗페',
    titleEn:
      'Min Jeonggi — Minjung Art Founder, From "Barber Shop" to Landscape Painting | SAF Online',
  },
  김수오: {
    // GSC: 24 imp / 0 click / pos 9.2 — 제주 출신 한의사 겸 사진가, 강정마을·제주 바다 기록.
    titleKo: '김수오 — 제주 바다와 강정마을을 기록한 의사 사진가 | 씨앗페',
    titleEn:
      'Kim Suoh — Physician Photographer Documenting Jeju Sea and Gangjeong Village | SAF Online',
  },
  이은화: {
    // GSC: 20 imp / 0 click / pos 7.4 — 런던예대·소더비 석사, 회화·설치·뉴미디어.
    // story override와 중복 피해 작가 페이지는 런던예대 학력 + 전방위 매체 강조.
    titleKo: '이은화 — 런던예대·소더비 석사, 언어·욕망·감정의 회화 설치 | 씨앗페',
    titleEn: "Lee Eunhwa — UAL & Sotheby's MFA, Painting Language and Human Emotion | SAF Online",
  },
  양순열: {
    // GSC: 18 imp / 0 click / pos 6.0 — 회화·조각, 확장된 모성, 존재와 사물의 영적 교감.
    titleKo: '양순열 — 모성과 존재를 탐구하는 회화·조각 작가 | 씨앗페',
    titleEn:
      'Yang Sunyeol — Painter-Sculptor Exploring Motherhood, Being, and the Sacred | SAF Online',
  },
  천지수: {
    // GSC: 16 imp / 0 click / pos 6.0 — 이태리 미술대전 대상, 유네스코 탄자니아 암석벽화 복원.
    titleKo: '천지수 — 이태리 미술대전 대상, 삽화·서평·암석벽화 복원 작가 | 씨앗페',
    titleEn:
      'Cheon Jisu — Italian Art Grand Prize, Illustrator and UNESCO Rock Art Restorer | SAF Online',
  },
  이문형: {
    // GSC: 14 imp / 0 click / pos 4.3 — 한국 전통 민화를 현대 회화로, 현대민화공모전 우수상.
    titleKo: '이문형 — 한국 전통 민화를 현대 회화로 풀어낸 작가 | 씨앗페',
    titleEn: 'Lee Munhyeong — Korean Folk Painting (Minhwa) in Contemporary Style | SAF Online',
  },
  박재동: {
    // GSC: 14 imp / 0 click / pos 7.6 — 한겨레신문 만평 8년, 한국 시사만화의 대부, 서울대 회화과.
    titleKo: '박재동 — 한겨레 만평 8년, 한국 시사만화의 대부 | 씨앗페',
    titleEn:
      'Park Jae-dong — Hankyoreh Editorial Cartoonist, Pioneer of Korean Satirical Comics | SAF Online',
  },
  이홍원: {
    // GSC: 13 imp / 0 click / pos 2.8 — 1984년 데뷔 40여 년, 달항아리·숲속의 노래, 단재 신채호 영정.
    titleKo: '이홍원 — 40년 화업, 달항아리·숲속의 노래, 한국 정서의 회화 | 씨앗페',
    titleEn:
      'Lee Hongwon — 40 Years Painting Korean Spirit: Moon Jars and Forest Songs | SAF Online',
  },

  // ─── GSC 2026-04-19~05-16: T2-6 추가 발견 ────────────────────────────────
  // T2-5 미커버 작가 2건.

  김준권: {
    // GSC: 34 imp / 0 click / pos 8.4 — 목판화가. 2018년 남북정상회담 평화의집 배경 작품
    // 〈산운〉으로 널리 알려짐. 40년 수묵·채묵 목판화, 국립현대미술관 소장.
    titleKo: '김준권 — 남북정상회담 배경 〈산운〉, 40년 수묵 목판화 | 씨앗페',
    titleEn: 'Kim Jungwon — Korean Woodblock Master, 2018 North-South Summit Artwork | SAF Online',
  },
  정금희: {
    // GSC: 21 imp / 0 click / pos 3.5 — 부산 기반 사진가, 홍익대 사진학 박사.
    // 〈화락이토〉(花落以土)·〈동해선—역사〉 시리즈로 부산·경남 풍경 기록.
    titleKo: '정금희 — 화락이토·동해선, 홍익대 사진학 박사 사진가 | 씨앗페',
    titleEn: 'Jeong Geumhui — PhD Photographer, Busan Landscapes and East Sea Line | SAF Online',
  },

  // ─── GSC 2026-04-22~05-20: T2-8 잔여 0-click 작가 ───────────────────────
  // 합계 ~99 imp / 0 click. T2-5/T2-6 미커버 + story override만 있고 artist override 없음.

  손은영: {
    // GSC: 46 imp / 0 click / pos 4.4 — story override(meet-artist-son-eunyeong) 있으나
    // artist 페이지(/artworks/artist/손은영)에는 generic title. 작가 정체성 강조.
    titleKo: '손은영 — 서양화에서 사진으로, 집과 정원을 기록하는 사진작가 | 씨앗페',
    titleEn: 'Son Eunyeong — From Painting to Photography, Homes and Gardens | SAF Online',
  },
  주재환: {
    // GSC: 20 imp / 0 click / pos 11.0 — 1940년생, 한국 민중미술 원로. 학고재·트렁크갤러리.
    // 이매망량·현기증 시리즈, 홍대 미대 중퇴 후 20년 생계 전전, 독학 화가.
    titleKo: '주재환 — 1940년생 한국 민중미술 원로, 이매망량·현기증의 작가 | 씨앗페',
    titleEn: 'Ju Jaehwan — Veteran Korean Minjung Artist (Born 1940) | SAF Online',
  },
  최혜수: {
    // GSC: 12 imp / 0 click / pos 1.7 — pos 1.7면 노출 보장 자리인데 CTR 0%. title 매력도 결정적.
    // 벨기에 브뤼셀 왕립 미술대 조각 석사, 안젤리미술관상, 포르쉐 코리아 드리머스 온.
    titleKo: '최혜수 — 벨기에 왕립 미술대 조각 석사, 존재와 일상의 시각 예술 | 씨앗페',
    titleEn: 'Choe Hyesu — Royal Academy of Brussels MFA, Sculpting Existence | SAF Online',
  },
  박은선: {
    // GSC: 11 imp / 0 click / pos 9.6 — 동국대 서양화·로마국립아카데미, 18회 개인전 200+ 단체전.
    // 가나아뜰리에·창동스튜디오·국제 레지던시.
    titleKo: '박은선 — 동국대·로마국립아카데미 출신, 18회 개인전의 서양화가 | 씨앗페',
    titleEn: 'Park Eunseon — Dongguk University & Rome Academy, 18 Solo Exhibitions | SAF Online',
  },
  강석태: {
    // GSC: 10 imp / 0 click / pos 9.8 — 어린왕자를 2002년부터 20년+ 주제로, 별소년·마음의 별 시리즈.
    titleKo: '강석태 — 어린왕자를 20년간 그려온 화가, 별소년의 회화 | 씨앗페',
    titleEn: 'Kang Seoktae — Painter of The Little Prince, 20 Years of Star Boy | SAF Online',
  },
};

/** 작가 이름(name_ko)으로 SEO 오버라이드 조회. 매핑 없으면 undefined. */
export function getArtistSeoOverride(artistName: string): ArtistSeoOverride | undefined {
  return ARTIST_SEO_OVERRIDES[artistName];
}
