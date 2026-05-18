#!/usr/bin/env node
// Supabase DB에서 노출 작품/작가 수를 쿼리해 lib/site-stats.ts의 상수를 갱신한다.
// 빌드 전(prebuild)에 자동 실행 — 배포마다 JSON-LD·SEO 카피·FAQPage 스키마가 최신 수치로 빌드됨.
// Usage: node scripts/sync-site-stats.js
// Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (또는 NEXT_PUBLIC_SUPABASE_ANON_KEY)

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

dotenv.config({ path: path.join(__dirname, '..', '.env.local'), override: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const IS_CI = process.env.CI === '1' || !!process.env.VERCEL;

if (!supabaseUrl || !supabaseKey) {
  const msg = '[sync-site-stats] Supabase 환경 변수 없음';
  if (IS_CI) {
    console.error(`${msg} — CI 환경에서 stale 카운트 방지 위해 빌드 실패`);
    process.exit(1);
  }
  console.warn(`${msg} — site-stats.ts 갱신 건너뜀 (기존 상수 유지)`);
  process.exit(0);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const STATS_PATH = path.join(__dirname, '..', 'lib', 'site-stats.ts');

async function fetchCounts() {
  // 노출 작품 수 (is_hidden = false)
  const { count: artworkCount, error: artworkErr } = await supabase
    .from('artworks')
    .select('id', { count: 'exact', head: true })
    .eq('is_hidden', false);

  if (artworkErr) throw artworkErr;

  // 노출 작품이 있는 작가 수 (distinct artist_id)
  const { data: artistRows, error: artistErr } = await supabase
    .from('artworks')
    .select('artist_id')
    .eq('is_hidden', false);

  if (artistErr) throw artistErr;

  const artistCount = new Set(artistRows.map((r) => r.artist_id).filter((id) => id != null)).size;

  return { artworkCount, artistCount };
}

async function main() {
  let artworkCount, artistCount;

  try {
    ({ artworkCount, artistCount } = await fetchCounts());
  } catch (err) {
    if (IS_CI) {
      console.error('[sync-site-stats] DB 쿼리 실패 — CI 환경에서 빌드 실패:', err.message);
      process.exit(1);
    }
    console.warn('[sync-site-stats] DB 쿼리 실패 — site-stats.ts 갱신 건너뜀:', err.message);
    process.exit(0);
  }

  if (artworkCount == null) {
    if (IS_CI) {
      console.error('[sync-site-stats] artworkCount가 null — CI 환경에서 빌드 실패');
      process.exit(1);
    }
    console.warn('[sync-site-stats] artworkCount가 null — site-stats.ts 갱신 건너뜀');
    process.exit(0);
  }

  // 현재 파일에서 LOAN_COUNT 줄을 보존 (수동 관리 영역)
  const existing = fs.readFileSync(STATS_PATH, 'utf8');
  const loanMatch = existing.match(/^export const LOAN_COUNT = (\d+);/m);
  const loanCount = loanMatch ? Number(loanMatch[1]) : 354;

  const today = new Date().toISOString().slice(0, 10);

  const content = `// 메타·SEO 카피·i18n 메시지·JSON-LD 스키마에 들어가는 작품/작가 수의 단일 출처.
// 빌드 전 scripts/sync-site-stats.js 가 Supabase DB에서 자동 갱신 (prebuild 훅).
// 수동 수정 불필요 — 갱신 방법: npm run build 또는 node scripts/sync-site-stats.js
// 최종 갱신: ${today} (artworks.is_hidden=false 기준 ${artworkCount}건, 작가 ${artistCount}명)
export const ARTWORK_COUNT = ${artworkCount};
// 노출 작품이 있는 작가 수 (is_hidden=false 작품 보유 기준).
// 최종 갱신: ${today}
export const ARTIST_COUNT = ${artistCount};

// 예술인 상호부조 대출 누적 건수 (한국스마트협동조합 운영 데이터, 수기 갱신).
// 운영 보고서·SEO 카피·JSON-LD 답변에서 반복 사용되는 핵심 수치.
// 갱신 시점: 2025-09 누적 — 수치가 바뀌면 이 한 줄만 수정.
export const LOAN_COUNT = ${loanCount};
`;

  fs.writeFileSync(STATS_PATH, content, 'utf8');
  console.log(
    `[sync-site-stats] 갱신 완료 — 작품 ${artworkCount}건, 작가 ${artistCount}명 (${today})`
  );
}

main();
