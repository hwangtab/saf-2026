/**
 * 새 작품 추가 스크립트
 * CSV 파일: docs/추가 씨앗페 작가 - 시트1 (3).csv
 * 이미지 폴더: public/images/artworks/
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

// 새 작품 데이터 (CSV에서 수동 추출, 규칙에 맞게 정리)
const newArtworks = [
    {
        id: "35",
        artist: "김준권",
        title: "섬진淸流-2",
        description: "",
        profile: "김준권은 1956년 전남 영암 출생으로 1982년 홍익대학교 서양화 졸업, 1994년부터 1997년까지 중국 魯迅미술대학 목판화 연구원으로 활동했으며, 1997년에 한국 목판문화 연구소를 개설해 계속해서 목판화 작업을 이어나가고 있다.\n\n목판화 작업을 통해 민중미술운동에 참여한 작가이기도 하다. 작가는 1980년대 미술교육운동에 몰두하던 시기에 리놀륨 판화(Linoleum cut) 작업으로, 민중목판화의 양식적 특성을 보여준다.\n\n김준권의 수성 다색목판화는 한국 현대 산수화의 방향을 제시할 만큼 독보적 위치를 점유하고 있다고 판단된다.",
        size: "35x55cm",
        material: "수묵목판",
        year: "2020",
        edition: "",
        price: "₩4,000,000",
        history: "1955 전남 영암 출생\n1982 홍익대학교 졸업(서양화)\n1994~1997 중국 루쉰(魯迅) 미술대학 목판화 연구원 / 객원교수\n1996~ 중국 루쉰(魯迅) 미술대학 명예 부교수\n2017~ 한국 목판문화원 원장\n\n주요 작품 소장처: 국립현대미술관, 정부미술은행, 서울시립미술관, 제주현대미술관, 광주시립미술관 등"
    },
    {
        id: "36",
        artist: "김준권",
        title: "Blue Mt. -3",
        description: "",
        profile: "김준권은 1956년 전남 영암 출생으로 1982년 홍익대학교 서양화 졸업, 1994년부터 1997년까지 중국 魯迅미술대학 목판화 연구원으로 활동했으며, 1997년에 한국 목판문화 연구소를 개설해 계속해서 목판화 작업을 이어나가고 있다.",
        size: "50x33cm",
        material: "채묵목판",
        year: "2020",
        edition: "",
        price: "₩3,000,000",
        history: ""
    },
    {
        id: "37",
        artist: "김준권",
        title: "푸른 소나무",
        description: "",
        profile: "김준권은 1956년 전남 영암 출생으로 1982년 홍익대학교 서양화 졸업, 1994년부터 1997년까지 중국 魯迅미술대학 목판화 연구원으로 활동했으며, 1997년에 한국 목판문화 연구소를 개설해 계속해서 목판화 작업을 이어나가고 있다.",
        size: "45x80cm",
        material: "유성목판",
        year: "2023",
        edition: "",
        price: "₩8,000,000",
        history: ""
    },
    {
        id: "38",
        artist: "김준권",
        title: "Blue Night -4",
        description: "",
        profile: "김준권은 1956년 전남 영암 출생으로 1982년 홍익대학교 서양화 졸업, 1994년부터 1997년까지 중국 魯迅미술대학 목판화 연구원으로 활동했으며, 1997년에 한국 목판문화 연구소를 개설해 계속해서 목판화 작업을 이어나가고 있다.",
        size: "20x14cm",
        material: "유성목판",
        year: "2025",
        edition: "",
        price: "₩1,000,000",
        history: ""
    },
    {
        id: "39",
        artist: "김준권",
        title: "Blue Moon-3",
        description: "",
        profile: "김준권은 1956년 전남 영암 출생으로 1982년 홍익대학교 서양화 졸업, 1994년부터 1997년까지 중국 魯迅미술대학 목판화 연구원으로 활동했으며, 1997년에 한국 목판문화 연구소를 개설해 계속해서 목판화 작업을 이어나가고 있다.",
        size: "30x20cm",
        material: "유성목판",
        year: "2025",
        edition: "",
        price: "₩2,000,000",
        history: ""
    },
    {
        id: "40",
        artist: "한애규",
        title: "달을 든 여인",
        description: "",
        profile: "한애규(b.1953)는 서울대학교에서 응용미술과와 동 대학원에서 도예를 전공하고 프랑스 앙굴렘 미술학교를 졸업하였다. 국내외 다수의 개인전과 단체전에 참여하였다. 주요 소장처로는 국립현대미술관, 서울시립미술관, 서울역사박물관, 대전시립미술관, 전북도립미술관 등이 있다.",
        size: "확인 중",
        material: "테라코타",
        year: "2021",
        edition: "",
        price: "₩2,000,000",
        history: ""
    },
    {
        id: "41",
        artist: "심현희",
        title: "사소한 일상",
        description: "",
        profile: "심현희는 1980년대 후반부터 1990년대에 이르기까지 한국 화단에 존재했던 이분법적 틀을 거부하고 독자적인 노선을 견지해 온 작가입니다. 서울대학교 미술대학과 동 대학원에서 동양화를 전공하며 수묵과 인물 중심의 정통 교육을 이수했으나, 그는 당시 화단을 지배하던 민중미술의 거대 서사나 기성 동양화단의 수묵 중심주의 중 어디에도 안주하지 않았습니다.",
        size: "35x28cm",
        material: "캔버스에 아크릴",
        year: "2022",
        edition: "",
        price: "₩2,500,000",
        history: "서울대학교 미술대학 회화과 및 동 대학원 졸업\n\n개인전:\n1990 금호 미술관\n1991 송원화랑\n1992 토 아트 스페이스\n1994 서경 갤러리\n1996 금호 미술관\n1999 동산방 화랑\n\n수상:\n1982 중앙미술대전 장려상"
    },
    {
        id: "42",
        artist: "류준화",
        title: "책의 무게",
        description: "",
        profile: "류준화는 1990년대부터 현재까지 한국 여성주의 미술의 최전선에서 활동하며, 가부장적 사회가 규정한 여성의 역할을 해체하고 그 속에 감춰진 억압의 굴레를 시각화해 온 작가입니다. 그의 예술 세계는 단순히 여성을 묘사하는 데 그치지 않고, 사회적 금기에 도전하거나 남성 중심적인 시각 시스템을 전복시키는 강력한 예술적 실천을 지향합니다.",
        size: "45.5x38cm",
        material: "캔버스에 아크릴",
        year: "2023",
        edition: "",
        price: "₩2,800,000",
        history: ""
    },
    {
        id: "43",
        artist: "최경선",
        title: "날마다",
        description: "",
        profile: "최경선 작가는 자연을 소재로 꾸준히 삶의 생동, 슬픔, 치유 등을 화폭에 담아왔다. 이번 전시에서 새롭게 선보이는 신작을 포함한 작품들은 '마음의 유영(遊泳)'을 표현한 작품들이다. 작가는 공중제비와 같은 마음의 동선에 대해 자주 사유한다.",
        size: "53x41.2cm",
        material: "Oil on canvas",
        year: "2022",
        edition: "",
        price: "₩2,800,000",
        history: "개인전:\n2020년 '미동' / 자하미술관, 서울\n2019년 '生·물(水)' / 나무화랑, 서울\n2017년 '귀가' / 창룡마을창작센터, 경기\n2017년 '비오톱의 저녁' / 나무화랑, 서울\n2015년 '흐르는 빛' / 오산시립미술관, 경기"
    },
    {
        id: "44",
        artist: "김주호",
        title: "내 손끝에 은하수",
        description: "",
        profile: "김주호는 서울대학교 미술대학 조소과와 동 대학원을 졸업하고, 개인전 및 다수의 기획전에 참여해 왔으며 국립현대미술관, 대전시립미술관, 소마미술관 등에 작품이 소장되어 있다. 그는 사람과 일상의 풍경을 작가 특유의 사색과 여유로 재해석하여 입체 혹은 평면작업들을 일관되게 이끌어 왔다.",
        size: "확인 중",
        material: "질구이",
        year: "2020",
        edition: "",
        price: "₩3,000,000",
        history: "학력:\n1986 서울대학교 대학원 조소과 졸업\n1976 서울대학교 미술대학 조소과 졸업\n\n작품 소장:\n국립현대미술관, 대전시립미술관, 소마미술관, 모란미술관, 국립민속박물관 등"
    },
    {
        id: "45",
        artist: "김상구",
        title: "No 895",
        description: "",
        profile: "김상구는 1945년 서울에서 태어나 홍대 서양화과와 동대학원을 졸업하였다. 그는 현대 산업사회의 기계화시대에 역행하는 듯한 목판화와 철저한 수공적 공정을 고수하고 있는 보기 드문 작가이다. 목각예술은 현란한 세련미 대신에 우직함과 단순함을 특징으로 하는 동양적 장인정신과 서민적 속성을 그 뿌리로 한다.",
        size: "180x30cm",
        material: "한지에 목판화",
        year: "2005",
        edition: "",
        price: "₩4,000,000",
        history: "학력:\n1967년 홍익대학교 서양화 학사\n홍익대학교 미술교육대학원 석사\n\n기관 경력:\n한국판화가협회 회원\n대한민국미술대전 심사위원\n\n전시:\n1978년-2009년, 개인전 (20회)"
    },
    {
        id: "46",
        artist: "류연복",
        title: "북한산을 거닐다-2",
        description: "",
        profile: "류연복은 경기도 가평에서 출생하여 서울에서 학업을 하다가 1977년 홍익대 미대에 입학하면서 본격적으로 민중미술의 세계에 뛰어든 작가이다. '아름다움은 많은 이들이 누릴 수 있어야 한다.'는 소박한 믿음은 그가 대학을 졸업하던 1984년 서울 미술공동체를 결성하고 벽화팀 '십장생'에서 벽화운동을 이끄는 원동력이 되었다.",
        size: "38x165cm",
        material: "한지에 목판화",
        year: "2013",
        edition: "",
        price: "₩4,000,000",
        history: "학력:\n1984년 홍익대학교 미술대학 회화과 학사\n\n기관 경력:\n1985년 서울미술공동체 대표\n1991년 민족미술협의회 사무국장"
    },
    {
        id: "47",
        artist: "이윤엽",
        title: "튼튼한 감나무",
        description: "",
        profile: "이윤엽은 농부나 노동자, 주변의 소박한 사물들을 재치 있게 표현하는데 흰 여백 위에 굵은 선을 사용하여 투박하면서도 정겨운 목판화의 특징을 잘 보여준다. 그에게 목판화는 나무를 깎고 작업의 도구를 다루며 그의 몸을 움직이게 만드는 매체로써, 노동을 이해하는 사람들 사이의 공감을 만들어 낸다.",
        size: "56x76cm",
        material: "확인 중",
        year: "2025",
        edition: "에디션",
        price: "₩1,000,000",
        history: "학력:\n1993, 수원대 서양화과 입학\n1997, 수원대 서양화과 졸업\n\n수상:\n2012, 구본주예술상 수상"
    },
    {
        id: "48",
        artist: "이윤엽",
        title: "북한산 2025",
        description: "",
        profile: "이윤엽은 농부나 노동자, 주변의 소박한 사물들을 재치 있게 표현하는데 흰 여백 위에 굵은 선을 사용하여 투박하면서도 정겨운 목판화의 특징을 잘 보여준다.",
        size: "56x76cm",
        material: "확인 중",
        year: "2025",
        edition: "에디션",
        price: "₩1,000,000",
        history: ""
    },
    {
        id: "49",
        artist: "이윤엽",
        title: "행복한 나날 2020",
        description: "",
        profile: "이윤엽은 농부나 노동자, 주변의 소박한 사물들을 재치 있게 표현하는데 흰 여백 위에 굵은 선을 사용하여 투박하면서도 정겨운 목판화의 특징을 잘 보여준다.",
        size: "56x76cm",
        material: "확인 중",
        year: "2020",
        edition: "에디션",
        price: "₩1,000,000",
        history: ""
    },
    {
        id: "50",
        artist: "이윤엽",
        title: "나를 안는다",
        description: "",
        profile: "이윤엽은 농부나 노동자, 주변의 소박한 사물들을 재치 있게 표현하는데 흰 여백 위에 굵은 선을 사용하여 투박하면서도 정겨운 목판화의 특징을 잘 보여준다.",
        size: "30x42cm",
        material: "확인 중",
        year: "2025",
        edition: "에디션",
        price: "₩500,000",
        history: ""
    },
    {
        id: "51",
        artist: "이윤엽",
        title: "붉은 봄 매화",
        description: "",
        profile: "이윤엽은 농부나 노동자, 주변의 소박한 사물들을 재치 있게 표현하는데 흰 여백 위에 굵은 선을 사용하여 투박하면서도 정겨운 목판화의 특징을 잘 보여준다.",
        size: "41x41cm",
        material: "확인 중",
        year: "2018",
        edition: "에디션",
        price: "₩700,000",
        history: ""
    },
    {
        id: "52",
        artist: "최은경",
        title: "밤의 템포",
        description: "밤 산책길에서 본 풍경을 담았다. 같은 장면을 시간차를 두고 다른 크기로 여러 번 그렸는데 그중에 첫 그림이다. 일상의 중심에서, 사회의, 필요성의 영역에서 약간 비켜나 있지만 또 언제나 우리 곁에서, 일상의 반경에서 결코 벗어나 본 적 없는, 날씨 같은, 일상의 곁두리 경치랄까.",
        profile: "최은경은 회화의 '붓질'이란 삶의 구체성을 표현하기 위한 전제로 다시 조우해야만 하는 잊힌 (원)기억에 의해 직조되는(재구성되는) 허구의 내러티브이자 실재의 사실성이 아닐까 하는 추론으로 작업한다.",
        size: "53x65.1cm",
        material: "Oil on canvas",
        year: "2023",
        edition: "",
        price: "₩3,500,000",
        history: "학력:\n2006 한국예술종합학교 미술원 조형예술과 예술전문사 졸업\n1997 덕성여자대학교 예술대학 서양화과 졸업\n\n개인전:\n2024 《모퉁이로 미끄러지는 풍경(들)》, 아트스페이스 보안 1, 서울\n2023 《발길 따라 유유히》, 오에이오에이, 서울\n\n작품소장:\n국립현대미술관 미술은행, 서울시립미술관, 송은문화재단 등"
    },
    {
        id: "53",
        artist: "최은경",
        title: "나무하늘 물그림자",
        description: "어느 해, 보름 정도 머물렀던 진도에서 버스를 기다리다가 문득 나무 따라 끝없을 것 같은 겨울 하늘의 흰 구름을 하염없이 바라보았다.",
        profile: "최은경은 회화의 '붓질'이란 삶의 구체성을 표현하기 위한 전제로 다시 조우해야만 하는 잊힌 (원)기억에 의해 직조되는(재구성되는) 허구의 내러티브이자 실재의 사실성이 아닐까 하는 추론으로 작업한다.",
        size: "72.7x60.6cm",
        material: "Oil on canvas",
        year: "2022",
        edition: "",
        price: "₩4,500,000",
        history: ""
    },
    {
        id: "54",
        artist: "최은경",
        title: "차창 밖, 겨울 능선",
        description: "차창 밖으로 무심코 보게 된 전라도 정읍 외곽 일대의 겨울 풍경이다. 부모님 집이었던 고부면 관청리에서 정읍 시내를 오고 갈 때마다 차창 밖으로 본 정경(情景)들로 10여 년 전에 찍은 사진 이미지를 토대로 다시 그렸다.",
        profile: "최은경은 회화의 '붓질'이란 삶의 구체성을 표현하기 위한 전제로 다시 조우해야만 하는 잊힌 (원)기억에 의해 직조되는(재구성되는) 허구의 내러티브이자 실재의 사실성이 아닐까 하는 추론으로 작업한다.",
        size: "72.7x60.6cm",
        material: "Oil on canvas",
        year: "2023",
        edition: "",
        price: "₩4,500,000",
        history: ""
    }
];

// 이미지 파일 매핑 및 검증
newArtworks.forEach(artwork => {
    const imgFile = imageMap[artwork.id];
    if (imgFile) {
        artwork.image = imgFile;
    } else {
        console.error(`❌ ID ${artwork.id}: 이미지 파일 없음!`);
        artwork.image = `${artwork.id}.jpg`; // 기본값
    }
    // shopUrl은 비워둠 (사용자가 아직 없다고 함)
    artwork.shopUrl = "";
});

// TypeScript 파일에 추가
const artworksPath = path.join(__dirname, '../content/saf2026-artworks.ts');
let content = fs.readFileSync(artworksPath, 'utf-8');

// 마지막 }]; 앞에 새 작품 추가
const insertionPoint = content.lastIndexOf('}];');
if (insertionPoint === -1) {
    console.error('삽입 위치를 찾을 수 없습니다.');
    process.exit(1);
}

// 새 작품들을 문자열로 변환
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

// 삽입
const newContent = content.substring(0, insertionPoint + 1) + ',\n' + newArtworksStr + '\n' + content.substring(insertionPoint + 1);

fs.writeFileSync(artworksPath, newContent, 'utf-8');

console.log(`✅ ${newArtworks.length}개 작품 추가 완료!`);
console.log('\n추가된 작품:');
newArtworks.forEach(a => {
    console.log(`  - ID ${a.id}: ${a.artist} - ${a.title} (${a.image})`);
});

console.log('\n⚠️  주의: shopUrl은 아직 비어있습니다. 나중에 추가해주세요.');
