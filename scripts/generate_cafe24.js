const fs = require('fs');
const path = require('path');

const batchPath = path.join(__dirname, '../content/artworks-batches/batch-007.ts');
const artistsPath = path.join(__dirname, '../content/artists-data.ts');
const templatePath = path.join(__dirname, '../docs/cafe24-products-218-227.csv');
const outputPath = path.join(__dirname, '../docs/cafe24-products-248-274.csv');

// Helper to parse JS object string partially
function parseBatchFile(content) {
  const artworks = [];
  // Regex to match object blocks in the array
  const objectRegex = /{\s*id:\s*'([^']*)'[\s\S]*?}/g;
  let match;

  while ((match = objectRegex.exec(content)) !== null) {
    const block = match[0];
    const id = (block.match(/id:\s*'([^']*)'/) || [])[1];
    const artist = (block.match(/artist:\s*'([^']*)'/) || [])[1];
    const title = (block.match(/title:\s*'([^']*)'/) || [])[1];
    // Description: handle template literals and single quotes
    let description = '';
    const descMatch = block.match(/description:\s*`([\s\S]*?)`/);
    if (descMatch) {
      description = descMatch[1];
    } else {
      const descMatchSingle = block.match(/description:\s*'([\s\S]*?)'/);
      if (descMatchSingle) description = descMatchSingle[1];
    }

    const size = (block.match(/size:\s*'([^']*)'/) || [])[1];
    const material = (block.match(/material:\s*'([^']*)'/) || [])[1];
    const year = (block.match(/year:\s*'([^']*)'/) || [])[1];
    const edition = (block.match(/edition:\s*'([^']*)'/) || [])[1];
    const price = (block.match(/price:\s*'([^']*)'/) || [])[1];
    const image = (block.match(/image:\s*'([^']*)'/) || [])[1];

    if (id) {
      artworks.push({
        id,
        artist,
        title,
        description,
        size,
        material,
        year,
        edition,
        price,
        image,
      });
    }
  }
  return artworks;
}

function parseArtistsData(content) {
  const artists = {};
  // Regex: key: { ... }
  // Simplified: name: { profile: `...`, history: `...` }
  // We just need profile intro (first paragraph or sentence?)
  // Template uses "작가 소개" -> full profile.

  // Regex to capture artist keys and their blocks
  const artistBlockRegex = /([가-힣a-zA-Z0-9]+):\s*{\s*profile:\s*`([\s\S]*?)`,\s*history:/g;
  let match;
  while ((match = artistBlockRegex.exec(content)) !== null) {
    const name = match[1];
    const profile = match[2];
    artists[name] = profile;
  }
  return artists;
}

function getGenre(material, title) {
  if (!material) return '회화';
  if (
    material.includes('canvas') ||
    material.includes('유채') ||
    material.includes('아크릴') ||
    material.includes('수묵')
  )
    return '회화';
  if (material.includes('paper') && material.includes('print')) return '사진';
  if (material.includes('목판') || material.includes('실크스크린') || material.includes('Print'))
    return '판화';
  if (material.includes('resin') || material.includes('조각')) return '조각';
  if (material.includes('한지') && (material.includes('채색') || material.includes('먹')))
    return '회화'; // or 민화 based on artist
  return '회화'; // default
}

function generateHTML(artwork, artistProfile) {
  let edInfo = '';
  if (artwork.edition) {
    edInfo = ` | ${artwork.edition}`;
  }

  // Clean profile for HTML
  const cleanProfile = artistProfile ? artistProfile.trim() : '';

  return (
    `<div style="font-family: 'Noto Sans KR', sans-serif; line-height: 1.8; color: #333;">` +
    `<div style="margin-bottom: 30px;">` +
    `<h2 style="font-size: 24px; margin-bottom: 10px;">${artwork.title}</h2>` +
    `<p style="font-size: 18px; color: #666; margin-bottom: 5px;">${artwork.artist}</p>` +
    `<p style="color: #888;">${artwork.material} | ${artwork.size} | ${artwork.year}${edInfo}</p>` +
    `</div>` +
    `<div style="margin-bottom: 30px;">` +
    `<h3 style="font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 15px;">작가 소개</h3>` +
    `<p style="white-space: pre-line;">${cleanProfile}</p>` +
    `</div></div>`
  );
}

function escapeCSV(field) {
  if (field === undefined || field === null) return '';
  const stringField = String(field);
  if (stringField.includes('"') || stringField.includes(',') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return `"${stringField}"`;
}

function run() {
  const batchContent = fs.readFileSync(batchPath, 'utf-8');
  const artistsContent = fs.readFileSync(artistsPath, 'utf-8');
  const templateCSV = fs.readFileSync(templatePath, 'utf-8');

  const artworks = parseBatchFile(batchContent);
  const artists = parseArtistsData(artistsContent);

  const templateLines = templateCSV.split('\n');
  const header = templateLines[0].trim();

  // New columns
  // Use original header strictly
  const newHeader = header;

  const rows = [newHeader];

  artworks.forEach((art) => {
    const priceNum = art.price.replace(/[^0-9]/g, '');
    const genre = getGenre(art.material, art.title);
    // Correction: If artist is Seo Gong-im or Lee Moon-hyeong (Minhwa), set genre Mingwa
    let finalGenre = genre;
    if (['서공임', '이문형'].includes(art.artist)) finalGenre = '민화';

    const summary = `${finalGenre} | ${art.material} | ${art.size}`;
    const profile = artists[art.artist] || '';

    // Basic profile for short desc (first sentence?)
    // Template 218-227 uses full profile intro for "상품 간략설명"
    const shortDesc = profile;

    const htmlDesc = generateHTML(art, profile);

    // Keywords
    const keywords = `${art.artist},${finalGenre},씨앗페,SAF2026,미술,예술,작품`;

    // Construct row based on template columns
    // Note: This is fragile if columns change, but strictly follows 218-227 structure (cols 1-89)
    // I will map manually to the observed structure.

    const colValues = [];
    // 1. 상품코드 (Empty for new)
    colValues.push('');
    // 2. 자체 상품코드
    colValues.push(`SAF2026-${art.id}`);
    // 3. 진열상태
    colValues.push('Y');
    // 4. 판매상태
    colValues.push('Y');
    // 5. 상품분류 번호 (43)
    colValues.push('43');
    // 6. 신상품영역
    colValues.push('Y');
    // 7. 추천상품영역
    colValues.push('Y');
    // 8. 상품명
    colValues.push(`${art.title} - ${art.artist}`);
    // 9. 영문 상품명
    colValues.push('');
    // 10. 상품명(관리용)
    colValues.push(`[${art.id}] ${art.artist}`);
    // 11. 공급사 상품명
    colValues.push('');
    // 12. 모델명
    colValues.push('');
    // 13. 상품 요약설명
    colValues.push(summary);
    // 14. 상품 간략설명
    colValues.push(shortDesc);
    // 15. 상품 상세설명
    colValues.push(htmlDesc);
    // 16. 모바일 상품 상세설명 설정 (A = use PC)
    colValues.push('A');
    // 17. 모바일 상품 상세설명
    colValues.push('');
    // 18. 검색어설정
    colValues.push(keywords);
    // 19. 과세구분 (B = Taxable? Or Tax Free? Art is usually Tax Free '면세'. B might be 'Tax Free' code in Cafe24)
    // Template uses 'B'. Stick to it.
    colValues.push('B');
    // 20. 소비자가
    colValues.push(priceNum);
    // 21. 공급가
    colValues.push(priceNum);
    // 22. 상품가
    colValues.push(priceNum);
    // 23. 판매가
    colValues.push(priceNum);
    // 24. 판매가 대체문구 사용
    colValues.push('N');
    // 25. 판매가 대체문구
    colValues.push('');
    // 26. 주문수량 제한 기준
    colValues.push('');
    // 27. 최소 주문수량(이상)
    colValues.push('1');
    // 28. 최대 주문수량(이하) (Template has '1')
    colValues.push('1');
    // 29. 적립금
    colValues.push('');
    // 30. 적립금 구분
    colValues.push('');
    // 31. 공통이벤트 정보
    colValues.push('');
    // 32. 성인인증
    colValues.push('N');
    // 33. 옵션사용
    colValues.push('N');
    // 34. 품목 구성방식
    colValues.push('');
    // 35. 옵션 표시방식
    colValues.push('');
    // 36. 옵션세트명
    colValues.push('');
    // 37. 옵션입력
    colValues.push('');
    // 38. 옵션 스타일
    colValues.push('');
    // 39. 버튼이미지 설정
    colValues.push('');
    // 40. 색상 설정
    colValues.push('');
    // 41. 필수여부
    colValues.push('');
    // 42. 품절표시 문구
    colValues.push('품절');
    // 43. 추가입력옵션
    colValues.push('');
    // 44. 추가입력옵션 명칭
    colValues.push('');
    // 45. 추가입력옵션 선택/필수여부
    colValues.push('');
    // 46. 입력글자수(자)
    colValues.push('');
    // 47. 이미지등록(상세)
    colValues.push(art.image);
    // 48. 이미지등록(목록)
    colValues.push(art.image);
    // 49. 이미지등록(작은목록)
    colValues.push(art.image);
    // 50. 이미지등록(축소)
    colValues.push(art.image);
    // 51. 이미지등록(추가)
    colValues.push('');
    // 52. 제조사
    colValues.push('');
    // 53. 공급사
    colValues.push('');
    // 54. 브랜드
    colValues.push('');
    // 55. 트렌드
    colValues.push('');
    // 56. 자체분류 코드
    colValues.push('');
    // 57. 제조일자
    colValues.push('');
    // 58. 출시일자
    colValues.push('');
    // 59. 유효기간 사용여부
    colValues.push('N');
    // 60-89: Empty strings based on template visual count or just fill empty until end
    // Let's explicitly look at cols from template... template has ~90 columns.
    // I will just add empty strings for the rest of standard columns before my custom ones.
    // Or safer: loop until column 89 (last one in template seems to be '메모').

    const definedCols = colValues.length;
    const totalTemplateCols = 89; // Based on header count (I counted roughly, let's verify)
    // Header count validation
    const headerCols = header.split('","').length; // simple split

    for (let i = definedCols; i < headerCols; i++) {
      colValues.push('');
    }

    // Stop adding custom columns. strict template match.
    // colValues.push('Y');
    // colValues.push('1');
    // colValues.push('0');

    // Escape and Join
    const csvRow = colValues.map((v) => escapeCSV(v)).join(',');
    rows.push(csvRow);
  });

  // Add BOM for Excel compatibility (Cafe24 often needs this for UTF-8)
  const BOM = '\uFEFF';
  fs.writeFileSync(outputPath, BOM + rows.join('\n'), 'utf-8');
  console.log(`Generated ${outputPath} with ${rows.length - 1} products.`);
}

run();
