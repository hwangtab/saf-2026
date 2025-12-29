const fs = require('fs');
const path = require('path');

function log(msg) {
    fs.writeSync(1, msg + '\n');
}

try {
    const csvPath = path.join(__dirname, '../docs/추가 씨앗페 작가 - 시트1 (1).csv');
    const artworksPath = path.join(__dirname, '../content/saf2026-artworks.ts');

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    let artworksContent = fs.readFileSync(artworksPath, 'utf-8');

    log(`Reading CSV size: ${csvContent.length}`);

    // ID 위치 찾기 (콤마 + 숫자 + 줄바꿈 또는 파일끝)
    const idRegex = /,(\d+)(\r?\n|$)/g;
    let match;
    const items = [];
    let lastIndex = 0;

    // 전체 텍스트에서 ID 마커 찾기
    // 주의: "설명" 안에 숫자가 있을 수 있으나, 보통 "설명",ID 형태로 끝나는 패턴을 찾음.
    // 설명이 긴 텍스트이고 그 안에 콤마+숫자+줄바꿈 패턴이 우연히 있을 확률은 낮음.
    // 하지만 안전하게 하기 위해, CSV 구조상 마지막 필드여야 함.
    
    // 이 파일은 형식이 좀 깨진 CSV일 수 있음.
    // ID 마커들을 모두 찾아서 배열에 저장
    const markers = [];
    while ((match = idRegex.exec(csvContent)) !== null) {
        markers.push({
            id: match[1],
            index: match.index
        });
    }

    log(`Found ${markers.length} potential ID markers`);

    const extractedPrices = {};

    // 각 마커 사이의 텍스트에서 가격 추출
    for (let i = 0; i < markers.length; i++) {
        const marker = markers[i];
        
        // 데이터 블록의 시작점: 이전 마커의 끝 (첫 번째는 0)
        // 하지만 설명 필드가 앞따옴표로 시작해서 뒤따옴표로 끝나는지 확인 필요?
        // 그냥 단순하게: 이 마커 앞쪽 일정 범위(또는 이전 마커 이후)에서 가격 패턴 찾기
        
        const startSearch = i === 0 ? 0 : markers[i-1].index + markers[i-1][0].length; // 이전 매칭 전체 길이 더하기 불가. idRegex.exec 결과 match[0]이 전체 매칭 문자열
        // match[0] 길이를 모르므로 marker.index + 매칭문자열길이 계산 필요
        // 정규식 실행 다시 안해도 됨.
        
        const block = csvContent.substring(startSearch, marker.index);
        
        // 가격 패턴: ₩숫자,숫자... 
        // 여러개가 있을 수 있으나, 마지막에 나오는 가격이 해당 행의 가격일 가능성 높음
        // (설명 텍스트 안에 예전 가격이나 다른 숫자가 있을 수 있으므로)
        // 하지만 보통 가격 필드는 설명 앞쪽임.
        
        // CSV 순서: ...가격,프로필,작가노트,이력,이미지파일명,URL... 이 아니라 
        // 1번행 헤더: ...재료,크기,년도,에디션 넘버,가격,프로필,... 
        // 즉 가격은 데이터 블록의 중간쯤에 위치함.
        
        const priceMatches = [...block.matchAll(/["']?(₩[\d,]+)["']?/g)];
        if (priceMatches.length > 0) {
            // 가장 마지막에 발견된 가격 사용? 아니면 첫번째?
            // "가격" 필드 뒤에 "프로필"(긴 텍스트)가 오므로, 가격은 텍스트들보다 앞에 나옴.
            // 하지만 block 문자열은 이전 ID 끝부터 현재 ID 앞까지임. 
            // 즉 [이전레코드뒤쪽쓰레기] + [현재레코드앞쪽] 형태일 수 있음... 아님.
            // markers[i-1]이 이전 레코드의 끝(ID)이므로, startSearch부터 marker.index까지는 
            // "현재 레코드의 전체 데이터"임. ( CSV 구조상 마지막 컬럼이 ID니까)
            
            // 따라서 block 안에는 현재 레코드의 모든 컬럼이 들어있음.
            // 가격 필드는 중간에 있음.
            
            // 안전하게 모든 가격 찾아서 로깅해보기
            // log(`ID ${marker.id} prices found: ${priceMatches.map(m => m[1]).join(', ')}`);
            
            // 보통 가격 컬럼은 하나임. 설명 안에 가격이 언급될 수도 있지만, "₩" 기호를 쓰는지 확인해야 함.
            // 여기선 첫 번째 매칭된 가격을 우선시하거나, 
            // 만약 여러개라면... 보통 프로필/노트엔 "₩" 안씀.
            
            const price = priceMatches[0][1]; // 첫 번째 가격 선택
            extractedPrices[marker.id] = price;
        }
    }

    log(`Extracted prices for ${Object.keys(extractedPrices).length} items`);

    // 업데이트
    let updateStr = '';
    let count = 0;
    
    for (const [id, newPrice] of Object.entries(extractedPrices)) {
        // artworks.ts에서 해당 ID 찾기
        const idPattern = `"id": "${id}"`;
        const idIdx = artworksContent.indexOf(idPattern);
        
        if (idIdx !== -1) {
            // 해당 ID 블록 범위 찾기 (다음 "id": 패턴 전까지)
            const remaining = artworksContent.substring(idIdx);
            const nextIdIdx = remaining.indexOf('"id": "', 10);
            
            const blockLength = nextIdIdx !== -1 ? nextIdIdx : remaining.length;
            const block = remaining.substring(0, blockLength);
            
            // 현재 가격 찾기
            const priceMatch = block.match(/"price":\s*"([^"]*)"/);
            if (priceMatch) {
                const currentPrice = priceMatch[1];
                if (currentPrice !== newPrice) {
                    log(`Update ID ${id}: ${currentPrice} => ${newPrice}`);
                    
                    // 교체
                    // 단순 replace는 위험하므로 위치 기반 교체
                    // block 안에서의 price 위치 찾기
                    const priceInBlockIdx = block.indexOf(priceMatch[0]);
                    
                    const beforePrice = artworksContent.substring(0, idIdx + priceInBlockIdx);
                    // "price": "oldPrice" -> "price": "newPrice"
                    // priceMatch[0] 길이만큼 건너뛰고 나머지
                    const afterPrice = artworksContent.substring(idIdx + priceInBlockIdx + priceMatch[0].length);
                    
                    const newField = `"price": "${newPrice}"`;
                    artworksContent = beforePrice + newField + afterPrice;
                    count++;
                }
            }
        }
    }
    
    if (count > 0) {
        fs.writeFileSync(artworksPath, artworksContent, 'utf-8');
        log(`Saved ${count} updates to file.`);
    } else {
        log('No changes needed.');
    }

} catch (e) {
    log(`Error: ${e.message}`);
    log(e.stack);
}
