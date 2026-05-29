#!/usr/bin/env node

/**
 * 오윤(O Yun) 사후판화 일괄 import / 기존 18점 갱신 스크립트.
 *
 * 출처: '오윤_작품목록_사이즈_년도(오윤작품).csv' (가나화랑 도큐먼트 번호 기준 175점)
 *       + '오윤_이미지' 폴더 고화질 PNG (가나번호 zero-pad 매칭)
 *
 * 정책 (2026-05-29 사용자 확정):
 *  - 범위: 전체 175점 = 씨앗페 18점(기존, 갱신) + 4/8가져옴 157점(신규 등록).
 *  - 가격: CSV '작품가격' 컬럼(도상가격 반영) → 신규·기존 공통.
 *  - 결제: cafe24 종료 → 전부 토스 직접 결제. shop_url 불필요(=null). DB 작품(UUID)+가격이면 자동 토스.
 *  - 기존 18점: size/year/material/price 를 CSV로 갱신 + dead cafe24 shop_url=null + 새 이미지로 교체.
 *  - 신규 157점: INSERT (category=사후판화, edition_type=open, tax_type=B, admin_product_name=OYN-{가나}).
 *  - 가드: admin_product_name='OYN-{가나}' 이미 있으면 skip(중복 차단). [project_artwork_import_guard]
 *  - 이미지: sharp로 thumb/card/detail/hero/original webp 5종 생성 후 Storage 업로드, images=[__original.webp].
 *
 * 사용:
 *   node scripts/import-oh-yun-artworks.js                 # dry-run (DB/Storage 무변경)
 *   node scripts/import-oh-yun-artworks.js --apply         # 전체 적용 (기존 갱신 + 신규 등록)
 *   node scripts/import-oh-yun-artworks.js --apply --existing-only
 *   node scripts/import-oh-yun-artworks.js --apply --new-only
 *   node scripts/import-oh-yun-artworks.js --write-log     # dry-run + import JSON 미리보기 출력
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const sharp = require('sharp');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true });

const CSV_PATH =
  process.env.OY_CSV ||
  '/Users/hwang-gyeongha/Downloads/오윤_작품목록_사이즈_년도(오윤작품).csv';
const IMG_DIR = process.env.OY_IMG || '/Users/hwang-gyeongha/Downloads/오윤_이미지';

const ARTIST_ID = '398f3739-b81e-4ba8-bcd0-fed2e53d3dc8'; // 오윤 (career_tier=거장)
const ARTWORK_BUCKET = 'artworks';

const VARIANTS = [
  { variant: 'thumb', maxSize: 400, quality: 72 },
  { variant: 'card', maxSize: 960, quality: 75 },
  { variant: 'detail', maxSize: 1600, quality: 80 },
  { variant: 'hero', maxSize: 1920, quality: 80 },
  { variant: 'original', maxSize: 2560, quality: 82 },
];

// 기존 18점 (씨앗페 출품작): 가나번호 → { id(UUID), storageNum(현 Storage 베이스), dbTitle }
// storageNum 은 현 이미지 경로 베이스 — 같은 경로에 새 이미지를 upsert 하여 URL 안정성 유지(오펀 없음).
const EXISTING = {
  1: { id: 'e637bb45-e888-443b-8f2e-8911c79d9ba7', storageNum: 213, dbTitle: '대지' },
  5: { id: 'b3838f14-0601-4e2a-a502-4b099ecd50ad', storageNum: 154, dbTitle: '낮도깨비' },
  6: { id: '74824081-63a0-4b76-9de6-a57d865c110e', storageNum: 210, dbTitle: '춘무인추무의' },
  7: { id: '4c920878-32dd-4727-ab03-6eda996597d5', storageNum: 151, dbTitle: '칼노래', sold: true },
  8: { id: '4a78be2f-01b1-4db2-956e-32b11df89177', storageNum: 152, dbTitle: '징2' },
  12: { id: '45dac49b-e8f2-4aea-8b86-8452dba853c0', storageNum: 153, dbTitle: '무호도' },
  14: { id: '1cb51984-cc53-49e2-bf93-1eb4e00f780a', storageNum: 215, dbTitle: '춤2' },
  15: { id: '618357b4-b410-472d-8ba5-e0cf3189380e', storageNum: 216, dbTitle: '형님' },
  18: { id: '7d93201f-1397-4b76-91e6-a504ac2edf36', storageNum: 148, dbTitle: '검은새' },
  22: { id: '7f154b6f-a158-49ef-877f-618f9da166c1', storageNum: 149, dbTitle: '봄의소리1' },
  23: { id: 'b8a497d3-862d-4d98-81d9-dfec5e0bdb7d', storageNum: 156, dbTitle: '석양' },
  29: { id: 'd0188743-0eb3-4c07-97e1-8021163a0d63', storageNum: 150, dbTitle: '봄의소리2' },
  30: { id: '951c0751-1e28-446e-9786-4dfd7ced92e8', storageNum: 214, dbTitle: '소리꾼1' },
  41: { id: 'ec78c03b-9e16-46a2-af71-7e28ac12da60', storageNum: 186, dbTitle: '지리산3' },
  48: { id: '1350256c-5137-4a99-afcc-043e4c72287b', storageNum: 211, dbTitle: '팔엽일화' },
  51: { id: '6a47a8a2-764a-4da9-8d9c-217b05536662', storageNum: 212, dbTitle: '귀향' },
  64: { id: '536f693e-ef7d-487a-86f9-5dc986220001', storageNum: 155, dbTitle: '남녁땅뱃노래' },
  79: { id: 'd17d1423-20f7-4bf6-9611-89a3688280f8', storageNum: 147, dbTitle: '지리산2' },
};

// ---------- CSV 파서 (RFC4180, 따옴표/내부쉼표/개행 처리) ----------
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// ---------- 제목 포맷 ----------
const ROMAN = {
  'Ⅰ': '1', 'Ⅱ': '2', 'Ⅲ': '3', 'Ⅳ': '4', 'Ⅴ': '5',
  'Ⅵ': '6', 'Ⅶ': '7', 'Ⅷ': '8', 'Ⅸ': '9', 'Ⅹ': '10',
};
function romanToArabic(s) {
  return s.replace(/[Ⅰ-Ⅹ]/g, (m) => ROMAN[m] || m);
}
function formatTitle(raw) {
  let t = (raw || '').trim();
  // 시리즈 삽화: 박꽃누나 / 메아리소년 — "{시리즈}_{NN}_{부제}" → "{시리즈} - {부제}"
  const m = t.match(/^(박꽃누나|메아리소년)[_\-]+(\d+)[_\-]+(.+)$/);
  if (m) {
    const series = m[1];
    let sub = m[3]
      .replace(/_/g, ' ') // 내부 언더스코어 → 공백 (메아리소년_..._가슴에 해를 안고_장면)
      .replace(/^[\-\s]+/, '') // 선행 하이픈/공백 제거
      .replace(/\s+/g, ' ')
      .trim();
    sub = romanToArabic(sub);
    return `${series} - ${sub}`;
  }
  return romanToArabic(t).replace(/\s+/g, ' ').trim();
}
function seriesPlate(raw) {
  const m = (raw || '').match(/^(박꽃누나|메아리소년)[_\-]+(\d+)[_\-]+/);
  return m ? `${m[1]}-${m[2]}` : null;
}

// ---------- 필드 변환 ----------
function formatSize(raw) {
  const t = (raw || '').trim();
  if (!t) return '확인 중';
  return t.replace(/[×xX]/g, 'x').replace(/\s+/g, '') + 'cm';
}
function formatYear(raw) {
  const t = (raw || '').trim();
  if (!t) return '확인 중';
  return t.replace(/~/g, '-');
}
function formatPrice(raw) {
  const digits = (raw || '').replace(/[^\d]/g, '');
  if (!digits) return null;
  return '₩' + Number(digits).toLocaleString('en-US');
}

// ---------- 이미지 파일 매칭 ----------
let imgFiles = null;
function imageFor(gana) {
  if (!imgFiles) imgFiles = fs.readdirSync(IMG_DIR).filter((f) => /\.png$/i.test(f));
  const pad = String(gana).padStart(3, '0');
  // "061" 중복: "(2)" 아닌 기본 파일 우선
  const matches = imgFiles
    .filter((f) => f.startsWith(pad + '_'))
    .sort((a, b) => (a.includes('(2)') ? 1 : 0) - (b.includes('(2)') ? 1 : 0));
  return matches[0] || null;
}

// ---------- Supabase ----------
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;
function getClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 누락 (.env.local)');
  }
  if (!supabase) supabase = createClient(supabaseUrl, serviceRoleKey);
  return supabase;
}
function publicUrl(storagePath) {
  return getClient().storage.from(ARTWORK_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

async function uploadVariants(storageNum, fileName) {
  const buf = fs.readFileSync(path.join(IMG_DIR, fileName));
  const source = sharp(buf, { failOnError: false }).rotate();
  for (const spec of VARIANTS) {
    const out = await source
      .clone()
      .resize({ width: spec.maxSize, height: spec.maxSize, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: spec.quality })
      .toBuffer();
    const p = `${ARTIST_ID}/${storageNum}__${spec.variant}.webp`;
    const { error } = await getClient()
      .storage.from(ARTWORK_BUCKET)
      .upload(p, out, { upsert: true, contentType: 'image/webp' });
    if (error) throw new Error(`업로드 실패 ${p}: ${error.message}`);
  }
  return publicUrl(`${ARTIST_ID}/${storageNum}__original.webp`);
}

// ---------- 메인 ----------
function buildWorks() {
  const rows = parseCSV(fs.readFileSync(CSV_PATH, 'utf8'));
  const works = [];
  for (const r of rows.slice(1)) {
    const gana = parseInt((r[0] || '').trim(), 10);
    const title = (r[1] || '').trim();
    if (!Number.isFinite(gana) || gana < 1 || gana > 184) continue; // 푸터/빈 행 제외
    if (!title) continue; // 빈 작품 행 제외
    const isSeed = (r[6] || '').trim() === '씨앗페';
    const has48 = (r[7] || '').trim() !== '';
    if (!isSeed && !has48) continue; // '이별'(분류 외) 제외 → 정확히 175점

    const existing = EXISTING[gana] || null;
    // 전 작품 새 경로(1000+가나) 사용 → 기존 18점도 이미지 URL이 바뀌어 CDN 캐시 확실히 무효화.
    // 기존 경로(147~216) 파일은 무해한 orphan으로 남음(cleanup-artwork-variants.js로 추후 정리 가능).
    const storageNum = 1000 + gana;
    const img = imageFor(gana);
    works.push({
      gana,
      rawTitle: title,
      title: title, // 사용자 지시: CSV 제목 원문 통째로 사용 (포맷 변환 없음)
      plate: seriesPlate(title),
      material: (r[2] || '').trim(),
      size: formatSize(r[3]),
      year: formatYear(r[4]),
      price: formatPrice(r[14]), // 작품가격
      isSeed,
      existing,
      storageNum,
      img,
      adminProductName: `OYN-${String(gana).padStart(3, '0')}`,
    });
  }
  return works;
}

async function run() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const existingOnly = args.includes('--existing-only');
  const newOnly = args.includes('--new-only');
  const writeLog = args.includes('--write-log');

  const works = buildWorks();
  const existingWorks = works.filter((w) => w.existing);
  const newWorks = works.filter((w) => !w.existing);

  console.log(`\n=== 오윤 import (${apply ? 'APPLY' : 'DRY-RUN'}) ===`);
  console.log(`총 ${works.length}점 = 기존 ${existingWorks.length} + 신규 ${newWorks.length}\n`);

  // 플래그/검증
  const flags = [];
  const noImg = works.filter((w) => !w.img);
  if (noImg.length) flags.push(`이미지 없음 ${noImg.length}점: ${noImg.map((w) => `${w.gana}/${w.rawTitle}`).join(', ')}`);
  const noPrice = works.filter((w) => !w.price);
  if (noPrice.length) flags.push(`가격 없음 ${noPrice.length}점: ${noPrice.map((w) => `${w.gana}/${w.rawTitle}`).join(', ')}`);
  const dupTitles = {};
  works.forEach((w) => { dupTitles[w.title] = (dupTitles[w.title] || 0) + 1; });
  const dups = Object.entries(dupTitles).filter(([, c]) => c > 1);
  if (dups.length) flags.push(`제목 중복: ${dups.map(([t, c]) => `"${t}"×${c}`).join(', ')}`);

  console.log('--- 신규 제목 샘플 (시리즈 포함) ---');
  const samples = [
    ...newWorks.slice(0, 6),
    ...newWorks.filter((w) => w.plate).slice(0, 6),
  ];
  [...new Set(samples)].forEach((w) =>
    console.log(`  [${w.gana}] "${w.rawTitle}"  →  "${w.title}"  | ${w.year} | ${w.size} | ${w.price} | ${w.img ? 'IMG✓' : 'IMG✗'}`)
  );

  console.log('\n--- 기존 18점 갱신 내역 ---');
  existingWorks.forEach((w) =>
    console.log(`  [${w.gana}] ${w.existing.dbTitle}  | ${w.year} | ${w.size} | ${w.price} | ${w.material.slice(0, 14)} | ${w.img ? `IMG✓→${w.storageNum}` : 'IMG✗(유지)'}${w.existing.sold ? ' | SOLD' : ''}`)
  );

  if (flags.length) {
    console.log('\n--- ⚠ 플래그 ---');
    flags.forEach((f) => console.log('  • ' + f));
  }

  if (!apply) {
    console.log('\n(dry-run — DB/Storage 무변경. 적용하려면 --apply)');
    if (writeLog) console.log('\nLOG preview:\n', JSON.stringify(buildLog(works), null, 2).slice(0, 1200));
    return;
  }

  // ---- APPLY ----
  const client = getClient();

  if (!newOnly) {
    console.log('\n>>> 기존 18점 갱신...');
    for (const w of existingWorks) {
      const update = {
        size: w.size,
        year: w.year,
        material: w.material,
        price: w.price,
        shop_url: null, // dead cafe24 정리
        updated_at: new Date().toISOString(),
      };
      if (w.img) {
        const url = await uploadVariants(w.storageNum, w.img);
        update.images = [url];
      }
      const { error } = await client.from('artworks').update(update).eq('id', w.existing.id);
      if (error) throw new Error(`기존 갱신 실패 ${w.gana}/${w.existing.dbTitle}: ${error.message}`);
      console.log(`  ✓ [${w.gana}] ${w.existing.dbTitle} 갱신${w.img ? ' + 이미지' : ''}`);
    }
  }

  if (!existingOnly) {
    console.log('\n>>> 신규 157점 등록...');
    // 가드: 이미 등록된 OYN-% 조회
    const { data: existingOyn, error: gErr } = await client
      .from('artworks')
      .select('admin_product_name')
      .like('admin_product_name', 'OYN-%');
    if (gErr) throw new Error(`가드 조회 실패: ${gErr.message}`);
    const already = new Set((existingOyn || []).map((r) => r.admin_product_name));

    for (const w of newWorks) {
      if (already.has(w.adminProductName)) {
        console.log(`  ↷ skip [${w.gana}] ${w.title} (이미 ${w.adminProductName})`);
        continue;
      }
      const { data: inserted, error } = await client
        .from('artworks')
        .insert({
          title: w.title,
          artist_id: ARTIST_ID,
          size: w.size,
          material: w.material,
          year: w.year,
          price: w.price || '문의',
          category: '사후판화',
          edition_type: 'open',
          tax_type: 'B',
          admin_product_name: w.adminProductName,
          shop_url: null,
          status: 'available',
          is_hidden: false,
        })
        .select('id')
        .single();
      if (error) throw new Error(`신규 INSERT 실패 ${w.gana}/${w.title}: ${error.message}`);
      w.artworkId = inserted.id;

      if (w.img) {
        const url = await uploadVariants(w.storageNum, w.img);
        const { error: upErr } = await client
          .from('artworks')
          .update({ images: [url], updated_at: new Date().toISOString() })
          .eq('id', inserted.id);
        if (upErr) throw new Error(`신규 이미지 갱신 실패 ${w.gana}: ${upErr.message}`);
      }
      console.log(`  ✓ [${w.gana}] ${w.title} → ${inserted.id}${w.img ? ' + 이미지' : ' (이미지없음)'}`);
    }
  }

  // import 로그
  const logPath = path.join(__dirname, '..', 'content', 'imports', 'oh-yun-prints-2026.json');
  fs.writeFileSync(logPath, JSON.stringify(buildLog(works), null, 2) + '\n');
  console.log(`\n✓ import 로그: ${logPath}`);
  console.log('\n=== 완료 ===');
}

function buildLog(works) {
  return {
    meta: {
      source: '오윤_작품목록_사이즈_년도(오윤작품).csv + 오윤_이미지 폴더',
      imported_at: '2026-05-29',
      imported_by: 'claude-code',
      artist_id: ARTIST_ID,
      artist_name_ko: '오윤',
      total: works.length,
      existing_updated: works.filter((w) => w.existing).length,
      new_inserted: works.filter((w) => !w.existing).length,
      price_basis: 'CSV 작품가격(도상가격 반영)',
      payment: '토스 직접 결제 (cafe24 종료, shop_url=null)',
      guard_policy:
        "admin_product_name='OYN-{가나번호3자리}'. 재등록 시 SELECT ... WHERE admin_product_name LIKE 'OYN-%' 확인 후 skip",
    },
    works: works.map((w) => ({
      gana: w.gana,
      admin_product_name: w.adminProductName,
      raw_title: w.rawTitle,
      title: w.title,
      series_plate: w.plate,
      material: w.material,
      size: w.size,
      year: w.year,
      price: w.price,
      classification: w.isSeed ? '씨앗페' : '4/8가져옴',
      action: w.existing ? 'update' : 'insert',
      artwork_id: w.existing ? w.existing.id : w.artworkId || null,
      storage_num: w.storageNum,
      source_image: w.img,
    })),
  };
}

run().catch((e) => {
  console.error('\n실패:', e.message || e);
  process.exit(1);
});
