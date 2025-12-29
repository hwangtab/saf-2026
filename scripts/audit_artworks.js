const fs = require('fs');
const path = require('path');

// 파일 경로
const csvPath = path.join(__dirname, '../docs/추가 씨앗페 작가 - 시트1 (1).csv');
const artworksPath = path.join(__dirname, '../content/saf2026-artworks.ts');

function normalize(str) {
    if (!str) return '';
    // 줄바꿈, 공백 정규화, 문자열 내 콤마 제거 등은 비교 시에
    return str.replace(/\s+/g, ' ').trim();
}

try {
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const tsContent = fs.readFileSync(artworksPath, 'utf-8');

    // --- CSV 파싱 ---
    const markers = [];
    const idRegex = /,(\d+)(\r?\n|$)/g;
    let match;
    while ((match = idRegex.exec(csvContent)) !== null) {
        markers.push({ id: match[1], index: match.index });
    }

    console.log(`Debug: Found ${markers.length} markers in CSV`);

    const csvData = {};

    // CSV 헤더 스킵 로직: markers[0] 이전 데이터가 너무 길면 헤더일 것.
    // 하지만 우리는 ID를 Key로 매핑하므로 순서는 상관없음.

    for (let i = 0; i < markers.length; i++) {
        const marker = markers[i];

        let start = 0;
        if (i > 0) {
            // 이전 마커의 끝 위치 계산
            // 이전 마커 텍스트 길이: match[0] 길이는 정규식 실행시 알 수 있는데...
            // idRegex를 다시 exec 안하므로...
            // 간단히: 이전 마커 index + 1(콤마) + ID길이 + 줄바꿈길이? -> 가변적.
            // 그냥 이전 마커 index부터 현재 마커 index까지 자르고, 앞부분 콤마+ID+줄바꿈 제거
            start = markers[i - 1].index;
        }

        let block = csvContent.substring(start, marker.index);

        // 앞부분(이전 ID 잔여물) 제거: 첫번째 콤마 뒤 숫자 뒤 줄바꿈...
        // 정규식으로 제거
        if (i > 0) {
            block = block.replace(/^,\d+(\r?\n)?/, '');
        }

        // 이제 block은 순수 데이터 행 (아마도)
        // CSV 파싱 (따옴표 고려)
        const parsedFields = [];
        let inQuote = false;
        let currentField = '';

        for (let j = 0; j < block.length; j++) {
            const char = block[j];
            if (char === '"') {
                if (j + 1 < block.length && block[j + 1] === '"') {
                    currentField += '"';
                    j++;
                } else {
                    inQuote = !inQuote;
                }
            } else if (char === ',' && !inQuote) {
                parsedFields.push(currentField.trim());
                currentField = '';
            } else {
                currentField += char;
            }
        }
        parsedFields.push(currentField.trim());

        // 필드 인덱스 매핑 (헤더 기준)
        // 0: 판매여부, 1: 이름, 3: 작품명, 4: 재료, 5: 크기, 6: 년도, 7: 에디션, 8: 가격
        // 필드가 모자라면 스킵
        if (parsedFields.length < 9) continue;

        // 1번 필드(이름)가 비어있으면 데이터 아닐 수 있음 (중간 빈 줄 등)
        if (!parsedFields[1]) continue;

        csvData[marker.id] = {
            id: marker.id,
            artist: parsedFields[1],
            title: parsedFields[3],
            material: parsedFields[4],
            size: parsedFields[5],
            year: parsedFields[6],
            edition: parsedFields[7],
            price: parsedFields[8],
            sold: parsedFields[0].includes('판매완료') || parsedFields[0].includes('●')
        };
    }

    // --- TS 파싱 ---
    // 배열 시작/끝 찾기
    const startIdx = tsContent.indexOf('export const artworks: Artwork[] = [');
    const openBracket = tsContent.indexOf('[', startIdx);
    const closeBracket = tsContent.lastIndexOf(']');

    const arrayString = tsContent.substring(openBracket, closeBracket + 1);

    // eval 실행
    const tsArtworks = eval(arrayString);

    // --- 비교 ---
    console.log("=== Artwork Data Audit Report ===\n");
    console.log(`CSV Records Parsed: ${Object.keys(csvData).length}`);
    console.log(`TS Records Loaded: ${tsArtworks.length}\n`);

    let discrepancyCount = 0;

    tsArtworks.forEach(art => {
        const csvArt = csvData[art.id];

        if (!csvArt) {
            console.log(`[MISSING IN CSV] ID: ${art.id} (${art.artist} - ${art.title})`);
            return;
        }

        const diffs = [];
        const check = (field, label) => {
            let tsVal = normalize(art[field]);
            let csvVal = normalize(csvArt[field]);

            // 특수 처리: 가격의 콤마/원화 기호 등
            if (field === 'price') {
                // Remove commas and Won sign for loose comparison?
                // Or just standard string comparison (since we updated TS from CSV)
            }
            // Year: "2023" vs "2023" (no change) or "확인 중" vs ""
            if ((tsVal === '확인 중' || tsVal === '') && (csvVal === '' || csvVal === '확인중')) return;
            // Edition: "" vs "에디션 X/Y" or "X/Y"

            if (tsVal !== csvVal) {
                diffs.push(`   - ${label}: [TS] "${tsVal}"  !=  [CSV] "${csvVal}"`);
            }
        };

        check('title', 'Title');
        check('size', 'Size');
        check('material', 'Material');
        check('year', 'Year');
        check('price', 'Price');
        // check('edition', 'Edition');

        if (diffs.length > 0) {
            console.log(`[DIFF] ID: ${art.id} (${art.artist})`);
            diffs.forEach(d => console.log(d));
            console.log('');
            discrepancyCount++;
        }
    });

    console.log(`Audit Complete. Found discrepancies in ${discrepancyCount} artworks.`);

} catch (e) {
    console.error("Audit Error:", e);
    console.error(e.stack);
}
