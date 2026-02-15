import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

type CSVSale = {
  rowNum: number;
  buyerName: string;
  artist: string;
  artwork: string;
  salePrice: number; // 매출 (실제 판매가)
  originalPrice: number; // 작품가격 (정가)
  purchaseDate: string;
  note: string;
};

function parsePrice(str: string): number {
  if (!str) return 0;
  const numStr = str.replace(/[^0-9]/g, '');
  return parseInt(numStr, 10) || 0;
}

function parseCSV(csvPath: string): CSVSale[] {
  const content = fs.readFileSync(csvPath, 'utf-8');
  const lines = content.split('\n');
  const sales: CSVSale[] = [];

  for (const line of lines) {
    // Simple CSV parsing (handles quoted fields with commas)
    const fields: string[] = [];
    let field = '';
    let inQuotes = false;

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(field.trim());
        field = '';
      } else {
        field += char;
      }
    }
    fields.push(field.trim());

    const rowNum = parseInt(fields[0], 10);
    if (isNaN(rowNum) || rowNum <= 0) continue;

    const buyerName = fields[1] || '';
    const artist = fields[5] || '';
    const artwork = fields[6] || '';
    const salePrice = parsePrice(fields[7]); // 매출
    const originalPrice = parsePrice(fields[11]); // 작품가격
    const purchaseDate = fields[14] || '';
    const note = fields[16] || '';

    // Skip empty rows
    if (!artist || !artwork) continue;

    sales.push({
      rowNum,
      buyerName,
      artist,
      artwork,
      salePrice,
      originalPrice,
      purchaseDate,
      note,
    });
  }

  return sales;
}

async function main() {
  console.log('📊 CSV 판매 데이터 분석 중...\n');

  // 1. CSV 파싱
  const csvPath = 'docs/2026 씨앗페 참가자 정보(외부 유출 금지).xlsx - 판매 및 배송정보.csv';
  const csvSales = parseCSV(csvPath);
  console.log(`📄 CSV에서 ${csvSales.length}건의 판매 기록 발견\n`);

  // 2. 작가 목록 조회
  const { data: artists } = await supabase.from('artists').select('id, name_ko');
  const artistMap = new Map(artists?.map((a) => [a.name_ko, a.id]) || []);

  // 3. 작품 목록 조회
  const { data: artworks } = await supabase.from('artworks').select('id, title, artist_id, price');
  const artworkMap = new Map<string, { id: string; price: string }>();
  artworks?.forEach((a) => {
    const artistName = artists?.find((ar) => ar.id === a.artist_id)?.name_ko || '';
    const key = `${artistName}:${a.title}`;
    artworkMap.set(key, { id: a.id, price: a.price });
  });

  // 4. 기존 판매 기록 조회
  const { data: existingSales } = await supabase
    .from('artwork_sales')
    .select('artwork_id, quantity, sale_price');

  const salesByArtwork = new Map<string, { totalQty: number; totalRevenue: number }>();
  existingSales?.forEach((s) => {
    const existing = salesByArtwork.get(s.artwork_id) || { totalQty: 0, totalRevenue: 0 };
    existing.totalQty += s.quantity || 1;
    existing.totalRevenue += (s.sale_price || 0) * (s.quantity || 1);
    salesByArtwork.set(s.artwork_id, existing);
  });

  // 5. CSV 판매를 작품별로 그룹화
  const csvByArtwork = new Map<string, { qty: number; totalRevenue: number; records: CSVSale[] }>();
  for (const sale of csvSales) {
    const key = `${sale.artist}:${sale.artwork}`;
    const existing = csvByArtwork.get(key) || { qty: 0, totalRevenue: 0, records: [] };
    existing.qty += 1;
    existing.totalRevenue += sale.salePrice;
    existing.records.push(sale);
    csvByArtwork.set(key, existing);
  }

  // 6. 분석
  console.log('='.repeat(60));
  console.log('🔍 분석 결과\n');

  const missingInDB: Array<{
    artist: string;
    artwork: string;
    csvQty: number;
    csvRevenue: number;
  }> = [];
  const quantityMismatch: Array<{
    artist: string;
    artwork: string;
    csvQty: number;
    dbQty: number;
    csvRevenue: number;
    dbRevenue: number;
  }> = [];
  const discountedSales: Array<{
    artist: string;
    artwork: string;
    originalPrice: number;
    salePrice: number;
    buyer: string;
    discount: number;
  }> = [];

  for (const [key, csvData] of csvByArtwork) {
    const [artist, artwork] = key.split(':');
    const artworkInfo = artworkMap.get(key);

    if (!artworkInfo) {
      missingInDB.push({
        artist,
        artwork,
        csvQty: csvData.qty,
        csvRevenue: csvData.totalRevenue,
      });
      continue;
    }

    const dbData = salesByArtwork.get(artworkInfo.id);
    if (!dbData) {
      missingInDB.push({
        artist,
        artwork,
        csvQty: csvData.qty,
        csvRevenue: csvData.totalRevenue,
      });
      continue;
    }

    if (dbData.totalQty !== csvData.qty || dbData.totalRevenue !== csvData.totalRevenue) {
      quantityMismatch.push({
        artist,
        artwork,
        csvQty: csvData.qty,
        dbQty: dbData.totalQty,
        csvRevenue: csvData.totalRevenue,
        dbRevenue: dbData.totalRevenue,
      });
    }

    // Check for discounted sales
    for (const record of csvData.records) {
      if (record.salePrice > 0 && record.originalPrice > 0) {
        const discount = record.originalPrice - record.salePrice;
        if (discount > 0) {
          discountedSales.push({
            artist,
            artwork,
            originalPrice: record.originalPrice,
            salePrice: record.salePrice,
            buyer: record.buyerName,
            discount,
          });
        }
      }
    }
  }

  // 출력
  if (missingInDB.length > 0) {
    console.log('❌ DB에 없는 판매 기록:');
    for (const m of missingInDB) {
      console.log(
        `   ${m.artist} - "${m.artwork}": ${m.csvQty}건 (₩${m.csvRevenue.toLocaleString()})`
      );
    }
    console.log();
  }

  if (quantityMismatch.length > 0) {
    console.log('⚠️ 수량/매출 불일치:');
    for (const m of quantityMismatch) {
      console.log(`   ${m.artist} - "${m.artwork}":`);
      console.log(`      CSV: ${m.csvQty}건, ₩${m.csvRevenue.toLocaleString()}`);
      console.log(`      DB:  ${m.dbQty}건, ₩${m.dbRevenue.toLocaleString()}`);
    }
    console.log();
  }

  if (discountedSales.length > 0) {
    console.log('💰 할인 판매 내역:');
    for (const d of discountedSales) {
      const discountPct = Math.round((d.discount / d.originalPrice) * 100);
      console.log(
        `   ${d.artist} - "${d.artwork}" (${d.buyer}): ₩${d.originalPrice.toLocaleString()} → ₩${d.salePrice.toLocaleString()} (-${discountPct}%)`
      );
    }
    console.log();
  }

  console.log('='.repeat(60));
  console.log(`📊 요약:`);
  console.log(`   - DB에 없는 판매: ${missingInDB.length}건`);
  console.log(`   - 수량/매출 불일치: ${quantityMismatch.length}건`);
  console.log(`   - 할인 판매: ${discountedSales.length}건`);
}

main();
