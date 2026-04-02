#!/usr/bin/env node
'use strict';

/**
 * Artwork size normalization script
 * 모든 size 값을 WxHcm (3D는 WxHxDcm) 형식으로 정규화
 *
 * Usage:
 *   node scripts/normalize-artwork-sizes.js           # dry-run (preview only)
 *   node scripts/normalize-artwork-sizes.js --apply   # apply changes
 */

const fs = require('fs');
const path = require('path');

const APPLY = process.argv.includes('--apply');

// From lib/utils/parseArtworkSize.ts
const HO_SIZES = {
  0: [18.0, 14.0],
  1: [22.7, 16.0],
  2: [24.2, 19.0],
  3: [27.3, 22.0],
  4: [33.3, 24.2],
  5: [35.0, 27.3],
  6: [40.9, 31.8],
  8: [45.5, 37.9],
  10: [53.0, 40.9],
  12: [60.6, 50.0],
  15: [65.1, 53.0],
  20: [72.7, 60.6],
  25: [80.3, 65.1],
  30: [90.9, 72.7],
  40: [100.0, 80.3],
  50: [116.7, 91.0],
  60: [130.3, 97.0],
  80: [145.5, 112.1],
  100: [162.1, 130.3],
  120: [193.9, 130.3],
};

function round1(n) {
  return Math.round(n * 10) / 10;
}

/**
 * Parse cm dimensions from inner content of F-number parentheses.
 * e.g. "45.5 x 53cm" or "45.5x53"
 */
function parseCmDims(inner) {
  const m = inner.match(/(\d+(?:\.\d+)?)\s*[×xX]\s*(\d+(?:\.\d+)?)(?:cm)?/i);
  if (m) {
    return `${m[1]}x${m[2]}cm`;
  }
  return null;
}

/**
 * Normalize a single size value to standard WxHcm (or WxHxDcm) format.
 */
function normalizeSize(raw) {
  // Rule 1: empty string → 확인 중
  if (raw === '') return '확인 중';

  // Rule 2: already 확인 중
  if (raw === '확인 중') return '확인 중';

  const s = raw.trim();

  // Rule 3: F-number with cm in parentheses: "10F (45.5 x 53cm)"
  const fMatch = s.match(/^\d+F?\s*\(([^)]+)\)$/);
  if (fMatch) {
    const dims = parseCmDims(fMatch[1].trim());
    if (dims) return dims;
  }

  // Rule 4: asterisk separator: "53cm* 45.5cm"
  const asteriskMatch = s.match(/^(\d+(?:\.\d+)?)cm\*\s*(\d+(?:\.\d+)?)cm$/);
  if (asteriskMatch) {
    return `${asteriskMatch[1]}x${asteriskMatch[2]}cm`;
  }

  // Rule 5: dash separator: "116cm - 91cm"
  const dashMatch = s.match(/^(\d+(?:\.\d+)?)cm\s*-\s*(\d+(?:\.\d+)?)cm$/);
  if (dashMatch) {
    return `${dashMatch[1]}x${dashMatch[2]}cm`;
  }

  // Rule 6: unit on each dimension: "90cm × 72cm", "90cm x 72cm "
  const unitEachMatch = s.match(/^(\d+(?:\.\d+)?)cm\s*[×xX]\s*(\d+(?:\.\d+)?)cm\s*$/);
  if (unitEachMatch) {
    return `${unitEachMatch[1]}x${unitEachMatch[2]}cm`;
  }

  // Rule 7: unit embedded between dimensions: "19cmx24cm"
  const embeddedMatch = s.match(/^(\d+(?:\.\d+)?)cm[xX](\d+(?:\.\d+)?)cm$/);
  if (embeddedMatch) {
    return `${embeddedMatch[1]}x${embeddedMatch[2]}cm`;
  }

  // Rule 8: ho+cm hybrid, no unit on cm part: "33.4x45.5(P8호)"
  const hoCmNoUnitMatch = s.match(/^(\d+(?:\.\d+)?)[×xX](\d+(?:\.\d+)?)\([PFM]?\d+호\)$/);
  if (hoCmNoUnitMatch) {
    return `${hoCmNoUnitMatch[1]}x${hoCmNoUnitMatch[2]}cm`;
  }

  // Rule 9: cm+ho hybrid: "72.7×50cm(M20호)", "60.6×72.7cm(F20호)"
  const cmHoMatch = s.match(/^(\d+(?:\.\d+)?)[×xX](\d+(?:\.\d+)?)cm\([PFM]?\d+호\)$/);
  if (cmHoMatch) {
    return `${cmHoMatch[1]}x${cmHoMatch[2]}cm`;
  }

  // Rule 10: A4 size
  if (/^A4\s*size$/i.test(s)) {
    return '21x29.7cm';
  }

  // Rule 11: bare Korean ho: "8호", "30호"
  const hoMatch = s.match(/^(\d+)호$/);
  if (hoMatch) {
    const ho = parseInt(hoMatch[1], 10);
    const dims = HO_SIZES[ho];
    if (dims) {
      return `${dims[0]}x${dims[1]}cm`;
    }
    // Unknown ho number — return as-is
    return raw;
  }

  // Rule 12: no unit WxH or WxHxD: "81x61", "37.8x37.8"
  const noUnitMatch = s.match(/^(\d+(?:\.\d+)?)[×xX](\d+(?:\.\d+)?)((?:[×xX]\d+(?:\.\d+)?)?)$/);
  if (noUnitMatch) {
    const d = noUnitMatch[3] ? noUnitMatch[3].replace(/[×xX]/, 'x') : '';
    return `${noUnitMatch[1]}x${noUnitMatch[2]}${d}cm`;
  }

  // Rule 13: mm unit (2D or 3D): "12x12x285mm"
  const mmMatch = s.match(
    /^(\d+(?:\.\d+)?)[×xX](\d+(?:\.\d+)?)((?:[×xX]\d+(?:\.\d+)?)?)\s*mm$/i
  );
  if (mmMatch) {
    const w = round1(parseFloat(mmMatch[1]) / 10);
    const h = round1(parseFloat(mmMatch[2]) / 10);
    if (mmMatch[3]) {
      const dVal = round1(parseFloat(mmMatch[3].replace(/^[×xX]/i, '')) / 10);
      return `${w}x${h}x${dVal}cm`;
    }
    return `${w}x${h}cm`;
  }

  // Rule 14: inch unit: "11x40inch"
  const inchMatch = s.match(/^(\d+(?:\.\d+)?)[×xX](\d+(?:\.\d+)?)\s*inch$/i);
  if (inchMatch) {
    const w = round1(parseFloat(inchMatch[1]) * 2.54);
    const h = round1(parseFloat(inchMatch[2]) * 2.54);
    return `${w}x${h}cm`;
  }

  // Rule 15: cosmetic normalization (already valid format with × or X or spaces)
  // Replace × → x, X → x, remove spaces around x
  const cosmetic = s.replace(/\s*[×X]\s*/g, 'x').replace(/\s*x\s*/g, 'x');
  if (cosmetic !== s) return cosmetic;

  // Rule 16: return as-is (trimmed)
  return s !== raw ? s : raw;
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const changes = [];

  let newContent = content;

  // Pattern 1: single-quote TypeScript object literal: size: 'value'
  newContent = newContent.replace(/(\bsize: ')([^']*)(')/g, (match, before, val, after) => {
    const normalized = normalizeSize(val);
    if (normalized === val) return match;
    changes.push({ old: val, new: normalized });
    return `${before}${normalized}${after}`;
  });

  // Pattern 2: double-quote JSON style (batch-db-generated.ts): "size": "value"
  newContent = newContent.replace(/("size": ")([^"]*)(")/g, (match, before, val, after) => {
    const normalized = normalizeSize(val);
    if (normalized === val) return match;
    changes.push({ old: val, new: normalized });
    return `${before}${normalized}${after}`;
  });

  return { content: newContent, changes };
}

function main() {
  const batchDir = path.join(__dirname, '..', 'content', 'artworks-batches');
  const files = fs.readdirSync(batchDir).filter((f) => f.startsWith('batch-') && f.endsWith('.ts'));

  let totalChanges = 0;

  console.log(`\n=== 작품 사이즈 정규화 ${APPLY ? '(적용)' : '(미리보기 — --apply 로 실제 적용)'} ===\n`);

  for (const file of files.sort()) {
    const filePath = path.join(batchDir, file);
    const { content: newContent, changes } = processFile(filePath);

    if (changes.length === 0) continue;

    console.log(`📄 ${file} (${changes.length}건):`);
    for (const c of changes) {
      const oldDisplay = c.old === '' ? '(빈 문자열)' : `"${c.old}"`;
      console.log(`   ${oldDisplay} → "${c.new}"`);
    }
    console.log('');

    if (APPLY) {
      fs.writeFileSync(filePath, newContent, 'utf8');
    }

    totalChanges += changes.length;
  }

  if (totalChanges === 0) {
    console.log('✅ 정규화가 필요한 항목 없음.\n');
  } else if (APPLY) {
    console.log(`✅ ${totalChanges}건 정규화 완료.\n`);
    console.log('다음 단계: npm run validate-artworks\n');
  } else {
    console.log(`💡 총 ${totalChanges}건 정규화 예정. 실제 적용하려면:\n`);
    console.log('   node scripts/normalize-artwork-sizes.js --apply\n');
  }
}

main();
