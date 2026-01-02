const fs = require('fs');
const path = require('path');

// Path to artwork data
const artworksPath = path.join(__dirname, '../content/saf2026-artworks.ts');
const imagesDir = path.join(__dirname, '../public/images/artworks');

// Read and parse artwork data
const content = fs.readFileSync(artworksPath, 'utf-8');
// Extract the array using regex or simple parsing since it's a TS file
const match = content.match(/export const artworks: Artwork\[\] = (\[[\s\S]*?\]);/);
if (!match) {
    console.error('Could not find artworks array');
    process.exit(1);
}

// We need to be careful with eval on TS content as it might have TS types or non-JSON syntax.
// However, the file structure usually is simple JS objects.
// Let's try to simple eval or strict parse.
// A safe way is to regex extract IDs and Images.

const regex = /id:\s*'([^']+)',[\s\S]*?artist:\s*'([^']+)',[\s\S]*?image:\s*'([^']+)'/g;
let m;
const missing = [];
const allImages = new Set(fs.readdirSync(imagesDir));

// Iterate over regex matches
// Note: This regex assumes a specific order, which might be risky. 
// Better logic: match each object {} block, then extract fields.

// Let's just use the validate_artworks approach of eval if the file is simple enough
// The validate script used:
// const artworks = eval(arrayString);
// Let's do the same trick.

const startIdx = content.indexOf('export const artworks: Artwork[] = [');
const openBracket = content.indexOf('[', startIdx);
const closeBracket = content.lastIndexOf('];');
const arrayString = content.substring(openBracket, closeBracket + 1);

let artworks;
try {
    artworks = eval(arrayString);
} catch (e) {
    console.error('Eval failed:', e);
    // Fallback or exit
    process.exit(1);
}

console.log(`Checking images for ${artworks.length} artworks...`);

artworks.forEach(artwork => {
    const filename = artwork.image;
    const artist = artwork.artist;
    const id = artwork.id;

    // Check exact match
    if (artist.includes('김규학') || artist.includes('김동석')) {
        console.log(`Found ${artist} (ID: ${id}) -> Image: '${filename}'`);
    }

    if (!allImages.has(filename)) {
        // Check if maybe case sensitive issue or extension mismatch
        // list files with same base name
        const basename = filename.split('.')[0];
        const candidates = Array.from(allImages).filter(f => f.startsWith(basename + '.'));

        if (candidates.length > 0) {
            missing.push({ id, artist, expected: filename, found: candidates.join(', ') });
        } else {
            missing.push({ id, artist, expected: filename, found: 'NONE' });
        }
    }
});

if (missing.length > 0) {
    console.log('\n❌ Missing or Misnamed Images:');
    missing.forEach(m => {
        console.log(`- ID ${m.id} (${m.artist}): Expected '${m.expected}' -> Suggestion: ${m.found}`);
    });
    process.exit(1);
} else {
    console.log('✅ All images found.');
}
