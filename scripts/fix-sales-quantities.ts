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

// 수정이 필요한 항목들
const corrections = [
  { artist: '오윤', title: '칼노래', correctQuantity: 7 },
  { artist: '김정원', title: '손 모은 사람', correctQuantity: 2 },
  { artist: '이열', title: '기억의 푸른 바오밥', correctQuantity: 2 },
];

async function fixQuantities() {
  console.log('🔧 판매 수량 수정 시작...\n');

  // 작가 ID 조회
  const artistNames = [...new Set(corrections.map((c) => c.artist))];
  const { data: artists } = await supabase
    .from('artists')
    .select('id, name_ko')
    .in('name_ko', artistNames);

  const artistMap = new Map(artists?.map((a) => [a.name_ko, a.id]) || []);

  for (const c of corrections) {
    const artistId = artistMap.get(c.artist);
    if (!artistId) {
      console.log(`❌ 작가 못찾음: ${c.artist}`);
      continue;
    }

    // 작품 조회
    const { data: artwork } = await supabase
      .from('artworks')
      .select('id, title')
      .eq('artist_id', artistId)
      .eq('title', c.title)
      .single();

    if (!artwork) {
      console.log(`❌ 작품 못찾음: ${c.artist} - "${c.title}"`);
      continue;
    }

    // 기존 판매 기록 조회
    const { data: sales } = await supabase
      .from('artwork_sales')
      .select('id, quantity')
      .eq('artwork_id', artwork.id);

    if (!sales || sales.length === 0) {
      console.log(`⚠️ 판매 기록 없음: ${c.artist} - "${c.title}"`);
      continue;
    }

    // 중복 기록이 있으면 첫 번째 것만 남기고 삭제
    if (sales.length > 1) {
      const idsToDelete = sales.slice(1).map((s) => s.id);
      const { error: deleteError } = await supabase
        .from('artwork_sales')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) {
        console.log(`❌ 중복 삭제 실패: ${deleteError.message}`);
      } else {
        console.log(`🗑️ ${c.artist} - "${c.title}": 중복 기록 ${idsToDelete.length}개 삭제`);
      }
    }

    // 첫 번째 기록의 수량 업데이트
    const currentQuantity = sales[0].quantity;
    if (currentQuantity === c.correctQuantity) {
      console.log(`⏭️ 이미 올바른 수량: ${c.artist} - "${c.title}": ${c.correctQuantity}부`);
      continue;
    }

    const { error: updateError } = await supabase
      .from('artwork_sales')
      .update({ quantity: c.correctQuantity, note: `2026 씨앗페 판매 (${c.correctQuantity}부)` })
      .eq('id', sales[0].id);

    if (updateError) {
      console.log(`❌ 수량 업데이트 실패: ${updateError.message}`);
    } else {
      console.log(
        `✅ ${c.artist} - "${c.title}": ${currentQuantity}부 → ${c.correctQuantity}부로 수정`
      );
    }
  }

  console.log('\n🎉 완료!');
}

fixQuantities();
