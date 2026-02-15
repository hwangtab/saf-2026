import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    '❌ Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env.local'
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 판화/사진 작가 목록 - 모든 작품이 'open' 에디션
const PRINTMAKER_ARTISTS = ['오윤', '이윤엽', '류연복', '김준권', '김정원', '민정기', '이열'];

// 판매 기록 대상 작품 (작가명: { 작품명: 수량 })
const SALES_DATA: Record<string, Record<string, number>> = {
  오윤: {
    무호도: 22,
    석양: 7,
    춘무인추무의: 7,
    칼노래: 7,
    징2: 6,
    지리산3: 4,
    지리산2: 4,
    검은새: 3,
    봄의소리1: 3,
    춤2: 3,
    귀향: 3,
    낮도깨비: 3,
    봄의소리2: 2,
    팔엽일화: 2,
    남녁땅뱃노래: 2,
  },
  이윤엽: {
    '무슨일 있어?': 8,
    '나를 안는다': 5,
    '콩밭매는 할머니2': 4,
    '튼튼한 감나무': 4,
    '새로운 날': 3,
  },
  류연복: {
    '민들레 촛불': 5,
  },
  김준권: {
    소나무: 2,
    'Blue Night-1': 2,
  },
  김정원: {
    '손 모은 사람': 2,
  },
  민정기: {
    포옹: 2,
  },
  이열: {
    '기억의 푸른 바오밥': 2,
  },
};

function parsePrice(priceValue: string | number | null | undefined): number {
  if (priceValue === null || priceValue === undefined) {
    return 0;
  }
  const priceStr = String(priceValue);
  if (!priceStr || priceStr === '문의' || priceStr === '확인 중') {
    return 0;
  }
  const numericStr = priceStr.replace(/[^\d]/g, '');
  const parsed = parseInt(numericStr, 10);
  return isNaN(parsed) ? 0 : parsed;
}

async function main() {
  console.log('🚀 판화/사진 작가 에디션 및 판매수량 업데이트 시작...\n');

  try {
    // 1. 대상 작가들의 artist_id 조회
    console.log('📋 Step 1: 작가 ID 조회...');
    const { data: artists, error: artistError } = await supabase
      .from('artists')
      .select('id, name_ko')
      .in('name_ko', PRINTMAKER_ARTISTS);

    if (artistError) throw artistError;

    if (!artists || artists.length === 0) {
      console.error('❌ 작가를 찾을 수 없습니다.');
      process.exit(1);
    }

    console.log(`   ✅ ${artists.length}명의 작가를 찾았습니다.`);
    const artistMap = new Map(artists.map((a) => [a.name_ko, a.id]));
    const artistIds = artists.map((a) => a.id);

    // 2. 해당 작가들의 모든 작품을 edition_type='open'으로 업데이트
    console.log('\n📋 Step 2: 모든 작품 edition_type을 "open"으로 설정...');
    const { data: updatedArtworks, error: updateError } = await supabase
      .from('artworks')
      .update({ edition_type: 'open' })
      .in('artist_id', artistIds)
      .select('id, title, artist_id, price');

    if (updateError) throw updateError;

    console.log(
      `   ✅ ${updatedArtworks?.length || 0}개 작품의 에디션 타입을 'open'으로 설정했습니다.`
    );

    // 3. 작품 ID 맵 생성 (작가ID + 제목 -> 작품정보)
    const artworkMap = new Map<string, { id: string; price: string }>();
    updatedArtworks?.forEach((artwork) => {
      const key = `${artwork.artist_id}:${artwork.title}`;
      artworkMap.set(key, { id: artwork.id, price: artwork.price });
    });

    // 4. 중복 판매 작품에 대한 판매 기록 추가
    console.log('\n📋 Step 3: 판매 기록 추가...');

    // 기존 판매 기록 확인
    const { data: existingSales, error: existingSalesError } = await supabase
      .from('artwork_sales')
      .select('artwork_id');

    if (existingSalesError) throw existingSalesError;

    const existingSalesSet = new Set(existingSales?.map((s) => s.artwork_id) || []);

    const salesRecords: Array<{
      artwork_id: string;
      quantity: number;
      sale_price: number;
      sold_at: string;
      note: string;
    }> = [];

    let notFoundCount = 0;
    let skippedCount = 0;

    for (const [artistName, artworks] of Object.entries(SALES_DATA)) {
      const artistId = artistMap.get(artistName);
      if (!artistId) {
        console.log(`   ⚠️ 작가 "${artistName}"를 찾을 수 없습니다.`);
        continue;
      }

      for (const [title, quantity] of Object.entries(artworks)) {
        const key = `${artistId}:${title}`;
        const artworkInfo = artworkMap.get(key);

        if (!artworkInfo) {
          console.log(`   ⚠️ 작품을 찾을 수 없음: ${artistName} - "${title}"`);
          notFoundCount++;
          continue;
        }

        // 이미 판매 기록이 있는지 확인
        if (existingSalesSet.has(artworkInfo.id)) {
          console.log(`   ⏭️ 이미 판매 기록 있음: ${artistName} - "${title}"`);
          skippedCount++;
          continue;
        }

        const salePrice = parsePrice(artworkInfo.price);

        salesRecords.push({
          artwork_id: artworkInfo.id,
          quantity,
          sale_price: salePrice,
          sold_at: new Date().toISOString(),
          note: `2026 씨앗페 판매 (${quantity}부)`,
        });

        console.log(
          `   ✅ ${artistName} - "${title}": ${quantity}부 (₩${salePrice.toLocaleString()})`
        );
      }
    }

    if (salesRecords.length > 0) {
      const { error: insertError } = await supabase.from('artwork_sales').insert(salesRecords);

      if (insertError) throw insertError;

      console.log(`\n✅ ${salesRecords.length}개 작품의 판매 기록을 추가했습니다.`);
    } else {
      console.log('\n⚠️ 추가할 판매 기록이 없습니다.');
    }

    if (notFoundCount > 0) {
      console.log(`\n⚠️ ${notFoundCount}개 작품을 찾을 수 없습니다 (제목 불일치 확인 필요).`);
    }

    if (skippedCount > 0) {
      console.log(`⏭️ ${skippedCount}개 작품은 이미 판매 기록이 있어 건너뛰었습니다.`);
    }

    console.log('\n🎉 완료!');
  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

main();
