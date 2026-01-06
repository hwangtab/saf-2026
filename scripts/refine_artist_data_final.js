const fs = require('fs');
const path = require('path');

// Read CSV file
const csvPath = path.join(__dirname, '../docs/2026 씨앗페 참가자 정보.xlsx - Sheet1 (2).csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV - handle multiline fields carefully
function parseCSV(content) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip \n in \r\n
      }
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField);
        if (currentRow.length > 1) {
          // Skip empty rows
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      }
    } else {
      currentField += char;
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.length > 1) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// Smart formatting specifically for artist history
function formatHistory(text) {
  if (!text) return '';

  let cleaned = text;
  cleaned = cleaned.replace(/\[출처\]\s*뉴스아트\s*\(https?:\/\/www\.news-art\.co\.kr\)/gi, '');
  cleaned = cleaned.replace(/\[출처\]\s*뉴스아트/gi, '');
  cleaned = cleaned.replace(/https?:\/\/www\.news-art\.co\.kr/gi, '');
  cleaned = cleaned.replace(/\|\|\|/g, '\n');
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const lines = cleaned.split('\n');
  const formattedLines = [];

  // Expanded section header regex
  const sectionHeaderRegex =
    /^(개인전|단체전|주요 경력|학력|수상|작품 소장|소장|전시 경력|그룹전|기획전|아트페어|레지던시|출판|출판물|워크샵|활동|현재|경력|Solo Exhibition|Group Exhibition|Awards|Collection|Education|Selected Solo Exhibitions|Selected Group Exhibitions)\s*$/i;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue;

    // Check if this line looks like a section header
    const isSectionHeader = sectionHeaderRegex.test(line.replace(/[:\[\]]/g, '').trim());

    // Add empty line before section headers (unless it's the very first line)
    if (isSectionHeader && formattedLines.length > 0) {
      formattedLines.push('');
    }

    formattedLines.push(line);
  }

  return formattedLines.join('\n');
}

// Formatting for profile/description
function formatProse(text, artistName) {
  if (!text) return '';

  let cleaned = text;
  cleaned = cleaned.replace(/\[출처\]\s*뉴스아트\s*\(https?:\/\/www\.news-art\.co\.kr\)/gi, '');
  cleaned = cleaned.replace(/\[출처\]\s*뉴스아트/gi, '');
  cleaned = cleaned.replace(/https?:\/\/www\.news-art\.co\.kr/gi, '');

  // Fix duplicate name issue (e.g. "이익태 이익태는")
  if (artistName) {
    const name = artistName.trim();
    const duplicatePattern = new RegExp(`^${name}\\s+${name}`, 'i');
    if (duplicatePattern.test(cleaned)) {
      cleaned = cleaned.replace(duplicatePattern, name);
    }
  }

  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split into lines to detect "sub-headers" in profile
  const lines = cleaned.split('\n');
  const formattedLines = [];

  // Regex for profile sub-headers (e.g. "초기 경력", "미국 활동")
  const subHeaderRegex =
    /^(초기 경력|미국 활동|귀국 후|예술 철학|작품 세계|EDUCATION|AWARD|SOLO EXHIBITION|GROUP EXHIBITION)\s*$/i;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) {
      // If explicitly empty line, keep it (double newline = paragraph break)
      if (formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== '') {
        formattedLines.push('');
      }
      continue;
    }

    // If line is short and looks like a header, add space before it
    const isHeader =
      subHeaderRegex.test(line) ||
      (line.length < 15 &&
        !line.endsWith('다.') &&
        !line.endsWith('다') &&
        /^[가-힣\s]+$/.test(line) &&
        lines[i + 1]);

    if (isHeader && formattedLines.length > 0 && formattedLines[formattedLines.length - 1] !== '') {
      formattedLines.push('');
    }

    formattedLines.push(line);
  }

  return formattedLines.join('\n');
}

// Parse CSV
const rows = parseCSV(csvContent);
console.log(`Parsed ${rows.length} rows from CSV`);

const artworkDataMap = new Map();

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  const artistName = row[1]; // Name column
  const imageFilename = row[12];

  if (!imageFilename || imageFilename.trim() === '') continue;

  const id = imageFilename.trim();
  const profile = formatProse(row[9], artistName);
  const description = formatProse(row[10], artistName);
  const history = formatHistory(row[11]);

  if (profile || description || history) {
    artworkDataMap.set(id, {
      profile,
      description,
      history,
    });
  }
}

// Update artworks.ts
const artworksPath = path.join(__dirname, '../content/saf2026-artworks.ts');
let artworksContent = fs.readFileSync(artworksPath, 'utf-8');

const artworksMatch = artworksContent.match(/export const artworks: Artwork\[\] = (\[[\s\S]*\]);/);
if (!artworksMatch) {
  console.error('Could not find artworks array in file');
  process.exit(1);
}

const artworks = JSON.parse(artworksMatch[1]);
let updated = 0;

artworks.forEach((artwork, index) => {
  const data = artworkDataMap.get(artwork.id);

  if (data) {
    // Always update to ensure consistency across ALL artworks
    artworks[index].profile = data.profile || '';
    artworks[index].description = data.description || '';
    artworks[index].history = data.history || '';

    updated++;

    // Preview for verifying
    if (artwork.id === '25') {
      // Yi Ik-tae
      console.log(`\n--- Artwork ${artwork.id} Profile Preview ---`);
      console.log(artworks[index].profile);
    }
  }
});

console.log(`\nUpdated ${updated} artworks`);

const interfaceSection = `export interface Artwork {
  id: string;
  artist: string;
  title: string;
  description: string; // 작가 노트
  profile?: string; // 작가 프로필
  history?: string; // 작가 이력
  size: string; // 크기
  material: string; // 재료
  year: string; // 년도
  edition: string; // 에디션 넘버 (빈 문자열이면 원본)
  price: string;
  image: string; // 이미지 파일명
  shopUrl?: string; // Cafe24 상품 상세 페이지 URL
}

`;

const artworksArrayJson = JSON.stringify(artworks, null, 2);

const newContent =
  interfaceSection +
  'export const artworks: Artwork[] = ' +
  artworksArrayJson +
  ';\n\n' +
  `export function getAllArtworks(): Artwork[] {
  return artworks;
}

export function getArtworkById(id: string): Artwork | undefined {
  return artworks.find(artwork => artwork.id === id);
}
`;

fs.writeFileSync(artworksPath, newContent, 'utf-8');
