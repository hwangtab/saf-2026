const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEFAULT_IMPORT_DATE = '2026-02-15';
const DEFAULT_WINDOW_HOURS = 72;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY 설정이 필요합니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    apply: args.includes('--apply'),
    verbose: args.includes('--verbose'),
  };
}

function toMs(iso) {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function toMoney(value) {
  return `₩${Number(value || 0).toLocaleString('ko-KR')}`;
}

async function loadRows() {
  const { data, error } = await supabase
    .from('artwork_sales')
    .select(
      'id, artwork_id, sale_price, quantity, sold_at, created_at, source, buyer_name, note, external_order_id, external_order_item_code, artworks(title)'
    );

  if (error) throw new Error(`artwork_sales 조회 실패: ${error.message}`);
  return data || [];
}

function findMirrors(rows, options) {
  const importDateToken = options.importDateToken;
  const windowMs = options.windowHours * 60 * 60 * 1000;

  const cafe24Rows = rows.filter((row) => row.source === 'cafe24');
  const manualCandidates = rows.filter((row) => {
    if (row.source === 'cafe24') return false;
    if (typeof row.created_at !== 'string' || !row.created_at.startsWith(importDateToken)) {
      return false;
    }
    if (typeof row.buyer_name === 'string' && row.buyer_name.trim()) return false;
    if (row.external_order_id || row.external_order_item_code) return false;
    const note = typeof row.note === 'string' ? row.note.trim() : '';
    if (note && !note.startsWith('2026 씨앗페 판매')) return false;
    return true;
  });

  const usedManualIds = new Set();
  const mirroredPairs = [];

  for (const cafe24 of cafe24Rows) {
    const cafe24SoldAtMs = toMs(cafe24.sold_at);
    if (cafe24SoldAtMs === null) continue;

    const candidates = manualCandidates
      .filter((manual) => {
        if (usedManualIds.has(manual.id)) return false;
        if (manual.artwork_id !== cafe24.artwork_id) return false;
        if ((manual.sale_price || 0) !== (cafe24.sale_price || 0)) return false;
        if ((manual.quantity || 1) !== (cafe24.quantity || 1)) return false;
        const manualSoldAtMs = toMs(manual.sold_at);
        if (manualSoldAtMs === null) return false;
        return Math.abs(manualSoldAtMs - cafe24SoldAtMs) <= windowMs;
      })
      .sort((a, b) => {
        const aDiff = Math.abs((toMs(a.sold_at) || 0) - cafe24SoldAtMs);
        const bDiff = Math.abs((toMs(b.sold_at) || 0) - cafe24SoldAtMs);
        return aDiff - bDiff;
      });

    const manual = candidates[0];
    if (!manual) continue;

    usedManualIds.add(manual.id);
    mirroredPairs.push({
      manual,
      cafe24,
      diffHours: Number(
        (
          Math.abs((toMs(manual.sold_at) || 0) - cafe24SoldAtMs) /
          (1000 * 60 * 60)
        ).toFixed(2)
      ),
    });
  }

  return mirroredPairs;
}

async function deleteMirrors(ids) {
  if (ids.length === 0) return;
  const { error } = await supabase.from('artwork_sales').delete().in('id', ids);
  if (error) throw new Error(`수동 미러 삭제 실패: ${error.message}`);
}

async function main() {
  const args = parseArgs();
  const importDateToken = process.env.CAFE24_MANUAL_MIRROR_IMPORT_DATE || DEFAULT_IMPORT_DATE;
  const windowHours = Number.parseInt(
    process.env.CAFE24_MANUAL_MIRROR_PURGE_WINDOW_HOURS || String(DEFAULT_WINDOW_HOURS),
    10
  );

  const rows = await loadRows();
  const mirroredPairs = findMirrors(rows, {
    importDateToken,
    windowHours: Number.isFinite(windowHours) && windowHours > 0 ? windowHours : DEFAULT_WINDOW_HOURS,
  });

  const mirrorIds = mirroredPairs.map((pair) => pair.manual.id);
  const mirrorRevenue = mirroredPairs.reduce(
    (sum, pair) => sum + (pair.manual.sale_price || 0) * (pair.manual.quantity || 1),
    0
  );

  console.log(`총 판매 레코드: ${rows.length}건`);
  console.log(`미러 후보(import=${importDateToken}, window=${windowHours}h): ${mirrorIds.length}건`);
  console.log(`미러 후보 매출 합계: ${toMoney(mirrorRevenue)}`);

  if (args.verbose && mirroredPairs.length > 0) {
    console.log('\n상세 후보:');
    mirroredPairs.forEach((pair, index) => {
      const title = pair.manual.artworks?.title || '(제목 없음)';
      const amount = (pair.manual.sale_price || 0) * (pair.manual.quantity || 1);
      console.log(
        `${index + 1}. ${title} | ${toMoney(amount)} | 수동:${pair.manual.sold_at} / cafe24:${pair.cafe24.sold_at} | diff=${pair.diffHours}h`
      );
    });
  }

  if (!args.apply) {
    console.log('\n드라이런 모드입니다. 실제 삭제하려면 --apply 옵션을 사용하세요.');
    return;
  }

  await deleteMirrors(mirrorIds);
  console.log(`\n✅ 삭제 완료: ${mirrorIds.length}건`);
}

main().catch((error) => {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
