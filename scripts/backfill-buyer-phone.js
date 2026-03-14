/**
 * backfill-buyer-phone.js
 *
 * docs/판매목록.csv의 '전번' 컬럼(col 2)을 읽어
 * artwork_sales 레코드의 buyer_phone을 업데이트합니다.
 *
 * 매칭 전략:
 *   1차: import_row_no (CSV의 순번)로 매칭
 *   2차: buyer_name으로 fallback 매칭
 *
 * Usage:
 *   node scripts/backfill-buyer-phone.js            # dry-run (미리보기)
 *   node scripts/backfill-buyer-phone.js --apply     # 실제 적용
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// --env 플래그로 env 파일 지정 가능 (기본: .env.local)
const envFlag = process.argv.find((a) => a.startsWith('--env='));
const envPath = envFlag ? envFlag.split('=')[1] : '.env.local';
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY 설정이 필요합니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

const CSV_PATH = path.join('docs', '판매목록.csv');
const DRY_RUN = !process.argv.includes('--apply');

function parseCsvRows(content) {
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const result = [];
  for (const line of lines.slice(1)) {
    const cols = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cols.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cols.push(current.trim());
    result.push(cols);
  }

  return result;
}

function normalizePhone(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9-]/g, '').trim();
  if (!cleaned || cleaned.length < 8) return null;
  return cleaned;
}

async function main() {
  console.log(DRY_RUN ? '🔍 DRY-RUN 모드 (미리보기)' : '⚡ APPLY 모드 (실제 적용)');
  console.log('');

  // 1. CSV 읽기
  const csvPath = path.resolve(CSV_PATH);
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ CSV 파일을 찾을 수 없습니다: ${csvPath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const rawRows = parseCsvRows(csvContent);
  console.log(`📄 CSV 행 수: ${rawRows.length}`);

  // 2. CSV에서 seq → phone 매핑 추출
  const csvPhoneMap = new Map(); // seq → { phone, buyerName }
  const namePhoneMap = new Map(); // buyerName → phone (fallback용)

  for (const cols of rawRows) {
    const seq = Number.parseInt(cols[0] || '', 10);
    const buyerName = (cols[1] || '').trim();
    const phone = normalizePhone(cols[2]);

    if (!Number.isFinite(seq) || seq <= 0) continue;
    if (!phone) continue;

    csvPhoneMap.set(seq, { phone, buyerName });

    if (buyerName && !namePhoneMap.has(buyerName)) {
      namePhoneMap.set(buyerName, phone);
    }
  }

  console.log(`📞 전화번호가 있는 CSV 행: ${csvPhoneMap.size}`);
  console.log(`👤 고유 구매자 이름 → 전화번호 매핑: ${namePhoneMap.size}`);
  console.log('');

  // 3. DB에서 artwork_sales 레코드 조회
  const { data: salesRows, error: salesError } = await supabase
    .from('artwork_sales')
    .select('id, import_row_no, buyer_name, buyer_phone')
    .is('voided_at', null)
    .order('import_row_no', { ascending: true });

  if (salesError) {
    console.error(`❌ artwork_sales 조회 실패: ${salesError.message}`);
    process.exit(1);
  }

  console.log(`🗄️  artwork_sales 총 레코드: ${salesRows.length}`);

  // 4. 매칭 및 업데이트 준비
  const updates = []; // { id, buyer_phone, matchMethod }
  let alreadyHasPhone = 0;
  let matchedByRowNo = 0;
  let matchedByName = 0;
  let noMatch = 0;

  for (const row of salesRows) {
    // 이미 전화번호가 있으면 스킵
    if (row.buyer_phone && row.buyer_phone.trim()) {
      alreadyHasPhone += 1;
      continue;
    }

    // 1차: import_row_no로 매칭
    if (row.import_row_no && csvPhoneMap.has(row.import_row_no)) {
      const { phone } = csvPhoneMap.get(row.import_row_no);
      updates.push({ id: row.id, buyer_phone: phone, matchMethod: 'import_row_no' });
      matchedByRowNo += 1;
      continue;
    }

    // 2차: buyer_name으로 fallback 매칭
    const name = (row.buyer_name || '').trim();
    if (name && namePhoneMap.has(name)) {
      updates.push({ id: row.id, buyer_phone: namePhoneMap.get(name), matchMethod: 'buyer_name' });
      matchedByName += 1;
      continue;
    }

    noMatch += 1;
  }

  console.log('');
  console.log('=== 매칭 결과 ===');
  console.log(`  이미 전화번호 있음 (스킵): ${alreadyHasPhone}`);
  console.log(`  import_row_no로 매칭: ${matchedByRowNo}`);
  console.log(`  buyer_name으로 매칭: ${matchedByName}`);
  console.log(`  매칭 불가 (연락처 없음): ${noMatch}`);
  console.log(`  ➡️  업데이트 대상: ${updates.length}`);
  console.log('');

  if (updates.length === 0) {
    console.log('✅ 업데이트할 레코드가 없습니다.');
    return;
  }

  // 상위 10건 미리보기
  console.log('--- 업데이트 미리보기 (상위 10건) ---');
  for (const update of updates.slice(0, 10)) {
    const sale = salesRows.find((r) => r.id === update.id);
    console.log(
      `  [${update.matchMethod}] ${sale?.buyer_name || '(이름없음)'} → ${update.buyer_phone}`
    );
  }
  if (updates.length > 10) {
    console.log(`  ... 외 ${updates.length - 10}건`);
  }
  console.log('');

  if (DRY_RUN) {
    console.log('ℹ️  --apply 플래그를 추가하면 실제로 DB에 적용됩니다.');
    return;
  }

  // 5. 실제 업데이트 적용
  let successCount = 0;
  let failCount = 0;

  // 10건씩 배치 처리
  for (let i = 0; i < updates.length; i += 10) {
    const batch = updates.slice(i, i + 10);

    for (const update of batch) {
      const { error: updateError } = await supabase
        .from('artwork_sales')
        .update({ buyer_phone: update.buyer_phone })
        .eq('id', update.id);

      if (updateError) {
        console.error(`  ❌ 업데이트 실패 (${update.id}): ${updateError.message}`);
        failCount += 1;
      } else {
        successCount += 1;
      }
    }
  }

  console.log('');
  console.log('=== 적용 결과 ===');
  console.log(`  ✅ 성공: ${successCount}`);
  if (failCount > 0) console.log(`  ❌ 실패: ${failCount}`);
  console.log('');
  console.log('🎉 백필 완료!');
}

main().catch((err) => {
  console.error('❌ 실행 중 오류:', err);
  process.exit(1);
});
