#!/usr/bin/env node

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

const PAGE_SIZE = 200;
const STORAGE_MARKERS = [
  '/storage/v1/object/public/artworks/',
  '/storage/v1/render/image/public/artworks/',
];
const VARIANT_SUFFIX_REGEX = /__(thumb|card|detail|hero|original)\.(webp|jpg|jpeg|png|avif)$/i;

function isSupabaseUrl(url) {
  return typeof url === 'string' && STORAGE_MARKERS.some((m) => url.includes(m));
}

function getVariantUrl(url, variant) {
  if (!isSupabaseUrl(url)) return null;
  const base = url.replace(VARIANT_SUFFIX_REGEX, '').replace(/\.[^/.]+$/, '');
  return `${base}__${variant}.webp`;
}

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

async function checkUrl(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function main() {
  const artworks = await fetchAllArtworks();
  console.log(`총 작품 수: ${artworks.length}\n`);

  let emptyImages = 0;
  let localPaths = 0;
  let supabaseUrls = 0;
  let originalOk = 0;
  let originalFail = 0;
  const failedItems = [];

  const CONCURRENCY = 10;

  for (let i = 0; i < artworks.length; i += CONCURRENCY) {
    const batch = artworks.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (artwork) => {
        const images = Array.isArray(artwork.images) ? artwork.images : [];

        if (images.length === 0) {
          emptyImages++;
          return;
        }

        const primaryImage = images[0];

        if (!isSupabaseUrl(primaryImage)) {
          localPaths++;
          return;
        }

        supabaseUrls++;

        // Check __original.webp variant (most important)
        const origUrl = getVariantUrl(primaryImage, 'original');
        if (origUrl) {
          const ok = await checkUrl(origUrl);
          if (ok) {
            originalOk++;
          } else {
            originalFail++;
            failedItems.push({ id: artwork.id, title: artwork.title, url: origUrl });
          }
        }
      })
    );

    if ((i + CONCURRENCY) % 50 === 0 || i + CONCURRENCY >= artworks.length) {
      console.log(`[progress] ${Math.min(i + CONCURRENCY, artworks.length)}/${artworks.length}`);
    }
  }

  console.log('\n--- 검증 결과 ---');
  console.log(`총 작품: ${artworks.length}`);
  console.log(`images 비어있음: ${emptyImages}`);
  console.log(`로컬 경로: ${localPaths}`);
  console.log(`Supabase URL: ${supabaseUrls}`);
  console.log(`  __original.webp 접근 성공: ${originalOk}`);
  console.log(`  __original.webp 접근 실패: ${originalFail}`);

  if (failedItems.length > 0) {
    console.log('\n--- 실패 항목 (최대 20개) ---');
    failedItems.slice(0, 20).forEach((item, idx) => {
      console.log(`${idx + 1}. id=${item.id} title="${item.title}" url=${item.url}`);
    });
    process.exitCode = 1;
  } else {
    console.log('\n✓ 모든 Supabase 이미지 접근 가능');
  }
}

main().catch((err) => {
  console.error('검증 실패:', err.message || err);
  process.exit(1);
});
