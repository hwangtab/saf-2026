#!/usr/bin/env node

/**
 * 오윤 175점 영문 제목(title_en) 적용.
 *
 * 입력:
 *  - content/imports/oh-yun-prints-2026.json (gana → artwork_id 매핑, 권위 출처)
 *  - 번역 결과 JSON: [{gana, en}] — OY_TITLE_EN 환경변수 경로 또는 기본 /tmp/oy_title_en.json
 *
 * 사용:
 *   node scripts/apply-oh-yun-title-en.js            # dry-run
 *   node scripts/apply-oh-yun-title-en.js --apply    # title_en UPDATE
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true });

const TRANS_PATH = process.env.OY_TITLE_EN || '/tmp/oy_title_en.json';
const LOG_PATH = path.join(__dirname, '..', 'content', 'imports', 'oh-yun-prints-2026.json');

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const apply = process.argv.includes('--apply');

  const log = JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'));
  const ganaToId = {};
  const ganaToKo = {};
  for (const w of log.works) {
    if (w.artwork_id) {
      ganaToId[w.gana] = w.artwork_id;
      ganaToKo[w.gana] = w.title;
    }
  }

  const trans = JSON.parse(fs.readFileSync(TRANS_PATH, 'utf8')); // [{gana, en}]
  const transArr = Array.isArray(trans) ? trans : trans.final || trans.translations;

  console.log(`\n=== 오윤 title_en 적용 (${apply ? 'APPLY' : 'DRY-RUN'}) ===`);
  console.log(`번역 ${transArr.length}점, 매핑 ${Object.keys(ganaToId).length}점`);

  const rows = [];
  const missing = [];
  for (const { gana, en } of transArr) {
    const id = ganaToId[gana];
    if (!id) { missing.push(gana); continue; }
    if (!en || !en.trim()) { missing.push(`${gana}(빈값)`); continue; }
    rows.push({ gana, id, ko: ganaToKo[gana], en: en.trim() });
  }

  // 매핑엔 있는데 번역 누락된 gana
  const transGanas = new Set(transArr.map((t) => t.gana));
  const notTranslated = Object.keys(ganaToId).map(Number).filter((g) => !transGanas.has(g));

  console.log(`적용 대상 ${rows.length}점`);
  if (missing.length) console.log(`⚠ id 없음/빈값: ${missing.join(', ')}`);
  if (notTranslated.length) console.log(`⚠ 번역 누락 gana: ${notTranslated.join(', ')}`);

  console.log('\n--- 샘플 (앞 12 + 한자/시리즈) ---');
  const sample = [...rows.slice(0, 12), ...rows.filter((r) => /[一-鿿]|박꽃누나|메아리소년/.test(r.ko)).slice(0, 8)];
  [...new Set(sample)].forEach((r) => console.log(`  [${r.gana}] ${r.ko}  →  ${r.en}`));

  if (!apply) {
    console.log('\n(dry-run — 적용하려면 --apply)');
    return;
  }

  let ok = 0;
  for (const r of rows) {
    const { error } = await sb
      .from('artworks')
      .update({ title_en: r.en, updated_at: new Date().toISOString() })
      .eq('id', r.id);
    if (error) throw new Error(`UPDATE 실패 ${r.gana}/${r.ko}: ${error.message}`);
    ok++;
  }
  console.log(`\n✓ title_en 적용 완료: ${ok}/${rows.length}`);
}

main().catch((e) => {
  console.error('\n실패:', e.message || e);
  process.exit(1);
});
