/**
 * Export Artworks to CSV
 * 모든 작품 데이터를 CSV 파일로 내보내기
 * - 모든 필드 포함 (작가, 작품명, 설명, 프로필, 이력, 크기, 재료, 년도, 에디션, 가격, 이미지)
 * - 장르/매체 자동 분류
 * - 가격대 분류
 */

const fs = require('fs');
const path = require('path');

// Read the artworks TypeScript file
const artworksPath = path.join(__dirname, '../content/saf2026-artworks.ts');
const artworksContent = fs.readFileSync(artworksPath, 'utf-8');

// Extract the array content between [ and ];
const arrayMatch = artworksContent.match(/export const artworks: Artwork\[\] = \[([\s\S]*?)\];/);
if (!arrayMatch) {
    console.error('Could not find artworks array');
    process.exit(1);
}

// Parse the array using eval (safe since we control the input)
const cleanedContent = arrayMatch[1]
    .replace(/\n/g, ' ')
    .replace(/\\n/g, '\\n')
    .trim();

// Use Function constructor to safely evaluate the array
const artworksArray = eval('[' + cleanedContent + ']');

console.log(`Found ${artworksArray.length} artworks`);

// Function to classify genre/medium based on material
function classifyGenre(material) {
    const m = (material || '').toLowerCase();

    if (m.includes('oil on canvas') || m.includes('acrylic on canvas') || m.includes('캔버스에')) {
        return '회화 (Painting)';
    }
    if (m.includes('pigment print') || m.includes('archival') || m.includes('inkjet')) {
        return '사진 (Photography)';
    }
    if (m.includes('목판') || m.includes('etching') || m.includes('lithography') || m.includes('drypoint')) {
        return '판화 (Printmaking)';
    }
    if (m.includes('한지') || m.includes('분채') || m.includes('먹')) {
        return '한국화/민화 (Korean Traditional)';
    }
    if (m.includes('mixed') || m.includes('믹스') || m.includes('콜라주')) {
        return '믹스드 미디어 (Mixed Media)';
    }
    if (m.includes('확인 중')) {
        return '확인 중';
    }
    return '기타 (Other)';
}

// Function to classify price range
function classifyPriceRange(price) {
    if (!price || price === '문의') {
        return '문의';
    }

    // Extract numeric value
    const numMatch = price.replace(/[₩,\s]/g, '').match(/\d+/);
    if (!numMatch) return '문의';

    const numPrice = parseInt(numMatch[0], 10);

    if (numPrice < 1000000) return '100만원 미만';
    if (numPrice < 3000000) return '100-300만원';
    if (numPrice < 5000000) return '300-500만원';
    if (numPrice < 10000000) return '500-1000만원';
    return '1000만원 이상';
}

// Escape CSV field
function escapeCSV(field) {
    if (field === null || field === undefined) return '';
    const str = String(field);
    // If contains comma, newline, or quote, wrap in quotes and escape internal quotes
    if (str.includes(',') || str.includes('\n') || str.includes('"') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

// Build CSV
const headers = [
    'ID',
    '작가명',
    '작품명',
    '장르/매체',
    '재료',
    '크기',
    '제작연도',
    '에디션',
    '가격',
    '가격대',
    '이미지 파일명',
    '작품 설명',
    '작가 프로필',
    '작가 이력'
];

const rows = artworksArray.map(artwork => {
    const genre = classifyGenre(artwork.material);
    const priceRange = classifyPriceRange(artwork.price);

    return [
        artwork.id,
        artwork.artist,
        artwork.title,
        genre,
        artwork.material,
        artwork.size,
        artwork.year,
        artwork.edition || '원본',
        artwork.price,
        priceRange,
        artwork.image,
        artwork.description || '',
        artwork.profile || '',
        artwork.history || ''
    ].map(escapeCSV).join(',');
});

// Add BOM for Excel compatibility with Korean
const BOM = '\uFEFF';
const csv = BOM + headers.join(',') + '\n' + rows.join('\n');

// Write to docs folder
const outputPath = path.join(__dirname, '../docs/saf2026-artworks-database.csv');
fs.writeFileSync(outputPath, csv, 'utf-8');

console.log(`\n✅ CSV 파일 생성 완료: ${outputPath}`);
console.log(`총 ${artworksArray.length}개 작품 데이터 내보내기 완료`);

// Print summary
const genreCounts = {};
const priceRangeCounts = {};

artworksArray.forEach(artwork => {
    const genre = classifyGenre(artwork.material);
    const priceRange = classifyPriceRange(artwork.price);

    genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    priceRangeCounts[priceRange] = (priceRangeCounts[priceRange] || 0) + 1;
});

console.log('\n📊 장르별 분포:');
Object.entries(genreCounts).forEach(([genre, count]) => {
    console.log(`  - ${genre}: ${count}개`);
});

console.log('\n💰 가격대별 분포:');
Object.entries(priceRangeCounts).forEach(([range, count]) => {
    console.log(`  - ${range}: ${count}개`);
});
