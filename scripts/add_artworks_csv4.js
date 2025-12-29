/**
 * 새 작품 추가 스크립트 (CSV 4)
 * ID: 55-62
 * 작가: 정미정(2), 최재란(2), 이열(4)
 */

const fs = require('fs');
const path = require('path');

// 이미지 확장자 확인
const imageDir = path.join(__dirname, '../public/images/artworks');
const imageFiles = fs.readdirSync(imageDir);
const imageMap = {};
imageFiles.forEach(f => {
    const match = f.match(/^(\d+)\.(jpg|jpeg|png)$/i);
    if (match) {
        imageMap[match[1]] = f;
    }
});

// 새 작품 데이터 (CSV에서 수동 추출)
const newArtworks = [
    {
        id: "55",
        artist: "정미정",
        title: "그곳",
        description: "",
        profile: "정미정은 Chelsea college of Arts (MA Fine Art)를 졸업하고 국립현대미술관 미술은행, 서울시청 박물관, 경기도미술관, 양주시립장욱진 미술관 등에 작품이 소장되어 있다. 2021년 BIAF 부산국제아트페어 신진우수작가상, IBK 기업은행 신진작가 공모대전 최우수상을 수상했다.",
        size: "72.7x53cm",
        material: "Oil on canvas",
        year: "2022",
        edition: "",
        price: "₩3,000,000",
        history: "Chelsea college of Arts – MA Fine Art (석사)\n세종대학교 회화과(서양화) 학사\n\n소장처: 국립현대미술관 미술은행, 서울시청 박물관, 경기도미술관, 양주시립장욱진 미술관"
    },
    {
        id: "56",
        artist: "정미정",
        title: "그곳",
        description: "",
        profile: "정미정은 Chelsea college of Arts (MA Fine Art)를 졸업하고 국립현대미술관 미술은행, 서울시청 박물관, 경기도미술관, 양주시립장욱진 미술관 등에 작품이 소장되어 있다. 2021년 BIAF 부산국제아트페어 신진우수작가상, IBK 기업은행 신진작가 공모대전 최우수상을 수상했다.",
        size: "72.7x53cm",
        material: "Oil on canvas",
        year: "2022",
        edition: "",
        price: "₩3,000,000",
        history: ""
    },
    {
        id: "57",
        artist: "최재란",
        title: "쿼크의 시간#111",
        description: "'쿼크(Quark)'는 입자물리학의 표준모형에 따르면 원자핵의 양성자나 중성자의 구성요소이자 기본 입자로 우주를 구성하는 가장 근본적인 입자이다. <쿼크의 시간>은 매일 산책하면서 떨어진 자연물을 줍거나 채집하여 정물적 구성을 한 후 우주에 흐르는 보이지 않는 시간을 상징적으로 드로잉하여 시간의 방향성을 표현한 작업이다.",
        profile: "최재란은 중앙대학교 미술학사 사진전공, 아주대학교 공공정책대학원 행정학 석사를 졸업했다. 2023년 대한민국국제포토페스티벌 형형색색 수상, 2021년 아트경기 작가 선정 등의 이력이 있다.",
        size: "100x100cm",
        material: "Archival pigment print",
        year: "2024",
        edition: "",
        price: "₩3,000,000",
        history: "중앙대학교 미술학사 사진전공\n아주대학교 공공정책대학원 행정학 석사\n\n개인전:\n2023 카이로스(Kairos)벽화, 예술공간 아름(수원)\n2022 화성,묵시의 풍경, 수원sk아트리움 아트갤러리(수원)"
    },
    {
        id: "58",
        artist: "최재란",
        title: "쿼크의 시간#113",
        description: "'쿼크(Quark)'는 우주를 구성하는 가장 근본적인 입자이다. <쿼크의 시간>은 시간의 흐름에 따라 시들고 소멸하는 변화하는 자연이 인간의 생로병사와 닮아 있음을 느끼며 작업한 시리즈이다.",
        profile: "최재란은 중앙대학교 미술학사 사진전공, 아주대학교 공공정책대학원 행정학 석사를 졸업했다.",
        size: "100x100cm",
        material: "Archival pigment print",
        year: "2025",
        edition: "",
        price: "₩3,000,000",
        history: ""
    },
    {
        id: "59",
        artist: "이열",
        title: "Mango tree_Sawani",
        description: "",
        profile: "이열(Yoll Lee) 사진가는 2012년부터 나무를 소재로 자연과 생명의 아름다움을 사진으로 표현하고 있는 나무 사진가이다. 밤새 한 나무에 조명을 주어 사진가가 느낀 개인적인 감정과 영감을 사진에 표현한다.",
        size: "138x99cm",
        material: "Hahnemühle Baryta FB, pigment ink-jet print",
        year: "2023",
        edition: "에디션 3/10",
        price: "₩4,240,000",
        history: "중앙대학교 예술대학 사진학과 졸업\n이태리 밀라노 유럽 디자인대학 사진학과 졸업\n\n2025 제14회 녹색문학상 선정(포토 에세이 '느린 인간')"
    },
    {
        id: "60",
        artist: "이열",
        title: "Moonlight Mangrove_Tokuo",
        description: "",
        profile: "이열(Yoll Lee) 사진가는 2012년부터 나무를 소재로 자연과 생명의 아름다움을 사진으로 표현하고 있는 나무 사진가이다.",
        size: "62x92cm",
        material: "Hahnemühle Baryta FB, pigment ink-jet print",
        year: "2023",
        edition: "에디션 7/10",
        price: "₩3,200,000",
        history: ""
    },
    {
        id: "61",
        artist: "이열",
        title: "별들과 녹색 바오밥",
        description: "",
        profile: "이열(Yoll Lee) 사진가는 2012년부터 나무를 소재로 자연과 생명의 아름다움을 사진으로 표현하고 있는 나무 사진가이다.",
        size: "62x92cm",
        material: "Hahnemühle Baryta FB, pigment ink-jet print",
        year: "2020",
        edition: "에디션 5/10",
        price: "₩2,660,000",
        history: ""
    },
    {
        id: "62",
        artist: "이열",
        title: "자은도 면전리 팽나무",
        description: "",
        profile: "이열(Yoll Lee) 사진가는 2012년부터 나무를 소재로 자연과 생명의 아름다움을 사진으로 표현하고 있는 나무 사진가이다. 2013년 '양재천 둑방길 나무 지키기 운동'을 주도하여 성공하였고, 자연과 예술이 함께하는 '예술의숲'을 꿈꾸고 있다.",
        size: "138x94cm",
        material: "Hahnemühle Baryta FB, pigment ink-jet print & acrylic paint",
        year: "2025",
        edition: "",
        price: "₩6,000,000",
        history: ""
    }
];

// 이미지 파일 매핑
newArtworks.forEach(artwork => {
    const imgFile = imageMap[artwork.id];
    if (imgFile) {
        artwork.image = imgFile;
    } else {
        console.error(`❌ ID ${artwork.id}: 이미지 파일 없음!`);
        artwork.image = `${artwork.id}.jpg`;
    }
    artwork.shopUrl = "";
});

// TypeScript 파일에 추가
const artworksPath = path.join(__dirname, '../content/saf2026-artworks.ts');
let content = fs.readFileSync(artworksPath, 'utf-8');

// 마지막 객체 끝 위치 찾기 (}로 끝나고 ];이 뒤따르는 위치)
const arrayEndPattern = /}\s*\n\];/;
const match = content.match(arrayEndPattern);
if (!match) {
    console.error('삽입 위치를 찾을 수 없습니다.');
    process.exit(1);
}
const insertionPoint = content.indexOf(match[0]);

const newArtworksStr = newArtworks.map(a => {
    return `  {
    "id": "${a.id}",
    "artist": "${a.artist}",
    "title": "${a.title.replace(/"/g, '\\"')}",
    "description": "${a.description.replace(/"/g, '\\"').replace(/\n/g, '\\n')}",
    "profile": "${a.profile.replace(/"/g, '\\"').replace(/\n/g, '\\n')}",
    "size": "${a.size}",
    "material": "${a.material}",
    "year": "${a.year}",
    "edition": "${a.edition}",
    "price": "${a.price}",
    "image": "${a.image}",
    "shopUrl": "${a.shopUrl}",
    "history": "${a.history.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"
  }`;
}).join(',\n');

// 삽입: 마지막 } 뒤에 ,와 새 작품들 추가
const newContent = content.substring(0, insertionPoint + 1) + ',\n' + newArtworksStr + '\n];' + content.substring(content.indexOf('];', insertionPoint) + 2);

fs.writeFileSync(artworksPath, newContent, 'utf-8');

console.log(`✅ ${newArtworks.length}개 작품 추가 완료!`);
console.log('\n추가된 작품:');
newArtworks.forEach(a => {
    console.log(`  - ID ${a.id}: ${a.artist} - ${a.title} (${a.image})`);
});
