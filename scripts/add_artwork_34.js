const fs = require('fs');
const path = require('path');

const artworksPath = path.join(__dirname, '../content/saf2026-artworks.ts');
let content = fs.readFileSync(artworksPath, 'utf-8');

// 마지막 객체의 닫는 괄호 '}' 뒤, 배열 닫는 괄호 ']' 앞을 찾아서 삽입
const lastBraceIndex = content.lastIndexOf('}');
if (lastBraceIndex === -1) {
    console.error("Could not find end of artworks array");
    process.exit(1);
}

const newArtwork = `,
  {
    "id": "34",
    "artist": "이호철",
    "title": "어린왕자",
    "description": "",
    "profile": "이호철 작가의 그림에는 닫혀 있는 세계와 열려 있는 세계의 묘한 함수관계 같은 것이 암시되어 있다. 작가의 작품에 자주 등장 하는 서랍이나 틀의 이미지는 닫힘과 열림의 경계에 있는 하나의 문지방 역할을 하기도 하며, 백자 뿐 아니라 대접, 흔히 사발이라 부르는 다완은 담백하고 수더분한 자태를 지닌다. 두툼한 기벽 외면의 굵은 물레 자국의 빠른 움직임이 순식간에 휙 지나간 듯 도자기 외벽에 거칠게 나 있는 것을 그대로 그렸다. 물의 흐름처럼, 바람이 불어오는 것 처럼 도체 전면을 분장하여 자유로움을 표현하고 있는 이호철 작가의 달항아리 작품은 백토의 자연스러운 흔적을 상당히 정교하고 섬세하게 묘사해 내고 있다. 더 없는 회화적인 맛을 풍성하게 표현하고 있는 백토는 충분히 매력적인 붓질의 회화 작품으로 추상화처럼 느껴진다. 이호철 작가는 홍익대학교 서양화과를 거쳐 동대학교 대학원 서양화과를 졸업한 후 1990년 금호 미술관에서의 첫 개인전을 시작으로 노화랑, 표갤러리, 아라리오, 선화랑 등 다수의 개인전을 가졌으며, 국제 Impact Art Festival (일본, 경도(京都)), 제8회 JAALA (TOKYO, JAPAN), 한국현대회화 50년 조망전(서울 갤러리) 등 국내외 단체전에 150여회 참여하였다.",
    "size": "",
    "material": "",
    "year": "",
    "edition": "",
    "price": "₩5,000,000",
    "image": "34.png"
  }`;

// 배열 끝에 추가
const newContent = content.substring(0, lastBraceIndex + 1) + newArtwork + content.substring(lastBraceIndex + 1);

fs.writeFileSync(artworksPath, newContent, 'utf-8');
console.log("Adding artwork ID 34 success.");
