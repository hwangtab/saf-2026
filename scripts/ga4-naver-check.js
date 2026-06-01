#!/usr/bin/env node
/**
 * 네이버 노출/유입 진단 — GA4 기준.
 *
 * GSC(sc-domain:saf2026.com)는 구글 검색만 측정하므로, 네이버 노출은
 * GA4 유입으로 간접 판단한다. 네이버 서치어드바이저 연동 전까지의 유일한 측정 수단.
 *   - sessionSource = naver / m.search.naver.com = 네이버에서 실제 들어온 트래픽
 *   - organic(검색) vs referral 구분 — GA4가 네이버 검색을 referral로 흘리는 경우가 많아
 *     양쪽을 합산해야 실질 네이버 검색 유입이 됨
 *   - 인증: scripts/lib/ga4-auth.js (SA > OAuth > dev token)
 *
 * 사용:
 *   npm run ga4:naver-check          # 최근 90일
 *   npm run ga4:naver-check -- 30    # 일수 지정
 */

'use strict';

const { runReport } = require('./lib/ga4-auth');

const DAYS = parseInt(process.argv[2] || '90', 10);
const RANGE = [{ startDate: `${DAYS}daysAgo`, endDate: 'today' }];

function rows(r) {
  return r.rows || [];
}

async function main() {
  console.log(`=== 네이버 유입 진단 (GA4, 최근 ${DAYS}일) ===\n`);

  // 1. 소스/매체별 세션 — 검색엔진 비교
  const sm = await runReport({
    dateRanges: RANGE,
    dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'engagedSessions' },
      { name: 'conversions' },
    ],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 40,
  });

  let totalSessions = 0;
  const agg = {}; // source -> {sessions, users}
  rows(sm).forEach((r) => {
    const src = r.dimensionValues[0].value;
    const med = r.dimensionValues[1].value;
    const s = +r.metricValues[0].value;
    totalSessions += s;
    const key = src;
    if (!agg[key]) agg[key] = { sessions: 0, users: 0, byMedium: {} };
    agg[key].sessions += s;
    agg[key].users += +r.metricValues[1].value;
    agg[key].byMedium[med] = (agg[key].byMedium[med] || 0) + s;
  });

  console.log('=== 소스별 세션 점유 (전체 대비) ===');
  Object.entries(agg)
    .sort((a, b) => b[1].sessions - a[1].sessions)
    .slice(0, 15)
    .forEach(([src, v]) => {
      const pct = totalSessions ? ((v.sessions / totalSessions) * 100).toFixed(1) : '0';
      const mediums = Object.entries(v.byMedium)
        .map(([m, c]) => `${m}:${c}`)
        .join(' ');
      const flag = /naver/i.test(src) ? ' 🟢 네이버' : '';
      console.log(`  ${src.padEnd(22)} ${String(v.sessions).padStart(6)} (${pct}%)  [${mediums}]${flag}`);
    });
  console.log(`  ${'합계'.padEnd(22)} ${String(totalSessions).padStart(6)}`);
  console.log();

  // 2. 검색엔진 organic만 비교 (sessionMedium=organic)
  console.log('=== 검색엔진별 organic 세션 (medium=organic) ===');
  const organic = Object.entries(agg)
    .map(([src, v]) => [src, v.byMedium['organic'] || 0])
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1]);
  const organicTotal = organic.reduce((s, [, c]) => s + c, 0);
  if (organic.length === 0) {
    console.log('  (organic 세션 없음)');
  } else {
    organic.forEach(([src, c]) => {
      const pct = organicTotal ? ((c / organicTotal) * 100).toFixed(1) : '0';
      const flag = /naver/i.test(src) ? ' 🟢' : '';
      console.log(`  ${src.padEnd(22)} ${String(c).padStart(6)} (${pct}%)${flag}`);
    });
  }
  console.log();

  // 3. 네이버 유입 랜딩 페이지
  const naverLanding = await runReport({
    dateRanges: RANGE,
    dimensions: [{ name: 'landingPagePlusQueryString' }],
    metrics: [{ name: 'sessions' }],
    dimensionFilter: {
      filter: { fieldName: 'sessionSource', stringFilter: { matchType: 'CONTAINS', value: 'naver' } },
    },
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 15,
  });
  console.log('=== 네이버 유입 랜딩 페이지 Top 15 ===');
  if (rows(naverLanding).length === 0) {
    console.log('  (네이버 유입 세션 없음)');
  } else {
    rows(naverLanding).forEach((r) => {
      console.log(`  ${r.metricValues[0].value.padStart(5)}  ${r.dimensionValues[0].value}`);
    });
  }
  console.log();

  // 4. 네이버 vs 구글 organic 일자별 추세 (주 단위 집계)
  const trend = await runReport({
    dateRanges: RANGE,
    dimensions: [{ name: 'yearWeek' }, { name: 'sessionSource' }],
    metrics: [{ name: 'sessions' }],
    dimensionFilter: {
      orGroup: {
        expressions: [
          { filter: { fieldName: 'sessionSource', stringFilter: { matchType: 'CONTAINS', value: 'naver' } } },
          { filter: { fieldName: 'sessionSource', stringFilter: { matchType: 'CONTAINS', value: 'google' } } },
        ],
      },
    },
    orderBys: [{ dimension: { dimensionName: 'yearWeek' } }],
    limit: 200,
  });
  console.log('=== 주별 네이버/구글 세션 추세 ===');
  const weeks = {};
  rows(trend).forEach((r) => {
    const wk = r.dimensionValues[0].value;
    const src = /naver/i.test(r.dimensionValues[1].value) ? 'naver' : 'google';
    if (!weeks[wk]) weeks[wk] = { naver: 0, google: 0 };
    weeks[wk][src] += +r.metricValues[0].value;
  });
  console.log('  주차      네이버   구글');
  Object.entries(weeks)
    .sort()
    .forEach(([wk, v]) => {
      console.log(`  ${wk}   ${String(v.naver).padStart(5)}  ${String(v.google).padStart(5)}`);
    });
}

main().catch((e) => {
  console.error('에러:', e.message);
  process.exit(1);
});
