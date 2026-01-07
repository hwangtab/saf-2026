const path = require('path');
const createJiti = require('jiti');
const jiti = createJiti(__filename);

const { artworks } = jiti('../content/saf2026-artworks.ts');

function validateArtworks() {
  const errors = [];
  const warnings = [];

  const rules = {
    required: ['id', 'artist', 'title', 'image'],

    size: (value, id) => {
      if (value === '') return null;
      if (!value) return `ID ${id}: size 필드 누락`;
      if (value === '확인 중') return null;
      if (/^\d+(\.\d+)?x\d+(\.\d+)?cm$/.test(value)) return null;
      if (/^\d+F?\s*\([\d\s.x×cm]+\)$/.test(value)) return null;
      if (/^\d+호$/.test(value)) return null;
      return `ID ${id}: size 형식 오류 ("${value}") - "숫자x숫자cm", "숫자호", 또는 "확인 중" 사용`;
    },

    price: (value, id) => {
      if (value === '') return null;
      if (!value) return `ID ${id}: price 필드 누락`;
      if (/^₩[\d,]+$/.test(value)) return null;
      if (value === '확인 중' || value === '문의') return null;
      return `ID ${id}: price 형식 오류 ("${value}") - "₩X,XXX,XXX" 형식 사용`;
    },

    year: (value, id) => {
      if (value === '') return null;
      if (!value) return `ID ${id}: year 필드 누락`;
      if (value === '확인 중') return null;
      if (/^\d{4}$/.test(value)) return null;
      return `ID ${id}: year 형식 오류 ("${value}") - "YYYY" 또는 "확인 중" 사용`;
    },

    edition: (value, id) => {
      if (value === '' || value === undefined) return null;
      if (/^에디션\s*\d+\/\d+/.test(value)) return null;
      return `ID ${id}: edition 형식 경고 ("${value}") - "에디션 X/Y" 또는 빈 문자열 권장`;
    },

    shopUrl: (value, id) => {
      if (!value) return `ID ${id}: shopUrl 누락 - Cafe24 URL 필요`;
      if (!value.startsWith('https://'))
        return `ID ${id}: shopUrl 형식 오류 - https:// 로 시작해야 함`;
      return null;
    },

    material: (value, id) => {
      if (value === '') return null;
      if (!value) return `ID ${id}: material 필드 누락`;
      return null;
    },
  };

  const ids = artworks.map((a) => a.id);
  const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx);
  if (duplicates.length > 0) {
    errors.push(`중복 ID 발견: ${[...new Set(duplicates)].join(', ')}`);
  }

  artworks.forEach((artwork) => {
    rules.required.forEach((field) => {
      if (!artwork[field]) {
        errors.push(`ID ${artwork.id || '?'}: 필수 필드 '${field}' 누락`);
      }
    });

    ['size', 'price', 'year', 'material'].forEach((field) => {
      const result = rules[field](artwork[field], artwork.id);
      if (result) {
        if (field === 'price') {
          errors.push(result);
        } else {
          warnings.push(result);
        }
      }
    });

    const shopUrlResult = rules.shopUrl(artwork.shopUrl, artwork.id);
    if (shopUrlResult) warnings.push(shopUrlResult);

    const editionResult = rules.edition(artwork.edition, artwork.id);
    if (editionResult) warnings.push(editionResult);
  });

  console.log('\n=== 작품 데이터 검증 결과 ===\n');
  console.log(`총 작품 수: ${artworks.length}\n`);

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ 모든 검증 통과!\n');
    process.exit(0);
  }

  if (errors.length > 0) {
    console.log(`❌ 오류 (${errors.length}개):`);
    errors.forEach((e) => console.log(`   - ${e}`));
    console.log('');
  }

  if (warnings.length > 0) {
    console.log(`⚠️  경고 (${warnings.length}개):`);
    warnings.forEach((w) => console.log(`   - ${w}`));
    console.log('');
  }

  if (errors.length > 0) {
    console.log('💡 오류를 수정한 후 다시 검증하세요.\n');
    process.exit(1);
  } else {
    console.log('💡 경고는 권장사항이며, 필수 수정 대상은 아닙니다.\n');
    process.exit(0);
  }
}

validateArtworks();
