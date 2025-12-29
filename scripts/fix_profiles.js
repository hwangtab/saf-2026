/**
 * 수동 데이터 교정 스크립트
 * CSV에서 정확한 profile/history 필드 매핑하여 업데이트
 */

const fs = require('fs');
const path = require('path');

// 텍스트 정리 함수
function cleanText(text) {
    if (!text) return '';
    // 캐리지 리턴 제거
    let result = text.replace(/\r/g, '');
    // 3개 이상 연속 줄바꿈 -> 2개
    result = result.replace(/\n{3,}/g, '\n\n');
    // 각 줄 시작/끝 공백 제거
    result = result.split('\n').map(l => l.trim()).join('\n');
    // 시작/끝 공백 제거
    result = result.trim();
    return result;
}

const artworksPath = path.join(__dirname, '../content/saf2026-artworks.ts');
let content = fs.readFileSync(artworksPath, 'utf-8');

// 정확한 데이터 교정 (CSV 원본에서 추출)
const corrections = {
    // ID 40: 한애규 (CSV 3에서)
    40: {
        profile: cleanText(`한애규(b.1953)는 서울대학교에서 응용미술과와 동 대학원에서 도예를 전공하고 프랑스 앙굴렘 미술학교를 졸업하였다. 국내외 다수의 개인전과 단체전에 참여하였으며 주요 개인전으로는 《흙의 감정, 흙의 여정》(갤러리세줄, 2024), 《Beside》 (아트사이드 갤러리, 서울, 2022), 《푸른 길》 (아트사이드 갤러리, 서울, 2018), 《폐허에서》 (아트사이드 갤러리, 베이징, 2010), 《조우》 (포스코 미술관, 서울, 2009), 《꽃을 든 사람》 (가나 아트 센터, 서울, 2008) 과 주요 단체전은 《한국의 채색화 특별전》 (국립현대미술관, 과천, 2022>, 《토요일展》 (서울, 2012-2020), 《긴 호흡》 (소마미술관, 서울, 2014), 《테라코타, 원시적 미래》 (클레이아크 김해미술관, 경상남도, 2011) 등에 참여하였다. 주요 소장처로는 국립현대미술관, 서울시립미술관, 서울역사박물관, 대전시립미술관, 전북도립미술관, 서울시청, 이화여자대학교 박물관, 고려대학교 박물관 등이 있다.`),
        history: ""
    },

    // ID 54: 최은경 (CSV 3에서) - 마지막 줄
    54: {
        profile: cleanText(`최은경은 회화의 '붓질'이란 삶의 구체성을 표현하기 위한 전제로 다시 조우해야만 하는 잊힌 (원)기억에 의해 직조되는(재구성되는) 허구의 내러티브이자 실재의 사실성이 아닐까 하는 추론으로 작업한다.`),
        history: ""
    },

    // ID 55: 정미정 (CSV 4)
    55: {
        profile: "",
        history: cleanText(`Chelsea college of Arts – MA Fine Art / 첼시 예술대학교 회화과 석사. LONDON. UK
세종대학교 회화과(서양화) 학사. 서울. 대한민국

개인전
2025. 팔림프세스트- 사라지며 남는 것들. 공간썬더. 서울. 한국
2024. 연결: Connection 개인전. 갤러리 실. 플레이스낙양. 낙양모사
2023-2024. 시간, 공간 그리고 기억- 시간과 공간을 기억으로 저장한다. 개인전. E. Land. 이랜드 갤러리-아트로 /이랜드문화재단. 서울 (신구로 NC 백화점).
2022. 저 너머에: YONDER. 개인전. Fill Gallery. 필 갤러리. 서울. 한국
2022. The time in between. 서울신문-서울갤러리 전시작가 공모 선정작가전. 서울. 한국
2021. I run Into You. 사이. 은평문화재단-신진 청년작가지원사업. 아트숨비. 서울. 한국
2021. Line and Light: 선 그리고 빛. 아트스페이스 W. 우신보석. 서울. 한국
2020. Rendezvous: 랑데부. 이랜드 월드사옥. 이랜드 문화재단. 서울. 한국
2020. TIME : 시간. 필 갤러리. Fill gallery. 서울. 한국
2018. 교차된 시간: Intersected Time. 세움아트 스페이스. 서울. 한국
2017. MY STORY. 필 갤러리. Fill gallery. 서울. 한국
2017. Remembrance. 사이아트 도큐먼트. 서울. 한국
2016. Self-Transformation. 초대전. 정 갤러리. 서울. 한국

수상경력
2021. BIAF. New Wave. 부산국제아트페어. 신진우수작가상
2021. 인사아트프라자 갤러리 작가공모전. 장려상
2018. IBK 기업은행 신진작가 공모대전. 최우수상
2018. K-Painting 신진작가 공모전. 우수상. 윤승 갤러리. / 가치창의 재단
2017 양주시립장욱진 미술관. 제2회 뉴 드로잉 프로젝트. 입상
2016. International Invited Exhibition: 2016 GAMMA Young Artist Competition. Seoul. 입상

소장처
국립현대미술관 미술은행. 서울시청 박물관. 경기도미술관. 양주시립장욱진 미술관.
(사)한국미술협회. 윤승갤러리/가치창의재단. 대한불교조계종 안국선원
필 갤러리. 갤러리 정. 세움아트 스페이스. 소피스 갤러리.`)
    },

    // ID 56: 정미정 (동일)
    56: {
        profile: "",
        history: cleanText(`Chelsea college of Arts – MA Fine Art / 첼시 예술대학교 회화과 석사. LONDON. UK
세종대학교 회화과(서양화) 학사. 서울. 대한민국

개인전
2025. 팔림프세스트- 사라지며 남는 것들. 공간썬더. 서울. 한국
2024. 연결: Connection 개인전. 갤러리 실. 플레이스낙양. 낙양모사
2023-2024. 시간, 공간 그리고 기억- 시간과 공간을 기억으로 저장한다. 개인전.

수상경력
2021. BIAF. New Wave. 부산국제아트페어. 신진우수작가상
2021. 인사아트프라자 갤러리 작가공모전. 장려상
2018. IBK 기업은행 신진작가 공모대전. 최우수상

소장처
국립현대미술관 미술은행. 서울시청 박물관. 경기도미술관. 양주시립장욱진 미술관.`)
    },

    // ID 57: 최재란 (CSV 4)
    57: {
        profile: cleanText(`최재란은 중앙대학교 미술학사 사진전공, 아주대학교 공공정책대학원 행정학 석사를 졸업했다. 2023년 대한민국국제포토페스티벌 형형색색 수상, 2021년 아트경기작가 선정, 2021년 제8회 현대사진공모작가 선정 등의 이력이 있다.`),
        description: cleanText(`'쿼크(Quark)'는 입자물리학의 표준모형에 따르면 원자핵의 양성자나 중성자의 구성요소이자 기본 입자로 우주를 구성하는 가장 근본적인 입자이다. 우리의 일상, 매일 바라보는 세상에서 매순간 경험하고 느끼지만 볼 수 없는 시간을 물리에서 설명하는 시간을 차용한 <쿼크의 시간>은 매일 산책하면서 떨어진 자연물을 줍거나 채집하여 정물적 구성을 한 후 우주에 흐르는 보이지 않는 시간을 상징적으로 드로잉하여 시간의 방향성을 표현한 작업이다.

예부터 우리는 자연의 세계를 통해 생명의 근원, 삶의 이치를 성찰하고 자연에 순응하며 존중하는 겸허한 자세로 살아가고자 하였다. <쿼크(Quark)의 시간>은 시간의 흐름에 따라 시들고 소멸하는 변화하는 자연이 인간의 생로병사(生老病死)와 닮아 있음을 느끼며 산책길에 떨어지고 스러져가는 꽃잎, 열매, 작은 씨앗들을 줍거나 채집하고 재조합하여 밤하늘과 무한한 우주의 시간을 상상하며 정물(Still Life)적 구성을 한 후 우주, 별자리, 물리에서의 시간, 전통문양을 드로잉 하여 시간의 방향성을 표현하고자 하였다.`),
        history: cleanText(`학력
중앙대학교 미술학사 사진전공
아주대학교 공공정책대학원 행정학 석사

개인전
2023 카이로스(Kairos)벽화, 예술공간 아름(수원)
2022 화성,묵시의 풍경, 수원sk아트리움 아트갤러리(수원)
2020 화성,묵시의 풍경, 행궁재갤러리(수원)
2019 Tears, ddp알림2관(서울)
2019 화성,언저리풍경, 이데알레(수원)
2017 꿈꾸는 연가, 노송갤러리(수원)

수상 및 전시지원 선정
2025 교보교육재단 VR 아트 갤러리 작품 공모작가 선정
2024 문화1호선 순회전시 작가 선정
2023 대한민국국제포토페스티벌 형형색색 수상
2021 제8회 현대사진공모작가 선정
2021 경기미술품활성화사업 2021 아트경기작가 선정`)
    },

    // ID 58: 최재란 (동일 history)
    58: {
        profile: cleanText(`최재란은 중앙대학교 미술학사 사진전공, 아주대학교 공공정책대학원 행정학 석사를 졸업했다.`),
        description: cleanText(`'쿼크(Quark)'는 우주를 구성하는 가장 근본적인 입자이다. <쿼크의 시간>은 시간의 흐름에 따라 시들고 소멸하는 변화하는 자연이 인간의 생로병사와 닮아 있음을 느끼며 작업한 시리즈이다.`),
        history: cleanText(`학력
중앙대학교 미술학사 사진전공
아주대학교 공공정책대학원 행정학 석사

개인전
2023 카이로스(Kairos)벽화, 예술공간 아름(수원)
2022 화성,묵시의 풍경, 수원sk아트리움 아트갤러리(수원)

수상 및 전시지원 선정
2025 교보교육재단 VR 아트 갤러리 작품 공모작가 선정
2023 대한민국국제포토페스티벌 형형색색 수상`)
    },

    // ID 59-62: 이열 (CSV 4)
    59: {
        profile: cleanText(`이열(Yoll Lee) 사진가는 2012년부터 나무를 소재로 자연과 생명의 아름다움을 사진으로 표현하고 있는 나무 사진가이다.

2013년 최초의 나무 사진 전시인 '푸른 나무' 시리즈를 시작으로 '숲(2016)', '꿈꾸는 나무(2017)', '인간 나무(2018)'시리즈를 전시하였고, 해외 나무 사진 시리즈로 네팔 히말라야의 랄리구라스(2017), 이탈리아의 올리브나무(2018), 아프리카 마다가스카르의 바오밥나무(2020), 그리고 남태평양 피지의 맹그로브나무(2023) 등을 촬영하였다.
몇 년 전부터 국내의 섬 나무 사진 촬영을 시작하여 '제주신목(2021)'과 '신안신목(2022)', 통영신목(2023)을 발표하였고, 2024년에 '남해신목'을 전시하였다.

사진가 이열은 낮에 나무를 찾고, 밤에 작업을 한다. 밤새 한 나무에 조명을 주어 사진가가 나무, 지역, 그 지역의 역사 등을 통해 느낀 개인적인 감정과 영감을 사진에 표현한다. 이런 일련의 과정을 거쳐 촬영한 나무는 실제의 나무가 가지는 사실성을 넘어, 다른 사진가의 나무 사진과는 다른 그 만의 나무 사진이 된다. 즉, 사진의 기록성을 바탕으로 하되, 조명을 통해 주관적인 감정의 흐름까지 가미한다는 점이 다큐멘터리 사진과 구별되는 이열 사진의 특징이다.
이열은 나무 사진가일 뿐만 아니라, 2013년 '양재천 둑방길 나무 지키기 운동'을 주도하여 성공하였고, 자연과 예술이 함께하는 '예술의숲'을 꿈꾸고 있다.`),
        history: cleanText(`경력
2022. 6 ~ 현재 '예술의숲 사회적협동조합' 이사장
2018. 1 ~ 2020. 3 '아트필드(ARTFIELD) 갤러리' 아트 디렉터
2014. 5 ~ 2017. 3 '에이트리(A-Tree) 갤러리' 대표 역임
2004 ~ 2013 포토그룹 대표

학력
중앙대학교 예술대학 사진학과 졸업
이태리 밀라노의 '유럽 디자인대학'Istituto Europeo di Design' 사진학과 졸업

강의
2004. 3 ~ 2014. 6 건국대학교 디자인학부 강사 역임
2000. 3 ~ 2009 남서울대학교 멀티미디어과 겸임교수 역임

저서
2025 '아름다운 여름(La Bella Estate)' 녹색광선 (번역)
2025 '느린 인간' 글항아리 (글. 사진)
2016 '메르스의 영웅들' 둘다북스 (사진)
2015 '세속도시의 시인들' 로고폴리스 (사진)

수상
2025 제14회 녹색문학상 선정(포토 에세이 '느린 인간', 글항아리)`)
    },

    // ID 60-62: 이열 (동일 데이터)
    60: { profile: "", history: "" },
    61: { profile: "", history: "" },
    62: {
        profile: cleanText(`이열(Yoll Lee) 사진가는 2012년부터 나무를 소재로 자연과 생명의 아름다움을 사진으로 표현하고 있는 나무 사진가이다. 2013년 '양재천 둑방길 나무 지키기 운동'을 주도하여 성공하였고, 자연과 예술이 함께하는 '예술의숲'을 꿈꾸고 있다.`),
        history: cleanText(`경력
2022. 6 ~ 현재 '예술의숲 사회적협동조합' 이사장

학력
중앙대학교 예술대학 사진학과 졸업
이태리 밀라노의 '유럽 디자인대학'Istituto Europeo di Design' 사진학과 졸업

수상
2025 제14회 녹색문학상 선정(포토 에세이 '느린 인간', 글항아리)`)
    }
};

// id 60, 61은 59와 동일하게
corrections[60] = JSON.parse(JSON.stringify(corrections[59]));
corrections[61] = JSON.parse(JSON.stringify(corrections[59]));

// 업데이트 적용
Object.entries(corrections).forEach(([id, data]) => {
    if (data.profile !== undefined && data.profile !== "") {
        const profileEscaped = data.profile.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
        const profilePattern = new RegExp(`("id": "${id}"[^}]*"profile": ")[^"]*(")`);
        if (content.match(profilePattern)) {
            content = content.replace(profilePattern, `$1${profileEscaped}$2`);
            console.log(`ID ${id}: profile 업데이트됨 (${data.profile.length}자)`);
        }
    }

    if (data.history !== undefined && data.history !== "") {
        const historyEscaped = data.history.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
        const historyPattern = new RegExp(`("id": "${id}"[^}]*"history": ")[^"]*(")`);
        if (content.match(historyPattern)) {
            content = content.replace(historyPattern, `$1${historyEscaped}$2`);
            console.log(`ID ${id}: history 업데이트됨 (${data.history.length}자)`);
        }
    }

    if (data.description !== undefined) {
        const descEscaped = data.description.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
        const descPattern = new RegExp(`("id": "${id}"[^}]*"description": ")[^"]*(")`);
        if (content.match(descPattern)) {
            content = content.replace(descPattern, `$1${descEscaped}$2`);
            console.log(`ID ${id}: description 업데이트됨 (${data.description.length}자)`);
        }
    }
});

fs.writeFileSync(artworksPath, content, 'utf-8');
console.log('\n수정 완료!');
