#!/usr/bin/env node
// DB → 정적 파일 동기화 스크립트
// Usage: node scripts/sync-artworks-from-db.js
// Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다.');
  console.error('.env.local 파일을 확인하세요.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const OUTPUT_PATH = path.join(
  __dirname,
  '..',
  'content',
  'artworks-batches',
  'batch-db-generated.ts'
);
const PAGE_SIZE = 200;

async function fetchAllArtworks() {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('artworks')
      .select(
        `id, title, title_en, description, size, material, year, edition,
         price, images, shop_url, status, sold_at, category,
         artists (name_ko, name_en)`
      )
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

function formatPrice(priceValue) {
  if (priceValue === null || priceValue === undefined) return '';
  const priceStr = String(priceValue).trim();
  if (!priceStr) return '';
  if (priceStr === '문의' || priceStr === '확인 중') return priceStr;

  const numericStr = priceStr.replace(/[^\d]/g, '');
  if (!numericStr) return priceStr;

  const numeric = Number(numericStr);
  if (!Number.isFinite(numeric) || numeric <= 0) return '';

  return `₩${numeric.toLocaleString('ko-KR')}`;
}

function mapRow(row) {
  const artist = row.artists;
  const artwork = {
    id: row.id,
    artist: artist?.name_ko || 'Unknown Artist',
    title: row.title,
    description: row.description || '',
    size: row.size || '',
    material: row.material || '',
    year: row.year || '',
    edition: row.edition || '',
    price: formatPrice(row.price),
    images: row.images || [],
    shopUrl: row.shop_url || '',
  };

  if (row.title_en) artwork.title_en = row.title_en;
  if (artist?.name_en) artwork.artist_en = artist.name_en;
  if (row.status === 'sold' || row.status === 'reserved') artwork.sold = true;
  if (row.sold_at) artwork.sold_at = row.sold_at;
  if (row.category) artwork.category = row.category;

  return artwork;
}

function generateFileContent(artworks) {
  const timestamp = new Date().toISOString();
  const lines = [
    `// ⚡ AUTO-GENERATED — do not edit manually`,
    `// Run: npm run sync-artworks`,
    `// Last synced: ${timestamp}`,
    `// Total: ${artworks.length} artworks`,
    ``,
    `import type { Artwork } from '@/types';`,
    ``,
    `export const dbGeneratedArtworks: Artwork[] = ${JSON.stringify(artworks, null, 2)};`,
    ``,
  ];
  return lines.join('\n');
}

async function main() {
  console.log('Supabase에서 작품 데이터 가져오는 중...');
  const rows = await fetchAllArtworks();
  console.log(`DB에서 ${rows.length}개 작품 조회 완료`);

  const artworks = rows.map(mapRow);

  const content = generateFileContent(artworks);
  fs.writeFileSync(OUTPUT_PATH, content, 'utf-8');

  console.log(`✅ ${OUTPUT_PATH} 생성 완료 (${artworks.length}개 작품)`);
}

main().catch((err) => {
  console.error('실행 실패:', err.message || err);
  process.exit(1);
});
