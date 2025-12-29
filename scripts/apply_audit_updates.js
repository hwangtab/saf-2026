const fs = require('fs');
const path = require('path');

const artworksPath = path.join(__dirname, '../content/saf2026-artworks.ts');
let content = fs.readFileSync(artworksPath, 'utf-8');

const updates = [
    { id: "10", changes: { title: "야형화접도 (夜螢花蝶圖 / Night Blossoms and Butterflies)" } },
    { id: "15", changes: { year: "2019" } },
    { id: "17", changes: { material: "Acrylic on canvas Acrylic on supermirror" } },
    { id: "22", changes: { size: "24x35.5cm", material: "콜라주" } },
    { id: "23", changes: { material: "콜라주" } },
    { id: "24", changes: { size: "227x90cm", material: "목판, 캔버스" } },
    { id: "25", changes: { size: "33x59cm", material: "먹, 한지" } },
    { id: "26", changes: { size: "60x55cm" } },
    { id: "28", changes: { size: "80x62cm", material: "집게, 크레용, 종이" } },
    { id: "32", changes: { year: "2021" } }
];

let updateCount = 0;

console.log("Applying updates based on CSV audit...");

for (const { id, changes } of updates) {
    const idIdx = content.indexOf(`"id": "${id}"`);
    if (idIdx === -1) continue;

    // Find block end
    const remaining = content.substring(idIdx);
    const nextIdIdx = remaining.indexOf('"id": "', 10);
    const blockEnd = nextIdIdx === -1 ? content.length : idIdx + nextIdIdx;

    // Find block start (approximate)
    let blockStart = content.lastIndexOf('{', idIdx);

    // Extract block
    let block = content.substring(blockStart, blockEnd);
    let originalBlock = block;

    for (const [key, val] of Object.entries(changes)) {
        // Regex to find field: "key": "value"
        // key can be anywhere in the block
        const regex = new RegExp(`"${key}":\\s*"[^"]*"`);
        if (block.match(regex)) {
            block = block.replace(regex, `"${key}": "${val}"`);
            console.log(`[ID ${id}] Updated ${key}`);
        } else {
            // Field might be missing or different format?
            console.log(`[ID ${id}] Warning: Field ${key} not found for replacement`);
        }
    }

    if (block !== originalBlock) {
        content = content.replace(originalBlock, block);
        updateCount++;
    }
}

fs.writeFileSync(artworksPath, content, 'utf-8');
console.log(`\n✅ Successfully updated ${updateCount} artworks.`);
