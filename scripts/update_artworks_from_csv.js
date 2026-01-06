/**
 * Update artwork data from CSV file
 * Reads updated artwork information and applies to saf2026-artworks.ts
 */

const fs = require('fs');
const path = require('path');

// Read the CSV file
const csvPath = path.join(__dirname, '../docs/추가 씨앗페 작가 - 시트1 (1).csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV - handle multi-line fields
function parseCSV(content) {
  const lines = content.split('\n');
  const records = [];
  let currentRecord = [];
  let inQuotes = false;
  let currentField = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (let j = 0; j < line.length; j++) {
      const char = line[j];

      if (char === '"' && (j === 0 || line[j - 1] !== '\\')) {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        currentRecord.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }

    if (!inQuotes) {
      currentRecord.push(currentField.trim());
      if (currentRecord.length >= 13) {
        records.push(currentRecord);
      }
      currentRecord = [];
      currentField = '';
    } else {
      currentField += '\n';
    }
  }

  return records;
}

// Simple CSV extraction - get key data rows
function extractArtworkData(content) {
  const artworks = [];

  // Match pattern: data ending with artwork ID number
  // Format: ...,ID,
  const regex = /,(\d+),\r?\n/g;
  let match;
  const positions = [];

  while ((match = regex.exec(content)) !== null) {
    positions.push({
      id: match[1],
      endPos: match.index,
    });
  }

  console.log(`Found ${positions.length} artwork ID markers`);

  // For each ID, extract the preceding data
  for (const pos of positions) {
    // Find the start of this record (previous newline after comma+number)
    let startPos = content.lastIndexOf('\n,', pos.endPos);
    if (startPos === -1) startPos = 0;

    // Get the line
    const segment = content.substring(startPos + 1, pos.endPos + pos.id.length + 1);

    artworks.push({
      id: pos.id,
      raw: segment,
    });
  }

  return artworks;
}

// Extract specific fields from CSV content
function parseArtworkRow(content) {
  // CSV columns: 판매여부,이름,이미지,작품명,재료,크기,년도,에디션,가격,프로필,작가노트,작가이력,이미지파일명,온라인구매URL
  // Need: 이름(1), 작품명(3), 재료(4), 크기(5), 년도(6), 에디션(7), 가격(8), 프로필(9), 작가노트(10), 이력(11)

  const result = {};

  // Find key patterns
  const priceMatch = content.match(/₩[\d,]+/);
  if (priceMatch) {
    result.price = priceMatch[0];
  }

  // Look for sold status
  if (content.includes('판매완료') || content.startsWith('●')) {
    result.sold = true;
  }

  return result;
}

// Read artworks file
const artworksPath = path.join(__dirname, '../content/saf2026-artworks.ts');
let artworksContent = fs.readFileSync(artworksPath, 'utf-8');

// Define updates based on CSV analysis
// Format: ID -> { field: newValue }
const updates = {
  // ID 4: 이수철 - 포르코 당신은 어디있나요?-1 - material update
  4: {
    material: 'pigment print on paper',
  },
  // ID 17: 이호철 - 화려한재봉틀전축 - material update
  17: {
    material: 'Acrylic on canvas, Acrylic on supermirror',
    size: '30호',
  },
  // ID 25: 이익태 - 山 - price update
  25: {
    price: '₩1,800,000',
  },
  // ID 26: 이익태 - Beam Letter - price update
  26: {
    price: '₩3,500,000',
  },
  // ID 27: 이익태 - material/year update
  27: {
    material: 'acrylic, 알루미늄',
    price: '₩2,000,000',
  },
};

// Apply updates
let updatedCount = 0;

for (const [id, fields] of Object.entries(updates)) {
  for (const [field, newValue] of Object.entries(fields)) {
    // Find the artwork section
    const idPattern = new RegExp(`"id": "${id}",[\\s\\S]*?"${field}": "[^"]*"`);
    const match = artworksContent.match(idPattern);

    if (match) {
      const oldFieldPattern = new RegExp(`("id": "${id}",[\\s\\S]*?"${field}": ")[^"]*"`);
      const replacement = `$1${newValue}"`;

      if (artworksContent.match(oldFieldPattern)) {
        artworksContent = artworksContent.replace(oldFieldPattern, replacement);
        console.log(`✓ Updated ID ${id}: ${field} = "${newValue}"`);
        updatedCount++;
      }
    }
  }
}

// Write updated content
fs.writeFileSync(artworksPath, artworksContent, 'utf-8');

console.log(`\n✅ Total ${updatedCount} fields updated`);
console.log(`📁 File saved: ${artworksPath}`);
