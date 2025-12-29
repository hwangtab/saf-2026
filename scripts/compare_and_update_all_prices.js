const fs = require('fs');
const path = require('path');

// 파일 경로
const csvPath = path.join(__dirname, '../docs/추가 씨앗페 작가 - 시트1 (1).csv');
const artworksPath = path.join(__dirname, '../content/saf2026-artworks.ts');

// 파일 읽기
const csvContent = fs.readFileSync(csvPath, 'utf-8');
let artworksContent = fs.readFileSync(artworksPath, 'utf-8');

// 1. CSV 파싱 (ID와 가격 추출)
console.log("Analyzing CSV...");
const csvPrices = {};
const csvMaterials = {};

// CSV 라인별로 처리하지 않고 전체를 파싱 (멀티라인 처리 위해)
// 패턴: 마지막 컬럼이 ID 숫자이고, 그 앞에 가격 포맷("₩4,000,000" 등)이 존재하는지 확인
// CSV 구조: ...,"가격",...,ID
// 정규식으로 각 레코드의 끝부분(ID)과 그 안의 가격 필드를 찾습니다.

// 간단히 쉼표로 분리하기엔 텍스트 내 쉼표가 많아 위험하므로, 
// 각 레코드가 줄바꿈+숫자(1~33)+콤마 혹은 줄바꿈+콤마+숫자 등으로 끝나는 패턴을 이용하거나
// 역순으로 탐색하는 방법을 사용합니다.

// 각 줄을 순회하며 데이터 추출 시도
const lines = csvContent.split('\n');
let currentId = null;
let currentPrice = null;
let currentMaterial = null;

// 뒤에서부터 보면서 ID 찾기 전략이 더 정확할 수 있음.
// 하지만 파일 전체 텍스트에서 패턴 매칭으로 추출 시도.

// ID 패턴: 숫자로만 이루어진 마지막 컬럼 (1~33)
// 레코드 구분: 줄바꿈
// 하지만 설명 필드에 줄바꿈이 포함되어 있음.

// 더 강력한 정규식 접근:
// 각 레코드는 마지막에 숫자로 끝남. 그 앞에는 콤마가 있음.
// 예: ...,"설명",ID
// ID를 기준으로 텍스트를 블록으로 나눕니다.

const idMatches = [...csvContent.matchAll(/,(\d+)\r?\n/g)];
const idPositions = idMatches.map(m => ({ id: m[1], index: m.index }));

console.log(`Found ${idPositions.length} artwork entries in CSV.`);

if (idPositions.length === 0) {
    console.error("Could not find any artwork IDs in CSV. Checking file format...");
    process.exit(1);
}

// 각 ID에 해당하는 데이터 블록 추출
const artworkData = [];
for (let i = 0; i < idPositions.length; i++) {
    const current = idPositions[i];
    const prevIndex = i > 0 ? idPositions[i-1].index + idPositions[i-1][0].length : 0;
    
    // 이 블록은 이전 ID 끝부분 찾은 직후부터 현재 ID 발견 직전까지
    // 하지만 ID 자체도 포함해서 파싱해야 함, 혹은 역추적?
    
    // 더 쉬운 방법: 전체 텍스트에서 가격 패턴 ("₩...") 찾아서 가장 가까운 뒤쪽 ID와 매핑?
    // 아니면 CSV 파서를 흉내내야 함.
    
    // 여기서는 간단히 각 ID 마커 이전의 텍스트 세그먼트에서 가격을 찾습니다.
    const segmentEnd = current.index;
    // 시작점은 이전 ID 마커의 끝. 첫 번째는 0.
    const segmentStart = i === 0 ? 0 : idPositions[i-1].index + idPositions[i-1][0].length;
    
    const segment = csvContent.substring(segmentStart, segmentEnd);
    
    // 가격 찾기: "₩1,200,000" 같은 형식
    const priceMatch = segment.match(/"?₩[\d,]+"?/);
    // 재료 찾기: 작품명 다음, 크기 이전? CSV 구조가 복잡하니 가격 위주로.
    // CSV 헤더: 판매여부,이름,이미지,작품명,재료,크기,년도,에디션,가격,...
    
    if (priceMatch) {
        let price = priceMatch[0].replace(/"/g, ''); // 따옴표 제거
        csvPrices[current.id] = price;
    } else {
        console.log(`Warning: No price found for ID ${current.id}`);
    }
}

// 2. 현재 artworks.ts 파일 분석
console.log("\nAnalyzing current artworks file...");
const currentPrices = {};
const idRegex = /"id": "(\d+)"/g;
let match;

// 파일 전체를 돌면서 id와 그 블록 안의 price 추출
// 정규식으로 id 블록 찾기에는 중첩 구조가 없어서 가능할듯 하지만,
// 그냥 fs로 읽은 내용에서 replace 하는게 나음.

// 3. 비교 및 업데이트
console.log("\nComparing and Updating...");
let updateCount = 0;

for (const [id, newPrice] of Object.entries(csvPrices)) {
    // 해당 ID의 블록 찾기
    // "id": "1", ... "price": "..."
    
    // 1. 해당 ID가 있는 위치 찾기
    const idPattern = `"id": "${id}"`;
    const idPos = artworksContent.indexOf(idPattern);
    
    if (idPos === -1) {
        console.log(`Skipping ID ${id}: Not found in artworks file`);
        continue;
    }
    
    // 2. 해당 ID 블록 내의 price 필드 찾기 (다음 "id" 나오기 전까지, 혹은 닫는 중괄호 전까지)
    // 간단하게 해당 id 위치 뒤에 나오는 첫 번째 "price": "..." 패턴을 찾습니다.
    const remainingContent = artworksContent.substring(idPos);
    // 다음 객체 시작이나 파일 끝 전까지
    const nextIdPos = remainingContent.indexOf('"id": "', 10); // 10은 "id": "1" 길이 대충 넘김
    const block = nextIdPos !== -1 ? remainingContent.substring(0, nextIdPos) : remainingContent;
    
    const pricePattern = /"price":\s*"([^"]*)"/;
    const priceMatch = block.match(pricePattern);
    
    if (priceMatch) {
        const oldPrice = priceMatch[1];
        
        // 차이가 있거나, 기존 가격이 '문의'/'확인 중'이고 새 가격이 있는 경우 업데이트
        // 데이터 정규화: 쉼표 등
        if (oldPrice !== newPrice) {
            console.log(`Updating ID ${id}: ${oldPrice} -> ${newPrice}`);
            
            // 전체 content에서 해당 ID 부분의 price만 교체
            // 정규식이 전역으로 매칭되지 않도록 위치를 특정해야 함.
            // replace는 처음 매칭되는것만 바꾸므로, 
            // idPos 이후의 첫 price만 바꾸기 위해 문자열 분리 후 결합 사용
            
            const beforeId = artworksContent.substring(0, idPos);
            const afterId = artworksContent.substring(idPos);
            
            // afterId 부분에서 첫 번째 price만 교체
            const newAfterId = afterId.replace(
                /"price":\s*"[^"]*"/, 
                `"price": "${newPrice}"`
            );
            
            artworksContent = beforeId + newAfterId;
            updateCount++;
        }
    } else {
        console.log(`Warning: Could not find price field for ID ${id} in file`);
    }
}

// 4. 저장
if (updateCount > 0) {
    fs.writeFileSync(artworksPath, artworksContent, 'utf-8');
    console.log(`\n✅ Successfully updated ${updateCount} prices.`);
} else {
    console.log("\nNo updates needed. All prices match.");
}
