#!/usr/bin/env node
/**
 * GA4 빠른 점검 — 최근 7일 트래픽·이벤트·페이지 현황.
 *
 * 인증: scripts/lib/ga4-auth.js (SA > OAuth > dev token 우선순위)
 *
 * 사용:
 *   node scripts/ga4-quick-check.js
 */

'use strict';

const { PROPERTY_ID, runReport } = require('./lib/ga4-auth');

if (!PROPERTY_ID) {
  console.error('❌ GA4_PROPERTY_ID 미설정');
  process.exit(1);
}

async function main() {
  console.log('=== GA4 빠른 점검 — 최근 7일 ===\n');

  // 1. 사이트 트래픽 자체
  const traffic = await runReport({
    dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
    metrics: [{ name: 'totalUsers' }, { name: 'sessions' }, { name: 'screenPageViews' }],
  });
  if (traffic.rows && traffic.rows[0]) {
    const r = traffic.rows[0];
    console.log('전체 트래픽 (7일):');
    console.log(`  사용자: ${r.metricValues[0].value}`);
    console.log(`  세션: ${r.metricValues[1].value}`);
    console.log(`  페이지뷰: ${r.metricValues[2].value}`);
  }
  console.log();

  // 2. Top events
  const events = await runReport({
    dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }],
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit: 20,
  });

  console.log('=== Top 20 events (7일) ===');
  if (events.rows) {
    events.rows.forEach((r) => {
      const name = r.dimensionValues[0].value;
      const count = r.metricValues[0].value;
      const flag = name === 'web_vitals' ? ' ✅ ← 우리가 추가한 이벤트' : '';
      console.log(`  ${name.padEnd(28)} ${count.padStart(7)}${flag}`);
    });
  }
  console.log();

  // 3. web_vitals 발생 일자별 추세 (14일)
  const byDate = await runReport({
    dateRanges: [{ startDate: '14daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: { fieldName: 'eventName', stringFilter: { value: 'web_vitals' } },
    },
    orderBys: [{ dimension: { dimensionName: 'date' } }],
  });

  console.log('=== web_vitals 발생 추세 (14일) ===');
  if (byDate.rows && byDate.rows.length > 0) {
    byDate.rows.forEach((r) => {
      const d = r.dimensionValues[0].value;
      const c = r.metricValues[0].value;
      const fmt = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
      console.log(`  ${fmt}  ${c}`);
    });
  } else {
    console.log('  (web_vitals 이벤트 발생 없음)');
  }
  console.log();

  // 4. Top pages
  const topPages = await runReport({
    dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 15,
  });

  console.log('=== Top 15 pages (7일, 페이지뷰) ===');
  if (topPages.rows) {
    topPages.rows.forEach((r) => {
      const p = r.dimensionValues[0].value;
      const v = r.metricValues[0].value;
      console.log(`  ${v.padStart(5)}  ${p}`);
    });
  }
}

main().catch((e) => {
  console.error('에러:', e.message);
  process.exit(1);
});
