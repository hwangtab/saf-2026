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
  강레아: [
    {
      url: 'https://www.hani.co.kr/arti/culture/music/989903.html',
      title: '“암벽 비탈에 버틴 소나무에서 ‘경지에 오른 사람’ 봤죠”',
      description:
        '한국 최초의 여성 클라이밍 사진작가 강레아(53)씨의 개인전 ‘소나무-바위에 깃들다’. 암벽과 소나무를 통해 인간의 의지와 자연의 생명력을 포착한 작품 세계 소개.',
      source: '한겨레',
    },
    {
      url: 'https://www.joongang.co.kr/article/23639736',
      title: '빙벽에 24시간 매달렸다···죽음 문턱서 찍은 인간의 한계',
      description:
        '국내 유일 여성 암벽 사진작가 강레아 인터뷰. 2000년부터 시작된 극한의 촬영 현장과 클라이머들의 찰나를 담아내는 작업 철학. 죽음의 문턱에서 배운 삶에 대한 겸손함.',
      source: '중앙일보',
    },
    {
      url: 'https://www.hankyung.com/article/2021040834771',
      title: '연약해도 쓰러지지 않는 소나무…그분들을 찍기 위해 난, 산으로 간다',
      description:
        '강레아 작가가 담아낸 바위 틈 소나무의 생명력. 흙 한 줌 없는 암벽에서 뿌리 내린 소나무를 위인처럼 섬기며 촬영한 ‘소나무-바위에 깃들다’ 전시 이야기.',
      source: '한국경제',
    },
    {
      url: 'https://www.hanion.co.kr/news/articleView.html?idxno=22638',
      title: '여성 암벽등반 사진작가 강레아 개인전',
      description:
        '한겨레:온에 소개된 강레아 작가의 개인전 ‘소나무-바위에 깃들다’ 리뷰. 암벽 위 소나무를 의인화하여 생명의 경이로움과 자연의 숭고함을 표현한 작품들.',
      source: '한겨레:온',
    },
    {
      url: 'https://www.routefinders.co.kr/news/articleView.html?idxno=2486',
      title: '강레아 산사진 작가, 프랑스 그레노블에서 전시회를 열다',
      description:
        '프랑스 알프스 중심도시 그레노블에서 열린 강레아 작가의 초대전 ‘설악, 한국의 에크랭’. 한국의 산과 소나무를 유럽에 알리며 산악 문화 교류의 가교 역할.',
      source: '루트파인더스',
    },
    {
      url: 'https://www.joongang.co.kr/article/24026915',
      title: '모질게 살아남은 바위 틈 소나무…절벽서 40m 오르락내리락 찍었다',
      description:
        '7번째 개인전 ‘산(山)에 들다’를 연 강레아 작가. 절벽을 오르내리며 촬영한 흑백의 소나무 사진들. 척박한 환경을 이겨낸 소나무를 통해 전하는 위로와 희망의 메시지.',
      source: '중앙일보',
    },
  ],
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
  김규학: [
    {
      url: 'https://artgg.ggcf.kr/pastArtists/%EA%B9%80%EA%B7%9C%ED%95%99',
      title: '김규학 작가 - 아트경기',
      description:
        '경기미술품활성화사업 아트경기 소속 작가 김규학의 전시 이력 및 주요 작품 소장처 정보. 국립현대미술관, 인천미술은행 등 주요 기관 소장 작가.',
      source: '아트경기',
    },
    {
      url: 'https://kmjart.com/untitled-15',
      title: '김규학 작가 초대전 | KMJ ART GALLERY',
      description:
        '인천 KMJ아트갤러리에서 열린 김규학 작가의 전시 소식. 시골 풍경과 숲길, 고향의 기억을 세밀한 회화로 담아내는 작가의 작품들 전시.',
      source: 'KMJ ART GALLERY',
    },
    {
      url: 'https://www.incheonin.com/news/articleView.html?idxno=96055',
      title: '김규학 작가, 풍경과 기억에 관한 회화 세계',
      description:
        '인천in 보도. 한적한 시골 풍경과 어린 시절의 고향 기억을 적막하면서도 따뜻한 시선으로 그려내는 김규학 작가의 회화 작업 소개.',
      source: '인천in',
    },
    {
      url: 'https://asyaaf.chosun.com/artistroom/?artist_idx=2263',
      title: '김규학 작가 - 아시아프',
      description:
        '2021 아시아프(ASYAAF) 참여 작가 김규학의 작가룸. 도시의 풍경을 독특한 시각으로 재해석한 작품들을 전시.',
      source: '조선일보(아시아프)',
    },
  ],
  김남진: [
    {
      url: 'https://www.hani.co.kr/arti/culture/music/870136.html',
      title: '김남진 사진전…대자연에 인간 몸짓 합치다',
      description:
        '한겨레 기사. 미국 서부 사막과 협곡의 광막한 풍경 속에 인간의 몸짓을 합쳐낸 김남진 작가의 신작 사진전 소개.',
      source: '한겨레',
    },
    {
      url: 'https://www.artkoreatv.com/news/articleView.html?idxno=12554',
      title: '사진작가 김남진 ‘이태원의 밤’ 출판기념회',
      description:
        '아트코리아방송 보도. 1980년대 이태원의 밤 풍경을 담은 사진집 ‘이태원의 밤’ 발간 및 출판기념회 현장 소식.',
      source: '아트코리아방송',
    },
    {
      url: 'https://anderssonbell.com/collaboration/kimnamjin.html?srsltid=AfmBOop6yd5W-iCqKno03cXfPVt2Bs29tAZU1ORkshQFXJH956PJHMrr',
      title: 'Andersson Bell X Kim Namjin',
      description:
        '패션 브랜드 앤더슨벨과의 협업 프로젝트. 이태원의 밤을 기록한 사진 작업과 앤더슨벨의 감성이 결합된 콜라보레이션 에디션.',
      source: '앤더슨벨(Andersson Bell)',
    },
    {
      url: 'https://visla.kr/article/event/59579/',
      title: '30년 만에 다시 이태원을 찾은 사진가 김남진의 ‘호모나이트쿠스’',
      description:
        'VISLA 매거진 인터뷰. 80년대 이태원을 기록했던 작가가 30년 만에 다시 포착한 서울의 밤과 변화된 이태원의 풍경.',
      source: 'VISLA Magazine',
    },
    {
      url: 'https://www.khan.co.kr/article/201803052125025',
      title: '서슬 퍼런 칼처럼 내민 ‘이것이 사진가다’',
      description:
        '경향신문 기사. 갤러리 브레송 관장이자 사진가로서 고독하게 자신만의 길을 걷는 김남진 작가의 예술 철학 탐구.',
      source: '경향신문',
    },
    {
      url: 'http://www.kunews.ac.kr/news/articleView.html?idxno=24980',
      title: '“갤러리는 인생을 즐기는 사진가들의 놀이터”',
      description:
        '고대신문 인터뷰. 사진가들을 위한 놀이터인 갤러리 브레송을 운영하는 김남진 작가의 인생과 예술적 도전에 관한 이야기.',
      source: '고대신문',
    },
  ],
  김동석: [
    {
      url: 'https://www.sac.or.kr/site/main/show/show_view?SN=38473',
      title: '김동석 개인전 ‘석과불식(碩果不食)’',
      description:
        '예술의전당 한가람미술관 전시 정보. 씨앗을 소재로 생명의 본질과 공존의 가치를 탐구하며, ‘희망’이라는 메시지를 조형화한 김동석 작가의 개인전.',
      source: '예술의전당',
    },
    {
      url: 'https://www.morningsunday.com/sub_read.html?uid=18584',
      title: '김동석 작가, 삶의 길을 담아내는 회화 세계',
      description:
        '모닝선데이 보도. 씨앗과 나뭇잎 등 자연의 오브제를 통해 삶의 궤적과 생명력을 표현하는 김동석 작가의 독창적인 예술 세계 조명.',
      source: '모닝선데이',
    },
    {
      url: 'https://www.artworldnews.co.kr/news/articleView.html?idxno=3870',
      title: '김동석 展 - 우공이산의 꿈, 초월적 조형의 미학',
      description:
        '아트월드뉴스 전시 리뷰. 수만 개의 씨앗 오브제를 캔버스에 붙이는 고된 작업을 통해 탄생한 김동석 작가의 숭고한 조형미와 철학적 사유.',
      source: '아트월드뉴스',
    },
    {
      url: 'https://www.youtube.com/watch?v=3rcAzwp7NIA',
      title: "서양화가 김동석 개인전, '길...어디에도 있었다'",
      description:
        'YTN 뉴스 인터뷰 영상. 20년 넘게 씨앗과 나뭇잎을 소재로 생명과 길을 그려온 김동석 작가의 전시 현장과 인터뷰.',
      source: 'YouTube(YTN)',
    },
    {
      url: 'https://www.artkoreatv.com/news/articleView.html?idxno=100050',
      title: "인사아트프라자갤러리-김동석 개인전 '점으로 부터의 성찰과 사유'",
      description:
        '인사동 인사아트프라자갤러리 전시. 30여 년간의 작업 세계를 정리하며 시대적 변화와 내면의 사유를 점을 통해 조형화한 김동석 작가의 개인전.',
      source: '아트코리아방송',
    },
  ],
  김레이시: [
    {
      url: 'https://www.artsnculture.com/news/articleView.html?idxno=6679',
      title: '김레이시 - 화면 위에 쌓인 선과 색의 층위',
      description:
        '아츠앤컬쳐 기사. 화면 안팎으로 연장되는 선들과 색채의 층을 통해 존재의 순간들을 기록하는 김레이시 작가의 추상 작업 세계 소개.',
      source: '아츠앤컬쳐',
    },
    {
      url: 'https://cicamuseum.com/lacey-kim-solo-exhibition/',
      title: 'Lacey Kim Solo Exhibition: Before Mind',
      description:
        'CICA 미술관 전시 정보. 선과 색의 조합을 통해 찰나의 경험과 내면의 진실을 캔버스 위에 펼쳐 보인 김레이시 작가의 개인전.',
      source: 'CICA 미술관',
    },
    {
      url: 'https://www.misulin.co.kr/news/articleView.html?idxno=3728',
      title: '김레이시 개인전: 익명의 시간 (Anonymous Moments)',
      description:
        '미술여행신문 보도. 겹겹이 쌓인 선과 색채의 직관적인 제스처를 통해 자유로운 존재로서의 자신을 표현하는 김레이시 작가의 신작 전시 소식.',
      source: '미술여행신문',
    },
    {
      url: 'https://www.artbava.com/exhibits/%EA%B9%80%EB%A0%88%EC%9D%B4%EC%8B%9C-%EA%B7%B8-%EC%96%B4%EB%96%A4-%EB%A7%90%EB%B3%B4%EB%8B%A4-_-before-any-words',
      title: '김레이시: 그 어떤 말보다 (Before Any Words)',
      description:
        '아트바바 전시 정보. 갤러리도스에서 열린 김레이시 작가의 개인전. 언어 이전의 순수한 감각과 선의 움직임을 통해 소통하는 작품들.',
      source: '아트바바',
    },
    {
      url: 'https://www.art-culture.co.kr/gallery_week/751',
      title: '김레이시 개인전: This Moment 너와 내가 연결되는 순간',
      description:
        '문화예술신문 기사. ‘순간의 연결’이라는 주제로 캔버스 위에 선과 색을 펼쳐 보이며 존재와 존재 사이의 연결을 탐구하는 전시.',
      source: '문화예술신문',
    },
    {
      url: 'https://www.daljin.com/column/22999',
      title: '김레이시의 예술: 숨 쉬듯 그어낸 순간',
      description:
        '서울아트가이드 이희수 칼럼. 김레이시 작가의 작업 과정을 숨 쉬는 듯한 행위로 분석하며, 작품에 담긴 예술적 진정성과 호흡을 평론.',
      source: '서울아트가이드(달진)',
    },
  ],
  김수오: [
    {
      url: 'https://www.jejunews.com/news/articleView.html?idxno=2214689',
      title: '김수오 사진전 ‘가닿음으로’',
      description:
        '제주일보 보도. 한의사이자 사진가인 김수오 작가가 제주마의 사계절과 생로병사의 서사를 담아낸 첫 번째 사진전 소식.',
      source: '제주일보',
    },
    {
      url: 'https://www.news-art.co.kr/news/article.html?no=27256',
      title: '삶과 죽음을 아우르는 ‘높은 오름’',
      description:
        '뉴스아트 기사. 죽은 자들을 지켜주는 듯한 구좌공설공원묘지 인근 높은 오름의 풍경을 통해 삶과 죽음의 경계를 포착한 사진 작업.',
      source: '뉴스아트',
    },
    {
      url: 'https://www.kdntv.kr/news/articleView.html?idxno=23202',
      title: '아름다운 사람 - 사진작가 김수오',
      description:
        '코리아드림뉴스 인터뷰. 제주의 자연과 말을 묵묵히 기록해온 김수오 작가의 삶과 예술, 그리고 제주에 대한 깊은 애정 어린 이야기.',
      source: '코리아드림뉴스',
    },
    {
      url: 'https://s1.ihalla.com/article.php?aid=1666156431733557036',
      title: '김수오 작가가 사진에 담은 5년여의 기록',
      description:
        '한라일보 기사. 사라져가는 제주의 풍광을 안타까워하며 5년간 오름과 들판을 누비며 기록해온 김수오 작가의 끈기 있는 작업 여정.',
      source: '한라일보',
    },
    {
      url: 'https://www.ohmynews.com/NWS_Web/Series/series_premium_pg.aspx?CNTN_CD=A0003077137',
      title: '한밤중, 들판에서 목격한 제주마의 슬픈 죽음',
      description:
        '오마이뉴스 기사. 밤의 사진가 김수오가 포착한 어둠 속 제주의 평화로운 풍경과 그 안에서 마주한 생명의 숭고한 순간들.',
      source: '오마이뉴스',
    },
  ],
  김우주: [
    {
      url: 'https://www.handmk.com/news/articleView.html?idxno=20600',
      title: '‘한국은행이 선정한 우리 시대의 젊은 작가들’展',
      description:
        '핸드메이커 보도. 한국은행 신진작가 공모전을 통해 선정된 김우주 작가를 포함한 6인의 젊은 작가들의 실험 정신과 개성 넘치는 작품 세계 소개.',
      source: '핸드메이커',
    },
    {
      url: 'https://www.ibulgyo.com/news/articleView.html?idxno=417101',
      title: '신인 작가 6명이 함께 이뤄내는 ‘예술적 도약’',
      description:
        '불교신문 기사. 탑골미술관의 신인 작가 지원 사업인 ‘도약의 단초10’ 전시를 통해 첫 개인전과 예술적 도전을 시작하는 김우주 작가의 소식.',
      source: '불교신문',
    },
    {
      url: 'https://www.youtube.com/watch?v=isF6EJoyuwc',
      title: "[MR Media Lab] 초실감 메타버스 XR 트윈기반 'Space Simulation'",
      description:
        "홍익대학교 AI 뮤지엄 전시 영상. 초실감 메타버스 XR 트윈 기반의 'Space Simulation' 전시 현장과 AI 미디어아트 작품 소개.",
      source: 'YouTube(홍익대)',
    },
  ],
  김주희: [
    {
      url: 'https://www.saf2026.com/artworks/263',
      title: '월정교 - 이미지 오버랩으로 표현한 기억의 순간',
      description:
        '씨앗페 2026 출품작 정보. 경주 월정교를 소재로 시간의 중첩과 기억의 오버랩을 회화적 언어로 풀어낸 김주희 작가의 작품 설명 및 작가 노트.',
      source: '씨앗페 2026',
    },
    {
      url: 'https://www.artsnculture.com/news/articleView.html?idxno=4796',
      title: '김주희 - 그리움과 시간의 중첩을 담다',
      description:
        '아츠앤컬쳐 인터뷰. ‘그리다’라는 행위를 통해 그리운 장소와 찰나의 순간을 겹쳐 그리는 김주희 작가의 예술적 영감과 작업 철학 탐구.',
      source: '아츠앤컬쳐',
    },
    {
      url: 'https://www.artfield.co.kr/blank-8',
      title: '작가 인터뷰 - 김주희 ‘Overlap Korea’',
      description:
        '아트필드 갤러리 인터뷰. 한국의 풍경을 독특한 오버랩 기법으로 재해석한 ‘Overlap Korea’ 시리즈에 담긴 의미와 작가의 작업 과정 소개.',
      source: '아트필드 갤러리',
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
  이열: [
    {
      url: 'https://brunch.co.kr/@6d18ba65f0a04b0/23',
      title: '사진작가 이열 - 느린인간과 나무이야기',
      description:
        '파인 아트 사진 작가 이열의 느린인간 프로젝트. 사진은 카메라 프레임을 통해 실제 존재하는 사물의 일부분을 잘라내어 사진가의 의도와 생각을 담아내는 작업. 나무를 주제로 한 포토에세이.',
      source: 'Brunch',
    },
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
      url: 'https://brunch.co.kr/@todolphin/17',
      title: '이윤엽 판화 - 단순하고 깊은',
      description:
        '진실처럼 단순하고 깊은 이윤엽의 판화. 대추리, 용산, 거제 조선소, 밀양, 구럼비, 4대강, 쌍용차 등 사회적 의제를 현장에서 함께하며 기록. 예술은 자기 얘기를 하는 것, 진실을 보고 싶어 하는 마음.',
      source: 'Brunch',
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
    {
      url: 'https://www.artbank.go.kr/home/art/productDetail.do?artId=190425000031453',
      title: '최경선 작품 - 미술은행 소장',
      description:
        '국립현대미술관 미술은행 소장 최경선 작가 작품. 2016년 서양화 작품. 대여 가능 작품.',
      source: '미술은행',
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
  오윤: [
    {
      url: 'http://www.daljin.com/column/22480',
      title: '오윤 : 민중의 삶을 대변한 판화가',
      description:
        'copyright © 2012 KIM DALJIN ART RESEARCH AND CONSULTING. All Rights reserved 이 페이지는 서울아트가이드에서 제공됩니다. This page provided by Seoul Art Guide. 다음 브라우져 에서 최적화 되어있습니다. This page optimized for these browser...',
      source: '서울아트가이드',
    },
  ],
  박생광: [
    {
      url: 'https://www.yna.co.kr/view/AKR20190617140000005',
      title: "'그대로 박생광'이 넓힌 채색 한국화의 지평",
      description:
        '(서울=연합뉴스) 정아란 기자 = 새빨간 옷을 입은 남자가 긴 원통을 든 채 먼 데를 바라본다. 초록색 구름이며, 발치의 청·록·황색 존재들이 ...',
      source: '연합뉴스',
    },
  ],
  아트만두: [
    {
      url: 'https://www.mediaus.co.kr/news/articleView.html?idxno=239536',
      title: '아트만두가 특별한 의미를 두는 캐리커처는',
      description:
        '[미디어스=이영광 객원기자] 촌철살인의 풍자 캐리커처로 사랑받는 아트만두 작가가 지난 1월 라는 제목의 첫 작품집을 출간했다. 아트만두 작가가 그동안 그린 캐리커처 작품 중 120편을 선별해 맛깔난 글솜씨로 익살스러운 설명을 더했다. 국내 최초 시사 캐리커처 모음집 출간 과정에 대한 이야기를 들어보고자 지난 12일 아트만두 작가와 전화 연결했다. 다음은 아...',
      source: '미디어스',
    },
  ],
  '칡뫼 김구': [
    {
      url: 'https://www.hanion.co.kr/news/articleView.html?idxno=33271',
      title: '시대의 상징이 된 화가 칡뫼김구',
      description:
        "'A painting is a thought'죽은 정물을 모사한 서경적 스케치나 뜻도 모르고 그려놓은 난삽한 풍의 추상화가 주류무대인 한국의 지배적인 화단에서 그 리얼한 화풍으로서의 구체적 현실에 터한 한국 화가로서 차지하는 그의 위치는 각별하다 하지 않을 수 없다.이번 전시회도 그렇다 이땅은 황무지라는 것이고, 그것은 우상의 벌판과도 같다는 것이다.아니,...",
      source: '한겨레:온',
    },
  ],
  '장천 김성태': [
    {
      url: 'https://www.hani.co.kr/arti/culture/music/1210138.html',
      title: '한글창제 원리를 먹붓질로 표현하다',
      description:
        '전통서예를 전공하고 국내 캘리그라피(손글씨예술) 분야의 중견작가로 활동해온 장천 김성태씨가 15세기 조선 세종의 한글(훈민정음) 창제 원리를 먹 이미지로 형상화한 신작들을 선보이고 있다. 28일까지 서울 인사동 거리의 무우수갤러리에서 열리는 김씨의 기획 초대전 ‘나랏말',
      source: '한겨레',
    },
  ],
  고자영: [
    {
      url: 'https://www.aaart.co.kr/news/article.html?no=4469',
      title: "고자영·하이경 작가가 풀어낸 '지극히 사적인' 공간들",
      description:
        '리나갤러리에서 열린 고자영, 하이경 작가의 2인전. 식물에서 시작되어 정원이 되고 식물원이 되는 고자영 작가의 작품 세계 소개. 일상 풍경을 통한 위로와 휴식.',
      source: '다아트',
    },
    {
      url: 'https://www.newsverse.kr/news/articleView.html?idxno=8295',
      title: '아, 어떻게 우리가 이 여름을 기록할 것인가?- 고자영 작가',
      description:
        "심정택 미술 칼럼. 알베르 카뮈의 소설과 연계하여 고자영 작가의 '정원' 시리즈를 비평. 장소의 혼(Genius Loci)이 깃든 작가만의 정원 이미지와 타입폼 분석.",
      source: '뉴스버스',
    },
    {
      url: 'https://www.kgnews.co.kr/news/article.html?no=160965',
      title: '장준석의 작가탐방<42>-고자영의 예술세계',
      description:
        '장준석 미술평론가의 작가 탐방. 신이 주신 자연의 모습을 판화와 그림으로 표현하는 고자영의 조형 세계. 독창적인 작가의 심성과 예술적 기질로 빚어낸 새로운 자연.',
      source: '경기신문',
    },
    {
      url: 'https://www.newscj.com/news/articleView.html?idxno=4622',
      title: '고자영 작가, 자연과 인간이 함께하는 공간 연출',
      description:
        "세오갤러리에서 열린 고자영 개인전 '공중정원 Hanging Gardens in Babylon'. 바빌로니아 공중정원에서 유래한 따뜻한 정원과 식물을 소재로 한 전시.",
      source: '천지일보',
    },
    {
      url: 'https://www.economytalk.kr/news/articleView.html?idxno=147379',
      title: "고단한 현실 속 자연 풍경, 고자영·하이경 '지극히 사적인'展",
      description:
        '이코노미톡뉴스 전시 소개. 일상에 지친 삶 속에서 삶의 쉼표가 되는 자연 풍경. 동양적 산수화와 물속 풍경이 공존하는 고자영 작가의 작품 세계.',
      source: '이코노미톡뉴스',
    },
  ],
  기조: [
    {
      url: 'https://www.idaegu.co.kr/news/articleView.html?idxno=449035',
      title: '기조 개인전 “부정적 기억 꺼내 곱씹는 과정이 제 작업”',
      description:
        '대구신문 인터뷰. 자화상 캐릭터인 ‘반인반수 토끼’를 통해 부정적인 기억과 내면의 갈등을 예술로 승화시키는 기조 작가의 작업 세계 소개.',
      source: '대구신문',
    },
    {
      url: 'https://www.welfarehello.com/community/hometownNews/cdeca101-8605-4fea-a20e-9bb1d0e6738d',
      title: '달성군의 예술가를 찾아서 _ 6편 [ 기조 작가님 ]',
      description:
        '달천예술창작공간 입주 작가 기조 인터뷰. “두 마리의 토끼가 살고 있는 집” 시리즈와 스트레스를 캐릭터로 풀어낸 자화상 이야기.',
      source: '웰로(WelfareHello)',
    },
    {
      url: 'https://www.youtube.com/watch?v=T7fxMK5YQlM',
      title: '[디포레스트] 달천예술창작공간 제3기 입주작가 인터뷰 | 기조(KIJO)',
      description:
        '달성문화재단 제작 영상 인터뷰. 기조 작가의 작업실 풍경과 작품 제작 과정, 예술에 대한 진솔한 이야기를 담은 영상 콘텐츠.',
      source: 'YouTube',
    },
    {
      url: 'https://www.daeguartscenter.or.kr/mobile/content.html?md=0283&vmode=view&seq=56744',
      title: '달천예술창작공간 제3기 입주작가 프리뷰전',
      description:
        '대구문화예술회관 프리뷰 전시 정보. 달천예술창작공간 입주 작가로서 선보인 기조 작가의 초기 작업과 전시 소식.',
      source: '대구문화예술회관',
    },
  ],

  김종환: [
    {
      url: 'https://books.google.com/books/about/%EB%A7%A4%EC%9D%BC_%ED%8C%90%ED%99%94.html?id=JlfLswEACAAJ',
      title: '매일 판화: 처음이어도 괜찮아! - 김종환',
      description:
        '조각가이자 판화가인 김종환의 판화 입문서. 누구나 쉽고 재미있게 판화 작업을 시작할 수 있도록 돕는 실질적인 가이드와 작가의 노하우 수록.',
      source: 'Google Books',
    },
    {
      url: 'http://altspaceloop.com/exhibitions/transforming-episode',
      title: '김종환 개인전: 변신 에피소드 (Transforming Episode)',
      description:
        '대안공간 루프 전시 정보. 인간의 실존적 변신과 정체성 탐구를 조형적 언어로 풀어낸 김종환 작가의 개인전 상세 설명 및 평론.',
      source: '대안공간 루프',
    },
    {
      url: 'https://www.primeherald.co.kr/27090',
      title: '김종환 작가, 예술을 통한 변신과 성찰의 기록',
      description:
        '프라임헤럴드 보도. 독창적인 조형미와 철학적 사유를 통해 현대인의 내면을 포착하는 김종환 작가의 작품 세계와 전시 관련 심층 기사.',
      source: '프라임헤럴드',
    },
  ],
  김지영: [
    {
      url: 'https://topclass.chosun.com/news/articleView.html?idxno=1445',
      title: '자연주의 도예가 김지영 - 자연을 닮은 간결한 그릇',
      description:
        '조선일보 톱클래스 기사. 생활 속 도예를 추구하며 꽃과 풀잎, 나무 등 자연의 소재를 간결한 선과 절제된 색으로 담아내는 김지영 도예가의 작품 세계.',
      source: '조선일보(톱클래스)',
    },
    {
      url: 'http://www.bsnews.kr/news/articleView.html?idxno=78435',
      title: '도예가 김지영 - 흙과 불로 빚은 삶의 층위',
      description:
        '백제신문 보도. 자연과의 교감을 통해 탄생한 도자 작품들과 일상의 소소한 행복을 흙으로 빚어내는 김지영 작가의 예술적 행보 조명.',
      source: '백제신문(BS News)',
    },
    {
      url: 'https://www.ccnnews.co.kr/news/articleView.html?idxno=395149',
      title: '대전문화재단 차세대artiStar 김지영 도예가 개인전 ‘겹’',
      description:
        '충청뉴스 전시 뉴스. 시간과 감정의 축적을 주제로 한 개인전 ‘겹’을 통해 흙의 변화와 생명력을 보여주는 김지영 청년 도예가의 전시 소식.',
      source: '충청뉴스(CCN News)',
    },
  ],
  라인석: [
    {
      url: 'https://www.news-art.co.kr/news/article.html?no=26326',
      title: '라인석 작가',
      description:
        '예술인의 권익 보호 및 향상, 당사자인 예술인의 목소리를 대변, 문화예술정책에 영향력',
      source: '뉴스아트',
    },
  ],
  민병산: [
    {
      url: 'https://www.cbinews.co.kr/news/articleView.html?idxno=124291',
      title: '고 민병산 서예 대작 발견 김호일 전 총장 경매로 입수',
      description:
        "'거리의 철학자' '한국의 디오게네스'로 불렸는 청주 출신 고 민병산 선생(1928∼1988, 본명 민병익)의 본격 서예 작품이 경매를 통해 공개돼 화제가 되고 있다. 작품은 고인이 1984년 쓴 소식의 '적벽부'로 가로 138m + 세로 24cm의 족자로 특유의 흘림체(가칭 호롱불체)로 완성했다. 그동안 유품으로 나온 고인의 서예 작품 가운데 대작으로 분...",
      source: '충북인뉴스',
    },
  ],
  서금앵: [
    {
      url: 'http://www.daljin.com/display/D102264',
      title: '전시 - 서금앵展',
      description:
        'copyright © 2012 KIM DALJIN ART RESEARCH AND CONSULTING. All Rights reserved 이 페이지는 서울아트가이드에서 제공됩니다. This page provided by Seoul Art Guide. 다음 브라우져 에서 최적화 되어있습니다. This page optimized for these browser...',
      source: '서울아트가이드',
    },
  ],
  김호성: [
    {
      url: 'https://www.photoart.co.kr/bbs/m/mcb_data_view.php?type=mcb&ep=ep1260394525d70b6363602a&gp=all&item=md404406056648efb1e6de05',
      title: '김호성 《blur》 Gallery Vista (서울) | 6. 15 ~ 7. 10',
      description:
        'Google Earth 프로그램을 통해 캡처한 이미지로 사진의 현장성에 대한 본질적 관념을 비틀고 가상 세계를 사진 작품으로 표현한 김호성 작가의 개인전 소식.',
      source: 'photoart.co.kr',
    },
    {
      url: 'https://blog.naver.com/saeki_pnc/223813119637?trackingCode=rss',
      title: '김호성 작가 인터뷰 - 세기피앤씨 S매거진',
      description:
        '세기피앤씨 S매거진에서 진행한 극사실주의 화가 김호성 작가와의 인터뷰. 초기작부터 최근 작품까지 아우르며 외형과 진실의 경계를 탐구하는 작가의 예술 세계 소개.',
      source: '세기피앤씨(S매거진)',
    },
  ],
  강석태: [
    {
      url: 'https://urbanbreak.com/kang-seoktae/',
      title: 'KANG SEOKTAE – 어반브레이크',
      description:
        '어린 왕자에서 영감을 받아 ‘별소년’을 모티브로 작업하는 강석태 작가. 어반브레이크에서 소개하는 작가의 작품 세계와 비전.',
      source: '어반브레이크',
    },
    {
      url: 'https://www.arthara.com/Artist/view/1749655',
      title: '강석태 작가 - 아트하라',
      description:
        '아트하라 플랫폼에 소개된 강석태 작가의 포트폴리오. "별이 가득한 오후에" 등 장지에 먹과 채색으로 표현한 동양화 작품 감상.',
      source: '아트하라',
    },
    {
      url: 'https://www.daljin.com/column/17914',
      title: '단짝, 어린왕자 강석태X어린어른 이흥재',
      description:
        '서울아트가이드 칼럼. 정영숙 문화예술학 박사가 쓴 에세이집 <삶이 계절이라면 가을쯤 왔습니다> 리뷰. 이흥재 교수의 글과 강석태 작가의 그림이 어우러진 책.',
      source: '서울아트가이드',
    },
    {
      url: 'https://segyelocalnews.com/article/1065592327225698',
      title: '강석태 작가 “따뜻한 감성 전하고파”',
      description:
        '세계로컬타임즈 인터뷰. 어린 왕자를 통해 순수한 동심과 위로를 전하는 강석태 작가의 예술 철학. 잃어버린 감성을 되찾아주는 치유의 그림.',
      source: '세계로컬타임즈',
    },
    {
      url: 'http://www.a-bunker.com/exhibition/?bmode=view&idx=54321605',
      title: '강석태 - 어린왕자에게 말을 걸다',
      description:
        '에이벙커(A-Bunker)에서 열린 강석태 개인전 << 어린왕자에게 말을 걸다 >> 전시 정보. 순수함을 찾아 떠나는 어린 왕자와의 대화.',
      source: '에이벙커',
    },
    {
      url: 'https://www.artkoreatv.com/news/articleView.html?idxno=59112',
      title: '강석태 개인전 ‘내 안의 소년에게’',
      description:
        '아트코리아방송 전시 뉴스. 갤러리그림손에서 열린 강석태 개인전. 2002년부터 시작된 어린 왕자 시리즈와 내면의 소년에게 보내는 그림 편지.',
      source: '아트코리아방송',
    },
    {
      url: 'https://www.shinsegae.com/culture/gallery/exhibition/view.do?glrySeq=409&pg=8&pgSz=9',
      title: '한불수교 130주년 기념 강석태-<어린왕자>展',
      description:
        '신세계갤러리 전시 아카이브. 생텍쥐페리의 어린 왕자를 한국적 감수성과 재료로 재해석한 강석태 작가의 특별전.',
      source: '신세계갤러리',
    },
  ],
  김영서: [],

  리호: [
    {
      url: 'http://www.daljin.com/display/D089952',
      title: '스며들다展',
      description:
        'copyright © 2012 KIM DALJIN ART RESEARCH AND CONSULTING. All Rights reserved 이 페이지는 서울아트가이드에서 제공됩니다. This page provided by Seoul Art Guide. 다음 브라우져 에서 최적화 되어있습니다. This page optimized for these browser...',
      source: '서울아트가이드',
    },
  ],
  민정See: [
    {
      url: 'https://www.marieclairekorea.com/culture/2025/04/galleriesartfair-minjungsee/',
      title: '2025 화랑미술제 특별전 선정 작가 인터뷰 #민정See',
      description:
        '국내 최장수 아트페어인 화랑미술제가 4월 16일부터 20일까지 5일간 서울 코엑스 A&B홀에서 열립니다. 역대 최대 규모로, 168개의 유수 갤러리와 함께 엄선된 작품을 선보일 예정인데요. 그중 신진 작가 특별전 에 참여하는 10인의 작가와 함께한 인터뷰를 공개합니다.',
      source: '마리끌레르',
    },
  ],
  박성완: [
    {
      url: 'http://www.gwangjuart.com/bbs/board.php?bo_table=artist01&wr_id=111',
      title: '박성완 > 우리시대의작가들/회화',
      description: '남도아트, 광주미술, 광주작가, 남도미술의 역사, 남도미술소식',
      source: '광주미술문화연구소',
    },
  ],
  변경희: [],
  조이락: [
    {
      url: 'https://www.youtube.com/watch?v=8kz3o7V-89E',
      title: '[BTN뉴스] 현대적 감수성으로 재탄생한 고려불화',
      description:
        '〔앵커〕고려불화를 현대적인 감수성으로 재해석하고 있는 조이락 작가가 2년 만에 개인전을 열었습니다. 그동안 어머니를 여읜 조 작가는 아미타내영도를 통해 연꽃으로 극락정토에 왕생한 어머니를 재구성했습니다. 작품을 따라가다 보면 화창한 봄날 만물에 깃든 부처님을 만나볼 수 있습니다. ...',
      source: 'BTN뉴스(YouTube)`',
    },
  ],
  박불똥: [
    {
      url: 'https://www.hani.co.kr/arti/culture/culture_general/834561.html',
      title: '민예총 이사장에 박불똥 작가',
      description:
        '한국민족예술단체총연합(한국민예총) 신임 이사장에 민중미술 작가인 박불똥(62)씨가 선임됐다. 한국민예총은 지난달 28일 정기총회를 열고 이사장에 박불똥, 부이사장에 미술평론가 강성원씨를 선출했다고 4일 밝혔다. 올해 설립 30돌을 맞은 한국민예총은 이날 결의문을 발표하',
      source: '한겨레',
    },
  ],
  박지혜: [
    {
      url: 'https://homa.hongik.ac.kr/homa/0301.do?mode=view&articleNo=120639&title=%EC%8B%9C%EA%B0%81%EC%A0%81+%EB%8C%80%ED%99%94+Visual+Dialogues+%3A+between+Form+and+Essence',
      title: '현대미술관 시각적 대화 Visual Dialogues',
      description: 'COPYRIGHT © HONGIK UNIVERSITY. ALL RIGHTS RESERVED.',
      source: '홍익대학교 현대미술관',
    },
  ],
  백금아: [
    {
      url: 'https://www.jejusori.net/news/articleView.html?idxno=333400',
      title: '제주만화작가회, 17일부터 창립 20주년 특별전',
      description:
        '제주만화작가회(회장 백금아)는 17일부터 30일까지 설문대여성문화센터 전시장에서 ‘창립 20주년 특별전’을 개최한다.이번 전시는 제주만화작가회의 지난 20년 역사를 기념하는 자리다. 제주만화작가회는 ‘황우럭’으로 알려진 故 양병윤 화백을 중심으로 2000년 결성한 ‘제주만화사랑회’가 전신이다. 2002년부터 현재 명칭으로 바꿨다. 그동안 다양한 전시와 함께...',
      source: '제주의소리',
    },
  ],
  송광연: [
    {
      url: 'https://www.ksilbo.co.kr/news/articleView.html?idxno=636108',
      title: "색색의 실로 수놓아 이은 '나비의 꿈'",
      description:
        '서양화가 송광연씨의 개인전이 세민S병원갤러리에서 16일 시작된다. 전시는 23일까지.송광연 작가는 영남대에서 서양화를 전공했고 총 9회의 개인전을 치렀고, 스페인·중국·미국 등 해외전을 비롯해 60여회의 아트페어와 단체전에 참여했다.이번 전시는 ‘나비의 꿈’이라는 주제...',
      source: '경상일보',
    },
  ],
  신건우: [
    {
      url: 'https://hksisaeconomy.com/mobile/article.html?no=622602',
      title: "달천예술창작공간 결과 보고전, 신건우 작가의 '진부한 것이 새로운 것이다'",
      description:
        '한국시사경제, 정치, 경제, 사회, 문화, 스포츠, 연예, 라이프, 글로벌브랜드대상, 해외언론보도 등 실시간 뉴스 제공',
      source: '한국시사경제',
    },
  ],
  신연진: [
    {
      url: 'https://keeptiq.com/all/?idx=816',
      title: '신연진, Oriental Painting Series - Landscape',
      description: '나만의 작은 그림 가게 - 1:1 그림 매칭 서비스, 소장의 경험을 더욱 특별하게',
      source: '킵티크',
    },
  ],
  신예리: [
    {
      url: 'https://www.knaart.com/1175',
      title: '2022년 대한민국 국가 미술 특별초대전. 신예리 작가, 초대작가로 선정',
      description:
        '한류문화원, (사)한국언론사협회와 한류미술협회에서 주최하고 대한민국 국가미술특별초대전 운영위원회와 K스타저널',
      source: '대한민국 국가미술원',
    },
  ],
  안은경: [
    {
      url: 'https://www.ksilbo.co.kr/news/articleView.html?idxno=1012755',
      title: '되돌아본 삶의 고통과 불안 가방에 담다',
      description:
        '여행가방을 소재로 의미를 담아 작업하는 안은경 작가의 18번째 개인전 ‘반추_反芻_Rumination’가 이달 3일부터 9일까지 중구 옥교동에 위치한 가기갤러리에서 열리고 있다. 안 작가는 삶을 살아감에 있어 누구에게나 존재하는 고통과 불안감을 주제로 한 작품 40여점을 선보이고 있다. 안 작가는 반추(어떤 일을 되풀이해 음미하거나 생각함)에서 오는 감정을...',
      source: '경상일보',
    },
  ],

  박소형: [
    {
      url: 'https://louisethewomen.org/news/?bmode=view&idx=167794323',
      title: '그린레시피랩 [한국 생태미술의 역사와 현재]',
      description:
        '🌴 루이즈더우먼의 프로젝트, #그린레시피랩(@green_recipe_lab)의 #워크랩 (Work-lab)소식을 공유합니다! 🧭《한국 생태미술의 역사와 현재》그린레시피랩 × #박윤조 미술사학자 그린레시피랩 생태미술 스터디 작가들과 박윤조 미술학자와 함께 생태미술의 현재와 한국 생태미술에 변화 과정을 논의하고 사례를 살펴봤습니다. ▪️일시: (1회차) 9...',
      source: '루이즈더우먼',
    },
  ],
  양운철: [
    {
      url: 'https://www.art-culture.co.kr/magazine_art_ca/1036',
      title: "양운철 개인전 <'c; stand up for yourself, ㅁ'>",
      description:
        '아트앤컬처- 문화예술신문 - 전시, 공연 문화·예술·교육소식 및 공모, 행사 정보제공 .',
      source: '아트앤컬처',
    },
  ],
  예미킴: [
    {
      url: 'https://www.handmk.com/news/articleView.html?idxno=15749',
      title: '빛의 벙커, 봄 풍경 포토타임 이벤트 진행',
      description:
        "[핸드메이커 곽혜인 기자] 복합문화예술공간 '빛의 벙커'가 청년 예술가와 협업하여 봄 콘셉트의 포토타임을 위한 새로운 인터미션 콘텐츠를 공개했다.제주 성산에 위치한 ‘빛의 벙커’는 청년 예술가 예미킴과 협업하여 새로운 포토타임 콘텐츠를 기획하고 제작함으로써 창작 예술 활동 기회 확대와 문화 교류의 장을 마련했다. 이번에 선보이는 포토타임 콘텐츠는 여행지, ...",
      source: '핸드메이커',
    },
  ],
  오아: [
    {
      url: 'https://asyaaf.chosun.com/artistroom/?artist_idx=3897',
      title: '오아(김성은)작가 - 아시아프',
      description: '아시아프',
      source: '조선일보(아시아프)`',
    },
  ],
  윤겸: [
    {
      url: 'https://misul.in/104/?idx=167904984&bmode=view',
      title: '윤겸.이유지 2인전 `<Exploring Life>`',
      description:
        '안녕하세요 이유지작가입니다:) 윤겸작가와 함께 성수동에 위치한 GG2 Gallery에서 2인전 하게 되었습니다🙏🏻 각자의 다른 방식으로 안식처와 삶의 불안정성을 마주하고 탐구하며, 반복과 몰입, 수행과도 같은 작품을 통해 다듬고 전환하는 회화적 탐험가들의 이야기를 준비했습니다. 많은 관심 부탁드립니다🩵윤겸.이유지 2인전 <Exploring Life>�...',
      source: '미술인',
    },
  ],
  이유지: [],
  이광수: [
    {
      url: 'https://m.blog.naver.com/foto3570/220255907243',
      title: '『사진 인문학』 집필 출간한 사진비평가 이광수와의 인터뷰',
      description:
        '사진 인문학 철학이 사랑한 사진 그리고 우리 시대의 사진가들 이광수 지음 372쪽｜18,000원 ｜신국판｜반...',
      source: '네이버 블로그(사진바다)`',
    },
  ],
  이은화: [
    {
      url: 'https://www.abcn.kr/news/articleView.html?idxno=74796',
      title: "이은화의 행복한 '북유럽 미술관 여행'",
      description:
        '[ABC뉴스=강현 기자] ‘북유럽’ 하면 떠오르는 단어는 단연 ‘행복’이다. 유엔 산하 자문기구의 발표에 따르면 2023년 세계에서 가장 행복한 나라는 핀란드로, 벌써 6년 연속 1위다. 덴마크는 5년 연속 2위, 스웨덴과 노르웨이도 각각 6위와 7위를 차지했다.우리는 북유럽 사람들이 행복한 이유를 그들의 복지나 휘게 등의 라이프스타일에서 찾아왔다. 그런데...',
      source: 'ABC뉴스',
    },
  ],
  이인철: [
    {
      url: 'https://www.francezone.com/news/articleView.html?idxno=2500525',
      title: '[파리에서만난사람] 이인철 &#34;디지털 아트로 부활한 민중미술 작가&#34;',
      description:
        '파리 마레지구의 디지털 아트 갤러리 ‘아트버스(ArtVerse)’에서 한국 민중미술의 대표 작가 이인철의 첫 디지털 개인전 『HOLOÏSME : 보이지 않는 것으',
      source: '프랑스존',
    },
  ],
  이재정: [
    {
      url: 'https://www.focus1.kr/news/articleView.html?idxno=72221',
      title: '제주신화전 20주년…&#34;인문학적 예술 방안 모색&#34;',
      description:
        "(포커스1=이재정 기자) 올해로 20주년을 맞은 제주신화전에 관객들의 발길이 이어지면서 미래 비전을 위한 '인문학적 예술 방안' 모색까지 이어질지 관심이 집중되고",
      source: 'Focus1',
    },
  ],
  이지은: [
    {
      url: 'https://www.artspaceat.com/category/all-products',
      title: "'Hollowed Colors' 이지은 작가",
      description:
        '카테고리 설명을 입력하는 공간입니다. 카테고리 소개 및 방문자와의 소통으로 제품에 대한 흥미를 유도해보세요.',
      source: 'Artspaceat',
    },
  ],
  이현정: [
    {
      url: 'https://cicamuseum.com/lee-hyunjeong-solo-exhibition/',
      title: 'LEE HYEONJEONG Solo Exhibition: 김치\_숨',
      description:
        '이현정 개인전 3-A Gallery, CICA Museum March 30 – April 3, 2022 2022.03.30 – 04.03',
      source: 'CICA Museum',
    },
  ],
  이호철: [
    {
      url: 'https://m.blog.naver.com/PostView.naver?blogId=gurimdotcom_official&logNo=222598017920',
      title: "닫힘과 열림의 경계, 이호철 작가님의 '달항아리'",
      description:
        '닫힘과 열림의 경계에 있는 하나의 달항아리 안녕하세요, 그림닷컴 입니다. 예로부터 넉넉하고 아름다운 모...',
      source: '그림닷컴(네이버 블로그)`',
    },
  ],
  이홍원: [
    {
      url: 'https://www.news-art.co.kr/news/article.html?no=26476',
      title: '이홍원 작가 - 뉴스아트',
      description:
        '예술인의 권익 보호 및 향상, 당사자인 예술인의 목소리를 대변, 문화예술정책에 영향력',
      source: '뉴스아트',
    },
  ],
  장경호: [
    {
      url: 'https://www.news-art.co.kr/news/article.html?no=26477',
      title: '장경호 작가 - 뉴스아트',
      description:
        '예술인의 권익 보호 및 향상, 당사자인 예술인의 목소리를 대변, 문화예술정책에 영향력',
      source: '뉴스아트',
    },
  ],
  정금희: [
    {
      url: 'https://art-map.co.kr/exhibition/view.php?idx=25435',
      title: '정금희 : 동해선-역사(驛舍), 역사(歷史)',
      description:
        '미술관을 배달받다 데이터 분석기반 전시회 인바이트 서비스, 나만의 취향을 배달받아 보세요',
      source: '아트맵',
    },
  ],
  정서온: [
    {
      url: 'https://deart82.com/artist/421',
      title: '정서온 - De Art82',
      description: '미술품 아카이빙, 작가소개, 기가픽셀, 미술이벤트',
      source: '디아트82',
    },
  ],
  정연수: [
    {
      url: 'https://www.lullu.net/43834',
      title: "정연수 개인전 'Im'pression', 갤러리 도스 기획",
      description: "정연수 개인전 'Im’pression', 갤러리 도스 기획-문화예술의전당",
      source: '문화예술의전당',
    },
  ],
  조신욱: [
    {
      url: 'https://www.newsis.com/view/NISX20201111_0001230067',
      title: '[2020마니프-뉴시스 온라인 아트페어]조신욱 작가',
      description:
        "뉴시스 국내 언론 최초 미술품 유통 채널 '케이 아트파크(kartpark.net)' 론칭 마니프조직위원회와 손잡고 작가 지원 유통망 확장 30대~ 80대 작가 130명 참여 '온라인 군집 개인전' 한국화 서양화등 회화 판화 입체등 1000여점 한자리 24시간 언제 어디서든 전시 감상부터 구매 결제 가능",
      source: '뉴시스',
    },
  ],
  최재란: [
    {
      url: 'https://m.blog.naver.com/foto3570/222086999040',
      title: '최재란 개인전 : 화성(華城), 묵시의 풍경',
      description:
        '최재란 개인전 화성(華城), 묵시의 풍경 장소 : 복합문화공간 행궁재 갤러리 (수원시 팔달구 행궁로 22번길...',
      source: '사진바다(네이버 블로그)`',
    },
  ],
  최혜수: [
    {
      url: 'https://www.choihyesu.com/',
      title: '최혜수 작가 포트폴리오',
      description:
        'Artist statement Recovering Deposited Time and Meaning My practice begins with prolonged observation of objects that have been pushed out of the urban ecosystem or have lost their function. Everyday i...',
      source: '작가 웹사이트',
    },
  ],
  홍진희: [
    {
      url: 'https://www.yongin21.co.kr/news/articleView.html?idxno=83279',
      title: '숲과 더불어 사는 삶 화폭에…홍진희 개인전',
      description:
        '홍진희 작가가 자연과 인간의 공존을 주제로 한 개인전 ‘더불어 숲’을 11월 13일까지 수지구 죽전동 갤러리 오르에서 연다.용인특례시 문화예술사업 공모 작가로 선정된 홍 작가는 이번 전시를 통해 기후 위기 시대 숲의 중요성과 자연과 더불어 사는 삶의 가치를 작품으로 표현했다.홍 작가는 “팬데믹 이후 기후 변화에 대한 관심이 높아지며 숲의 중요성이 더욱 강조...',
      source: '용인시민신문',
    },
  ],

  김태균: [
    {
      url: 'https://m.artgg.ggcf.kr/artists/%EA%B9%80%ED%83%9C%EA%B7%A0',
      title: '2025 작가 김태균 - 아트경기',
      description:
        '경기미술품활성화사업(아트경기)은 경기도 예술가의 지속적인 창작 활동과 건강한 미술시장의 발전을 위합니다',
      source: '아트경기',
    },
    {
      url: 'https://artnedition.com/artist/detail/kim-tae-kyun/?srsltid=AfmBOoq7yBEEvDXbqfbVX9fGV8xze7IePcAlcISLP86wRfRQYag0crM-',
      title: '사진작가 김태균 프로필 - ‘블루’를 고집하며 바다를 담다',
      description:
        '아트앤에디션 작가 소개. 미국 이민 후 한국으로 돌아와 패션 사진을 거쳐 1997년부터 순수 사진 작업에 몰두하며 시시각각 변하는 바다의 파랑을 포착하는 김태균 작가의 예술 여정.',
      source: '아트앤에디션',
    },
    {
      url: 'https://ko.b-treegallery.com/%EA%B9%80%ED%83%9C%EA%B7%A0-kim-taikyun-b-1956/',
      title: 'THE BLUE - 사진작가 김태균의 수평선과 바다 이야기',
      description:
        '비트리 갤러리 기획전 정보. 20여 년간 새벽 수평선 위의 하늘과 바다를 렌즈에 담아온 김태균 작가의 정체성이 투영된 ‘블루’ 시리즈와 작품에 담긴 철학적 사유 소개.',
      source: '비트리 갤러리',
    },
  ],
  김태희: [
    {
      url: 'https://art-moado.com/90/?bmode=view&idx=10430027',
      title: '김태희 작가 포트폴리오 및 작품 소개 - 모아도(Moado)',
      description:
        '예술가와 컬렉터를 잇는 플랫폼 모아도에 등록된 김태희 작가의 도예 작품 포트폴리오. 전통적인 백자의 미학을 현대적인 감각으로 재해석한 조형미를 확인할 수 있습니다.',
      source: '모아도',
    },
    {
      url: 'https://www.dbltv.com/news/articleView.html?idxno=24211',
      title: '목포생활도자박물관, 김태희 작가 ‘청화백자, 그림이 되다’ 초대전 개최',
      description:
        '뉴스탑전남 보도. 파주를 중심으로 활동하며 청화백자의 현대적 변용을 탐구하는 김태희 작가의 목포생활도자박물관 특별기획전 소식 및 주요 작품 소개.',
      source: '뉴스탑전남',
    },
    {
      url: 'https://www.sfac.or.kr/artspace/artspace/sindang_writerView.do?rsdIdx=89',
      title: '신당창작아케이드 입주작가 프로필 - 도예가 김태희',
      description:
        '서울문화재단 신당창작아케이드 입주 작가 정보. 백자 점토를 조각하여 회화적 평면성을 담아내는 김태희 작가의 독창적인 ‘도자조각화’ 작업과 주요 활동 이력.',
      source: '서울문화재단',
    },
    {
      url: 'https://www.cerazine.co.kr/news/view.php?idx=27033&sm=w_total&stx=%EA%B9%80%ED%83%9C%ED%9D%AC&stx2=&w_section1=&sdate=&edate=',
      title: '전시리뷰 - 김태희 〈도자조각화〉전 (H 컨템포러리 갤러리)',
      description:
        '세라진(Cerazine) 평론. 백자 점토로 성형한 얇은 흙판을 한땀 한땀 조각하여 정성을 담아내는 김태희 작가의 개인전 리뷰 및 작품 세계 심층 분석.',
      source: '세라진(Cerazine)',
    },
    {
      url: 'https://www.jjan.kr/article/20120910447050',
      title: '제8회 온고을미술대전 종합대상에 공예도자 부문 김태희씨',
      description:
        '전북일보 보도. 전주에서 개최된 온고을미술대전에서 ‘흑단 어문 대발’을 출품하여 공예도자 부문 종합대상을 수상한 김태희 작가의 수상 소식.',
      source: '전북일보',
    },
    {
      url: 'http://www.cerazine.co.kr/m/view.php?idx=26244',
      title: '<파주~예술로 잇다>전',
      description:
        '<파주~예술로 잇다>전 6.21~9.25 파주 한향림옹기박물관 <파주-예술로 잇다>전은 파주시에서 지원하는 지역문화예술 플랫폼 육성사업의 일환으로 마련된 전시다. 이번 전시는 옹기로 대표되는 한국 전통문화에 담긴 역사와 의미, 형태, 문양 등 파주지역에 거주하는 도자, 유리, 섬유, 민화 작가 5명의 시선으로 풀어냈다.',
      source: '세라진(Cerazine)',
    },
  ],
  박은선: [
    {
      url: 'https://www.iartpark.com/exhibitions/51-beyond-here/',
      title: '박은선 : Beyond Here - ART PARK',
      description:
        '라인테이프, 미러, LED 등 다양한 매체로 실재와 환영을 넘나들며 새로운 시•공간을 창조해 온 작가 박은선(b. 1962)의 열여섯 번째 개인전 『Beyond Here』가 세브란스 아트 스페이스에서 열린다. 동국대에서 회화를 전공하고 이태리 로마 국립 아카데미를 졸업한 작가는 서울, 파리, 로마에서 다수의 개인전과 함께 이태리 싼 죠반니 보노 국제전 명예...',
      source: 'ART PARK',
    },
  ],
  김현철: [
    {
      url: 'https://m.blog.naver.com/goldenhill/223746627870',
      title: '현대 진경산수화와 계화 : 정중동의 미학',
      description:
        '현대 진경산수화와 계화: 정중동(靜中動)의 미학 최경현(천안시립미술관 관장) Ⅰ. 들어가는 말 금릉 김현...',
      source: '시중재(작가 블로그)`',
    },
    {
      url: 'https://namu.wiki/w/%EA%B8%88%EB%A6%89%20%EA%B9%80%ED%98%84%EC%B2%A0(%EC%9E%91%EA%B0%80)',
      title: '금릉 김현철(작가) - 나무위키',
      description:
        '전통 동양화를 전공하고 진경산수화의 맥을 잇는 금릉 김현철 작가의 생애와 예술 세계. 정선과 단원의 화풍을 현대적으로 재해석하며 초상화와 산수화에서 독보적인 영역을 구축한 이력 수록.',
      source: '나무위키',
    },
    {
      url: 'https://www.youtube.com/watch?v=k0iyVDx_t1o',
      title: '금릉 김현철의 회화세계 - 진경(眞景)과 시중재',
      description:
        '진경(眞景)의 참된 의미를 찾아가는 김현철 작가의 다큐멘터리 영상. 겸재 정선의 정신을 현대적 필치로 되살려낸 작품들과 작가의 작업실 시중재에서의 고뇌와 창작 과정을 담은 영상.',
      source: 'YouTube(신빛찍다)',
    },
    {
      url: 'http://www.sctoday.co.kr/news/articleView.html?idxno=44342',
      title: '겸재정선미술관 김현철 초대개인전 《전신(傳神)과 진경(眞景)》',
      description:
        '서울문화투데이 보도. 금릉 김현철 작가의 초상화와 산수화를 아우르는 초대 개인전 소식. 1부 초상화 조망 ‘전신’과 2부 산수화 조망 ‘진경’으로 나누어 선보인 전시 상세 내용.',
      source: '서울문화투데이',
    },
    {
      url: 'https://www.newsis.com/view/NISX20250220_0003072011',
      title: '"겸재 정선 그림인 줄"... 금릉 김현철 \'금강내산도\' 깜짝',
      description:
        '뉴시스 보도. 겸재 정선을 오마주한 ‘금강내산도’와 한라산 영실을 주제로 한 신작 ‘영실’을 통해 한국화의 새로운 지평을 열어가는 김현철 작가의 예술적 성과 조명.',
      source: '뉴시스',
    },
  ],
  Salnus: [
    {
      url: 'https://www.youtube.com/watch?v=4zdu9MZbkyg',
      title: "Salnus 살누스 개인전 'Digging Out' 전시 현장",
      description:
        '2025 라운디드 플랫 5th Open Call 선정 작가 살누스의 개인전이 2025년 6월 27일부터 6월 30일까지 라운디드 플랫이 위치한 서울 종로구 인사동4길 17 건국빌딩 102-1호에서 열렸습니다. 과거와 현재, 평면과 입체, 안과 밖. 시공간을 엮고 엮어 만든 살누스의...',
      source: '유튜브',
    },
  ],
  이채원: [
    {
      url: 'https://www.saf2026.com/artworks/146',
      title: '이채원 - 씨앗페 2026',
      description:
        '작가: 예미킴, 작품명: 우주에서, 제작년도: 2024, 재료: Mixedmedia on canvas, 크기: 24.2x24.2cm.',
      source: '씨앗페 2026(작품명: Summer Comes to My Hometown, Seoul)`',
    },
  ],
  조문호: [
    {
      url: 'https://www.youtube.com/watch?v=B9YVUw8zQDg',
      title: '한국사진가론 28-청량리588 조문호편',
      description:
        '조문호는 80년대 "청량리588"로 널리 이름을 떨친 다큐멘터리 사진가입니다. 대낮에도 들어가기 힘들다는 속칭 청량리588로 불렸던 전농동 집창촌을 4년동안 촬영한 문제작이었습니다. 80년대 사진가 치고 조문호의 청량리588 사진을 모르는 사람이 없었습니다. 조문호의 두번째 역작은...',
      source: 'jindongsun photoTV(YouTube)`',
    },
  ],
  정영신: [
    {
      url: 'https://www.hani.co.kr/arti/culture/book/1198469.html',
      title: "“요즘 오일장은 '여자세상'…장꾼들이 기다리니 자주 가죠”",
      description:
        '사진가이자 작가인 정영신(67))씨는 올해로 40년째 매주 한두 차례 오일장(5일 간격으로 서는 장)을 찾는다. 새벽 4시쯤 기상해 행장을 차려 서울 반포 고속버스터미널이나 기차역으로 향한다. 전남 함평에서 나 중학 시절부터 소설 창작의 꿈을',
      source: '한겨레',
    },
  ],
  한미영: [],
  양순열: [
    {
      url: 'https://www.khan.co.kr/article/202209141556001',
      title: "예술혼으로 그리고 빚은 '오똑이', 모성의 힘을 일깨우다",
      description:
        '오뚝이가 중진의 양순열 작가(63)에게는 모성이다. 어떤 고난과 역경에도 다시 오뚝오뚝 일어서서 자식을 품어안는 엄마의 사랑, 마음을 오뚝이에 녹여낸다. 나아가 우주 만물의 생명력 근원인 모성의 회복이야 말로 세상의 온갖 문제들을 풀 수있을 것으로 본다. “모성은 우주와 한마음이 되고 인간뿐아니라 존재하는 모든 것들과 더불어 나아갈 때 가능하다. 우리...',
      source: '경향신문',
    },
  ],
  이문형: [
    {
      url: 'https://koreasmartcoop.cafe24.com/product/%EC%B1%85%EA%B1%B0%EB%A6%ACx%ED%82%A4%EC%8A%A4%ED%95%B4%EB%A7%81-%EC%9D%B4%EB%AC%B8%ED%98%95/85/',
      title: '책거리x키스해링 - 이문형',
      description:
        '책거리x키스해링 - 이문형, 씨앗페 온라인 갤러리, 이문형,씨앗페,SAF2026,미술,예술,작품, 씨앗페 2026, 한지위에 수묵채색 | 60.6×40.9cm,',
      source: '씨앗페 온라인 갤러리',
    },
  ],
  류호식: [
    {
      url: 'https://www.newsbrite.net/news/articleView.html?idxno=168927',
      title: "서촌 TYA, 류호식 작가 개인전 'Black & Daisy' 개최",
      description:
        '서촌 TYA는 11월 4일부터 17일까지 류호식 작가의 초대 개인전 를 개최한다. 류호식 작가는 2022년 5월 서촌 TYA에서 진행되었던 20인 기획전 《들여다보다》에 참여했던 작가이다.에서는 3D 프린팅 기법과 페이퍼 클레이를 통해 작품에 활용되는 소재의 다양성을 보여주고, 20인 전에서 보여주지 못했던 신작으로 공간을 채울 예정이다.초대전에 출품되는 ...',
      source: '뉴스브라이트',
    },
  ],

  김정원: [
    {
      url: 'https://www.artkoreatv.com/news/articleView.html?idxno=91237',
      title: "김정원 개인전 'The Coral Story'",
      description:
        "[아트코리아방송 = 김한정 기자] 마포구 성미산로에 위치한 Gallery MoM에서는 2024년 3월 18일~5월 12일까지 김정원 개인전 'The Coral Story'가 전시될 예정이다.어릴 적 해녀였던 할머니와 함께 집 앞 바닷가에 나갈 때면, 햇빛에 반짝이는 바닷가의 영롱한 반",
      source: '아트코리아방송',
    },
  ],
  하선영: [
    {
      url: 'https://www.newsfreezone.co.kr/news/articleView.html?idxno=584216',
      title: "산책길 만난 '행복의 퍼즐' 그리는 하선영 작가",
      description:
        '[서울 =뉴스프리존]편완식 미술전문기자= 하선영의 그림을 보면 ‘옥상달빛’의 노래 ‘산책의 미학’ 가사가 떠올려 진다. ‘오늘 참 되는 일 없네/ 생각하며 터덜터덜/걷다 보니 어, 바람이 시원하네//아무 말도 하기 싫은/피곤한 하룰 끝내고/걷다 보니 와, 하늘 참 예쁘다//걷고 걷고',
      source: '뉴스프리존',
    },
  ],
  정재철: [
    {
      url: 'http://m.todaytry.com/news_gisa/gisa_view.htm?gisa_category=03030000&gisa_idx=190221&date_y=2026&date_m=01',
      title: '갤러리박영, 정재철 첫 개인전 《Middle Ground: 해체된 시선》',
      description:
        '갤러리박영은 11월 5일부터 11월 30일까지 서울 청담동 전시관(서울시 강남구 압구정로 416 B2, 더트리니티플레이스)에서 정재철(b. 1980~) 작가의 초대 개인전 《Middle Ground: 해체된 시선》을 개최한다...',
      source: '투데이트라이',
    },
  ],
  장희진: [
    {
      url: 'https://artbava.com/exhibits/%EC%9E%A5%ED%9D%AC%EC%A7%84-%EA%B0%9C%EC%9D%B8%EC%A0%84-%EC%B2%9C-%EA%B0%9C%EC%9D%98-%EC%83%89-%EC%B2%9C-%EA%B0%9C%EC%9D%98-%EA%B2%B0',
      title: '장희진 개인전: 천 개의 색, 천 개의 결',
      description:
        '빛의 차원 dimension of light정현아 (이층갤러리+디아건축)장희진의 작업은 캔버스를 그만의 고유한 방식으로 만드는 것으로 시작한다. 캔버스 화면에 페이스트를 두껍게 바르고, 부분적으로 떼어내 캔버스 표면에 요철면을 만드는 것이다. 먼저 직접 만든 곡선형 자...',
      source: '아트바바',
    },
  ],
  김유진: [],
  고현주: [
    {
      url: 'https://www.artspacelumos.com/60',
      title: '[기억의 목소리 Ⅲ] 고현주 사진전',
      description:
        '제주 4.3의 현장에서 올리는 아름다운 제의. 학살이 자행되었던 현장을 찾아 희생자의 수만큼 보자기로 싼 등불을 놓으며 위무하는 고현주 작가의 사진 작업.',
      source: 'ArtSpace LUMOS',
    },
    {
      url: 'https://www.pressian.com/pages/articles/2022120516241262507',
      title: '사진가 고현주를 기억하며',
      description:
        '소년원 아이들에게 사진을 가르치고 그들의 마음을 카메라에 담아냈던 故 고현주 사진작가의 삶과 예술 세계를 기리는 추모 평론.',
      source: '프레시안',
    },
    {
      url: 'https://www.artkoreatv.com/news/articleView.html?idxno=75423',
      title: '‘기억의 목소리 II’ 고현주 작가의 두 번째 4·3 사진집',
      description:
        '고현주 작가의 두 번째 4·3 사진집 발간 소식. 제주 여성의 보따리 속 사물을 통해 제주 4·3의 아픔과 디아스포라의 기억을 섬세하게 기록.',
      source: '아트코리아방송',
    },
    {
      url: 'https://www.khan.co.kr/article/202306261538011',
      title: '4·3을 기억하다…고현주 사진작가 유고전 평화기념관서',
      description:
        '제주4·3평화재단 주최 고현주 작가 유고전 ‘기억의 목소리’. 척박한 땅에서 생을 일궈온 제주 사람들의 역사와 기억을 담은 사진 38점 전시.',
      source: '경향신문',
    },
  ],
  최연택: [
    {
      url: 'https://www.artbava.com/exhibits/%EC%B5%9C%EC%97%B0%ED%83%9D-%EA%B0%9C%EC%9D%B8%EC%A0%84-%EC%9A%B0%EB%A6%AC%EB%93%A4%EC%9D%98-%EC%95%88%EB%85%95',
      title: '최연택 개인전 : 우리들의 안녕',
      description:
        '그림으로 읽는 ‘우리들의 안녕’최연택의 세 번째 개인전 &lt;우리들의 안녕&gt;의 작품들은 사실 이미지보다는 텍스트에 집중한다. 작가의 작품은 텍스트와 함께여야 의미가 살고, 자세히 들여다보아야 마음을 움직이게 하는 하나의 점이 보인다.작가는 최근 세 권의 책에 그...',
      source: '아트바바',
    },
  ],
  이동구: [
    {
      url: 'https://www.youtube.com/watch?v=3f73apI6sIw',
      title: '도예-101/비오는날 국그릇만들기/이동구 도예공방',
      description:
        'YouTube에서 마음에 드는 동영상과 음악을 감상하고, 직접 만든 콘텐츠를 업로드하여 친구, 가족뿐 아니라 전 세계 사람들과 콘텐츠를 공유할 수 있습니다.',
      source: 'YouTube',
    },
  ],

  안소현: [
    {
      url: 'https://jinhwon.com/68',
      title: '사진가 없는 사진 - 안소현',
      description:
        '아트 스페이스 풀 디렉터 안소현의 비평글. 홍진훤 개인전 《랜덤 포레스트》 전시 서문으로, 사진 이미지와 현실의 관계, 부재감의 감각을 다룬 글.',
      source: 'jinhwon.com',
    },
  ],
};

/**
 * 작가명으로 관련 기사 가져오기
 */
export function getArticlesByArtist(artistName: string): Article[] {
  return artistArticles[artistName] || [];
}
