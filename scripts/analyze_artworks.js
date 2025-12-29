const fs = require('fs');
const path = require('path');

const artworksPath = path.join(__dirname, '../content/saf2026-artworks.ts');
const tsContent = fs.readFileSync(artworksPath, 'utf-8');

// Extract artworks array
const startIdx = tsContent.indexOf('export const artworks: Artwork[] = [');
const openBracket = tsContent.indexOf('[', startIdx);
const closeBracket = tsContent.lastIndexOf('];');
const arrayString = tsContent.substring(openBracket, closeBracket + 1);
const artworks = eval(arrayString);

console.log("=== 작품 데이터 구조 분석 보고서 ===\n");
console.log(`총 작품 수: ${artworks.length}\n`);

// Analyze each field
const fields = ['id', 'artist', 'title', 'description', 'profile', 'history', 'size', 'material', 'year', 'edition', 'price', 'image', 'shopUrl', 'sold'];

fields.forEach(field => {
    const values = artworks.map(a => a[field]);
    const empty = values.filter(v => v === '' || v === undefined || v === null).length;
    const checking = values.filter(v => v === '확인 중').length;
    const hasValue = values.filter(v => v && v !== '' && v !== '확인 중').length;

    console.log(`--- ${field} ---`);
    console.log(`  값 있음: ${hasValue}, 빈값/'확인 중': ${empty + checking}`);

    // Show unique patterns for specific fields
    if (field === 'size') {
        const sizes = values.filter(v => v && v !== '확인 중');
        const patterns = {};
        sizes.forEach(s => {
            if (s.includes('×')) patterns['×(곱셈 기호)'] = (patterns['×(곱셈 기호)'] || 0) + 1;
            else if (s.includes('x')) patterns['x(영문)'] = (patterns['x(영문)'] || 0) + 1;
            else if (s.includes('호')) patterns['호(단위)'] = (patterns['호(단위)'] || 0) + 1;
            else patterns['기타'] = (patterns['기타'] || 0) + 1;
        });
        console.log(`  패턴: ${JSON.stringify(patterns)}`);
    }

    if (field === 'price') {
        const prices = values.filter(v => v);
        const patterns = {};
        prices.forEach(p => {
            if (p.startsWith('₩')) patterns['₩ 포함'] = (patterns['₩ 포함'] || 0) + 1;
            else if (p === '문의') patterns['문의'] = (patterns['문의'] || 0) + 1;
            else patterns['기타'] = (patterns['기타'] || 0) + 1;
        });
        console.log(`  패턴: ${JSON.stringify(patterns)}`);
    }

    if (field === 'year') {
        const years = values.filter(v => v && v !== '확인 중');
        const patterns = {};
        years.forEach(y => {
            if (/^\d{4}$/.test(y)) patterns['YYYY 형식'] = (patterns['YYYY 형식'] || 0) + 1;
            else patterns['기타'] = (patterns['기타'] || 0) + 1;
        });
        console.log(`  패턴: ${JSON.stringify(patterns)}`);
    }

    if (field === 'edition') {
        const editions = values.filter(v => v);
        const patterns = {};
        editions.forEach(e => {
            if (e.startsWith('에디션')) patterns['에디션 X/Y'] = (patterns['에디션 X/Y'] || 0) + 1;
            else if (/^\d+\/\d+$/.test(e)) patterns['X/Y'] = (patterns['X/Y'] || 0) + 1;
            else patterns['기타'] = (patterns['기타'] || 0) + 1;
        });
        console.log(`  패턴: ${JSON.stringify(patterns)}`);
    }

    if (field === 'image') {
        const images = values.filter(v => v);
        const exts = {};
        images.forEach(i => {
            const ext = i.split('.').pop().toLowerCase();
            exts[ext] = (exts[ext] || 0) + 1;
        });
        console.log(`  확장자: ${JSON.stringify(exts)}`);
    }

    console.log('');
});

// Check for inconsistencies
console.log("\n=== 불일치 항목 ===\n");

// Size format inconsistency
const sizeIssues = artworks.filter(a => a.size && a.size !== '확인 중' && !a.size.includes('×') && !a.size.includes('호'));
if (sizeIssues.length > 0) {
    console.log("크기 형식 불일치 (×대신 x 사용):");
    sizeIssues.forEach(a => console.log(`  ID ${a.id}: "${a.size}"`));
}

// Year format issues
const yearIssues = artworks.filter(a => a.year && a.year !== '확인 중' && !/^\d{4}$/.test(a.year));
if (yearIssues.length > 0) {
    console.log("\n연도 형식 불일치:");
    yearIssues.forEach(a => console.log(`  ID ${a.id}: "${a.year}"`));
}

// Empty vs "확인 중" inconsistency
const emptyFields = artworks.filter(a =>
    (a.size === '' && a.material !== '') ||
    (a.size !== '' && a.material === '') ||
    (a.year === '' && a.size !== '')
);
if (emptyFields.length > 0) {
    console.log("\n빈값 vs '확인 중' 혼용:");
    emptyFields.slice(0, 5).forEach(a => console.log(`  ID ${a.id}: size="${a.size}", material="${a.material}", year="${a.year}"`));
}

// Missing shopUrl
const noShopUrl = artworks.filter(a => !a.shopUrl);
if (noShopUrl.length > 0) {
    console.log("\nshopUrl 없음:");
    noShopUrl.forEach(a => console.log(`  ID ${a.id} (${a.artist})`));
}

// ID sequence check
const ids = artworks.map(a => parseInt(a.id)).sort((a, b) => a - b);
const missing = [];
for (let i = ids[0]; i <= ids[ids.length - 1]; i++) {
    if (!ids.includes(i)) missing.push(i);
}
if (missing.length > 0) {
    console.log(`\n누락된 ID: ${missing.join(', ')}`);
}

console.log("\n=== 분석 완료 ===");
