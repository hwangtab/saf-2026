const fs = require('fs');
const path = require('path');

// Read CSV file
const csvPath = path.join(__dirname, '../docs/2026 씨앗페 참가자 정보.xlsx - Sheet1 (2).csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse CSV - handle multiline fields
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
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip \n in \r\n
      }
      if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
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

  // Handle last row
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.length > 1) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// Clean and format text
function cleanText(text) {
  if (!text) return '';

  // Remove leading/trailing whitespace
  text = text.trim();

  // Replace multiple newlines with single newline
  text = text.replace(/\n{3,}/g, '\n\n');

  // Remove carriage returns
  text = text.replace(/\r/g, '');

  // Remove leading/trailing empty lines
  text = text
    .split('\n')
    .filter((line, index, arr) => {
      // Keep lines that are not empty or are between non-empty lines
      if (line.trim()) return true;
      const prevNonEmpty = arr.slice(0, index).some((l) => l.trim());
      const nextNonEmpty = arr.slice(index + 1).some((l) => l.trim());
      return prevNonEmpty && nextNonEmpty;
    })
    .join('\n');

  return text;
}

// Create profile summary from long text
function summarizeProfile(profile, history) {
  if (!profile && !history) return { profile: '', history: '' };

  // If profile is very long, try to extract key info
  let cleanedProfile = cleanText(profile);
  let cleanedHistory = cleanText(history);

  // If profile contains paragraph breaks, get first paragraph as main profile
  if (cleanedProfile.includes('\n\n')) {
    const paragraphs = cleanedProfile.split('\n\n');
    cleanedProfile = paragraphs[0].trim();
  }

  // Limit profile length for display
  if (cleanedProfile.length > 500) {
    // Find a good break point
    const sentences = cleanedProfile.match(/[^.!?]+[.!?]+/g);
    if (sentences) {
      let shortened = '';
      for (const sentence of sentences) {
        if ((shortened + sentence).length > 500) break;
        shortened += sentence;
      }
      cleanedProfile = shortened.trim() || cleanedProfile.substring(0, 500) + '...';
    }
  }

  // Clean history - keep it as is but format nicely
  if (cleanedHistory) {
    // Remove "개인전" / "단체전" section headers if they appear alone
    cleanedHistory = cleanedHistory.replace(
      /^(개인전|단체전|Work Collection|출판|수상|Residence Program|단체전 |학력|전시 경력|연락처 및 SNS)\s*\n/gm,
      ''
    );

    // Summarize if too long
    if (cleanedHistory.length > 800) {
      const lines = cleanedHistory.split('\n').filter((l) => l.trim());
      cleanedHistory = lines.slice(0, 10).join('\n');
      if (lines.length > 10) {
        cleanedHistory += '\n외 다수';
      }
    }
  }

  return { profile: cleanedProfile, history: cleanedHistory };
}

// Parse CSV
const rows = parseCSV(csvContent);
console.log(`Parsed ${rows.length} rows from CSV`);

// Skip header row
const header = rows[0];
console.log('Header:', header);

// Map image filename to data
const artworkDataMap = new Map();

for (let i = 1; i < rows.length; i++) {
  const row = rows[i];

  // CSV columns: 판매여부(0), 이름(1), 이미지(2), 작품명(3), 재료(4), 크기(5), 년도(6), 에디션넘버(7), 가격(8), 프로필(9), 작가노트(10), 작가이력(11), 이미지파일명(12), 온라인구매URL(13)
  const imageFilename = row[12];

  if (!imageFilename || imageFilename.trim() === '') continue;

  const id = imageFilename.trim();
  const profile = row[9] || '';
  const artistNote = row[10] || '';
  const history = row[11] || '';

  if (profile || artistNote || history) {
    const { profile: cleanedProfile, history: cleanedHistory } = summarizeProfile(profile, history);

    artworkDataMap.set(id, {
      id,
      profile: cleanedProfile,
      description: cleanText(artistNote),
      history: cleanedHistory,
    });
  }
}

console.log(`\nFound ${artworkDataMap.size} artworks with artist data:`);
for (const [id, data] of artworkDataMap.entries()) {
  console.log(`\n--- Artwork ${id} ---`);
  if (data.profile) console.log(`Profile: ${data.profile.substring(0, 100)}...`);
  if (data.description) console.log(`Note: ${data.description.substring(0, 100)}...`);
  if (data.history) console.log(`History: ${data.history.substring(0, 100)}...`);
}

// Export the data as JSON for use in updating artworks.ts
const outputPath = path.join(__dirname, '../docs/artwork-artist-data.json');
fs.writeFileSync(outputPath, JSON.stringify(Object.fromEntries(artworkDataMap), null, 2), 'utf-8');
console.log(`\nSaved artwork data to ${outputPath}`);
