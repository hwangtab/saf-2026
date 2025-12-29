const fs = require('fs');
const path = require('path');

const artworksPath = path.join(__dirname, '../content/saf2026-artworks.ts');
let content = fs.readFileSync(artworksPath, 'utf-8');

const updates = [
    {
        id: "4",
        changes: {
            price: "₩1,000,000"
        }
    },
    {
        id: "12",
        changes: {
            price: "₩2,500,000"
        }
    },
    {
        id: "13",
        changes: {
            price: "₩1,500,000"
        }
    },
    {
        id: "17",
        changes: {
            title: "화려한재봉틀전축",
            price: "₩4,000,000",
            size: "30호",
            material: "Acrylic on canvas, Acrylic on supermirror"
        }
    },
    {
        id: "18",
        changes: {
            title: "전축&창문빛",
            price: "₩6,000,000"
        }
    },
    {
        id: "19",
        changes: {
            title: "바이올린소녀",
            price: "₩6,000,000"
        }
    }
];

let updateCount = 0;

for (const { id, changes } of updates) {
    // 1. 해당 ID 블록 찾기
    const idIdx = content.indexOf(`"id": "${id}"`);
    if (idIdx === -1) {
        console.log(`Skipping ID ${id}: Not found`);
        continue;
    }

    // 다음 ID 나오기 전까지가 블록 범위
    const nextIdMatch = content.substring(idIdx + 10).match(/"id": "/);
    const blockEnd = nextIdMatch ? idIdx + 10 + nextIdMatch.index : content.length;

    let blockStart = content.lastIndexOf('{', idIdx);
    if (blockStart === -1) blockStart = idIdx; // fallback

    // 블록 문자열 추출
    const block = content.substring(blockStart, blockEnd);
    let newBlock = block;
    let modified = false;

    // 변경사항 적용
    for (const [key, val] of Object.entries(changes)) {
        const fieldRegex = new RegExp(`"${key}":\\s*"[^"]*"`);
        if (newBlock.match(fieldRegex)) {
            newBlock = newBlock.replace(fieldRegex, `"${key}": "${val}"`);
            console.log(`Updated ID ${id} ${key} -> ${val}`);
            modified = true;
        } else {
            console.log(`Field ${key} not found in ID ${id}`);
        }
    }

    if (modified) {
        // 원본 content 교체
        content = content.substring(0, blockStart) + newBlock + content.substring(blockEnd);
        updateCount++;
    }
}

fs.writeFileSync(artworksPath, content, 'utf-8');
console.log(`\n✅ Updated ${updateCount} artworks successfully.`);
