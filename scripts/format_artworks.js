/**
 * Artwork Text Smart Formatter
 * 
 * Rules:
 * 1. Single spacing for lists (remove excessive newlines)
 * 2. Double spacing before major headers (e.g., '학력', '개인전')
 * 3. Trim whitespace from lines and full text
 * 4. Remove tabs
 */

const fs = require('fs');
const path = require('path');

const artworksPath = path.join(__dirname, '../content/saf2026-artworks.ts');

if (!fs.existsSync(artworksPath)) {
    console.error('Error: content/saf2026-artworks.ts not found');
    process.exit(1);
}

let content = fs.readFileSync(artworksPath, 'utf-8');

// 스마트 텍스트 정리 함수
function smartCleanText(text) {
    if (!text) return "";

    // 1. 탭 제거
    let cleaned = text.replace(/\t/g, '');

    // 2. 각 줄의 공백 제거
    cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');

    // 3. 모든 줄바꿈을 일단 단일 줄바꿈으로 통일 (과도한 줄바꿈 제거)
    cleaned = cleaned.replace(/\n+/g, '\n');

    // 4. 주요 섹션 헤더 앞에는 이중 줄바꿈 추가 (가독성 확보)
    const headers = [
        '학력', '개인전', '단체전', '주요 개인전', '주요 단체전',
        '수상', '수상 경력', '수상경력', '수상 내역', '수상 및 지원',
        '소장처', '작품 소장', '작품소장',
        '레지던시', '경력', '전시 이력', '전시이력', '교육',
        '강의', '저서', 'Art Fair', '기타경력',
        'Solo Exhibition', 'Group Exhibition', 'Team Project activities'
    ];

    headers.forEach(header => {
        // 정규식: (시작 또는 줄바꿈) + (헤더 텍스트) + (줄바꿈 또는 콜론 또는 끝)
        // [^\n]*는 헤더 앞의 장식문자(---, < 등)를 포용하기 위함
        const pattern = new RegExp(`(?:^|\\n)(.*${header}.*)(?:\\n|:|$)`, 'g');

        cleaned = cleaned.replace(pattern, (match, p1) => {
            // p1은 헤더 라인 전체
            return `\n\n${p1.trim()}\n`;
        });
    });

    // 5. 전체 앞뒤 공백 제거
    cleaned = cleaned.trim();

    // 6. 결과적으로 \n\n\n이 생길 수 있으므로 다시 최대 2줄로 제한
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    return cleaned;
}

// 필드 교체 함수
function replaceField(content, fieldName, cleaner) {
    // 모든 작품의 해당 필드를 찾아서 교체
    // "key": "value" 패턴 찾기 (이스케이프된 따옴표 고려)
    const fieldPattern = new RegExp(`"${fieldName}": "((?:[^"\\\\]|\\\\.)*)"`, 'g');

    return content.replace(fieldPattern, (match, originalValue) => {
        let decodedValue;
        try {
            decodedValue = JSON.parse(`"${originalValue}"`);
        } catch (e) { return match; } // 파싱 실패시 무시

        const cleanedValue = cleaner(decodedValue);

        if (decodedValue === cleanedValue) return match;

        const safeValue = JSON.stringify(cleanedValue);
        return `"${fieldName}": ${safeValue}`;
    });
}

console.log('Running Smart Text Formatting on all artworks...');

let newContent = content;
newContent = replaceField(newContent, 'profile', smartCleanText);
newContent = replaceField(newContent, 'description', smartCleanText);
newContent = replaceField(newContent, 'history', smartCleanText);

if (newContent !== content) {
    fs.writeFileSync(artworksPath, newContent, 'utf-8');
    console.log('✅ Formatting applied successfully.');
} else {
    console.log('✨ No formatting changes needed.');
}
