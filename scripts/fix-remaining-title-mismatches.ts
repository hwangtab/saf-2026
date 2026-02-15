import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// CSV 제목 → DB 제목 매핑 (수동 확인된 것들)
const titleMappings = [
  { artist: '김준권', csvTitle: '소나무', dbTitle: '푸른 소나무', qty: 2, revenue: 1000000 },
  {
    artist: '이윤엽',
    csvTitle: '콩밭매는 할머니2',
    dbTitle: '콩밭메는 할머니2',
    qty: 4,
    revenue: 1600000,
  },
  { artist: '양운철', csvTitle: '작은 하늘', dbTitle: 'c ; 작은 하늘', qty: 1, revenue: 800000 },
  { artist: '이익태', csvTitle: '산', dbTitle: '山', qty: 1, revenue: 0 },
  {
    artist: '박수지',
    csvTitle: 'Tropical forest',
    dbTitle: 'TROPICAL FOREST',
    qty: 1,
    revenue: 1500000,
  },
  { artist: '박성완', csvTitle: '대인시장-놀', dbTitle: '대인시장놀', qty: 1, revenue: 1000000 },
  { artist: '천지수', csvTitle: '가족 Family', dbTitle: '가족 family', qty: 1, revenue: 650000 },
  {
    artist: '박재동',
    csvTitle: '노무현 5점',
    dbTitle: '노무현(작품 다섯 점)',
    qty: 1,
    revenue: 10000000,
  },
  {
    artist: '윤겸',
    csvTitle: '꿈의 안식처',
    dbTitle: '꿈의 안식처 Dream haven',
    qty: 1,
    revenue: 1000000,
  },
  {
    artist: '윤겸',
    csvTitle: '꿈의안식처',
    dbTitle: '꿈의 안식처 Dream heaven',
    qty: 1,
    revenue: 2000000,
  },
];

async function main() {
  console.log('🔧 제목 불일치 판매 기록 추가\n');

  const artistNames = [...new Set(titleMappings.map((m) => m.artist))];
  const { data: artists } = await supabase
    .from('artists')
    .select('id, name_ko')
    .in('name_ko', artistNames);
  const artistMap = new Map(artists?.map((a) => [a.name_ko, a.id]) || []);

  let added = 0;
  let skipped = 0;
  let failed = 0;

  for (const mapping of titleMappings) {
    const artistId = artistMap.get(mapping.artist);
    if (!artistId) {
      console.log(`❌ 작가 못찾음: ${mapping.artist}`);
      failed++;
      continue;
    }

    // DB에서 작품 찾기
    const { data: artwork } = await supabase
      .from('artworks')
      .select('id, title, price')
      .eq('artist_id', artistId)
      .eq('title', mapping.dbTitle)
      .single();

    if (!artwork) {
      console.log(`❌ 작품 못찾음: ${mapping.artist} - "${mapping.dbTitle}"`);
      failed++;
      continue;
    }

    // 이미 판매 기록이 있는지 확인
    const { data: existingSales } = await supabase
      .from('artwork_sales')
      .select('id')
      .eq('artwork_id', artwork.id);

    if (existingSales && existingSales.length > 0) {
      console.log(`⏭️ 이미 판매 기록 있음: ${mapping.artist} - "${mapping.dbTitle}"`);
      skipped++;
      continue;
    }

    // 판매 기록 추가
    const avgPrice = mapping.qty > 0 ? Math.round(mapping.revenue / mapping.qty) : 0;
    const { error } = await supabase.from('artwork_sales').insert({
      artwork_id: artwork.id,
      quantity: mapping.qty,
      sale_price: avgPrice,
      sold_at: new Date().toISOString(),
      note: `2026 씨앗페 판매 (${mapping.qty}부) - CSV 제목: "${mapping.csvTitle}"`,
    });

    if (error) {
      console.log(`❌ 추가 실패: ${mapping.artist} - "${mapping.dbTitle}": ${error.message}`);
      failed++;
    } else {
      console.log(
        `✅ ${mapping.artist} - "${mapping.dbTitle}": ${mapping.qty}건, ₩${mapping.revenue.toLocaleString()}`
      );
      console.log(`   (CSV 제목: "${mapping.csvTitle}")`);
      added++;
    }
  }

  console.log(`\n🎉 완료! 추가: ${added}건, 건너뜀: ${skipped}건, 실패: ${failed}건`);
}

main();
