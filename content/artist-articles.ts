/**
 * 작가별 관련 기사/자료 데이터
 * 작품 상세 페이지에서 사용
 */

export interface Article {
  url: string;
  title: string;
  description: string;
  source: string;
  thumbnail?: string;
}

/**
 * 작가명을 키로 하는 관련 기사 목록
 */
export const artistArticles: Record<string, Article[]> = {
  신학철: [
    {
      url: 'http://www.hakgojae.com/page/2-1-view.php?artist_num=25',
      title: '신학철 - 학고재갤러리',
      description:
        '민중미술을 대표하는 신학철 작가의 작품세계와 전시 이력. 대표작 〈모내기〉, 〈한국근대사〉 등을 소개.',
      source: '학고재갤러리',
    },
    {
      url: 'https://namu.wiki/w/%EC%8B%A0%ED%95%99%EC%B2%A0',
      title: '신학철 - 민중미술의 거장',
      description:
        '대한민국 민중미술을 대표하는 화가. 1943년 경북 김천 출생. 홍익대 미대 서양화과 졸업. 역사와 현실을 담은 대형 작품으로 유명.',
      source: '나무위키',
    },
    {
      url: 'https://www.mmca.go.kr/collections/collectionsDetailPage.do?wrkinfoSeqno=6062&artistnm=%EC%8B%A0%ED%95%99%EC%B2%A0',
      title: '묵시 802 (1980)',
      description:
        '국립현대미술관 소장작. 신학철 작가의 1980년대 작품으로 한국 민중미술의 대표작 중 하나.',
      source: '국립현대미술관',
    },
    {
      url: 'https://busanbiennale2024.com/ko/exhibition/artists/7b92ca67-f4a5-441e-9201-5ca14612e092',
      title: '2024 부산비엔날레 참여 작가',
      description: '2024 부산비엔날레에 참여한 신학철 작가의 작품과 예술세계를 소개.',
      source: '부산비엔날레',
    },
    {
      url: 'https://sema.seoul.go.kr/kr/knowledge_research/collection/list?artCode1=ALL&soOrd=old&soHighlight=&kwd=KWNAME&wriName=%EC%8B%A0%ED%95%99%EC%B2%A0',
      title: '신학철 소장품 목록',
      description: '서울시립미술관이 소장한 신학철 작가의 작품들을 볼 수 있습니다.',
      source: '서울시립미술관',
    },
  ],
  김상구: [
    {
      url: 'https://www.mmca.go.kr/exhibitions/exhibitionsDetail.do?exhId=202001090001225',
      title: '판화, 판화, 판화 - 국립현대미술관 전시',
      description:
        '한국 추상 목판화를 대표하는 원로 작가 김상구의 작품이 소개된 국립현대미술관 전시 (2020). 50여 년간 1,500여 점의 작품을 발표하며 한국 현대 목판화의 기틀을 마련한 중요 작가.',
      source: '국립현대미술관',
    },
    {
      url: 'https://www.daljin.com/column/12502',
      title: '김상구 / 나무에서 나무에로',
      description:
        '김상구 작가의 목판화 작품세계를 다룬 미술평론. 작가의 작품이 지닌 형식적 특징과 서정성, 대중성의 조화를 분석.',
      source: '서울아트가이드',
    },
  ],
  김주호: [
    {
      url: 'https://www.mk.co.kr/news/culture/11457683',
      title: '김종영미술상 2025 수상 - 우리것을 찾아낸 뚝심',
      description:
        '김종영미술상 2025 수상자 조각가 김주호. 서양미술에 주눅들지 않고 평생 우리것을 찾아낸 뚝심. 강화도에서 전업작가 33년째, 환하게 웃는 유쾌한 인물 조각으로 긍정과 희망을 전달.',
      source: '매일경제',
    },
    {
      url: 'https://www.joongang.co.kr/article/330571',
      title: '조각가 김주호 세상 들여다보기 展',
      description:
        '강화도 외포리에서 작업하는 조각가 김주호의 전시. 노래방 풍속도 등 일상의 생생한 풍경을 질구이 작품으로 표현. 밭 갈고 포도 심으며 삶과 예술을 함께하는 작가.',
      source: '중앙일보',
    },
    {
      url: 'https://monthlyart.com/02-artist/special-artist-%EA%B9%80%EC%A3%BC%ED%98%B8/',
      title: 'SPECIAL ARTIST 김주호 - 말하는 조각들',
      description:
        '테라코타, 나무, 돌, 철판 등 다양한 재료를 다루는 조각가 김주호의 작품세계. 일상의 정서를 담은 친근하고 따뜻한 조각들.',
      source: '월간미술',
    },
    {
      url: 'https://www.ohmynews.com/NWS_Web/View/at_pg.aspx?CNTN_CD=A0001740413',
      title: '삶과 통하는 단비 같은 조각',
      description:
        '이웃 사람들이 겪는 삶의 욕망과 정서를 고스란히 담은 김주호의 조각. 일상의 생생한 풍경을 친근한 재료에 예리하면서도 따뜻한 기지로 표현.',
      source: '오마이뉴스',
    },
    {
      url: 'https://inartplatform.kr/residency/view?residency=87&category=2013',
      title: '인천아트플랫폼 입주작가',
      description:
        '인천아트플랫폼 2013년 입주작가로 선정된 김주호. 예술창작공간에서 작품 활동을 이어가며 지역 예술 생태계에 기여.',
      source: '인천아트플랫폼',
    },
    {
      url: 'http://www.ganghwanews.co.kr/news/articleView.html?idxno=10921',
      title: '강화군 내가면 조각가 김주호, 김종영미술상 수상',
      description:
        '강화군 내가면에 거주하는 조각가 김주호(76)가 독창적이고 혁신적인 예술 세계를 인정받아 김종영미술상 수상. 거대하고 권위적인 조각과는 달리 친근하고 인간적인 조각으로 평가.',
      source: '강화뉴스',
    },
  ],
  김준권: [
    {
      url: 'https://youtu.be/B_yXVVbpFOU',
      title: '한국 목판화의 거장, 김준권 작가',
      description:
        '목판화 거장 김준권 작가의 작품세계와 창작 철학을 담은 인터뷰 영상. 나무에 새긴 40년, 충북 진천군 백곡면 작업실과 진천군립 생거판화미술관 방문.',
      source: '대전MBC',
    },
    {
      url: 'https://www.youtube.com/watch?v=PPVPrUywlvw',
      title: 'MMCA 작가와의 대화 - 길 위의 예술가 김준권',
      description:
        '국립현대미술관 작가와의 대화. 김준권 작가의 초기작부터 통일대원도(1987), 대동천지굿(1988), 90년대 풍경 판화, 산에서 작품까지 작품세계 전반을 소개.',
      source: '국립현대미술관',
    },
    {
      url: 'http://www.sctoday.co.kr/news/articleView.html?idxno=44436',
      title: '목판화, 색을 입다 - 김준권 초대전',
      description:
        '한국소리문화의전당에서 열린 《김준권의 국토-판각장정》 전시. 우리 땅-우리의 진경이라는 고전적 명제에 충실하며 목판화 기법을 깊이 연구한 작가의 70년대 이후 창작 여정.',
      source: '서울문화투데이',
    },
    {
      url: 'https://www.daljin.com/display/D100155',
      title: '2025 김준권의 국토 판각장정',
      description:
        '한국소리문화의전당에서 2025년 1월 17일부터 3월 30일까지 진행되는 김준권 개인전. 목판화로 표현한 우리 국토의 아름다움.',
      source: '서울아트가이드',
    },
    {
      url: 'https://www.ohmynews.com/NWS_Web/View/at_pg.aspx?CNTN_CD=A0002468988',
      title: '노무현 전 대통령이 사랑한 판화가 김준권',
      description:
        '남북정상회담 시 판문점 평화의집에 내걸린 작품 "산운"의 작가 김준권. 진천군립 생거판화미술관 초대전 개최.',
      source: '오마이뉴스',
    },
    {
      url: 'https://www.sac.or.kr/site/main/show/show_view?SN=46449',
      title: '예술의전당 서울서예박물관 전시',
      description:
        '2022년 4월 15일부터 5월 8일까지 예술의전당 서울서예박물관에서 열린 김준권 목판화 전시. 한국목판화연구소 주최.',
      source: '예술의전당',
    },
  ],
};

/**
 * 작가명으로 관련 기사 가져오기
 */
export function getArticlesByArtist(artistName: string): Article[] {
  return artistArticles[artistName] || [];
}
