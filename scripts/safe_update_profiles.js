/**
 * 안전한 작가 프로필 업데이트 스크립트
 * 각 작품을 개별적으로 파싱하고 업데이트
 */

const fs = require('fs');
const path = require('path');

const artworksPath = path.join(__dirname, '../content/saf2026-artworks.ts');
let content = fs.readFileSync(artworksPath, 'utf-8');

// 텍스트 정리
function cleanText(text) {
    if (!text) return '';
    let result = text.replace(/\r/g, '');
    result = result.replace(/\n{3,}/g, '\n\n');
    result = result.split('\n').map(l => l.trim()).join('\n');
    return result.trim();
}

// JSON 문자열 이스케이프
function escapeForJson(text) {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '\\t');
}

// 업데이트할 데이터
const updates = {
    40: {
        profile: cleanText(`한애규(b.1953)는 서울대학교에서 응용미술과와 동 대학원에서 도예를 전공하고 프랑스 앙굴렘 미술학교를 졸업하였다. 국내외 다수의 개인전과 단체전에 참여하였으며 주요 개인전으로는 《흙의 감정, 흙의 여정》(갤러리세줄, 2024), 《Beside》 (아트사이드 갤러리, 서울, 2022), 《푸른 길》 (아트사이드 갤러리, 서울, 2018), 《폐허에서》 (아트사이드 갤러리, 베이징, 2010), 《조우》 (포스코 미술관, 서울, 2009), 《꽃을 든 사람》 (가나 아트 센터, 서울, 2008) 과 주요 단체전은 《한국의 채색화 특별전》 (국립현대미술관, 과천, 2022), 《토요일展》 (서울, 2012-2020), 《긴 호흡》 (소마미술관, 서울, 2014), 《테라코타, 원시적 미래》 (클레이아크 김해미술관, 경상남도, 2011) 등에 참여하였다. 주요 소장처로는 국립현대미술관, 서울시립미술관, 서울역사박물관, 대전시립미술관, 전북도립미술관, 서울시청, 이화여자대학교 박물관, 고려대학교 박물관 등이 있다.`)
    }
};

// 각 ID 업데이트
Object.entries(updates).forEach(([id, data]) => {
    // 해당 ID의 작품 블록 찾기
    const idPattern = new RegExp(`"id": "${id}"`, 'g');
    const match = content.match(idPattern);

    if (!match) {
        console.log(`ID ${id}: 찾을 수 없음`);
        return;
    }

    // 해당 작품의 profile 필드 위치 찾기
    const idIndex = content.indexOf(`"id": "${id}"`);
    const nextIdIndex = content.indexOf(`"id": "`, idIndex + 10);
    const artworkBlock = content.substring(idIndex, nextIdIndex > 0 ? nextIdIndex : content.length);

    if (data.profile) {
        // profile 필드 찾아서 교체
        const profileMatch = artworkBlock.match(/"profile": "([^"]*)"/);
        if (profileMatch) {
            const oldProfile = profileMatch[0];
            const newProfile = `"profile": "${escapeForJson(data.profile)}"`;
            content = content.replace(oldProfile, newProfile);
            console.log(`ID ${id}: profile 업데이트됨 (${data.profile.length}자)`);
        }
    }

    if (data.history) {
        const historyMatch = artworkBlock.match(/"history": "([^"]*)"/);
        if (historyMatch) {
            const oldHistory = historyMatch[0];
            const newHistory = `"history": "${escapeForJson(data.history)}"`;
            content = content.replace(oldHistory, newHistory);
            console.log(`ID ${id}: history 업데이트됨 (${data.history.length}자)`);
        }
    }
});

fs.writeFileSync(artworksPath, content, 'utf-8');
console.log('\n업데이트 완료!');

// 파일 검증
try {
    const testContent = fs.readFileSync(artworksPath, 'utf-8');
    const startIdx = testContent.indexOf('export const artworks');
    if (startIdx === -1) throw new Error('artworks 배열을 찾을 수 없음');
    console.log('파일 구문 유효성 확인: OK');
} catch (e) {
    console.error('파일 구문 오류:', e.message);
}
