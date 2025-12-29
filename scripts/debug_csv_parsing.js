const fs = require('fs');
const path = require('path');

try {
    const csvPath = path.join(__dirname, '../docs/추가 씨앗페 작가 - 시트1 (1).csv');
    console.log(`Reading CSV from: ${csvPath}`);
    
    if (!fs.existsSync(csvPath)) {
        console.error("File does not exist!");
        process.exit(1);
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    console.log(`File read successfully. Size: ${csvContent.length} bytes`);

    // 수동 정규식 매칭 테스트
    const regex = /,(\d+)\r?\n/g; // 콤마,숫자,줄바꿈 패턴
    let match;
    let count = 0;
    
    // 처음 5개만 출력
    while ((match = regex.exec(csvContent)) !== null) {
        count++;
        if (count <= 5) {
            console.log(`Match ${count}: ID=${match[1]}, Index=${match.index}`);
        }
    }
    console.log(`Total ID matches found: ${count}`);
    
    // 가격 패턴 테스트
    const priceRegex = /"?(₩[\d,]+)"?/g;
    let priceMatch;
    let priceCount = 0;
    while ((priceMatch = priceRegex.exec(csvContent)) !== null) {
        priceCount++;
    }
    console.log(`Total Price matches found: ${priceCount}`);

} catch (e) {
    console.error("Error:", e);
}
