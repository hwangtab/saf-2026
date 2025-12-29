const fs = require('fs');
const path = require('path');

const artworksPath = path.join(__dirname, '../content/saf2026-artworks.ts');
let content = fs.readFileSync(artworksPath, 'utf-8');

let changeCount = 0;

// 1. 크기 형식 통일: × → x
const beforeX = (content.match(/×/g) || []).length;
content = content.replace(/×/g, 'x');
const afterX = (content.match(/×/g) || []).length;
console.log(`[1] 크기 형식 통일: × → x (${beforeX - afterX}개 변경)`);
changeCount += (beforeX - afterX);

// 2. 빈 문자열 → "확인 중" 변경 (특정 필드만)
// size, material, year 필드에서 빈 문자열을 "확인 중"으로 변경
const fieldsToCheck = ['size', 'material', 'year'];

fieldsToCheck.forEach(field => {
    // 빈 문자열 패턴: "field": ""
    const emptyPattern = new RegExp(`"${field}":\\s*""`, 'g');
    const matches = content.match(emptyPattern) || [];
    if (matches.length > 0) {
        content = content.replace(emptyPattern, `"${field}": "확인 중"`);
        console.log(`[2] ${field} 필드: 빈값 → "확인 중" (${matches.length}개 변경)`);
        changeCount += matches.length;
    }
});

// 3. ID 34에 shopUrl 추가 (기존 패턴: ID + 20 = 54)
// ID 34의 image 필드 뒤에 shopUrl 추가
if (!content.includes('"id": "34"') || content.includes('"shopUrl"')) {
    // 이미 있거나 ID 34가 없으면 스킵
} else {
    const id34Pattern = /"id": "34"[\s\S]*?"image": "34\.png"/;
    const match = content.match(id34Pattern);
    if (match) {
        const replacement = match[0] + ',\n    "shopUrl": "https://koreasmartcoop.cafe24.com/surl/O/54"';
        content = content.replace(match[0], replacement);
        console.log(`[3] ID 34에 shopUrl 추가`);
        changeCount++;
    }
}

fs.writeFileSync(artworksPath, content, 'utf-8');
console.log(`\n✅ 총 ${changeCount}개 항목 표준화 완료`);
