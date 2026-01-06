const fs = require('fs');
const path = require('path');

// Read the current artworks.ts
const artworksPath = path.join(__dirname, '../content/saf2026-artworks.ts');
let artworksContent = fs.readFileSync(artworksPath, 'utf-8');

// Extract the artworks array from the TypeScript file
const artworksMatch = artworksContent.match(/export const artworks: Artwork\[\] = (\[[\s\S]*\]);/);
if (!artworksMatch) {
  console.error('Could not find artworks array in file');
  process.exit(1);
}

const artworksArrayStr = artworksMatch[1];
const artworks = JSON.parse(artworksArrayStr);

console.log(`Found ${artworks.length} artworks to clean up`);

// Clean text function - removes unwanted patterns and normalizes formatting
function cleanText(text) {
  if (!text) return '';

  // Remove news-art references
  text = text.replace(/\[출처\]\s*뉴스아트\s*\(https?:\/\/www\.news-art\.co\.kr\)/gi, '');
  text = text.replace(/\[출처\]\s*뉴스아트/gi, '');
  text = text.replace(/https?:\/\/www\.news-art\.co\.kr/gi, '');

  // Remove ||| separator (sometimes used in the data)
  text = text.replace(/\|\|\|/g, '\n\n');

  // Replace multiple newlines with single newline
  text = text.replace(/\n{3,}/g, '\n\n');

  // Replace double newlines followed by spaces with single newline
  text = text.replace(/\n\n\s+/g, '\n');

  // Normalize spacing in exhibition listings (remove leading spaces)
  text = text.replace(/\n\s{2,}/g, '\n');

  // Remove empty lines at start and end
  text = text.trim();

  // For history entries, format year-based listings nicely
  // Pattern: year followed by space and content
  text = text.replace(/(\d{4})\s+([^\n])/g, '$1 $2');

  // Clean up double spaces
  text = text.replace(/  +/g, ' ');

  // Remove trailing/leading whitespace from each line
  text = text
    .split('\n')
    .map((line) => line.trim())
    .join('\n');

  // Remove consecutive empty lines again
  text = text.replace(/\n{2,}/g, '\n');

  return text.trim();
}

// Special formatting for history - make it more consistent
function formatHistory(history) {
  if (!history) return '';

  let cleaned = cleanText(history);

  // Split by newlines and filter out empty lines
  let lines = cleaned.split('\n').filter((line) => line.trim());

  // Group and format consistently
  const formattedLines = [];
  for (const line of lines) {
    // If line starts with a year, keep it
    if (/^\d{4}/.test(line)) {
      formattedLines.push(line);
    }
    // If line starts with education/career keyword
    else if (
      /^(홍익|이화|동국|서울|상명|오사카|경원|부산|대구|국민|충남|계원|현\s|전\s)/.test(line)
    ) {
      formattedLines.push(line);
    }
    // If previous line exists and this is a sub-item (continuation)
    else if (formattedLines.length > 0 && line.trim()) {
      // Add as a new item
      formattedLines.push(line);
    } else if (line.trim()) {
      formattedLines.push(line);
    }
  }

  // Join with single newlines
  return formattedLines.join('\n');
}

// Special formatting for profile - clean paragraph style
function formatProfile(profile) {
  if (!profile) return '';

  let cleaned = cleanText(profile);

  // For profile, we want clean paragraphs, not line breaks
  // Remove single newlines (keep double for paragraph breaks)
  cleaned = cleaned.replace(/([^\n])\n([^\n])/g, '$1 $2');

  // Clean up any remaining issues
  cleaned = cleaned.replace(/  +/g, ' ');

  return cleaned.trim();
}

// Special formatting for description (artist notes)
function formatDescription(description) {
  if (!description) return '';

  let cleaned = cleanText(description);

  // For descriptions, preserve intentional line breaks but clean up messy ones
  // Convert single newlines to spaces unless they seem intentional
  const lines = cleaned.split('\n');
  const formattedLines = [];
  let currentParagraph = '';

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      // Empty line = paragraph break
      if (currentParagraph) {
        formattedLines.push(currentParagraph.trim());
        currentParagraph = '';
      }
    } else {
      // Check if this line should start a new paragraph
      // (starts with special characters or looks like a header)
      if (/^["「『]/.test(trimmedLine) || /^[0-9]+\./.test(trimmedLine)) {
        if (currentParagraph) {
          formattedLines.push(currentParagraph.trim());
        }
        currentParagraph = trimmedLine;
      } else {
        currentParagraph += (currentParagraph ? ' ' : '') + trimmedLine;
      }
    }
  }
  if (currentParagraph) {
    formattedLines.push(currentParagraph.trim());
  }

  return formattedLines.join('\n\n');
}

// Update each artwork
let updated = 0;
artworks.forEach((artwork, index) => {
  let changed = false;

  // Clean profile
  if (artwork.profile) {
    const cleaned = formatProfile(artwork.profile);
    if (cleaned !== artwork.profile) {
      artworks[index].profile = cleaned;
      changed = true;
    }
  }

  // Clean description
  if (artwork.description) {
    const cleaned = formatDescription(artwork.description);
    if (cleaned !== artwork.description) {
      artworks[index].description = cleaned;
      changed = true;
    }
  }

  // Clean history
  if (artwork.history) {
    const cleaned = formatHistory(artwork.history);
    if (cleaned !== artwork.history) {
      artworks[index].history = cleaned;
      changed = true;
    }
  }

  if (changed) {
    updated++;
    console.log(`Cleaned artwork ${artwork.id} (${artwork.artist})`);
  }
});

console.log(`\nCleaned ${updated} artworks`);

// Generate the new content
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
console.log(`\nUpdated ${artworksPath}`);
