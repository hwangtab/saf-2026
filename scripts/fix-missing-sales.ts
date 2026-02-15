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

async function fixMissing() {
  console.log('🔧 누락된 작품 판매 기록 추가...\n');

  // 작가 ID 조회
  const { data: artists } = await supabase
    .from('artists')
    .select('id, name_ko')
    .in('name_ko', ['이윤엽', '김준권']);

  const artistMap = new Map(artists?.map((a) => [a.name_ko, a.id]) || []);

  // 수정된 제목으로 작품 조회
  const corrections = [
    { artist: '이윤엽', correctTitle: '콩밭메는 할머니2', quantity: 4 },
    { artist: '김준권', correctTitle: '푸른 소나무', quantity: 2 },
    { artist: '김준권', correctTitle: 'Blue night-4', quantity: 2 },
  ];

  for (const c of corrections) {
    const artistId = artistMap.get(c.artist);
    if (!artistId) {
      console.log('❌ 작가 못찾음:', c.artist);
      continue;
    }

    const { data: artwork } = await supabase
      .from('artworks')
      .select('id, title, price')
      .eq('artist_id', artistId)
      .eq('title', c.correctTitle)
      .single();

    if (!artwork) {
      console.log('❌ 작품 못찾음:', c.artist, '-', c.correctTitle);
      continue;
    }

    // 이미 판매기록 있는지 확인
    const { data: existing } = await supabase
      .from('artwork_sales')
      .select('id')
      .eq('artwork_id', artwork.id)
      .single();

    if (existing) {
      console.log('⏭️ 이미 판매 기록 있음:', c.artist, '-', artwork.title);
      continue;
    }

    const price = parseInt((artwork.price || '0').replace(/[^\d]/g, '')) || 0;

    const { error } = await supabase.from('artwork_sales').insert({
      artwork_id: artwork.id,
      quantity: c.quantity,
      sale_price: price,
      sold_at: new Date().toISOString(),
      note: `2026 씨앗페 판매 (${c.quantity}부)`,
    });

    if (error) {
      console.log('❌ 오류:', error.message);
    } else {
      console.log(
        `✅ ${c.artist} - "${artwork.title}": ${c.quantity}부 (₩${price.toLocaleString()})`
      );
    }
  }

  console.log('\n🎉 완료!');
}

fixMissing();
