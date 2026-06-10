#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const jiti = require('jiti')(__filename);

const {
  findCrossBatchDuplicates,
  getExhibitionArtworkOverride,
  normalizeArtworkKeyPart,
  parseExhibitionSalesCsv,
  summarizeExhibitionCsvEligibility,
  summarizeExhibitionRows,
} = jiti('../lib/admin/exhibition-import.ts');

const DEFAULT_CSV_PATH = path.join(
  process.env.HOME || '',
  'Downloads',
  '2026 씨앗페 참가자 정보(외부 유출 금지).xlsx - 판매 및 배송정보.csv'
);

function parseArgs() {
  const args = process.argv.slice(2);
  const valueOf = (flag, fallback) => {
    const prefix = `${flag}=`;
    const found = args.find((arg) => arg.startsWith(prefix));
    return found ? found.slice(prefix.length) : fallback;
  };

  return {
    apply: args.includes('--apply'),
    csvPath: valueOf('--csv', DEFAULT_CSV_PATH),
    envPath: valueOf('--env', '.env.local'),
    importId: valueOf('--import-id', null),
    verbose: args.includes('--verbose'),
    allowCrossDuplicates: args.includes('--allow-cross-duplicates'),
  };
}

function requireSupabaseClient(envPath) {
  dotenv.config({ path: envPath });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY 설정이 필요합니다.');
  }

  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });
}

function artworkKey(artistName, artworkTitle) {
  return `${normalizeArtworkKeyPart(artistName)}:${normalizeArtworkKeyPart(artworkTitle)}`;
}

function chunk(values, size) {
  const chunks = [];
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size));
  }
  return chunks;
}

async function fetchExistingActiveSales(supabase, artworkIds) {
  const existing = [];
  for (const idChunk of chunk(artworkIds, 100)) {
    const { data, error } = await supabase
      .from('artwork_sales')
      .select('artwork_id, sold_at, sale_price, quantity, buyer_name, import_batch_id')
      .is('voided_at', null)
      .in('artwork_id', idChunk);

    if (error) throw new Error(`기존 판매 조회 실패: ${error.message}`);
    for (const row of data || []) {
      existing.push({
        artworkId: row.artwork_id,
        soldAt: row.sold_at,
        salePrice: row.sale_price,
        quantity: row.quantity,
        buyerName: row.buyer_name,
        importBatchId: row.import_batch_id,
      });
    }
  }
  return existing;
}

async function fetchArtworkIndex(supabase) {
  const { data, error } = await supabase
    .from('artworks')
    .select('id, title, admin_product_name, artists(name_ko)')
    .order('title', { ascending: true });

  if (error) throw new Error(`작품 목록 조회 실패: ${error.message}`);

  const byKey = new Map();
  const byId = new Map();
  for (const row of data || []) {
    const artist = Array.isArray(row.artists) ? row.artists[0]?.name_ko : row.artists?.name_ko;
    const titleCandidates = [row.title, row.admin_product_name].filter(Boolean);
    byId.set(row.id, { id: row.id, title: row.title, artistName: artist || null });

    for (const title of titleCandidates) {
      const key = artworkKey(artist || '', title || '');
      if (!key.startsWith(':') && !key.endsWith(':')) {
        const candidates = byKey.get(key) || [];
        if (!candidates.some((candidate) => candidate.id === row.id)) {
          candidates.push({ id: row.id, title: row.title, artistName: artist || null });
        }
        byKey.set(key, candidates);
      }
    }
  }

  return { byKey, byId };
}

function matchRows(rows, artworkIndex) {
  const matched = [];
  const unresolved = [];

  for (const row of rows) {
    const override = getExhibitionArtworkOverride(row.rowNo, artworkIndex.byId);
    if (override) {
      matched.push({ row, artwork: override });
      continue;
    }

    const key = artworkKey(row.artistName, row.artworkTitle);
    const candidates = artworkIndex.byKey.get(key) || [];

    if (candidates.length === 1) {
      matched.push({ row, artwork: candidates[0] });
      continue;
    }

    unresolved.push({
      rowNo: row.rowNo,
      artistName: row.artistName,
      artworkTitle: row.artworkTitle,
      reason: candidates.length === 0 ? 'no_match' : `ambiguous:${candidates.length}`,
      candidateIds: candidates.map((candidate) => candidate.id),
    });
  }

  return { matched, unresolved };
}

function buildSalePayload(match, importId) {
  const { row, artwork } = match;
  return {
    artwork_id: artwork.id,
    sale_price: row.salePrice,
    quantity: 1,
    sold_at: row.soldAt,
    source: 'manual',
    source_detail: 'manual_csv',
    buyer_name: row.buyerName,
    buyer_phone: row.buyerPhone,
    note: `SAF2026 오프라인 전시 CSV 이관 #${row.rowNo}`,
    import_batch_id: importId,
    import_row_no: row.rowNo,
  };
}

function buildDetailPayload(row, saleId) {
  return {
    sale_id: saleId,
    shipping_address: row.shippingAddress,
    delivery_status: row.deliveryStatus,
    release_status: row.releaseStatus,
    purchase_channel: row.purchaseChannel,
    paid_status: row.paidStatus,
    artwork_price: row.artworkPrice || row.salePrice,
    artist_share: row.artistShare || 0,
    exhibitor_name: row.exhibitorName,
    purchase_date: row.purchaseDate,
    shipping_required: row.shippingRequired,
    raw_payload: row.rawPayload,
  };
}

async function applyImport(supabase, matches, importId) {
  const salePayloads = matches.map((match) => buildSalePayload(match, importId));
  const saleIdByRowNo = new Map();

  for (const saleChunk of chunk(salePayloads, 200)) {
    const { data, error } = await supabase
      .from('artwork_sales')
      .upsert(saleChunk, { onConflict: 'import_batch_id,import_row_no' })
      .select('id, import_row_no');

    if (error) throw new Error(`artwork_sales upsert 실패: ${error.message}`);
    for (const sale of data || []) {
      saleIdByRowNo.set(sale.import_row_no, sale.id);
    }
  }

  const detailPayloads = [];
  for (const match of matches) {
    const saleId = saleIdByRowNo.get(match.row.rowNo);
    if (!saleId) throw new Error(`sale_id 확인 실패: CSV row ${match.row.rowNo}`);
    detailPayloads.push(buildDetailPayload(match.row, saleId));
  }

  for (const detailChunk of chunk(detailPayloads, 200)) {
    const { error } = await supabase
      .from('exhibition_sale_details')
      .upsert(detailChunk, { onConflict: 'sale_id' });

    if (error) throw new Error(`exhibition_sale_details upsert 실패: ${error.message}`);
  }
}

async function main() {
  const args = parseArgs();
  if (args.apply && !args.importId) {
    throw new Error('--apply 실행 시 --import-id=saf2026-exhibition-sales-202601 값이 필요합니다.');
  }

  const csvPath = path.resolve(args.csvPath);
  if (!fs.existsSync(csvPath)) throw new Error(`CSV 파일을 찾을 수 없습니다: ${csvPath}`);

  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const eligibilitySummary = summarizeExhibitionCsvEligibility(csvContent);
  const rows = parseExhibitionSalesCsv(csvContent);
  const summary = summarizeExhibitionRows(rows);
  const supabase = requireSupabaseClient(args.envPath);
  const artworkIndex = await fetchArtworkIndex(supabase);
  const { matched, unresolved } = matchRows(rows, artworkIndex);

  const report = {
    mode: args.apply ? 'apply' : 'dry-run',
    csvPath,
    importId: args.importId,
    csvRowCount: eligibilitySummary.numberedRowCount,
    importableRowCount: eligibilitySummary.importableRowCount,
    skippedRows: {
      total: eligibilitySummary.skippedRowCount,
      zeroRevenue: eligibilitySummary.zeroRevenueRowCount,
      blank: eligibilitySummary.blankRowCount,
    },
    ...summary,
    matchedRows: matched.length,
    unresolvedRows: unresolved.length,
    unresolvedSample: unresolved.slice(0, args.verbose ? 50 : 10),
  };

  console.log(JSON.stringify(report, null, 2));

  if (!args.apply) {
    console.log('\nDRY-RUN 완료. 실제 반영:');
    console.log(
      'node scripts/import-exhibition-customers.js --apply --import-id=saf2026-exhibition-sales-202601'
    );
    return;
  }

  if (unresolved.length > 0) {
    throw new Error(`매칭 실패/중복 작품 ${unresolved.length}건이 있어 반영을 중단합니다.`);
  }

  // 교차 중복 가드: 동일 판매가 다른 경로(수동입력 manual, cafe24 legacy_csv)나
  // 다른 배치로 이미 활성 존재하면 이중 적재(매출 2배) 사고가 난다. 2026-06-01 회귀 재발 방지.
  const salePayloads = matched.map((match) => buildSalePayload(match, args.importId));
  const artworkIds = [...new Set(salePayloads.map((payload) => payload.artwork_id))];
  const existingActiveSales = await fetchExistingActiveSales(supabase, artworkIds);
  const crossDuplicates = findCrossBatchDuplicates(salePayloads, existingActiveSales);

  if (crossDuplicates.length > 0) {
    console.error(`\n⚠️  교차 중복 ${crossDuplicates.length}건 감지 (이미 다른 경로/배치로 존재):`);
    console.error(
      JSON.stringify(
        crossDuplicates.slice(0, args.verbose ? 50 : 10).map((dup) => ({
          rowNo: dup.rowNo,
          artworkId: dup.artworkId,
          existingBatchIds: dup.existingBatchIds,
        })),
        null,
        2
      )
    );

    if (!args.allowCrossDuplicates) {
      throw new Error(
        '동일 판매가 다른 경로/배치로 이미 활성 존재합니다. 이중 적재(매출 2배)를 막기 위해 중단합니다. ' +
          '의도된 재적재라면 --allow-cross-duplicates 플래그로 강제하세요.'
      );
    }
    console.warn('--allow-cross-duplicates 지정 → 교차 중복 경고를 무시하고 진행합니다.');
  }

  await applyImport(supabase, matched, args.importId);
  console.log(`\n✅ 반영 완료: ${matched.length}건`);
}

main().catch((error) => {
  console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
