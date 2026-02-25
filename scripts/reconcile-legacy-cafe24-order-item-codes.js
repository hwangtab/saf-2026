const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_MAP_PATH = path.join('docs', 'cafe24-mapping', 'legacy-order-item-codes.json');
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
  const getArgValue = (flag, fallback) => {
    const prefixed = `${flag}=`;
    const matched = args.find((arg) => arg.startsWith(prefixed));
    if (!matched) return fallback;
    return matched.slice(prefixed.length);
  };

  const windowHoursRaw = getArgValue('--window-hours', String(DEFAULT_WINDOW_HOURS));
  const parsedWindow = Number.parseInt(String(windowHoursRaw || ''), 10);

  return {
    apply: args.includes('--apply'),
    verbose: args.includes('--verbose'),
    mapPath: getArgValue('--map', DEFAULT_MAP_PATH),
    windowHours:
      Number.isFinite(parsedWindow) && parsedWindow > 0 ? parsedWindow : DEFAULT_WINDOW_HOURS,
  };
}

function chunk(values, size) {
  const out = [];
  for (let i = 0; i < values.length; i += size) {
    out.push(values.slice(i, i + size));
  }
  return out;
}

function toMs(iso) {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function extractLegacyRowNo(note) {
  if (typeof note !== 'string' || !note) return null;
  const matched = note.match(/CSV\s*이관\s*#\s*(\d+)/);
  if (!matched) return null;
  const parsed = Number.parseInt(matched[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function extractCodeFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const keys = [
    'order_item_code',
    'item_code',
    'order_product_code',
    'external_order_item_code',
    'cafe24_order_item_code',
  ];
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function extractOrderIdFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const keys = ['order_id', 'order_no', 'external_order_id', 'cafe24_order_id'];
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function loadMappingEntries(mapPath) {
  const resolved = path.resolve(mapPath);
  if (!fs.existsSync(resolved)) {
    return { resolvedPath: resolved, loaded: false, entries: [] };
  }

  const parsed = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  if (!Array.isArray(parsed)) {
    throw new Error(`매핑 파일 형식이 올바르지 않습니다: ${resolved}`);
  }

  const entries = parsed
    .filter((row) => row && typeof row === 'object')
    .map((row) => ({
      legacy_row_no:
        Number.isFinite(Number(row.legacy_row_no)) && Number(row.legacy_row_no) > 0
          ? Number(row.legacy_row_no)
          : null,
      artwork_id:
        typeof row.artwork_id === 'string' && row.artwork_id.trim() ? row.artwork_id.trim() : null,
      sale_price:
        Number.isFinite(Number(row.sale_price)) && Number(row.sale_price) >= 0
          ? Number(row.sale_price)
          : null,
      quantity:
        Number.isFinite(Number(row.quantity)) && Number(row.quantity) > 0
          ? Number(row.quantity)
          : null,
      sold_at: typeof row.sold_at === 'string' && row.sold_at.trim() ? row.sold_at.trim() : null,
      external_order_id:
        typeof row.external_order_id === 'string' && row.external_order_id.trim()
          ? row.external_order_id.trim()
          : null,
      external_order_item_code:
        typeof row.external_order_item_code === 'string' && row.external_order_item_code.trim()
          ? row.external_order_item_code.trim()
          : null,
    }))
    .filter((row) => row.external_order_item_code);

  return { resolvedPath: resolved, loaded: true, entries };
}

async function fetchLegacyRows() {
  let { data, error } = await supabase
    .from('artwork_sales')
    .select(
      'id, artwork_id, sale_price, quantity, sold_at, note, import_row_no, external_order_id, external_order_item_code, external_payload'
    )
    .eq('source', 'cafe24')
    .eq('source_detail', 'legacy_csv')
    .is('external_order_item_code', null)
    .order('sold_at', { ascending: true });

  if (error && error.message.includes('import_row_no')) {
    const fallback = await supabase
      .from('artwork_sales')
      .select(
        'id, artwork_id, sale_price, quantity, sold_at, note, external_order_id, external_order_item_code, external_payload'
      )
      .eq('source', 'cafe24')
      .eq('source_detail', 'legacy_csv')
      .is('external_order_item_code', null)
      .order('sold_at', { ascending: true });
    data = (fallback.data || []).map((row) => ({ ...row, import_row_no: null }));
    error = fallback.error;
  }

  if (error && error.message.includes('source_detail')) {
    const fallback = await supabase
      .from('artwork_sales')
      .select(
        'id, artwork_id, sale_price, quantity, sold_at, note, external_order_id, external_order_item_code, external_payload'
      )
      .eq('source', 'cafe24')
      .is('external_order_item_code', null)
      .order('sold_at', { ascending: true });
    data = (fallback.data || []).map((row) => ({ ...row, import_row_no: null }));
    error = fallback.error;
  }

  if (error) throw new Error(`legacy_csv 조회 실패: ${error.message}`);
  return data || [];
}

async function fetchUsedExternalCodes() {
  const { data, error } = await supabase
    .from('artwork_sales')
    .select('external_order_item_code')
    .eq('source', 'cafe24')
    .not('external_order_item_code', 'is', null);

  if (error) throw new Error(`사용 중 external_order_item_code 조회 실패: ${error.message}`);

  const used = new Set();
  for (const row of data || []) {
    if (typeof row.external_order_item_code === 'string' && row.external_order_item_code) {
      used.add(row.external_order_item_code);
    }
  }
  return used;
}

function buildMapIndexes(entries) {
  const byRowNo = new Map();
  const byFingerprint = new Map();

  for (const entry of entries) {
    if (entry.legacy_row_no) {
      if (!byRowNo.has(entry.legacy_row_no)) byRowNo.set(entry.legacy_row_no, []);
      byRowNo.get(entry.legacy_row_no).push(entry);
    }

    if (entry.artwork_id && entry.sale_price !== null) {
      const key = `${entry.artwork_id}:${entry.sale_price}:${entry.quantity || 1}`;
      if (!byFingerprint.has(key)) byFingerprint.set(key, []);
      byFingerprint.get(key).push(entry);
    }
  }

  return { byRowNo, byFingerprint };
}

function pickMappingCandidate(input) {
  const { row, rowNoCandidates, fingerprintCandidates, usedCodes, pendingCodes, windowMs } = input;

  const candidates = [];

  if (rowNoCandidates.length > 0) {
    candidates.push(
      ...rowNoCandidates.filter(
        (entry) =>
          typeof entry.external_order_item_code === 'string' &&
          entry.external_order_item_code &&
          !usedCodes.has(entry.external_order_item_code) &&
          !pendingCodes.has(entry.external_order_item_code)
      )
    );
  }

  if (candidates.length === 0 && fingerprintCandidates.length > 0) {
    const soldAtMs = toMs(row.sold_at);
    for (const entry of fingerprintCandidates) {
      if (
        typeof entry.external_order_item_code !== 'string' ||
        !entry.external_order_item_code ||
        usedCodes.has(entry.external_order_item_code) ||
        pendingCodes.has(entry.external_order_item_code)
      ) {
        continue;
      }

      const entryMs = toMs(entry.sold_at);
      if (soldAtMs !== null && entryMs !== null && Math.abs(soldAtMs - entryMs) > windowMs) {
        continue;
      }

      candidates.push(entry);
    }
  }

  const payloadCode = extractCodeFromPayload(row.external_payload);
  if (
    payloadCode &&
    !usedCodes.has(payloadCode) &&
    !pendingCodes.has(payloadCode) &&
    !candidates.some((entry) => entry.external_order_item_code === payloadCode)
  ) {
    candidates.push({
      legacy_row_no: null,
      artwork_id: row.artwork_id,
      sale_price: row.sale_price,
      quantity: row.quantity,
      sold_at: row.sold_at,
      external_order_id: extractOrderIdFromPayload(row.external_payload),
      external_order_item_code: payloadCode,
    });
  }

  if (candidates.length === 0) {
    return { status: 'unmatched', reason: 'no_candidate', candidate: null };
  }
  if (candidates.length > 1) {
    return { status: 'unmatched', reason: `ambiguous:${candidates.length}`, candidate: null };
  }

  return { status: 'matched', reason: 'matched', candidate: candidates[0] };
}

async function applyMatches(matches) {
  let updated = 0;

  for (const batch of chunk(matches, 200)) {
    for (const row of batch) {
      const patch = {
        external_order_item_code: row.external_order_item_code,
        external_order_id: row.external_order_id || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('artwork_sales').update(patch).eq('id', row.id);
      if (error) {
        throw new Error(`legacy external key 업데이트 실패(${row.id}): ${error.message}`);
      }
      updated += 1;
    }
  }

  return updated;
}

async function main() {
  const { apply, verbose, mapPath, windowHours } = parseArgs();
  const mapping = loadMappingEntries(mapPath);
  const legacyRows = await fetchLegacyRows();
  const usedCodes = await fetchUsedExternalCodes();
  const pendingCodes = new Set();
  const windowMs = Math.max(1, windowHours) * 60 * 60 * 1000;

  const { byRowNo, byFingerprint } = buildMapIndexes(mapping.entries);

  const matchedRows = [];
  const unresolvedRows = [];

  for (const row of legacyRows) {
    const rowNo =
      Number.isFinite(Number(row.import_row_no)) && Number(row.import_row_no) > 0
        ? Number(row.import_row_no)
        : extractLegacyRowNo(row.note);
    const rowNoCandidates = rowNo ? byRowNo.get(rowNo) || [] : [];

    const fingerprint = `${row.artwork_id}:${row.sale_price || 0}:${row.quantity || 1}`;
    const fingerprintCandidates = byFingerprint.get(fingerprint) || [];

    const picked = pickMappingCandidate({
      row,
      rowNoCandidates,
      fingerprintCandidates,
      usedCodes,
      pendingCodes,
      windowMs,
    });

    if (picked.status !== 'matched' || !picked.candidate) {
      unresolvedRows.push({
        id: row.id,
        artwork_id: row.artwork_id,
        import_row_no: rowNo,
        reason: picked.reason,
      });
      continue;
    }

    pendingCodes.add(picked.candidate.external_order_item_code);
    matchedRows.push({
      id: row.id,
      artwork_id: row.artwork_id,
      import_row_no: rowNo,
      external_order_item_code: picked.candidate.external_order_item_code,
      external_order_id: picked.candidate.external_order_id,
    });
  }

  const total = legacyRows.length;
  const matched = matchedRows.length;
  const unmatched = unresolvedRows.length;
  const ambiguous = unresolvedRows.filter((row) =>
    String(row.reason).startsWith('ambiguous:')
  ).length;
  const noCandidate = unresolvedRows.filter((row) => row.reason === 'no_candidate').length;
  const matchRatePct = total > 0 ? Number(((matched / total) * 100).toFixed(1)) : 0;

  const report = {
    mapPath: mapping.resolvedPath,
    mapLoaded: mapping.loaded,
    apply,
    windowHours,
    totalLegacyWithoutExternalCode: total,
    matched,
    unmatched,
    ambiguous,
    noCandidate,
    matchRatePct,
  };

  console.log('=== legacy_csv external_order_item_code reconciliation ===');
  console.log(JSON.stringify(report, null, 2));

  if (verbose && unresolvedRows.length > 0) {
    console.log('\n[unresolved sample]');
    unresolvedRows.slice(0, 30).forEach((row, index) => {
      console.log(
        `${index + 1}. id=${row.id}, artwork=${row.artwork_id}, row_no=${row.import_row_no || '-'}, reason=${row.reason}`
      );
    });
  }

  if (!apply) {
    console.log('\n드라이런 모드입니다. 실제 반영하려면 --apply 옵션을 사용하세요.');
    return;
  }

  if (matchedRows.length === 0) {
    console.log('\n반영할 매칭이 없어 종료합니다.');
    return;
  }

  const updated = await applyMatches(matchedRows);
  console.log(
    JSON.stringify(
      {
        updated,
        matched,
        unmatched,
        matchRatePct,
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
