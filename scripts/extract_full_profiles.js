/**
 * CSV에서 작가 프로필 및 경력 전체 데이터 추출 및 업데이트 스크립트
 * - 불필요한 중복 줄바꿈 정리
 * - 띄어쓰기 정리
 * - 내용은 축소하지 않음
 */

const fs = require('fs');
const path = require('path');

// CSV 파일에서 작품 데이터 추출
function parseCSVForArtworks(csvPath) {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const artworks = [];

    // CSV 라인별 파싱 (복잡한 다중행 필드 처리)
    const lines = content.split('\n');
    let currentRecord = [];
    let inQuotedField = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 빈 줄이거나 헤더 건너뛰기
        if (line.trim() === '' || line.match(/^,+$/)) {
            continue;
        }

        // 따옴표 카운트로 다중행 필드 감지
        const quoteCount = (line.match(/"/g) || []).length;

        if (!inQuotedField) {
            currentRecord = [line];
            if (quoteCount % 2 === 1) {
                inQuotedField = true;
            } else {
                // 완전한 레코드
                processRecord(currentRecord.join('\n'), artworks);
                currentRecord = [];
            }
        } else {
            currentRecord.push(line);
            const totalQuotes = (currentRecord.join('\n').match(/"/g) || []).length;
            if (totalQuotes % 2 === 0) {
                inQuotedField = false;
                processRecord(currentRecord.join('\n'), artworks);
                currentRecord = [];
            }
        }
    }

    return artworks;
}

function processRecord(record, artworks) {
    // 마지막에 ID 번호가 있는지 확인 (예: ,35 또는 ,36)
    const idMatch = record.match(/,(\d+)\s*$/);
    if (!idMatch) return;

    const id = idMatch[1];

    // 간단히 필드 추출: 작가명, 제목, profile, history
    // CSV 구조: 작가명,,제목,재료,크기,년도,에디션,가격,profile,description,history,...,ID

    // profile은 큰따옴표로 감싸진 8번째 필드 (0-indexed: 8)
    // history는 10번째 필드 근처

    // 정규식으로 profile과 history 추출
    const profileMatch = record.match(/,"([^"]*(?:""[^"]*)*)"/g);

    if (profileMatch && profileMatch.length >= 1) {
        const artwork = { id };

        // 모든 따옴표 감싸진 필드 추출
        const quotedFields = record.match(/"([^"]*(?:""[^"]*)*)"/g);

        if (quotedFields) {
            quotedFields.forEach((field, idx) => {
                // 따옴표 제거 및 이중 따옴표 처리
                let cleaned = field.slice(1, -1).replace(/""/g, '"');

                // 불필요한 중복 줄바꿈 정리 (3개 이상 -> 2개)
                cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
                // 줄 시작/끝 공백 정리
                cleaned = cleaned.split('\n').map(l => l.trim()).join('\n');
                // 시작/끝 줄바꿈 제거
                cleaned = cleaned.trim();

                if (idx === 0 && cleaned.length > 50) {
                    artwork.profile = cleaned;
                } else if (idx === 2 && cleaned.length > 50) {
                    artwork.history = cleaned;
                }
            });
        }

        if (artwork.profile || artwork.history) {
            artworks.push(artwork);
        }
    }
}

// 정리 함수
function cleanText(text) {
    if (!text) return '';
    // 3개 이상 연속 줄바꿈 -> 2개
    let result = text.replace(/\n{3,}/g, '\n\n');
    // 각 줄 끝 공백 제거
    result = result.split('\n').map(l => l.trimEnd()).join('\n');
    // 시작/끝 공백 제거
    result = result.trim();
    return result;
}

// 메인
const csv3Path = path.join(__dirname, '../docs/추가 씨앗페 작가 - 시트1 (3).csv');
const csv4Path = path.join(__dirname, '../docs/추가 씨앗페 작가 - 시트1 (4).csv');

console.log('CSV 파일 분석 중...\n');

// CSV 3 분석
const csv3Content = fs.readFileSync(csv3Path, 'utf-8');
const csv4Content = fs.readFileSync(csv4Path, 'utf-8');

// ID별 데이터 매핑
const artworkUpdates = {};

// CSV 3에서 ID 35-54 추출
const csv3Matches = csv3Content.match(/[^,]+,,([^,]+),[^,]+,[^,]+,[^,]+,[^,]*,"[^"]+","([^"]*(?:""[^"]*)*)","?([^"]*)"?,"([^"]*(?:""[^"]*)*)",초대,,,(\d+)/g);

// 더 간단한 접근: 각 ID별로 해당 섹션 추출
for (let id = 35; id <= 62; id++) {
    const csvContent = id <= 54 ? csv3Content : csv4Content;

    // 해당 ID로 끝나는 레코드 찾기
    const idPattern = new RegExp(`,${id}\\r?\\n`, 'g');
    const idIndex = csvContent.search(idPattern);

    if (idIndex === -1) {
        console.log(`ID ${id}: 찾을 수 없음`);
        continue;
    }

    // ID 위치에서 역방향으로 작가명 찾기
    const beforeId = csvContent.substring(0, idIndex);
    const lastRecord = beforeId.lastIndexOf('\r\n김') !== -1 ?
        beforeId.lastIndexOf('\r\n김') :
        beforeId.lastIndexOf('\n김') !== -1 ?
            beforeId.lastIndexOf('\n김') :
            beforeId.lastIndexOf('\r\n정') !== -1 ?
                beforeId.lastIndexOf('\r\n정') :
                beforeId.lastIndexOf('\r\n최') !== -1 ?
                    beforeId.lastIndexOf('\r\n최') :
                    beforeId.lastIndexOf('\r\n한') !== -1 ?
                        beforeId.lastIndexOf('\r\n한') :
                        beforeId.lastIndexOf('\r\n심') !== -1 ?
                            beforeId.lastIndexOf('\r\n심') :
                            beforeId.lastIndexOf('\r\n류') !== -1 ?
                                beforeId.lastIndexOf('\r\n류') :
                                beforeId.lastIndexOf('\r\n이');

    if (lastRecord === -1) continue;

    const record = csvContent.substring(lastRecord + 2, idIndex + csvContent.substring(idIndex).indexOf('\n'));

    // "로 감싸진 필드들 추출
    const quotedFields = [];
    let match;
    const fieldRegex = /"([^"]*(?:""[^"]*)*)"/g;
    while ((match = fieldRegex.exec(record)) !== null) {
        let field = match[1].replace(/""/g, '"');
        // 정리
        field = cleanText(field);
        quotedFields.push(field);
    }

    if (quotedFields.length >= 1) {
        artworkUpdates[id] = {
            profile: quotedFields[0] || '',
            history: quotedFields.length >= 3 ? quotedFields[2] : ''
        };
        console.log(`ID ${id}: profile ${artworkUpdates[id].profile.length}자, history ${artworkUpdates[id].history.length}자`);
    }
}

console.log('\n추출된 데이터:', Object.keys(artworkUpdates).length, '개');

// JSON으로 저장 (수동 확인용)
fs.writeFileSync(
    path.join(__dirname, 'extracted_profiles.json'),
    JSON.stringify(artworkUpdates, null, 2),
    'utf-8'
);

console.log('\nextracted_profiles.json 파일로 저장됨');
