const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '../docs/추가 씨앗페 작가 - 시트1.csv');
const ARTWORKS_TS_PATH = path.join(__dirname, '../content/saf2026-artworks.ts');
const IMAGES_DIR = path.join(__dirname, '../public/images/artworks');

// Helper to find image filename with extension
function findImageFile(id) {
  const extensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
  for (const ext of extensions) {
    const filename = `${id}${ext}`;
    if (fs.existsSync(path.join(IMAGES_DIR, filename))) {
      return filename;
    }
  }
  return null;
}

// Helper to clean text
function cleanText(text) {
  if (!text) return '';

  // Smart spacing rules
  let cleaned = text.trim();

  // 3+ newlines to 2
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  // Remove carriage returns
  cleaned = cleaned.replace(/\r/g, '');

  // Remove tabs or replace with space
  cleaned = cleaned.replace(/\t/g, ' ');

  return cleaned;
}

function cleanSize(size) {
  if (!size) return '';
  return size.replace(/×/g, 'x').trim();
}

function parseCSV(content) {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;

  // Normalize line endings
  content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          currentField += '"';
          i++;
        } else {
          // End of quotes
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

function main() {
  console.log('Reading CSV...');
  const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCSV(csvContent);

  // CSV Header: 이름,이미지,작품명,재료,크기,년도,에디션 넘버,가격,프로필,작가노트,작가 이력,이미지파일명

  const newArtworks = [];

  // Start from index 1 to skip header
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 12) continue; // Skip empty or malformed rows

    // Check if row is empty (sometimes trailing newlines in CSV)
    if (row.every((cell) => !cell.trim())) continue;

    const artist = cleanText(row[0]);
    if (!artist) continue; // Skip if no artist name

    const imageId = row[11].trim();
    if (!imageId) {
      console.warn(`Skipping row ${i + 1}: No image ID found for artist ${artist}`);
      continue;
    }

    const imageFilename = findImageFile(imageId);
    if (!imageFilename) {
      console.warn(
        `Warning: Image file not found for ID ${imageId} (Artist: ${artist}). Using placeholder ${imageId}.jpg`
      );
    }

    const artwork = {
      id: imageId,
      artist: artist,
      title: cleanText(row[2]),
      description: cleanText(row[9]),
      profile: cleanText(row[8]),
      history: cleanText(row[10]),
      size: cleanSize(row[4]),
      material: cleanText(row[3]),
      year: cleanText(row[5]),
      edition: cleanText(row[6]),
      price: cleanText(row[7]),
      image: imageFilename || `${imageId}.jpg`,
      // shopUrl is intentionally omitted
    };

    newArtworks.push(artwork);
  }

  console.log(`Parsed ${newArtworks.length} new artworks.`);

  // Generate TS code
  const newArtworksCode = newArtworks
    .map((art) => {
      return `  {
    id: ${JSON.stringify(art.id)},
    artist: ${JSON.stringify(art.artist)},
    title: ${JSON.stringify(art.title)},
    description: ${JSON.stringify(art.description)},
    profile: ${JSON.stringify(art.profile)},
    history: ${JSON.stringify(art.history)},
    size: ${JSON.stringify(art.size)},
    material: ${JSON.stringify(art.material)},
    year: ${JSON.stringify(art.year)},
    edition: ${JSON.stringify(art.edition)},
    price: ${JSON.stringify(art.price)},
    image: ${JSON.stringify(art.image)},
  },`;
    })
    .join('\n');

  // Insert into existing file
  let tsContent = fs.readFileSync(ARTWORKS_TS_PATH, 'utf8');

  // Find the end of the artworks array
  const endMarker = '];';
  const lastIndex = tsContent.lastIndexOf(endMarker);

  if (lastIndex === -1) {
    console.error('Could not find end of artworks array in TypeScript file.');
    process.exit(1);
  }

  const insertPosition = lastIndex;

  const updatedContent =
    tsContent.slice(0, insertPosition) +
    '\n' +
    newArtworksCode +
    '\n' +
    tsContent.slice(insertPosition);

  fs.writeFileSync(ARTWORKS_TS_PATH, updatedContent, 'utf8');
  console.log('Successfully updated content/saf2026-artworks.ts');
}

main();
