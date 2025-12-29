/**
 * 작가 프로필 및 경력 데이터 업데이트 스크립트
 * CSV에서 전체 데이터를 추출하여 적용
 * - 불필요한 중복 줄바꿈 정리 (3개 이상 -> 2개)
 * - 각 줄 끝 공백 제거
 * - 내용은 축소하지 않음
 */

const fs = require('fs');
const path = require('path');

// 텍스트 정리 함수
function cleanText(text) {
    if (!text) return '';
    // 캐리지 리턴 제거
    let result = text.replace(/\r/g, '');
    // 3개 이상 연속 줄바꿈 -> 2개
    result = result.replace(/\n{3,}/g, '\n\n');
    // 각 줄 끝 공백 제거
    result = result.split('\n').map(l => l.trimEnd()).join('\n');
    // 시작/끝 공백 제거
    result = result.trim();
    return result;
}

// CSV 파일 읽기
const csv3Path = path.join(__dirname, '../docs/추가 씨앗페 작가 - 시트1 (3).csv');
const csv4Path = path.join(__dirname, '../docs/추가 씨앗페 작가 - 시트1 (4).csv');

const csv3 = fs.readFileSync(csv3Path, 'utf-8');
const csv4 = fs.readFileSync(csv4Path, 'utf-8');

// ID별 전체 레코드 추출
function extractRecordById(csvContent, id) {
    // 레코드 끝 패턴: `,ID번호\r\n` 또는 `,ID번호\n`
    const endPattern = new RegExp(`,${id}\\r?\\n`);
    const endMatch = csvContent.match(endPattern);
    if (!endMatch) return null;

    const endIndex = csvContent.indexOf(endMatch[0]);

    // 해당 ID 레코드의 시작점 찾기 (작가명으로 시작)
    const beforeRecord = csvContent.substring(0, endIndex);

    // 이전 ID의 끝을 찾아서 현재 레코드 시작점 결정
    const prevIdMatch = beforeRecord.match(/,\d+\r?\n[^\r\n]*$/);
    let startIndex;

    if (prevIdMatch) {
        startIndex = beforeRecord.lastIndexOf(prevIdMatch[0]) + prevIdMatch[0].length;
    } else {
        // 파일 시작 부분이면 빈 줄들 이후 첫 실제 데이터
        const firstDataMatch = beforeRecord.match(/[가-힣]+,,/);
        startIndex = firstDataMatch ? beforeRecord.indexOf(firstDataMatch[0]) : 0;
    }

    const record = csvContent.substring(startIndex, endIndex + endMatch[0].length - 1);
    return record;
}

// 레코드에서 따옴표로 감싸진 필드들 추출
function extractQuotedFields(record) {
    const fields = [];
    const regex = /"((?:[^"]*(?:""[^"]*)*)*)"/g;
    let match;

    while ((match = regex.exec(record)) !== null) {
        let content = match[1].replace(/""/g, '"');
        content = cleanText(content);
        fields.push(content);
    }

    return fields;
}

// 업데이트 데이터 수집
const updates = {};

// CSV 3: ID 35-54
for (let id = 35; id <= 54; id++) {
    const record = extractRecordById(csv3, id);
    if (!record) {
        console.log(`ID ${id}: CSV에서 찾을 수 없음`);
        continue;
    }

    const fields = extractQuotedFields(record);

    // 필드 순서: 가격, profile, description(?), history
    // 긴 필드들을 profile과 history로 매핑
    if (fields.length >= 1) {
        // 첫 번째 긴 텍스트 (가격 제외) = profile
        // 마지막 긴 텍스트 = history

        const longFields = fields.filter(f => f.length > 100);

        updates[id] = {
            profile: longFields[0] || '',
            history: longFields.length > 1 ? longFields[longFields.length - 1] : ''
        };

        console.log(`ID ${id}: profile ${updates[id].profile.length}자, history ${updates[id].history.length}자`);
    }
}

// CSV 4: ID 55-62
for (let id = 55; id <= 62; id++) {
    const record = extractRecordById(csv4, id);
    if (!record) {
        console.log(`ID ${id}: CSV에서 찾을 수 없음`);
        continue;
    }

    const fields = extractQuotedFields(record);

    if (fields.length >= 1) {
        const longFields = fields.filter(f => f.length > 100);

        updates[id] = {
            profile: longFields[0] || '',
            history: longFields.length > 1 ? longFields[longFields.length - 1] : ''
        };

        console.log(`ID ${id}: profile ${updates[id].profile.length}자, history ${updates[id].history.length}자`);
    }
}

console.log(`\n총 ${Object.keys(updates).length}개 작품 데이터 추출됨`);

// 추출 결과 저장
fs.writeFileSync(
    path.join(__dirname, 'profile_updates.json'),
    JSON.stringify(updates, null, 2),
    'utf-8'
);

console.log('profile_updates.json 저장됨');

// TypeScript 파일 업데이트
const artworksPath = path.join(__dirname, '../content/saf2026-artworks.ts');
let artworksContent = fs.readFileSync(artworksPath, 'utf-8');

Object.entries(updates).forEach(([id, data]) => {
    // profile 업데이트
    if (data.profile) {
        const profileEscaped = data.profile.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
        const profilePattern = new RegExp(`("id": "${id}"[^}]*"profile": ")[^"]*(")`);
        artworksContent = artworksContent.replace(profilePattern, `$1${profileEscaped}$2`);
    }

    // history 업데이트
    if (data.history) {
        const historyEscaped = data.history.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
        const historyPattern = new RegExp(`("id": "${id}"[^}]*"history": ")[^"]*(")`);
        artworksContent = artworksContent.replace(historyPattern, `$1${historyEscaped}$2`);
    }
});

fs.writeFileSync(artworksPath, artworksContent, 'utf-8');

console.log('\nsaf2026-artworks.ts 업데이트 완료!');
