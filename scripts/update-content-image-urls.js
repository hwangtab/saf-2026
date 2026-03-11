#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 없습니다.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const BATCH_DIR = path.join(__dirname, '..', 'content', 'artworks-batches');
const PAGE_SIZE = 200;

async function fetchAllArtworks() {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('artworks')
      .select('id, title, images')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

function buildTitleToImageMap(artworks) {
  const map = new Map();
  for (const artwork of artworks) {
    if (artwork.images && artwork.images.length > 0 && artwork.title) {
      // Use title as key since DB uses UUID ids but content files use numeric ids
      map.set(artwork.title, artwork.images);
    }
  }
  return map;
}

function updateBatchFileReliable(filePath, titleToImages) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let updateCount = 0;
  let currentTitle = null;

  for (let i = 0; i < lines.length; i++) {
    // Track current artwork title (handles both single quotes and backticks)
    const titleMatch = lines[i].match(/^\s+title:\s*['`](.+?)['`]\s*,?\s*$/);
    if (titleMatch) {
      currentTitle = titleMatch[1];
      continue;
    }

    // Find images line with local filenames
    const imagesMatch = lines[i].match(/^(\s+images:\s*\[)([^\]]*)(\],?\s*)$/);
    if (!imagesMatch || !currentTitle) continue;

    const imageList = imagesMatch[2];
    // Skip if already contains URLs
    if (imageList.includes('http://') || imageList.includes('https://')) continue;
    // Skip if empty
    if (!imageList.trim()) continue;

    const supabaseImages = titleToImages.get(currentTitle);
    if (!supabaseImages || supabaseImages.length === 0) continue;

    const newImageList = supabaseImages.map((url) => `'${url}'`).join(', ');
    lines[i] = `${imagesMatch[1]}${newImageList}${imagesMatch[3]}`;
    updateCount++;
  }

  return { content: lines.join('\n'), updateCount };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const artworks = await fetchAllArtworks();
  const titleToImages = buildTitleToImageMap(artworks);
  console.log(`DB에서 ${titleToImages.size}개 작품의 이미지 URL 조회 완료\n`);

  const batchFiles = fs.readdirSync(BATCH_DIR)
    .filter((f) => f.startsWith('batch-') && f.endsWith('.ts'))
    .sort();

  let totalUpdates = 0;

  for (const file of batchFiles) {
    const filePath = path.join(BATCH_DIR, file);
    const { content, updateCount } = updateBatchFileReliable(filePath, titleToImages);

    console.log(`${file}: ${updateCount}개 이미지 경로 업데이트`);
    totalUpdates += updateCount;

    if (apply && updateCount > 0) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
  }

  console.log(`\n--- summary ---`);
  console.log(`mode=${apply ? 'apply' : 'dry-run'}`);
  console.log(`총 업데이트: ${totalUpdates}개`);

  if (!apply && totalUpdates > 0) {
    console.log('\n실제 적용하려면: node scripts/update-content-image-urls.js --apply');
  }
}

main().catch((err) => {
  console.error('실행 실패:', err.message || err);
  process.exit(1);
});
