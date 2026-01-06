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

  // 1. Initial cleanup
  let cleaned = text;
  cleaned = cleaned.replace(/\[출처\]\s*뉴스아트\s*\(https?:\/\/www\.news-art\.co\.kr\)/gi, '');
  cleaned = cleaned.replace(/\[출처\]\s*뉴스아트/gi, '');
  cleaned = cleaned.replace(/https?:\/\/www\.news-art\.co\.kr/gi, '');
  cleaned = cleaned.replace(/\|\|\|/g, '\n');
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 2. Split by lines and process
  const lines = cleaned.split('\n');
  const formattedLines = [];

  // Regex to identify section headers
  const sectionHeaderRegex =
    /^(개인전|단체전|주요 경력|학력|수상|작품 소장|소장|전시 경력|그룹전|기획전|아트페어|레지던시|출판|워크샵|활동|현재|Solo Exhibition|Group Exhibition|Awards|Collection|Education)\s*$/i;
  // Regex to identify list items (starts with year, dot, dash, etc)
  const listItemRegex = /^(\d{4}|\d{2}\s?[-~]\s?\d{2}|\d{2}년|\-|•|·)/;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    if (!line) continue; // Skip empty lines first

    // Check if this line is a section header
    const isSectionHeader = sectionHeaderRegex.test(line.replace(/[:]/g, '').trim());

    // Add empty line before section headers (unless it's the very first line)
    if (isSectionHeader && formattedLines.length > 0) {
      formattedLines.push('');
    }

    // Check if previous line was a section header, if so, don't add extra space?
    // Actually, we are rebuilding the list, so we just push the line.

    formattedLines.push(line);

    // Logic for "tight" grouping:
    // We already skipped empty lines above.
    // So "List Item A" -> "List Item B" will strictly follow each other without blank lines.
    // Only "Section Header" gets a blank line before it.
  }

  // Join lines. Since we stripped all empty lines from input and only added them intelligently,
  // this should result in tight lists with spaced sections.
  return formattedLines.join('\n');
}

// Formatting for profile/description - usually prose
function formatProse(text) {
  if (!text) return '';

  let cleaned = text;
  cleaned = cleaned.replace(/\[출처\]\s*뉴스아트\s*\(https?:\/\/www\.news-art\.co\.kr\)/gi, '');
  cleaned = cleaned.replace(/\[출처\]\s*뉴스아트/gi, '');
  cleaned = cleaned.replace(/https?:\/\/www\.news-art\.co\.kr/gi, '');

  // Combine single lines into paragraphs, keep double newlines as paragraph breaks
  // But wait, user said data has weird breaks.

  // Let's preserve explicit double breaks as paragraphs, but merge single breaks?
  // Or just clean up excessive spacing.

  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split paragraphs by 2+ newlines
  const paragraphs = cleaned.split(/\n{2,}/);

  // Process each paragraph
  const formattedParagraphs = paragraphs.map((p) => {
    // Within a paragraph, replace single newlines with space to make it continuous text
    // (unless it looks like a poem or list, but for profile it's usually text)
    // However, some profiles might be formatted as lists.
    // Let's just trim lines and keep single newlines if they are likely prose flow.

    // Safer approach: Just remove excessive whitespace and keep single lines
    return p
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l)
      .join('\n');
  });

  return formattedParagraphs.join('\n\n');
}

// Parse CSV
const rows = parseCSV(csvContent);
console.log(`Parsed ${rows.length} rows from CSV`);

const artworkDataMap = new Map();

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];
  const imageFilename = row[12];

  if (!imageFilename || imageFilename.trim() === '') continue;

  const id = imageFilename.trim();
  const profile = formatProse(row[9]);
  const description = formatProse(row[10]);
  const history = formatHistory(row[11]);

  // Special check for Artwork 29 (Kim Jonghwan) profile which might have weird wrapping
  if (id === '29' && profile) {
    // Example of custom fix if needed, but formatProse should handle it
  }

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
    if (data.profile) artworks[index].profile = data.profile;
    if (data.description) artworks[index].description = data.description;
    if (data.history) artworks[index].history = data.history;

    updated++;

    // Preview for verifying
    if (artwork.id === '4' || artwork.id === '29') {
      console.log(`\n--- Artwork ${artwork.id} Preview ---`);
      console.log('HISTORY:\n' + artworks[index].history);
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
