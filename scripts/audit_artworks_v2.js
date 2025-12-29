const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '../docs/추가 씨앗페 작가 - 시트1 (1).csv');
const artworksPath = path.join(__dirname, '../content/saf2026-artworks.ts');

// --- 1. CSV Parser (Character-based State Machine) ---
function parseCSV(content) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
    let inQuote = false;

    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];

        if (char === '"') {
            if (inQuote && nextChar === '"') {
                currentField += '"';
                i++; // Skip next quote
            } else {
                inQuote = !inQuote;
            }
        } else if (char === ',' && !inQuote) {
            currentRow.push(currentField.trim());
            currentField = '';
        } else if ((char === '\r' || char === '\n') && !inQuote) {
            // Handle CRLF or LF
            if (char === '\r' && nextChar === '\n') i++;

            currentRow.push(currentField.trim());
            if (currentRow.length > 0) rows.push(currentRow); // Skip empty rows

            currentRow = [];
            currentField = '';
        } else {
            currentField += char;
        }
    }
    // Last row
    if (currentField || currentRow.length > 0) {
        currentRow.push(currentField.trim());
        rows.push(currentRow);
    }

    return rows;
}

// --- 2. TS Extractor (Regex-based) ---
function parseTS(content) {
    const artworks = [];
    // Match each object block: { ... }
    const objectRegex = /{\s*"id":\s*"([^"]+)"[\s\S]*?}/g;

    let match;
    while ((match = objectRegex.exec(content)) !== null) {
        const block = match[0];
        const id = match[1];

        const extract = (key) => {
            // Match "key": "value"
            // Value can contain escaped quotes, newlines etc.
            // Simplified regex assuming TS file format is consistent (double quotes)
            const regex = new RegExp(`"${key}":\\s*"((?:[^"\\\\]|\\\\.)*)"`);
            const m = block.match(regex);
            return m ? m[1].replace(/\\"/g, '"').replace(/\\n/g, '\n') : '';
        };

        // Sold field: "sold": true
        const soldMatch = block.match(/"sold":\s*(true|false)/);
        const sold = soldMatch ? soldMatch[1] === 'true' : false;

        artworks.push({
            id: id,
            artist: extract('artist'),
            title: extract('title'),
            material: extract('material'),
            size: extract('size'),
            year: extract('year'),
            edition: extract('edition'),
            price: extract('price'),
            sold: sold
        });
    }
    return artworks;
}

function normalize(str) {
    if (!str) return '';
    return str.replace(/\s+/g, ' ').trim();
}

try {
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const tsContent = fs.readFileSync(artworksPath, 'utf-8');

    const csvRows = parseCSV(csvContent);
    const tsArtworks = parseTS(tsContent);

    console.log(`Parsed ${csvRows.length} CSV rows.`);
    console.log(`Parsed ${tsArtworks.length} TS artworks.`);

    // Map CSV by ID (last column usually, but let's check header)
    // Header row: 0
    /*
    0: 판매여부
    1: 이름
    2: 이미지
    3: 작품명
    4: 재료
    5: 크기
    6: 년도
    7: 에디션 넘버
    8: 가격
    ...
    12: 이미지파일명 (ID)
    */

    const csvData = {};
    csvRows.forEach((row, idx) => {
        if (idx === 0) return; // Header
        if (row.length < 13) return; // Skip invalid rows

        // ID is in column 12 (index 12) or last column?
        // Let's assume index 12 based on known structure, or find the numeric column at the end.
        let id = row[12];

        // If empty, maybe look around?
        if (!id || !/^\d+$/.test(id)) {
            // Try last column if it is numeric
            const last = row[row.length - 1];
            if (/^\d+$/.test(last)) id = last;
        }

        if (id) {
            csvData[id] = {
                id: id,
                sold: row[0].includes('판매완료') || row[0].includes('●'),
                artist: row[1],
                title: row[3],
                material: row[4],
                size: row[5],
                year: row[6],
                edition: row[7],
                price: row[8]
            };
        }
    });

    console.log(`Mapped ${Object.keys(csvData).length} CSV items by ID.\n`);
    console.log("=== Discrepancy Report ===\n");

    let diffCount = 0;

    tsArtworks.forEach(tsArt => {
        const csvArt = csvData[tsArt.id];
        if (!csvArt) {
            // console.log(`[MISSING IN CSV] ID ${tsArt.id} (${tsArt.artist})`);
            return;
        }

        const diffs = [];

        const compare = (field, label) => {
            const tsVal = normalize(tsArt[field]);
            const csvVal = normalize(csvArt[field]);

            if (tsVal !== csvVal) {
                // Ignore subtle differences like "확인 중" vs empty
                if ((!tsVal || tsVal === '확인 중') && (!csvVal || csvVal === '확인중')) return;

                // Price specific normalization: remove comma, won sign
                if (field === 'price') {
                    const p1 = tsVal.replace(/[₩,]/g, '');
                    const p2 = csvVal.replace(/[₩,]/g, '');
                    if (p1 === p2) return;
                }

                diffs.push(`   - ${label}: [TS] "${tsVal}" != [CSV] "${csvVal}"`);
            }
        };

        compare('title', 'Title');
        compare('size', 'Size');
        compare('material', 'Material');
        compare('year', 'Year');
        compare('price', 'Price');
        // compare('edition', 'Edition'); 

        if (diffs.length > 0) {
            console.log(`[ID ${tsArt.id}] ${tsArt.artist}`);
            diffs.forEach(d => console.log(d));
            console.log('');
            diffCount++;
        }
    });

    console.log(`Audit complete. Found differences in ${diffCount} artworks.`);

} catch (e) {
    console.error(e);
}
