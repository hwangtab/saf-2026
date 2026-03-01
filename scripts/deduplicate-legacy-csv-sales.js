const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const PAGE_SIZE = 1000;
const DELETE_BATCH_SIZE = 200;

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

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getTimestamp(value) {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? timestamp : Number.MAX_SAFE_INTEGER;
}

function toMoney(value) {
  return `₩${Number(value || 0).toLocaleString('ko-KR')}`;
}

async function loadSalesRows() {
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from('artwork_sales')
      .select(
        'id, artwork_id, source, sale_price, quantity, sold_at, buyer_name, note, created_at, voided_at'
      )
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`artwork_sales 조회 실패 (${from}-${to}): ${error.message}`);
    }

    if (!data || data.length === 0) break;

    rows.push(...data);

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

function buildDuplicateKey(row) {
  return [
    row.artwork_id || '',
    row.source || '',
    row.sold_at || '',
    String(row.sale_price || 0),
    String(row.quantity || 1),
    normalizeText(row.buyer_name),
    normalizeText(row.note),
  ].join('|');
}

function findExactCsvDuplicates(rows) {
  const csvRows = rows.filter((row) => {
    if (row.voided_at) return false;
    if (row.source === 'cafe24') return false;

    const note = normalizeText(row.note);
    return note.startsWith('CSV 이관 #');
  });

  const grouped = new Map();
  for (const row of csvRows) {
    const key = buildDuplicateKey(row);
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(row);
  }

  const duplicateGroups = [];
  const idsToDelete = [];

  for (const rowsInGroup of grouped.values()) {
    if (rowsInGroup.length < 2) continue;

    const sorted = [...rowsInGroup].sort((a, b) => {
      const createdDiff = getTimestamp(a.created_at) - getTimestamp(b.created_at);
      if (createdDiff !== 0) return createdDiff;
      return String(a.id).localeCompare(String(b.id));
    });

    const keeper = sorted[0];
    const duplicates = sorted.slice(1);
    idsToDelete.push(...duplicates.map((row) => row.id));

    duplicateGroups.push({
      keeper,
      duplicates,
      duplicateCount: sorted.length,
      duplicateRevenue: sorted.reduce(
        (sum, row) => sum + Number(row.sale_price || 0) * Number(row.quantity || 1),
        0
      ),
    });
  }

  duplicateGroups.sort((a, b) => {
    if (b.duplicateRevenue !== a.duplicateRevenue) {
      return b.duplicateRevenue - a.duplicateRevenue;
    }
    return b.duplicateCount - a.duplicateCount;
  });

  return { duplicateGroups, idsToDelete };
}

async function deleteDuplicateRows(ids) {
  for (let index = 0; index < ids.length; index += DELETE_BATCH_SIZE) {
    const chunk = ids.slice(index, index + DELETE_BATCH_SIZE);
    const { error } = await supabase.from('artwork_sales').delete().in('id', chunk);

    if (error) {
      throw new Error(`중복 판매 삭제 실패: ${error.message}`);
    }
  }
}

async function main() {
  const args = parseArgs();
  const rows = await loadSalesRows();
  const { duplicateGroups, idsToDelete } = findExactCsvDuplicates(rows);

  const duplicateRevenue = duplicateGroups.reduce(
    (sum, group) => sum + group.duplicates.reduce(
      (groupSum, row) => groupSum + Number(row.sale_price || 0) * Number(row.quantity || 1),
      0
    ),
    0
  );

  console.log(`총 artwork_sales 레코드: ${rows.length}건`);
  console.log(`CSV exact duplicate 그룹: ${duplicateGroups.length}건`);
  console.log(`삭제 대상 레코드: ${idsToDelete.length}건`);
  console.log(`삭제 대상 매출 합계: ${toMoney(duplicateRevenue)}`);

  if (args.verbose && duplicateGroups.length > 0) {
    console.log('\n상세 후보:');
    duplicateGroups.forEach((group, index) => {
      const note = normalizeText(group.keeper.note);
      const buyer = normalizeText(group.keeper.buyer_name) || '-';
      console.log(
        `${index + 1}. artwork=${group.keeper.artwork_id} sold_at=${group.keeper.sold_at} buyer=${buyer} amount=${toMoney(
          Number(group.keeper.sale_price || 0) * Number(group.keeper.quantity || 1)
        )} dup=${group.duplicateCount} note="${note}"`
      );
    });
  }

  if (!args.apply) {
    console.log('\n드라이런 모드입니다. 실제 삭제하려면 --apply 옵션을 사용하세요.');
    return;
  }

  if (idsToDelete.length === 0) {
    console.log('\n✅ 삭제할 exact duplicate가 없습니다.');
    return;
  }

  await deleteDuplicateRows(idsToDelete);
  console.log(`\n✅ 삭제 완료: ${idsToDelete.length}건`);
}

main().catch((error) => {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
