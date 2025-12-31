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
  류연복: [
    {
      url: 'https://www.khan.co.kr/article/201912102150005',
      title: '칼끝으로 새긴 땅과 생명 - 회고전 온몸이 길이다',
      description:
        '목판에 시대상을, 삶의 지혜와 통찰을, 이 땅의 생명성을 조각칼로 새겨온 지 35년. 목판화 작업은 뜨거운 땀을 요구하는 노동의 길, 수도자의 길. 실존적 인간으로서, 예민한 감각의 예술가로서 살아있는 이유이자 자기 확인작업.',
      source: '경향신문',
    },
    {
      url: 'https://www.ohmynews.com/NWS_Web/View/at_pg.aspx?CNTN_CD=A0000361807',
      title: '류연복의 진경산수 판화',
      description:
        '1980년 중반부터 90년대 중반까지 우리 사회를 변화시키는데 중요한 역할을 했던 민중미술. 한국화와 서양화 목판화에 시대정신을 담은 민중화가 류연복의 진경산수 판화.',
      source: '오마이뉴스',
    },
    {
      url: 'http://www.sctoday.co.kr/news/articleView.html?idxno=31273',
      title: '민중의 한이 꿈틀대는 온몸이 길이다 목판화전',
      description:
        '진천군립 생거판화미술관 전시. 1984년부터 2019년까지 류연복 목판화 전부를 선보임. 민중에 대한 저항의 역사와 일상적인 삶에 대한 잠언, 작은 생명에 대한 풍경을 주제로 한 작품들.',
      source: '서울문화투데이',
    },
    {
      url: 'https://memory.library.kr/collection/show/220000535?ggmType=T',
      title: '류연복 아카이브 - 1980년대 소집단 미술운동',
      description:
        '서울미술공동체, 활화산, 민족미술인협의회에서 활동한 류연복 작가의 1980-1988년 기록. 벽화 공동 제작 작업 노트, 무명미술가 선언, 정릉벽화산건 기록 등 1980년대 소집단 미술운동사 연구 자료.',
      source: '경기도메모리',
    },
    {
      url: 'https://www.youtube.com/watch?v=fPaEzoO6FWA',
      title: '2016 옆집에 사는 예술가 - 류연복 작가의 작업실',
      description:
        '경기문화재단이 제작한 류연복 작가 작업실 방문 영상. 자연, 인간, 예술, 다시 자연이라는 주제로 안성에서 진행된 2016년 프로그램.',
      source: '경기문화재단',
    },
  ],
  류준화: [
    {
      url: 'https://www.daljin.com/column/20773',
      title: '여성이 바라본 여성의 현실',
      description:
        '현대미술포럼에 실린 류준화 작가의 여성주의 미술 작업. 여성이 바라본 여성의 현실을 작품으로 표현한 페미니즘 미술가의 시각.',
      source: '서울아트가이드',
    },
    {
      url: 'https://www.nyjnews.net/19369',
      title: '소녀는 항해하면서 푸른 빛 판타지를 펼친다',
      description:
        '류준화 작가의 작품세계. "나는 치명적이다"라는 제목의 작품을 통해 소녀의 항해와 푸른 빛 판타지를 표현.',
      source: '남양주뉴스',
    },
    {
      url: 'http://www.zineseminar.com/wp/issue03/interview-ipgimandtoday/',
      title: '한국 페미니즘 행동주의 미술의 궤적과 교차점 - 입김 인터뷰',
      description:
        '여성미술연구회 입김 멤버 류준화, 정정엽, 곽은숙 인터뷰. 1999년 종묘공원 아방궁 프로젝트와 여성문화축제, 한국 페미니즘 미술운동의 역사와 행동주의를 이야기.',
      source: 'zineseminar',
    },
  ],
  손은영: [
    {
      url: 'https://www.soneunyoung.com/',
      title: '손은영 작가 공식 홈페이지 - Working on a picture of the house',
      description:
        '집에서 비롯된 향수와 기억을 주제로 한 집 시리즈 작업. 사진으로 집의 기억을 구현하고, 오래된 집을 수리하듯 그림을 그려 집이라는 장소에서의 삶의 아름다움과 특별함을 표현.',
      source: '작가 홈페이지',
    },
    {
      url: 'http://virtualgallery.co.kr/artists/%EC%86%90%EC%9D%80%EC%98%81',
      title: '손은영 작가 프로필 및 전시 이력',
      description:
        '이화여대 서양화과, 홍익대 사진디자인전공 졸업. 검은 숲(2022), 밤의 집(2020-2021), 검은 집(2019), The underground(2018) 시리즈. 제2회 FNK Photography Award 수상.',
      source: '버추얼갤러리',
    },
    {
      url: 'https://www.hani.co.kr/arti/culture/culture_general/972511.html',
      title: '오묘한 빛과 색감…세월이 만든 도시 변두리 집들',
      description:
        '도시 변두리 달동네의 밤, 어둠 속에서 빛을 내며 드러나는 작은 집들. 각양각색의 생긴 꼴을 한 집들을 통해 세월이 만든 도시 변두리의 풍경을 담은 밤의 집 시리즈.',
      source: '한겨레',
    },
    {
      url: 'https://artlecture.com/article/3269',
      title: '그 집에 산다 - 손은영의 집',
      description:
        '회화 같은 리터칭을 통해 완성한 프레임으로 작가의 심상에서 길어 낸 한 장면을 보여주는 작업. 집을 주제로 꾸준히 작업하는 손은영 작가의 마음의 풍경.',
      source: 'artlecture',
    },
  ],
  심모비: [
    {
      url: 'https://www.daljin.com/?WS=21&BC=gdv&GNO=D103448',
      title: 'SIM_Purgatory 연옥 : 회화의 윤회',
      description:
        '갤러리도스에서 2025년 7월 23일부터 29일까지 진행되는 심모비 개인전. 생과 사, 연옥을 주제로 한 회화 작품 전시.',
      source: '서울아트가이드',
    },
    {
      url: 'https://brunch.co.kr/@fellas/22',
      title: '생과 사, 연옥의 풍경 속으로 - 심모비 인터뷰',
      description:
        '폭스바겐 독일 본사를 거쳐 일본 도요타 그룹 인테리어 디자이너로 재직 중인 NFT아티스트. 일본 거주하며 세계 각국에서 전시. 2023년 6월 나고야에서 10번째 개인전, 통산 55번째 전시 진행.',
      source: 'Brunch',
    },
  ],
  심현희: [
    {
      url: 'http://www.hakgojae.com/page/2-1-view.php?artist_num=63',
      title: '심현희 작가 프로필 - 학고재갤러리',
      description:
        '학고재갤러리 소속 작가 심현희. 2002년, 2005년 학고재갤러리에서 개인전 개최. 꽃과 나비를 주제로 한 회화 작업.',
      source: '학고재갤러리',
    },
    {
      url: 'https://www.hani.co.kr/arti/culture/music/974137.html',
      title: '코로나 시대, 고립의 고통을 역설로 그리다',
      description:
        '중견 화가 심현희(62) 신작전. 꽃과 사람의 모습을 거친 형상과 원색의 아크릴물감으로 표현. 파랑, 빨강, 하양, 노랑, 초록의 원색으로 코로나 시대 고립의 고통을 역설적으로 그림.',
      source: '한겨레',
    },
  ],
  이수철: [
    {
      url: 'https://www.gallerykim.com/%EB%B3%B5%EC%A0%9C-%EA%B3%A0%EC%A0%95%EB%82%A8',
      title: '이수철 작가 프로필 - 김영섭사진화랑',
      description:
        '흔적과 빛에 관한 이야기. 과거의 역사적 사실과 시간의 흐름에 따라 변화하는 인간의 의식과 기억의 오류를 디지털사진으로 표현. 근대문화유산을 통해 세월과 함께 희미해지는 역사의 기억을 시각화.',
      source: '김영섭사진화랑',
    },
    {
      url: 'https://blog.naver.com/isanacademy/221480596390',
      title: '이수철 작가 작품 소개',
      description:
        '이수철 작가의 사진 작업과 작품세계를 소개하는 이산아카데미 블로그 포스팅. 작가의 작품 활동과 전시 정보.',
      source: '이산아카데미',
    },
  ],
};

/**
 * 작가명으로 관련 기사 가져오기
 */
export function getArticlesByArtist(artistName: string): Article[] {
  return artistArticles[artistName] || [];
}
