const fs = require('fs');
const path = require('path');

const artworksPath = path.join(__dirname, '../content/saf2026-artworks.ts');
let content = fs.readFileSync(artworksPath, 'utf-8');

// 1. 잘못 추가된 부분 제거 (getArtworkById 뒤에 붙은 콤마와 객체)
// 523줄 부근: `},` 부터 시작되는 이상한 덩어리
const mistakeMarker = `},
  {
    "id": "34",`;
const mistakeIdx = content.lastIndexOf(mistakeMarker);

if (mistakeIdx !== -1) {
    // mistakeIdx는 `},`의 시작점. 즉 `getArtworkById`의 닫는 괄호 `}`. 
    // 원래 코드는 `}` 였을 것임.
    // 하지만 `getArtworkById`는 `return ...; }` 형태일 것임.
    // 잘못된 코드는 `getArtworkById`의 `}` 뒤에 `,`가 붙고 객체가 시작됨.

    // 복구: 해당 인덱스부터 파일 끝까지 날리고, 원래 있었어야 할 뒷부분 복구?
    // 아니면 그냥 mistakeIdx 위치에서 끊고 파일 끝까지 삭제?
    // 하지만 뒤에 아무것도 없었나? 파일 끝이었나?

    // 아니, 515줄에 `];`가 있고 그 뒤에 함수들이 정의되어 있었음.
    // 잘못된 삽입은 523줄(함수 끝) 뒤에 일어남.

    // 따라서 523줄의 `},`를 `}`로 바꾸고 그 뒤의 내용을 다 지워야 함... 이 아니네.
    // 추가된 문자열이 `, \n { "id": "34" ... }` 였음.
    // 이게 `getArtworkById`의 `}` 뒤에 붙었음.

    // content를 잘라내서 복구
    // `mistakeIdx`는 `},`의 시작 위치.
    // `content.substring(0, mistakeIdx + 1)` 하면 `}`까지.

    content = content.substring(0, mistakeIdx + 1);
    // 이제 파일 끝은 `getArtworkById`의 `}`.
}

// 2. 올바른 위치에 삽입
// `];` 를 찾아야 함. (배열의 끝)
// 하지만 파일 끝부분에 헬퍼 함수가 있으므로 `lastIndexOf` 쓰면 안되고, 
// `export const artworks = [` 부터 시작해서 그에 맞는 짝 `];`을 찾거나,
// `export function getAllArtworks` 바로 앞의 `];`를 찾아야 함.

const arrayEndParams = `];

export function getAllArtworks`;

const arrayEndIdx = content.indexOf(arrayEndParams);

if (arrayEndIdx === -1) {
    // 혹시 사이에 공백이 다를 수 있음.
    // `];`만 찾되, 파일 중간쯤에 있는 것.
    // `export const artworks` 위치 찾고 그 뒤에 나오는 첫 `];`
    const itemsStart = content.indexOf('export const artworks: Artwork[] = [');
    const itemsEnd = content.indexOf('];', itemsStart);

    if (itemsEnd !== -1) {
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

        content = content.substring(0, itemsEnd) + newArtwork + content.substring(itemsEnd);

        fs.writeFileSync(artworksPath, content, 'utf-8');
        console.log("Fixed and added artwork ID 34 correctly.");

    } else {
        console.error("Could not find array end");
    }
} else {
    // arrayEndParams 찾았으면 거기서 처리
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

    // 같은 로직
    content = content.substring(0, arrayEndIdx) + newArtwork + content.substring(arrayEndIdx);
    fs.writeFileSync(artworksPath, content, 'utf-8');
    console.log("Fixed and added artwork ID 34 correctly (using strict match).");
}
