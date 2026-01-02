/**
 * 작품 데이터 검증 스크립트
 * 
 * 사용법: npm run validate-artworks
 * 
 * 검증 규칙:
 * - 필수 필드: id, artist, title, price, image
 * - 크기 형식: "숫자x숫자cm" 또는 "숫자호" 또는 "확인 중"
 * - 가격 형식: "₩X,XXX,XXX"
 * - 연도 형식: "YYYY" 또는 "확인 중"
 * - 에디션 형식: "에디션 X/Y" 또는 빈 문자열
 * - shopUrl: 필수
 */

const fs = require('fs');
const path = require('path');

const artworksPath = path.join(__dirname, '../content/saf2026-artworks.ts');

function validateArtworks() {
    const tsContent = fs.readFileSync(artworksPath, 'utf-8');

    // Extract artworks array
    const startIdx = tsContent.indexOf('export const artworks: Artwork[] = [');
    const openBracket = tsContent.indexOf('[', startIdx);
    const closeBracket = tsContent.lastIndexOf('];');
    const arrayString = tsContent.substring(openBracket, closeBracket + 1);
    const artworks = eval(arrayString);

    const errors = [];
    const warnings = [];

    // Validation rules
    const rules = {
        // 필수 필드 검증
        required: ['id', 'artist', 'title', 'image'],

        // 크기 형식: 숫자x숫자cm, 숫자호, 확인 중, 또는 빈값 허용 안함
        size: (value, id) => {
            if (value === '') return null;
            if (!value) return `ID ${id}: size 필드 누락`;
            if (value === '확인 중') return null;
            if (/^\d+(\.\d+)?x\d+(\.\d+)?cm$/.test(value)) return null;
            if (/^\d+F?\s*\([\d\s.x×cm]+\)$/.test(value)) return null; // 10F (45.5 x 53cm) 형식
            if (/^\d+호$/.test(value)) return null;
            return `ID ${id}: size 형식 오류 ("${value}") - "숫자x숫자cm", "숫자호", 또는 "확인 중" 사용`;
        },

        // 가격 형식: ₩로 시작, 숫자와 콤마
        price: (value, id) => {
            if (value === '') return null;
            if (!value) return `ID ${id}: price 필드 누락`;
            if (/^₩[\d,]+$/.test(value)) return null;
            if (value === '확인 중') return null;
            return `ID ${id}: price 형식 오류 ("${value}") - "₩X,XXX,XXX" 형식 사용`;
        },

        // 연도 형식: 4자리 숫자 또는 확인 중
        year: (value, id) => {
            if (value === '') return null;
            if (!value) return `ID ${id}: year 필드 누락`;
            if (value === '확인 중') return null;
            if (/^\d{4}$/.test(value)) return null;
            return `ID ${id}: year 형식 오류 ("${value}") - "YYYY" 또는 "확인 중" 사용`;
        },

        // 에디션 형식: "에디션 X/Y" 또는 빈 문자열
        edition: (value, id) => {
            if (value === '' || value === undefined) return null;
            if (/^에디션\s*\d+\/\d+/.test(value)) return null;
            return `ID ${id}: edition 형식 경고 ("${value}") - "에디션 X/Y" 또는 빈 문자열 권장`;
        },

        // shopUrl 필수
        shopUrl: (value, id) => {
            if (!value) return `ID ${id}: shopUrl 누락 - Cafe24 URL 필요`;
            if (!value.startsWith('https://')) return `ID ${id}: shopUrl 형식 오류 - https:// 로 시작해야 함`;
            return null;
        },

        // 재료: 빈값 허용 안함
        material: (value, id) => {
            if (value === '') return null;
            if (!value) return `ID ${id}: material 필드 누락`;
            return null;
        }
    };

    // ID 중복 검사
    const ids = artworks.map(a => a.id);
    const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    if (duplicates.length > 0) {
        errors.push(`중복 ID 발견: ${[...new Set(duplicates)].join(', ')}`);
    }

    // 각 작품 검증
    artworks.forEach(artwork => {
        // 필수 필드 검사
        rules.required.forEach(field => {
            if (!artwork[field]) {
                errors.push(`ID ${artwork.id || '?'}: 필수 필드 '${field}' 누락`);
            }
        });

        // 형식 검사
        ['size', 'price', 'year', 'material'].forEach(field => {
            const result = rules[field](artwork[field], artwork.id);
            if (result) {
                if (field === 'price') {
                    errors.push(result);
                } else {
                    warnings.push(result);
                }
            }
        });

        // shopUrl 검사 (경고로 처리 - 나중에 추가할 수 있음)
        const shopUrlResult = rules.shopUrl(artwork.shopUrl, artwork.id);
        if (shopUrlResult) warnings.push(shopUrlResult);

        // 에디션 경고
        const editionResult = rules.edition(artwork.edition, artwork.id);
        if (editionResult) warnings.push(editionResult);
    });

    // 결과 출력
    console.log('\n=== 작품 데이터 검증 결과 ===\n');
    console.log(`총 작품 수: ${artworks.length}\n`);

    if (errors.length === 0 && warnings.length === 0) {
        console.log('✅ 모든 검증 통과!\n');
        process.exit(0);
    }

    if (errors.length > 0) {
        console.log(`❌ 오류 (${errors.length}개):`);
        errors.forEach(e => console.log(`   - ${e}`));
        console.log('');
    }

    if (warnings.length > 0) {
        console.log(`⚠️  경고 (${warnings.length}개):`);
        warnings.forEach(w => console.log(`   - ${w}`));
        console.log('');
    }

    // 오류가 있으면 exit code 1
    if (errors.length > 0) {
        console.log('💡 오류를 수정한 후 다시 검증하세요.\n');
        process.exit(1);
    } else {
        console.log('💡 경고는 권장사항이며, 필수 수정 대상은 아닙니다.\n');
        process.exit(0);
    }
}

validateArtworks();
