const fs = require('fs');
const path = require('path');

// Read the extracted artist data
const artistDataPath = path.join(__dirname, '../docs/artwork-artist-data.json');
const artistData = JSON.parse(fs.readFileSync(artistDataPath, 'utf-8'));

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

console.log(`Found ${artworks.length} artworks in saf2026-artworks.ts`);
console.log(`Found ${Object.keys(artistData).length} artworks with artist data`);

// Update each artwork with artist data
let updated = 0;
artworks.forEach((artwork, index) => {
    const data = artistData[artwork.id];
    if (data) {
        let changed = false;

        // Update profile if we have data and current is empty
        if (data.profile && (!artwork.profile || artwork.profile === '')) {
            artworks[index].profile = data.profile;
            changed = true;
        }

        // Update description if we have data and current is empty
        if (data.description && (!artwork.description || artwork.description === '')) {
            artworks[index].description = data.description;
            changed = true;
        }

        // Update history if we have data and current is empty or doesn't exist
        if (data.history && (!artwork.history || artwork.history === '')) {
            artworks[index].history = data.history;
            changed = true;
        }

        if (changed) {
            updated++;
            console.log(`Updated artwork ${artwork.id} (${artwork.artist} - ${artwork.title})`);
        }
    }
});

console.log(`\nUpdated ${updated} artworks with artist data`);

// Generate the new artworks array
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
console.log(`\nUpdated ${artworksPath}`);
