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
            currentRow.push(currentField); // Don't trim yet
            currentField = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') {
                i++; // Skip \n in \r\n
            }
            if (currentField || currentRow.length > 0) {
                currentRow.push(currentField);
                if (currentRow.length > 1) { // Skip empty rows
                    rows.push(currentRow);
                }
                currentRow = [];
                currentField = '';
            }
        } else {
            currentField += char;
        }
    }

    // Handle last row
    if (currentField || currentRow.length > 0) {
        currentRow.push(currentField);
        if (currentRow.length > 1) {
            rows.push(currentRow);
        }
    }

    return rows;
}

// Clean text but PRESERVE LINE BREAKS
function cleanText(text) {
    if (!text) return '';

    let cleaned = text;

    // Remove news-art references first
    cleaned = cleaned.replace(/\[출처\]\s*뉴스아트\s*\(https?:\/\/www\.news-art\.co\.kr\)/gi, '');
    cleaned = cleaned.replace(/\[출처\]\s*뉴스아트/gi, '');
    cleaned = cleaned.replace(/https?:\/\/www\.news-art\.co\.kr/gi, '');

    // Remove ||| separator if present and replace with double newline
    cleaned = cleaned.replace(/\|\|\|/g, '\n\n');

    // Normalize carriage returns to newlines
    cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Trim start/end of the whole text
    cleaned = cleaned.trim();

    // Replace 3+ newlines with 2 (max one empty line between text)
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // We do NOT remove single newlines or replace them with spaces anymore.
    // We keep the structure provided in the CSV.

    return cleaned;
}

// Parse CSV
const rows = parseCSV(csvContent);
console.log(`Parsed ${rows.length} rows from CSV`);

// Map image filename to data
const artworkDataMap = new Map();

for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    // CSV columns: 
    // 9: 프로필 -> profile
    // 10: 작가노트 -> description
    // 11: 작가 이력 -> history
    // 12: 이미지파일명 -> id

    const imageFilename = row[12];

    if (!imageFilename || imageFilename.trim() === '') continue;

    const id = imageFilename.trim();
    const profile = cleanText(row[9]);
    const description = cleanText(row[10]);
    const history = cleanText(row[11]);

    if (profile || description || history) {
        artworkDataMap.set(id, {
            profile,
            description,
            history
        });
    }
}

// Update artworks.ts
const artworksPath = path.join(__dirname, '../content/saf2026-artworks.ts');
let artworksContent = fs.readFileSync(artworksPath, 'utf-8');

// Extract the artworks array
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
        // Allow updating even if field was present, to restore line breaks if they were lost

        // Update profile (Column 9)
        // Only update if we have new data. If CSV is empty for this field, keep existing? 
        // User said "Check carefully" and "I provided CSV". Assuming CSV is source of truth.
        if (data.profile) artworks[index].profile = data.profile;

        // Update description (Column 10 - Artist Note)
        if (data.description) artworks[index].description = data.description;

        // Update history (Column 11)
        if (data.history) artworks[index].history = data.history;

        updated++;

        if (artwork.id === '4') {
            console.log('--- Artwork 4 Preview ---');
            console.log('History:', artworks[index].history);
        }
    }
});

console.log(`Updated ${updated} artworks from CSV`);

// Write back
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

const newContent = interfaceSection +
    'export const artworks: Artwork[] = ' + artworksArrayJson + ';\n\n' +
    `export function getAllArtworks(): Artwork[] {
  return artworks;
}

export function getArtworkById(id: string): Artwork | undefined {
  return artworks.find(artwork => artwork.id === id);
}
`;

fs.writeFileSync(artworksPath, newContent, 'utf-8');
console.log(`Updated ${artworksPath}`);
