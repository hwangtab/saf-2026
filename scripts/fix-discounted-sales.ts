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

// CSV 기준 실제 매출 데이터 (할인 포함)
// 매출 불일치가 있는 작품들의 실제 판매 정보
const salesCorrections = [
  // 오윤 작품들 - CSV 기준 실제 매출
  { artist: '오윤', title: '무호도', csvTotal: 32950000, qty: 22 },
  { artist: '오윤', title: '석양', csvTotal: 7400000, qty: 7 },
  { artist: '오윤', title: '징2', csvTotal: 6400000, qty: 6, note: '이혜경 26% 할인 포함' },
  { artist: '오윤', title: '지리산3', csvTotal: 6150000, qty: 4, note: '정민정 3% 할인 포함' },
  { artist: '오윤', title: '지리산2', csvTotal: 7650000, qty: 4 },
  { artist: '오윤', title: '귀향', csvTotal: 3900000, qty: 3 },
  { artist: '오윤', title: '낮도깨비', csvTotal: 6900000, qty: 3, note: '박홍선 24% 할인 포함' },
  { artist: '오윤', title: '칼노래', csvTotal: 14450000, qty: 7 },

  // 기타 작가들
  {
    artist: '강석태',
    title: '어린왕자가 머물던 풍경_제주 일기',
    csvTotal: 4590000,
    qty: 1,
    note: '김순영 15% 할인',
  },
  { artist: '김정원', title: '손 모은 사람', csvTotal: 200000, qty: 2 },
  { artist: '민정기', title: '포옹', csvTotal: 2150000, qty: 2 },
  {
    artist: '이윤엽',
    title: '무슨일 있어?',
    csvTotal: 1190000,
    qty: 8,
    note: '김영신 5% 할인 포함',
  },
  {
    artist: '천지수',
    title: '정글 도서관의 카바리',
    csvTotal: 3240000,
    qty: 1,
    note: '박변주 10% 할인',
  },
  {
    artist: '양순열',
    title: 'Ottogi Earthy Rainbow Matte',
    csvTotal: 11000000,
    qty: 1,
    note: '강동우 12% 할인',
  },
  { artist: '박불똥', title: '멸(滅)', csvTotal: 0, qty: 1, note: '무료 제공' },
];

async function main() {
  console.log('💰 할인 판매 금액 수정 시작...\n');

  // 작가 ID 조회
  const artistNames = [...new Set(salesCorrections.map((s) => s.artist))];
  const { data: artists } = await supabase
    .from('artists')
    .select('id, name_ko')
    .in('name_ko', artistNames);

  const artistMap = new Map(artists?.map((a) => [a.name_ko, a.id]) || []);

  let updated = 0;
  let failed = 0;

  for (const correction of salesCorrections) {
    const artistId = artistMap.get(correction.artist);
    if (!artistId) {
      console.log(`❌ 작가 못찾음: ${correction.artist}`);
      failed++;
      continue;
    }

    // 작품 조회
    const { data: artwork } = await supabase
      .from('artworks')
      .select('id, title, price')
      .eq('artist_id', artistId)
      .eq('title', correction.title)
      .single();

    if (!artwork) {
      console.log(`❌ 작품 못찾음: ${correction.artist} - "${correction.title}"`);
      failed++;
      continue;
    }

    // 기존 판매 기록 조회
    const { data: existingSales } = await supabase
      .from('artwork_sales')
      .select('id, quantity, sale_price, note')
      .eq('artwork_id', artwork.id);

    if (!existingSales || existingSales.length === 0) {
      console.log(`⚠️ 판매 기록 없음: ${correction.artist} - "${correction.title}"`);
      failed++;
      continue;
    }

    // 현재 총액 계산
    const currentTotal = existingSales.reduce(
      (sum, s) => sum + (s.sale_price || 0) * (s.quantity || 1),
      0
    );

    if (currentTotal === correction.csvTotal) {
      console.log(`⏭️ 이미 정확함: ${correction.artist} - "${correction.title}"`);
      continue;
    }

    // 첫 번째 레코드의 금액을 조정하여 총액 맞추기
    // (단순화를 위해 단일 레코드로 처리)
    const totalQty = existingSales.reduce((sum, s) => sum + (s.quantity || 1), 0);

    if (totalQty !== correction.qty) {
      console.log(
        `⚠️ 수량 불일치: ${correction.artist} - "${correction.title}" (CSV: ${correction.qty}, DB: ${totalQty})`
      );
    }

    // 기존 판매 기록들 삭제하고 새로 생성 (단일 레코드로)
    const idsToDelete = existingSales.map((s) => s.id);
    await supabase.from('artwork_sales').delete().in('id', idsToDelete);

    // 새 판매 기록 생성 (평균 단가 사용)
    const avgPrice = Math.round(correction.csvTotal / correction.qty);
    const noteText = correction.note
      ? `2026 씨앗페 판매 (${correction.qty}부) - ${correction.note}`
      : `2026 씨앗페 판매 (${correction.qty}부)`;

    const { error } = await supabase.from('artwork_sales').insert({
      artwork_id: artwork.id,
      quantity: correction.qty,
      sale_price: avgPrice,
      sold_at: new Date().toISOString(),
      note: noteText,
    });

    if (error) {
      console.log(`❌ 업데이트 실패: ${error.message}`);
      failed++;
    } else {
      const diff = correction.csvTotal - currentTotal;
      const sign = diff > 0 ? '+' : '';
      console.log(
        `✅ ${correction.artist} - "${correction.title}": ₩${currentTotal.toLocaleString()} → ₩${correction.csvTotal.toLocaleString()} (${sign}${diff.toLocaleString()})`
      );
      updated++;
    }
  }

  console.log(`\n🎉 완료! ${updated}건 수정, ${failed}건 실패`);
}

main();
