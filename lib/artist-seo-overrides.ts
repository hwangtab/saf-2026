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
    // 1974년 구의동 벽화 멸실 위기 → /petition/oh-yoon 청원 진행 중, 목표 1만 명 초과 달성.
    // "1만여 명 서명" 사회적 증거로 SERP CTR 강화. generic title이 매칭 약했던 이유와 동일한 방향.
    titleKo: '오윤 — 한국 민중미술 거장, 구의동 벽화 보존 1만여 명 서명 | 씨앗페',
    titleEn: 'Oh Yoon — Korean Minjung Art Master, 10,000+ Sign to Save the Mural | SAF Online',
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

  // ─── GSC 2026-04-19~05-17: T2-13 미커버 작가 페이지 ───────────────────────
  // 합계 ~118 imp / 0 click. 작가 페이지를 랭크시키나 artist override 없음(generic title).
  // 김주호는 story override(meet-artist-kim-ju-ho) 별도 보유 → 제외.

  박소형: {
    // GSC: 48 imp / 0 click / pos 3.2 — page-1 최상단인데 CTR 0%. title 매력도 결정적.
    // BU 조형예술 석사·SVA 학사, 보스턴·뉴욕·서울. 조각·설치·비디오·AI 미디어·생태예술.
    titleKo: '박소형 — 보스턴·뉴욕·서울의 조형예술가, AI·생태예술 조각·설치 | 씨앗페',
    titleEn:
      'Park Sohyeong — Sculptor & Installation Artist (Boston·NY·Seoul), AI & Eco Art | SAF Online',
  },
  이철수: {
    // GSC: 26 imp / 0 click / pos 9.3 — "판화가 이철수"·"이철수 판화". 1954년생 독학,
    // 1980년대 민중판화 대표 → 선(禪)·영성, 충북 제천 농사+판화 30년+. 한국 목판화 거장.
    titleKo: '이철수 — 민중판화에서 선(禪)의 판화로, 한국 목판화 거장 | 씨앗페',
    titleEn:
      'Lee Cheol-soo — From Minjung Prints to Zen Woodcuts, Korean Printmaking Master | SAF Online',
  },
  이호철: {
    // GSC: 35 imp / 0 click / pos 14.3 — page-2라 CTR ceiling 낮으나 노출 큼. 1958년 서울,
    // 홍익대, 1978 중앙미술대전 장려상. 서랍 속에 다른 세계가 펼쳐지는 초현실적 일상 회화.
    titleKo: '이호철 — 서랍 속에 펼쳐진 또 다른 세계, 일상의 초현실 회화 | 씨앗페',
    titleEn: 'Lee Ho-chul — Surreal Everyday Painting, Worlds Inside Open Drawers | SAF Online',
  },
  정채희: {
    // GSC: 9 imp / 0 click / pos 5.1 — 서울대 회화과·북경 중앙미술학원 벽화 석사,
    // 옻칠(칠화·칠벽화) 작가, 21회 개인전. 위치 양호라 title 개선 효과 직접.
    titleKo: '정채희 — 옻칠로 그리는 칠화·칠벽화, 서울대·북경 중앙미술학원 | 씨앗페',
    titleEn: 'Jeong Chaehui — Lacquer Painting and Murals, SNU & Beijing CAFA | SAF Online',
  },

  // ─── GSC 2026-05-27: 잔여 0-click 작가 페이지 gap-fill ──────────────────────
  // 합계 ~89 imp / 0~1 click. T2-13 이후 미커버된 2건.

  김지영: {
    // GSC: 48 imp / 0 click / pos 8.9 — 도예가. 자연 소재 작품, '순 돋는 나무'·'나무 한 그루' 시리즈.
    titleKo: '김지영 — 자연을 빚는 도예가, 순 돋는 나무·나무 한 그루 시리즈 | 씨앗페',
    titleEn: 'Kim Jiyeong — Ceramicist of Natural Forms, Budding Trees Series | SAF Online',
  },
  정영신: {
    // GSC: 41 imp / 0 click — 1958년생, 40년째 오일장 기록 사진가·소설가. 전국 600여 장터 모두 기록.
    titleKo:
      '정영신 — 40년 오일장 기록 사진가·소설가, 전국 600여 장터를 누빈 바람의 여행자 | 씨앗페',
    titleEn:
      'Jeong Yeongsin — Photographer & Novelist, 40 Years Documenting 600+ Rural Markets | SAF Online',
  },

  // ─── GSC 2026-05-02~05-27: TOP 3 CTR=0 위기 + Page 1 CTR=0 추가 보강 ─────
  // 'cm-1 읽는법' 1.9위 / 0 click, '이익태' 2.3위 / 0 click — 1~3위인데 click 0%는
  // title이 search intent를 즉시 만족시키지 못한다는 결정적 신호.

  이익태: {
    // GSC: 34 imp / 0 click / pos 2.3 — 1936년생, 다큐멘터리 사진가 1세대. '한국 사진의 산증인'.
    // 1~2위인데 click 0% — generic title('이익태 작가 작품 N점')이 SERP에서 'who is 이익태?'
    // 검색 의도에 답하지 못함. 작가 정체성을 title 앞에 배치.
    titleKo: '이익태 — 한국 1세대 다큐멘터리 사진가, 50년 한국 풍경의 기록자 | 씨앗페',
    titleEn:
      'Lee Iktae — First-Generation Korean Documentary Photographer, 50 Years of Korean Landscape | SAF Online',
  },
  김주희: {
    // GSC: ~40 imp / 0 click / pos ~6 — 회화·드로잉, 자전적 일기 회화.
    titleKo: '김주희 — 자전적 일기 회화, 매일의 풍경을 그리는 화가 | 씨앗페',
    titleEn: 'Kim Juhui — Diary Paintings, Daily Landscapes by a Korean Artist | SAF Online',
  },
  김영서: {
    // GSC: ~30 imp / 0 click — 회화. 신예 작가.
    titleKo: '김영서 — 한국 신예 화가, 씨앗페에서 만나는 동시대 회화 | 씨앗페',
    titleEn: 'Kim Yeongseo — Emerging Korean Painter, Contemporary Works at SAF | SAF Online',
  },
  아트만두: {
    // GSC: TOP 10 click 0% — 시사만화·캐리커처. '방구防口' 시리즈로 알려진 작가.
    titleKo: '아트만두 — 시사만화·캐리커처 작가, 방구防口 시리즈 | 씨앗페',
    titleEn: "Artmandu — Editorial Cartoonist, 'Banggu' Caricature Series | SAF Online",
  },
  이광수: {
    // GSC: TOP 10 click 0% — 사진비평가·시인 출신 회화 작가, '돌아올 回' 회화 시리즈.
    titleKo: "이광수 — 사진비평가 출신 회화 작가, 여섯 개의 회화 '돌아올 回' 시리즈 | 씨앗페",
    titleEn: "Lee Gwangsu — Photography Critic Turned Painter, 'Return' Series | SAF Online",
  },
  김호성: {
    // GSC: TOP 10 click 0% — 회화, 색면추상.
    titleKo: '김호성 — 색면추상 화가, 빛과 평면의 회화 | 씨앗페',
    titleEn: 'Kim Hoseong — Color Field Abstract Painter | SAF Online',
  },

  // ─── GSC 2026-05-02~05-27 추가: Page 2(11~15위) 작가 — Page 1 push 후보 ─────
  이수철: {
    // GSC: 12imp / pos 11.3 / 0 click — page 2 직전. 작가 페이지 + 작품 detail 양쪽 매칭.
    // 사진 작가, Over the Dream 시리즈.
    titleKo: '이수철 — Over the Dream 시리즈 사진 작가 | 씨앗페',
    titleEn: 'Lee Sucheol — Photographer of the Over the Dream Series | SAF Online',
  },
  조신욱: {
    // GSC: '탈방' 9imp / 11.3위 / 1 click — 작품 검색 매칭. 작가 페이지 보강.
    // 수채화 작가.
    titleKo: '조신욱 — 수채화 〈탈방〉, 일상의 균열을 그리는 작가 | 씨앗페',
    titleEn: 'Cho Sinuk — Watercolorist of Daily Fractures, "Talbang" Series | SAF Online',
  },
  최윤정: {
    // GSC: '최윤정 작가' 13imp / 11.6위 / 2 click — 미세하지만 CTR 가능성. story 매칭 우세.
    titleKo: '최윤정 — 손끝의 풍경, 직조의 회화로 일상을 그리는 작가 | 씨앗페',
    titleEn: 'Choi Yunjung — Painter Weaving Daily Landscape | SAF Online',
  },
  남진현: {
    // 작품 override는 별도 ('인생, 그 헛헛함에 대하여'). 작가 페이지도 보강.
    titleKo: '남진현 — 존재의 무게를 그리는 아크릴 회화 작가 | 씨앗페',
    titleEn: 'Nam Jinhyun — Acrylic Painter on the Weight of Being | SAF Online',
  },
  홍진희: {
    // 작품 '눈밭01/02' overrides 별도. 작가 페이지 보강.
    titleKo: '홍진희 — 한지에 면사 자수, 침묵의 풍경을 짓는 작가 | 씨앗페',
    titleEn: 'Hong Jinhee — Cotton Thread on Hanji, Quiet Landscapes | SAF Online',
  },

  // ─── GSC 2026-05-02~05-27 Cycle 4: TOP 5 (1~5위) click=0 + low-imp 작가 ─────
  // 정채희는 이미 187번에 entry 있음 (서울대·북경 CAFA 옻칠 강조).
  고현주: {
    // GSC: 5imp / pos 3.5 / 0 click — TOP 5인데 click 0%. 사진 작가.
    titleKo: '고현주 — 한국 현대 사진가, 침묵과 빛의 시각 언어 | 씨앗페',
    titleEn:
      'Go Hyeonju — Korean Contemporary Photographer, Visual Language of Silence | SAF Online',
  },
  한미영: {
    // GSC: 7imp / pos 3.7 / 0 click — 작품 'Free will' 매칭. 혼합매체(아크릴+금박+왁스).
    titleKo: '한미영 — 아크릴·금박·왁스의 혼합매체 회화, 자유의지 시리즈 | 씨앗페',
    titleEn:
      'Han Miyoung — Mixed Media Painting (Acrylic, Gold Leaf, Wax), Free Will Series | SAF Online',
  },
};

/** 작가 이름(name_ko)으로 SEO 오버라이드 조회. 매핑 없으면 undefined. */
export function getArtistSeoOverride(artistName: string): ArtistSeoOverride | undefined {
  return ARTIST_SEO_OVERRIDES[artistName];
}
