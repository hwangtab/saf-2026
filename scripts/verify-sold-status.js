const fs = require('fs');
const path = require('path');

const csvPath = path.join(process.cwd(), 'docs/판매목록.csv');
const batchesDir = path.join(process.cwd(), 'content/artworks-batches');

// Simple CSV parser that handles quoted fields
function parseCSV(text) {
    const lines = text.split('\n');
    const result = [];

    for (let i = 1; i < lines.length; i++) { // Skip header
        const line = lines[i].trim();
        if (!line) continue;

        const row = [];
        let current = '';
        let inQuote = false;

        for (let j = 0; j < line.length; j++) {
            const char = line[j];

            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
                row.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        row.push(current.trim());
        result.push(row);
    }
    return result;
}

function normalize(str) {
    if (!str) return '';
    // Remove spaces and normalize
    return str.replace(/\s+/g, '').toLowerCase();
}

function main() {
    console.log('Loading CSV...');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const rows = parseCSV(csvContent);

    const soldMap = new Map(); // Key: normalized(artist+title), Value: original row

    rows.forEach((row, index) => {
        // CSV Columns: 순번,이름,전번,주소,작가,작품,매출...
        // Index 4: 작가, Index 5: 작품
        const artist = row[4];
        const title = row[5];

        if (artist && title) {
            const key = normalize(artist + title);
            const displayKey = `${artist} - ${title}`;
            if (!soldMap.has(key)) {
                soldMap.set(key, []);
            }
            soldMap.get(key).push({
                row: index + 2,
                artist,
                title,
                price: row[6],
                buyer: row[1]
            });
        }
    });

    console.log(`Found ${soldMap.size} unique sold artworks in CSV.`);

    const batchFiles = fs.readdirSync(batchesDir).filter(f => f.endsWith('.ts'));
    let foundCount = 0;
    let missingSoldTagCount = 0;

    console.log('\nChecking batch files...');

    batchFiles.forEach(file => {
        const filePath = path.join(batchesDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        // Regex to capture artwork objects
        // This is a heuristic regex, might need adjustment
        // Looking for structure: { id: '...', artist: '...', title: '...', ... }

        // We'll iterate manually to be safer or matching line by line might be tricky with multiline descriptions.
        // Let's use a regex that matches start of object to end.

        // Actually, simple regex for fields is easier since we know the format from `batch-008.ts`.
        // We can assume standard formatting.

        const matches = content.matchAll(/{\s*id:\s*'([^']*)'[\s\S]*?artist:\s*'([^']*)'[\s\S]*?title:\s*'([^']*)'[\s\S]*?(sold:\s*true)?\s*}/g);

        // The regex above is a bit risky if fields order changes.
        // Let's try to extract blocks first.

        // Alternative: regex for individual fields within the file content, keeping track of current object.

        // Let's rely on the file format passing lint, so it's consistent.
        // We expect `artist: '...'` and `title: '...'`

        const lines = content.split('\n');
        let currentId = null;
        let currentArtist = null;
        let currentTitle = null;
        let currentSold = false;
        let inObject = false;

        for (let line of lines) {
            if (line.trim().startsWith('{')) {
                inObject = true;
                currentId = null;
                currentArtist = null;
                currentTitle = null;
                currentSold = false;
            } else if (line.trim().startsWith('}')) {
                if (inObject && currentId && currentArtist && currentTitle) {
                    const key = normalize(currentArtist + currentTitle);

                    if (soldMap.has(key)) {
                        foundCount++;
                        if (!currentSold) {
                            console.log(`[MISSING SOLD TAG] File: ${file}, ID: ${currentId}`);
                            console.log(`  Codebase: ${currentArtist} - ${currentTitle}`);
                            const saleInfo = soldMap.get(key)[0];
                            console.log(`  CSV Row ${saleInfo.row}: ${saleInfo.artist} - ${saleInfo.title} (Buyer: ${saleInfo.buyer})`);
                            missingSoldTagCount++;
                        }
                    }
                }
                inObject = false;
            }

            const idMatch = line.match(/id:\s*'([^']*)'/);
            if (idMatch) currentId = idMatch[1];

            const artistMatch = line.match(/artist:\s*'([^']*)'/);
            if (artistMatch) currentArtist = artistMatch[1];

            // Title might be multiline or have special chars, but usually single line in these files
            // Handle simple case first
            const titleMatch = line.match(/title:\s*'([^']*)'/);
            if (titleMatch) currentTitle = titleMatch[1];

            // Title with template literal or double quotes? The example used single quotes.
            // Also check for multiline title if it starts with ' and doesn't end with ' ?
            // For now assume single line title.

            if (line.includes('sold: true')) {
                currentSold = true;
            }
        }
    });

    console.log(`\nSummary:`);
    console.log(`Matched ${foundCount} artworks from CSV in codebase.`);
    console.log(`Found ${missingSoldTagCount} artworks needing 'sold: true'.`);
}

main();
