const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const IMPORT_DATE_TOKEN = process.env.SALES_IMPORT_DATE_TOKEN || '2026-02-15';
const CAFE24_DUP_WINDOW_HOURS = Number.parseInt(
  process.env.CAFE24_MANUAL_MIRROR_PURGE_WINDOW_HOURS || '72',
  10
);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY 설정이 필요합니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

const ALIAS_KEY_MAP = new Map([
  ['김준권:소나무', '김준권:푸른소나무'],
  ['김준권:bluenight1', '김준권:bluenight4'],
  ['이윤엽:콩밭매는할머니2', '이윤엽:콩밭메는할머니2'],
  ['양운철:작은하늘', '양운철:c작은하늘'],
  ['이익태:산', '이익태:山'],
  ['윤겸:꿈의안식처', '윤겸:꿈의안식처dreamheaven'],
  ['박성완:대인시장놀', '박성완:대인시장놀'],
  ['천지수:가족family', '천지수:가족family'],
]);

function parseArgs() {
  const args = process.argv.slice(2);
  const getArgValue = (flag, fallback) => {
    const prefixed = `${flag}=`;
    const matched = args.find((arg) => arg.startsWith(prefixed));
    if (!matched) return fallback;
    return matched.slice(prefixed.length);
  };

  return {
    apply: args.includes('--apply'),
    verbose: args.includes('--verbose'),
    csvPath: getArgValue('--csv', path.join('docs', '판매목록.csv')),
  };
}

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

function normalizeKeyPart(value = '') {
  return String(value)
    .replace(/\s+/g, '')
    .replace(/[\-–—_.,'"`~!@#$%^&*()[\]{}:;?/\\|+<>]/g, '')
    .toLowerCase();
}

function parseMoney(raw = '') {
  const numeric = Number(String(raw).replace(/[^0-9]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
}

function parseSoldAtKst(rawDate, fallbackSeq) {
  const matched = String(rawDate || '').match(/(\d{1,2})\.(\d{1,2})/);
  if (matched) {
    const month = Number.parseInt(matched[1], 10);
    const day = Number.parseInt(matched[2], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const utc = new Date(Date.UTC(2026, month - 1, day, 3, 0, 0, 0)); // 12:00 KST
      if (!Number.isNaN(utc.getTime())) return utc.toISOString();
    }
  }

  const fallback = new Date(Date.UTC(2026, 1, 15, 3, 0, Math.max(0, Math.min(59, fallbackSeq % 60))));
  return fallback.toISOString();
}

function resolveChannel(sourceText) {
  return /온라인/.test(String(sourceText || '')) ? 'cafe24' : 'manual';
}

function toMs(iso) {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function chunk(values, size) {
  const out = [];
  for (let i = 0; i < values.length; i += size) {
    out.push(values.slice(i, i + size));
  }
  return out;
}

function formatMoney(value) {
  return `₩${Number(value || 0).toLocaleString('ko-KR')}`;
}

async function fetchArtworkIndex() {
  const { data, error } = await supabase.from('artworks').select('id, title, artist_id, artists(name_ko)');
  if (error) throw new Error(`artworks 조회 실패: ${error.message}`);

  const byKey = new Map();
  for (const row of data || []) {
    const artistName = Array.isArray(row.artists) ? row.artists[0]?.name_ko : row.artists?.name_ko;
    const key = `${normalizeKeyPart(artistName || '')}:${normalizeKeyPart(row.title || '')}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(row);
  }

  return byKey;
}

async function fetchLegacyManualSales() {
  const { data, error } = await supabase
    .from('artwork_sales')
    .select(
      'id, artwork_id, source, created_at, sold_at, sale_price, quantity, buyer_name, note, external_order_id, external_order_item_code'
    )
    .neq('source', 'cafe24')
    .is('external_order_id', null)
    .is('external_order_item_code', null);

  if (error) throw new Error(`legacy 판매 조회 실패: ${error.message}`);

  return (data || []).filter((row) => String(row.created_at || '').startsWith(IMPORT_DATE_TOKEN));
}

async function fetchCafe24Sales() {
  const { data, error } = await supabase
    .from('artwork_sales')
    .select('id, artwork_id, sale_price, quantity, sold_at, source')
    .eq('source', 'cafe24');
  if (error) throw new Error(`cafe24 판매 조회 실패: ${error.message}`);
  return data || [];
}

function pickCandidateArtwork(candidates, remainingLegacyCountByArtwork) {
  if (candidates.length === 1) return candidates[0];
  const sorted = [...candidates].sort((a, b) => {
    const aCount = remainingLegacyCountByArtwork.get(a.id) || 0;
    const bCount = remainingLegacyCountByArtwork.get(b.id) || 0;
    if (bCount !== aCount) return bCount - aCount;
    return String(a.id).localeCompare(String(b.id));
  });

  const first = sorted[0];
  const second = sorted[1];
  const firstScore = remainingLegacyCountByArtwork.get(first.id) || 0;
  const secondScore = second ? remainingLegacyCountByArtwork.get(second.id) || 0 : -1;
  if (firstScore >= secondScore) {
    remainingLegacyCountByArtwork.set(first.id, Math.max(0, firstScore - 1));
    return first;
  }

  return first || null;
}

async function main() {
  const { apply, verbose, csvPath } = parseArgs();
  const resolvedCsvPath = path.resolve(csvPath);
  if (!fs.existsSync(resolvedCsvPath)) {
    throw new Error(`CSV 파일을 찾을 수 없습니다: ${resolvedCsvPath}`);
  }

  const csvContent = fs.readFileSync(resolvedCsvPath, 'utf8');
  const rawRows = parseCsvRows(csvContent);
  const artworkIndex = await fetchArtworkIndex();
  const legacySales = await fetchLegacyManualSales();
  const cafe24Sales = await fetchCafe24Sales();
  const dedupWindowMs = Math.max(1, CAFE24_DUP_WINDOW_HOURS) * 60 * 60 * 1000;

  const remainingLegacyCountByArtwork = new Map();
  for (const row of legacySales) {
    remainingLegacyCountByArtwork.set(
      row.artwork_id,
      (remainingLegacyCountByArtwork.get(row.artwork_id) || 0) + 1
    );
  }

  const existingCafe24ByArtwork = new Map();
  for (const row of cafe24Sales) {
    if (!existingCafe24ByArtwork.has(row.artwork_id)) existingCafe24ByArtwork.set(row.artwork_id, []);
    existingCafe24ByArtwork.get(row.artwork_id).push({
      ...row,
      used: false,
    });
  }

  let meaningfulRows = 0;
  let unmatchedRows = 0;
  let ambiguousRows = 0;
  let matchedRows = 0;
  let skippedAsCafe24Duplicate = 0;

  const unresolved = [];
  const inserts = [];
  const touchedArtworkIds = new Set();

  for (const cols of rawRows) {
    const seq = Number.parseInt(cols[0] || '', 10);
    const buyerName = (cols[1] || '').trim() || null;
    const artist = (cols[4] || '').trim();
    const title = (cols[5] || '').trim();
    const pathText = (cols[8] || '').trim();
    const salePrice = parseMoney(cols[10] || cols[6] || '0');
    const purchaseDate = (cols[13] || '').trim();
    const extraNote = (cols[15] || '').trim();

    if (!Number.isFinite(seq) || seq <= 0) continue;
    if (!artist || !title) continue;
    if (salePrice <= 0) continue;
    meaningfulRows += 1;

    let key = `${normalizeKeyPart(artist)}:${normalizeKeyPart(title)}`;
    if (ALIAS_KEY_MAP.has(key)) key = ALIAS_KEY_MAP.get(key);

    const candidates = artworkIndex.get(key) || [];
    if (candidates.length === 0) {
      unmatchedRows += 1;
      if (unresolved.length < 30) unresolved.push({ seq, artist, title, reason: 'no_match' });
      continue;
    }

    let picked = null;
    if (candidates.length === 1) {
      picked = candidates[0];
    } else {
      picked = pickCandidateArtwork(candidates, remainingLegacyCountByArtwork);
      if (!picked) {
        ambiguousRows += 1;
        if (unresolved.length < 30) unresolved.push({ seq, artist, title, reason: `ambiguous:${candidates.length}` });
        continue;
      }
    }

    matchedRows += 1;
    const source = resolveChannel(pathText);
    const soldAt = parseSoldAtKst(purchaseDate, seq);
    const noteParts = [`CSV 이관 #${seq}`, `경로:${pathText || '-'}`];
    if (extraNote) noteParts.push(extraNote);
    const note = noteParts.join(' | ');

    if (source === 'cafe24') {
      const sameArtworkRows = existingCafe24ByArtwork.get(picked.id) || [];
      const soldAtMs = toMs(soldAt);
      const matchedExisting = sameArtworkRows.find((existing) => {
        if (existing.used) return false;
        if ((existing.sale_price || 0) !== salePrice) return false;
        if ((existing.quantity || 1) !== 1) return false;
        const existingMs = toMs(existing.sold_at);
        if (existingMs === null || soldAtMs === null) return false;
        return Math.abs(existingMs - soldAtMs) <= dedupWindowMs;
      });
      if (matchedExisting) {
        matchedExisting.used = true;
        skippedAsCafe24Duplicate += 1;
        touchedArtworkIds.add(picked.id);
        continue;
      }
    }

    touchedArtworkIds.add(picked.id);
    inserts.push({
      artwork_id: picked.id,
      sale_price: salePrice,
      quantity: 1,
      sold_at: soldAt,
      source,
      buyer_name: buyerName,
      note,
    });
  }

  const legacyDeleteIds = legacySales
    .filter((row) => touchedArtworkIds.has(row.artwork_id))
    .map((row) => row.id);

  const summary = {
    csvPath: resolvedCsvPath,
    importDateToken: IMPORT_DATE_TOKEN,
    meaningfulRows,
    matchedRows,
    unmatchedRows,
    ambiguousRows,
    skippedAsCafe24Duplicate,
    insertsCount: inserts.length,
    deleteLegacyCount: legacyDeleteIds.length,
    insertOnlineCount: inserts.filter((row) => row.source === 'cafe24').length,
    insertOfflineCount: inserts.filter((row) => row.source === 'manual').length,
    insertOnlineRevenue: inserts
      .filter((row) => row.source === 'cafe24')
      .reduce((sum, row) => sum + row.sale_price * row.quantity, 0),
    insertOfflineRevenue: inserts
      .filter((row) => row.source === 'manual')
      .reduce((sum, row) => sum + row.sale_price * row.quantity, 0),
  };

  console.log('=== CSV 채널 재구성 드라이런 ===');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`온라인 삽입 매출: ${formatMoney(summary.insertOnlineRevenue)}`);
  console.log(`오프라인 삽입 매출: ${formatMoney(summary.insertOfflineRevenue)}`);

  if (verbose && unresolved.length > 0) {
    console.log('\n[미해결 샘플]');
    unresolved.forEach((row, index) => {
      console.log(`${index + 1}. #${row.seq} ${row.artist} - ${row.title} (${row.reason})`);
    });
  }

  if (!apply) {
    console.log('\n드라이런 모드입니다. 실제 반영하려면 --apply 옵션을 사용하세요.');
    return;
  }

  if (legacyDeleteIds.length > 0) {
    for (const idChunk of chunk(legacyDeleteIds, 500)) {
      const { error } = await supabase.from('artwork_sales').delete().in('id', idChunk);
      if (error) throw new Error(`legacy 삭제 실패: ${error.message}`);
    }
  }

  if (inserts.length > 0) {
    for (const insertChunk of chunk(inserts, 300)) {
      const { error } = await supabase.from('artwork_sales').insert(insertChunk);
      if (error) throw new Error(`재삽입 실패: ${error.message}`);
    }
  }

  console.log('\n✅ 반영 완료');

  const { data: finalRows, error: finalError } = await supabase
    .from('artwork_sales')
    .select('source, sale_price, quantity');
  if (finalError) throw new Error(`최종 검증 조회 실패: ${finalError.message}`);

  const finalManual = (finalRows || []).filter((row) => row.source !== 'cafe24');
  const finalCafe24 = (finalRows || []).filter((row) => row.source === 'cafe24');
  const revenue = (rows) => rows.reduce((sum, row) => sum + (row.sale_price || 0) * (row.quantity || 1), 0);

  console.log(
    JSON.stringify(
      {
        finalTotalCount: (finalRows || []).length,
        finalManualCount: finalManual.length,
        finalCafe24Count: finalCafe24.length,
        finalManualRevenue: revenue(finalManual),
        finalCafe24Revenue: revenue(finalCafe24),
        finalTotalRevenue: revenue(finalRows || []),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
