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

// CSV에서 누락된 것으로 보고된 판매 기록
const missingSales = [
  { artist: '오윤', title: '소리꾼1', qty: 1, revenue: 1550000 },
  { artist: '오윤', title: '형님', qty: 1, revenue: 1550000 },
  { artist: '오윤', title: '대지', qty: 1, revenue: 1950000 },
  { artist: '김준권', title: '소나무', qty: 2, revenue: 1000000 },
  { artist: '김준권', title: 'Blue Night-1', qty: 2, revenue: 1000000 },
  { artist: '이윤엽', title: '붉은 봄 매화', qty: 1, revenue: 700000 },
  { artist: '이윤엽', title: '콩밭매는 할머니2', qty: 4, revenue: 1600000 },
  { artist: '이윤엽', title: '좋은소식', qty: 1, revenue: 500000 },
  { artist: '한애규', title: '2020년 7월 25일 꿈', qty: 1, revenue: 1200000 },
  { artist: '양운철', title: '작은 하늘', qty: 1, revenue: 800000 },
  { artist: '이익태', title: '산', qty: 1, revenue: 0 },
  { artist: '김영서', title: '무지개  사냥꾼', qty: 1, revenue: 1400000 },
  { artist: '박수지', title: 'Tropical forest', qty: 1, revenue: 1500000 },
  { artist: '박성완', title: '대인시장-놀', qty: 1, revenue: 1000000 },
  { artist: '이동구', title: '보리술잔', qty: 1, revenue: 30000 },
  { artist: '천지수', title: '가족 Family', qty: 1, revenue: 650000 },
  { artist: '박재동', title: '노무현 5점', qty: 1, revenue: 10000000 },
  { artist: '박재동', title: '노무현', qty: 1, revenue: 1500000 },
  { artist: '윤겸', title: '유채빛 봄날 A canola-colored spring day', qty: 1, revenue: 1500000 },
  { artist: '윤겸', title: '꿈의 안식처', qty: 1, revenue: 1000000 },
  { artist: '윤겸', title: '꿈의안식처', qty: 1, revenue: 2000000 },
  { artist: '민정기', title: '추수', qty: 1, revenue: 1150000 },
  { artist: '김태희', title: '각진 병', qty: 1, revenue: 150000 },
  { artist: '류연복', title: '콩밭매는 할머니2', qty: 1, revenue: 500000 },
  { artist: '김수오', title: '오름의 아침', qty: 1, revenue: 1000000 },
];

type FoundSale = {
  artist: string;
  title: string;
  qty: number;
  revenue: number;
  artworkId: string;
  dbTitle: string;
};

async function analyze() {
  const artistNames = [...new Set(missingSales.map((m) => m.artist))];
  const { data: artists } = await supabase
    .from('artists')
    .select('id, name_ko')
    .in('name_ko', artistNames);
  const artistMap = new Map(artists?.map((a) => [a.name_ko, a.id]) || []);

  console.log('🔍 판매 기록 누락 분석\n');

  const canAdd: FoundSale[] = [];
  const alreadyHas: FoundSale[] = [];
  const notFound: Array<{ artist: string; title: string; reason: string }> = [];

  for (const m of missingSales) {
    const artistId = artistMap.get(m.artist);
    if (!artistId) {
      notFound.push({ artist: m.artist, title: m.title, reason: '작가 없음' });
      continue;
    }

    // 정확한 제목으로 작품 찾기
    let { data: artwork } = await supabase
      .from('artworks')
      .select('id, title, price')
      .eq('artist_id', artistId)
      .eq('title', m.title)
      .single();

    // 없으면 유사 제목 검색 (공백 무시)
    if (!artwork) {
      const { data: allArtworks } = await supabase
        .from('artworks')
        .select('id, title, price')
        .eq('artist_id', artistId);

      const normalized = m.title.replace(/\s+/g, '');
      artwork = allArtworks?.find((a) => a.title.replace(/\s+/g, '') === normalized) || null;

      if (artwork) {
        console.log(`🔄 제목 정규화 매칭: "${m.title}" → "${artwork.title}"`);
      }
    }

    if (!artwork) {
      notFound.push({ artist: m.artist, title: m.title, reason: '작품 없음' });
    } else {
      // 판매 기록 확인
      const { data: sales } = await supabase
        .from('artwork_sales')
        .select('id, quantity, sale_price')
        .eq('artwork_id', artwork.id);

      const item: FoundSale = {
        artist: m.artist,
        title: m.title,
        qty: m.qty,
        revenue: m.revenue,
        artworkId: artwork.id,
        dbTitle: artwork.title,
      };

      if (!sales || sales.length === 0) {
        canAdd.push(item);
      } else {
        alreadyHas.push(item);
      }
    }
  }

  console.log('\n✅ 판매 기록 추가 가능:');
  canAdd.forEach((f) => {
    console.log(`   ${f.artist} - "${f.dbTitle}": ${f.qty}건, ₩${f.revenue.toLocaleString()}`);
  });

  console.log('\n⏭️ 이미 판매 기록 있음:');
  alreadyHas.forEach((f) => {
    console.log(`   ${f.artist} - "${f.dbTitle}"`);
  });

  console.log('\n❌ DB에 작품 없음 (추가 불가):');
  notFound.forEach((f) => {
    console.log(`   ${f.artist} - "${f.title}": ${f.reason}`);
  });

  return { canAdd, alreadyHas, notFound };
}

async function addSales(sales: FoundSale[]) {
  console.log('\n📝 판매 기록 추가 중...\n');

  let added = 0;
  for (const s of sales) {
    const avgPrice = s.qty > 0 ? Math.round(s.revenue / s.qty) : 0;

    const { error } = await supabase.from('artwork_sales').insert({
      artwork_id: s.artworkId,
      quantity: s.qty,
      sale_price: avgPrice,
      sold_at: new Date().toISOString(),
      note: `2026 씨앗페 판매 (${s.qty}부)`,
    });

    if (error) {
      console.log(`❌ 실패: ${s.artist} - "${s.dbTitle}": ${error.message}`);
    } else {
      console.log(`✅ ${s.artist} - "${s.dbTitle}": ${s.qty}건, ₩${s.revenue.toLocaleString()}`);
      added++;
    }
  }

  console.log(`\n🎉 완료! ${added}건 추가됨`);
}

async function main() {
  const { canAdd } = await analyze();

  if (canAdd.length > 0) {
    console.log('\n---');
    console.log('판매 기록을 추가하려면 --apply 옵션으로 실행하세요.');
    console.log('npx tsx scripts/fix-title-mismatch-sales.ts --apply');

    if (process.argv.includes('--apply')) {
      await addSales(canAdd);
    }
  }
}

main();
