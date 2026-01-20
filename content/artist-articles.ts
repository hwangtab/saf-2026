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
  ],
  이열: [
    {
      url: 'https://www.classicm.co.kr/news/articleView.html?idxno=5340',
      title: '나무는 느린 인간, 인간은 빠른 나무 - 이열 전시',
      description:
        '서울 삼청동 복합문화공간 라플란드에서 열린 이열 작가 전시 "느린 인간". 오랫동안 촬영해 온 나무 사진들을 모아 책으로 펴내고 전시. 나무와 함께한 추억과 나무 곁에서 들은 이야기들을 담은 작품.',
      source: '뉴스클래식M',
    },
  ],
  이윤엽: [
    {
      url: 'https://ggc.ggcf.kr/p/5bfde8b0fb94a32d139339cb',
      title: '심심/ 판화/ 현장 - 이윤엽 작가',
      description:
        '경기문화재단 지지씨플랫폼에 소개된 이윤엽 작가의 판화 작업. 현장을 기록하고 표현하는 민중미술가의 작품세계.',
      source: '경기문화재단 지지씨',
    },
    {
      url: 'https://www.hani.co.kr/arti/culture/music/1084923.html',
      title: '아이들이 노동자 친근하게 느끼도록 이야기 그림 그렸죠',
      description:
        '민중미술가 이윤엽 작가의 이야기 그림책 "시간이 조금 걸리더라도". 2008년부터 약 10년간 어린이 잡지 "고래가 그랬어"에 연재한 이야기 판화 그림을 모음.',
      source: '한겨레',
    },
    {
      url: 'https://www.khan.co.kr/article/201112062116375',
      title: '김규항의 좌판 - 판화가 이윤엽',
      description:
        '경기 안성시 보개면 시골마을 작업실에서 작업하는 이윤엽. 폐가를 8개월간 손수 매달려 살려낸 작업실. 버려진 물건들을 모아 작품으로 재탄생시키는 민중미술가.',
      source: '경향신문',
    },
    {
      url: 'https://www.ohmynews.com/NWS_Web/View/at_pg.aspx?CNTN_CD=A0002082451',
      title: '세상을 풍자하는 칼노래 - 이윤엽을 만나다',
      description:
        '이윤엽의 남풍리 판화통신 전시. 안성 보개면 남풍리 작업장에서 만난 이윤엽 작가. 11번째 목판화전과 아트북 "한국현대미술선-이윤엽" 출간.',
      source: '오마이뉴스',
    },
    {
      url: 'https://m.woodplanet.co.kr/news/view/1065608303022949',
      title: '목판화가 이윤엽 - 손에 잡히는 대로 깎고 칠한다',
      description:
        '소박한 사람들을 관찰하는 이윤엽의 뜨거운 손끝. 예술과 사회를 말할 땐 차갑지만 나무를 만나면 순박한 소년이 되는 목판화가. 손에 잡히는 대로 깎고 칠하는 작업.',
      source: 'woodplanet',
    },
    {
      url: 'https://www.youtube.com/watch?v=paAa3tT3K5M',
      title: '약자들의 투쟁을 목판에 새겼다 - 이윤엽 작가 개인전 둥질',
      description:
        '포항 스페이스298에서 열린 이윤엽 작가 개인전 "둥질" 소개 영상. 약자들의 투쟁을 목판화로 기록한 작가의 전시.',
      source: '전국시대',
    },
  ],
  이익태: [
    {
      url: 'https://youtu.be/l_-jUX50zK8',
      title: '암울했던 시절, 한국이 배출한 천재 아티스트가 미국 예술계를 뒤흔들었던 이야기',
      description:
        '70년대 한국 최초의 독립영화 감독 이익태 작가. 미국으로 건너가 독창적이면서도 인간에 대한 깊은 이해와 애정이 담긴 퍼포먼스로 예술계의 화제. 귀한 필름 자료 발굴.',
      source: '고효경과 재야의 고수들',
    },
    {
      url: 'https://www.news-art.co.kr/news/article.html?no=32876',
      title: '재난의 폐허 위에 치유의 씨앗을 심다 - 이익태 작가 추모',
      description:
        '한국 현대예술의 가장 뜨거운 전위에 섰던 토탈 아티스트 이익태. 1970년 한국 최초 독립영화 "아침과 저녁 사이"로 전위의 포문. 광주항쟁, LA 폭동, 분단 등 시대의 아픔을 행위로 씻어낸 샤먼. 향년 78세 별세.',
      source: '뉴스아트',
    },
    {
      url: 'https://koreagalleries.or.kr/exhibition/%EC%9D%B4%EC%9D%B5%ED%83%9C-everyone-pierrot/',
      title: '이익태 : Everyone Pierrot 전시',
      description:
        '한국화랑협회에서 소개하는 이익태 작가 전시 "Everyone Pierrot". 피에로를 주제로 한 작품들. Big Mouth, 나 홀로 웃다, 빨간 코 마리오네트 등 전시.',
      source: '한국화랑협회',
    },
    {
      url: 'https://www.yna.co.kr/view/AKR20130222076900005',
      title: '전방위 예술가 이익태 초대전 빔 플라워',
      description:
        '전방위 예술가라는 별명으로도 불리는 서양화가 이익태의 전시. 분당구 서현동 아트스페이스 아프리카나에서 개최.',
      source: '연합뉴스',
    },
    {
      url: 'https://www.kgnews.co.kr/news/article.html?no=752882',
      title: '인간에 대한 깊은 연민 - Everyone Pierrot 전시',
      description:
        '용인 갤러리위에서 열린 이익태 작가 전시. 59점의 피에로 주제 작품. 작가가 바라보는 사회와 우리 모습, 인간에 대한 깊은 연민을 담은 작품. 위트와 페이소스의 상징.',
      source: '경기뉴스',
    },
  ],
  이철수: [
    {
      url: 'https://www.mokpan.com/home/main.php',
      title: '이철수의 집 - 공식 홈페이지',
      description: '판화가 이철수 작가의 공식 홈페이지. 작가의 작품세계와 활동을 소개하는 공간.',
      source: '이철수의 집',
    },
    {
      url: 'https://www.chosun.com/site/data/html_dir/2012/12/14/2012121401198.html',
      title: '시골살이 25년 판화가 이철수 - 판화로 시 쓰는 농부',
      description:
        '봄·여름·가을엔 농사짓고 겨울엔 밑그림 그리는 삶. 농사지은 것의 8할은 어려운 이웃들과 나눔. 80년대 말 독일 쇼크 이후 시위 걸개그림 벗어나 예술로 성찰하는 삶. 권정생 선생의 글로 힐링.',
      source: '조선일보',
    },
    {
      url: 'https://www.sedaily.com/NewsView/1S28YL9479',
      title: '시대 아픔 담고 대중과 호흡 - 이념 넘어 생명·평화 새기죠',
      description:
        '충북 제천 천등산 박달재 아래 자리잡은 판화가 이철수(64). 시대의 아픔을 담고 대중과 호흡하며, 이념을 넘어 생명과 평화를 새기는 작가.',
      source: '서울경제',
    },
    {
      url: 'https://www.ebs.co.kr/tv/show?prodId=7745&lectId=60054821',
      title: '목판에 마음을 새기다 - 이철수 화백',
      description:
        'EBS 방송. 데뷔 40주년을 맞이한 판화가 이철수. 평범한 삶 속의 일상사에 대한 깊은 통찰과 다채로운 자연 속에 깃들어 사는 인간의 모습. 목판화가, 환경운동연합 상임대표.',
      source: 'EBS',
    },
  ],
  정미정: [
    {
      url: 'https://m.artgg.ggcf.kr/pastArtists/%EC%A0%95%EB%AF%B8%EC%A0%95',
      title: '정미정 작가 - 아트경기',
      description:
        '경기미술품활성화사업 아트경기 소속 작가 정미정. The time in between(2022), Line and Light(2021), 랑데부(2020) 등 개인전. 다다르다, Who is next?, New Age Art 등 그룹전 참여.',
      source: '아트경기',
    },
    {
      url: 'https://www.geconomy.co.kr/news/article.html?no=307005',
      title: '기억의 흔적을 따라가는 회화적 여정',
      description:
        '서양화가 정미정 작가 초대 개인전 "Palimpsest: 팔림프세스트". 서울 종로구 가회동 공간 썬더에서 2025년 9월 13일부터 21일까지 개최. 북촌의 전통과 현대가 어우러진 공간.',
      source: '지이코노미',
    },
    {
      url: 'https://v.daum.net/v/uEgG76HlW2',
      title: '기억으로 피어난 풍경의 시학',
      description:
        '정미정의 회화는 기억의 풍경을 그리는 것이 아니라, 시간이 풍경으로 전이되는 순간을 포착. 흐름과 체류, 번짐과 여운의 감각으로 존재하는 화면. 안현정 미술평론가 추천.',
      source: '청년타임스',
    },
  ],
  주재환: [
    {
      url: 'https://namu.wiki/w/%EC%A3%BC%EC%9E%AC%ED%99%98',
      title: '주재환 - 나무위키',
      description:
        '대한민국의 민중미술가. 1940년 경성부에서 태어남. 민중미술 운동의 주요 작가로 활동.',
      source: '나무위키',
    },
    {
      url: 'http://www.hakgojae.com/page/2-1-view.php?artist_num=299',
      title: '주재환 작가 프로필 - 학고재갤러리',
      description: '학고재갤러리 소속 작가 주재환. 작가의 전시 이력과 작품세계를 소개.',
      source: '학고재갤러리',
    },
    {
      url: 'https://www.daljin.com/column/13547',
      title: '주재환의 유쾌한 딴지걸기 - 윤범모 미술시평',
      description:
        '윤범모 미술평론가의 주재환 작가 작품 평론. 유쾌한 딴지걸기라는 제목으로 작가의 작품세계 분석.',
      source: '서울아트가이드',
    },
    {
      url: 'https://koreana.or.kr/koreana/na/ntt/selectNttInfo.do?nttSn=103523&bbsId=1125',
      title: '이미지와 텍스트로 소통하다 - 주재환',
      description:
        '한국국제교류재단 코리아나 아트 리뷰. 주재환 작가의 이미지와 텍스트를 통한 소통 방식 분석.',
      source: '한국국제교류재단',
    },
    {
      url: 'https://www.mmca.go.kr/collections/collectionsDetailPage.do?wrkinfoSeqno=8752',
      title: '주재환 - 아침 햇살 (1998) - 국립현대미술관 소장',
      description:
        '국립현대미술관 소장 주재환 작가 작품 "아침 햇살"(1998). MMCA 이건희 컬렉션 특별전: 한국미술명작.',
      source: '국립현대미술관',
    },
  ],
  최경선: [
    {
      url: 'https://kiaf.org/insights/44956',
      title: 'Floating In Colors - 히든엠갤러리 3인전',
      description:
        '최경선, 최우, 황도유 작가 3인전. 자연을 소재로 삶의 생동, 슬픔, 치유를 화폭에 담는 최경선 작가. 마음의 유영을 표현한 작품들. 고요한 수면, 야트막하게 핀 꽃, 흔들리는 풀숲을 통해 생명의 언어를 표현.',
      source: 'Kiaf SEOUL',
    },
    {
      url: 'https://kiaf.org/insights/46664',
      title: '소리쟁이들 - 최경선 개인전',
      description:
        '히든엠갤러리 개인전 (2024.11.07-12.05). 삶에 적극적인 반응자들이라는 주제로 풀꽃을 소재로 한 20여점 신작. 소리쟁이, 달리는 꽃, 엄마의 밭, 노래하는 개망초 시리즈. 광음향 효과를 통한 생명의 찬가.',
      source: 'Kiaf SEOUL',
    },
  ],
  최윤정: [
    {
      url: 'https://www.chosunartgallery.com/%EB%B3%B5%EC%A0%9C-%EC%B0%A8%EC%98%81%EA%B7%9C',
      title: '최윤정 작가 - 조선화랑',
      description:
        'Pop Kids 시리즈. 현대사회에서 미디어와 인간의 욕망에 주목. 안경은 사고의 프레임을 상징하는 장치. 미디어가 만들어낸 이미지와 이슈의 무비판적 수용과 소비에 대한 질문.',
      source: '조선화랑',
    },
    {
      url: 'https://sites.google.com/view/sunwha/11%EA%B8%B0/%EC%B5%9C%EC%9C%A4%EC%A0%95',
      title: '최윤정 작가 프로필 및 전시 이력',
      description:
        '홍익대학교 미술대학 회화과 졸업. Pop Kids, Fantasyland, Moderno 등 다수 개인전. 국립현대미술관 미술은행, 양평군립미술관, 오산미술관 소장. 한국 팝아트 대표 작가.',
      source: '선화동문전',
    },
    {
      url: 'https://inside.ytn.co.kr/news/view.php?page=2&sort=4&id=33',
      title: '욕망, 우리의 눈을 가리다 - 팝 아티스트 최윤정',
      description:
        'YTN INSIDE 인터뷰. 미디어의 포장 능력과 현대인의 욕망. 현재를 이야기하는 작가. 풍자와 희화화를 통한 카타르시스. 가벼워 보이는 색으로 무거운 메시지 전달.',
      source: 'YTN INSIDE',
    },
  ],
  한애규: [
    {
      url: 'https://www.daljin.com/column/18726',
      title: '한애규의 흙으로 빚은 삶에 대한 열망',
      description:
        '서울아트가이드 그외자료. 김의연 평론. 테라코타 작가 한애규의 작품세계. 흙으로 빚은 삶에 대한 열망.',
      source: '서울아트가이드',
    },
    {
      url: 'https://topclass.chosun.com/news/articleView.html?idxno=323',
      title: '나는 여자다. 인류를 잉태하고 기르고, 집을 관장하는 주체적인 존재다',
      description:
        '톱클래스 우리 시대의 미술가. 한국 미술계에서 독보적인 테라코타 작가 한애규. 서울대 미대 응용미술과, 프랑스 앙굴렘 미술학교 졸업. 1980년대 후반부터 여성을 빚어내는 작업. 부조로 된 도자기판에 여성으로서 자신의 삶을 담음.',
      source: '톱클래스',
    },
    {
      url: 'https://kiaf.org/insights/14272',
      title: 'Besides - 한애규 개인전',
      description:
        '아트사이드 갤러리 개인전 (2022.06.17-07.09). 한국의 테라코타 작업을 선두에서 이끈 여성작가. 많은 미술관에 소장. 온전히 흙을 통해 자신만의 작품세계를 구축.',
      source: 'Kiaf SEOUL',
    },
  ],
  강석태: [
    {
      url: 'https://opengallery.co.kr/artist/A0573',
      title: '강석태 작가 프로필 및 인터뷰',
      description:
        '어린 왕자를 주제로 한 작품 활동을 통해 따뜻한 감성과 위로를 전하는 강석태 작가의 작품 세계와 인터뷰.',
      source: '오픈갤러리',
    },
  ],
  민정See: [
    {
      url: 'http://www.ikoreanspirit.com/news/articleView.html?idxno=72274',
      title: '차가운 현실을 비추는 일상의 따뜻한 빛, 민정See 작가 개인전《빛 이후 표상》',
      description:
        '서초문화재단 서리풀 휴(갤러리)에서 열린 민정See 작가의 개인전 소개. 빛이 일상 공간에 침투하여 새로운 기억을 불러일으키는 순간들을 기록한다.',
      source: 'K스피릿',
    },
  ],
  송광연: [
    {
      url: 'http://www.gnnews.co.kr/news/search.html?q=%EC%86%A1%EA%B4%91%EC%97%B0',
      title: "K-팝아트 송광연展 '나비의 꿈'",
      description:
        '전통 민화의 모란 문양과 팝아트를 결합하여 인간의 꿈과 행복을 표현하는 송광연 작가의 전시 관련 기사 모음.',
      source: '경남일보',
    },
  ],
  안소현: [
    {
      url: 'https://galleryunplugged.com/artist/AHN-So-Hyun',
      title: 'Artist Profile & Introduction: Ahn So-hyun',
      description: '일상의 휴식과 안온함을 그리는 안소현 작가의 작품 세계와 주요 전시 이력 소개.',
      source: 'Gallery Unplugged',
    },
  ],
  안은경: [
    {
      url: 'http://www.iusm.co.kr/news/search.html?q=%EC%95%88%EC%9D%80%EA%B2%BD',
      title: '안은경 개인전 "반추_反芻_Rumination" 관련 기사',
      description:
        '여행 가방을 매개로 삶의 고통과 불안, 그리고 치유를 이야기하는 안은경 작가의 전시 및 활동 소식.',
      source: '울산매일',
    },
  ],
  윤겸: [
    {
      url: 'http://www.kmisul.com/news/search.html?q=%EC%9C%A4%EA%B2%B8',
      title: '윤겸 작가 "반복 그리고 몰입" 인터뷰',
      description:
        '불안정한 심리와 시각을 극복하기 위해 선을 긋고 지우는 반복적인 행위를 통해 요새를 쌓는 윤겸 작가의 작업 세계 인터뷰.',
      source: '한국미술신문',
    },
  ],
  예미킴: [
    {
      url: 'http://www.headlinejeju.co.kr/news/search.html?q=%EC%98%88%EB%AF%B8%ED%82%B4',
      title: "예미킴 작가 개인전 '불멸' 및 작품 활동",
      description:
        'AI 기술을 활용하여 가상과 현실의 경계를 탐구하고 불멸에 대한 질문을 던지는 예미킴 작가의 전시 및 작품 소개.',
      source: '헤드라인제주',
    },
  ],
  오아: [
    {
      url: 'http://www.hobancf.or.kr/art/h_eaa_2023.do',
      title: '2023 H-EAA 선정작가: 오아',
      description:
        '호반문화재단이 선정한 청년 작가 오아의 작품 세계와 인터뷰 영상. 인물의 표정과 몸짓을 통해 현대인의 심리를 표현한다.',
      source: '호반문화재단',
    },
  ],
  오윤: [
    {
      url: 'http://www.artinculture.kr/online/1012',
      title: '오윤 30주기 회고전: 시대의 아픔을 칼끝으로 새기다',
      description:
        '민중미술의 대표 작가 오윤의 30주기를 맞아 가나아트센터에서 열린 대규모 회고전과 그의 예술 세계 조명.',
      source: 'Art in Culture',
    },
  ],
  양운철: [
    {
      url: 'http://www.namdonews.com/news/search.html?q=%EC%96%91%EC%9A%B4%EC%B2%A0',
      title: '양운철 개인전 "구름, 그대로" 관련 기사',
      description:
        '존재의 근원을 찾아가는 과정을 회화와 설치 미술로 표현한 양운철 작가의 개인전 및 작품 활동 소개.',
      source: '남도일보',
    },
  ],
  양순열: [
    {
      url: 'http://www.yeongnam.com/mnews/newsview.do?mode=newsView&newskey=20210503.010140733470001',
      title: "양순열 작가, 경북도청서 '대모신-오뚝이' 展",
      description:
        '어머니의 사랑과 생명력을 상징하는 오뚝이 조각으로 치유와 희망을 전하는 양순열 작가의 전시 소식.',
      source: '영남일보',
    },
  ],
};

/**
 * 작가명으로 관련 기사 가져오기
 */
export function getArticlesByArtist(artistName: string): Article[] {
  return artistArticles[artistName] || [];
}
