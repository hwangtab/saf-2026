#!/usr/bin/env node
/**
 * GA4 web_vitals 이벤트의 custom param이 customEvent:dimension으로 조회 가능한지 probe.
 * 등록되면 일자별 metric_name/metric_rating 분포 데이터로 풍부한 패널 가능.
 * 미등록이면 GA4 어드민에서 custom dimension 등록 필요.
 */
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  });
}

async function getToken() {
  const params = new URLSearchParams({
    client_id: process.env.GA4_OAUTH_CLIENT_ID,
    client_secret: process.env.GA4_OAUTH_CLIENT_SECRET,
    refresh_token: process.env.GA4_OAUTH_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString(),
  });
  const data = await res.json();
  return data.access_token;
}

(async () => {
  const token = await getToken();
  const PROPERTY = process.env.GA4_PROPERTY_ID;

  // 1) 단순 web_vitals 이벤트 일자별 (Custom dimension 불필요 — Standard만 사용)
  const r1 = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY}:runReport`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'date' }, { name: 'eventName' }],
        metrics: [{ name: 'eventCount' }, { name: 'eventValue' }],
        dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: 'web_vitals' } } },
        orderBys: [{ dimension: { dimensionName: 'date' } }],
      }),
    }
  ).then((r) => r.json());
  console.log('[1] Standard event count by date (no custom dim):');
  for (const row of r1.rows ?? []) {
    console.log(`  ${row.dimensionValues[0].value}: count=${row.metricValues[0].value}, sumValue=${row.metricValues[1].value}`);
  }

  // 2) Custom dimension 시도 — metric_name
  const r2 = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY}:runReport`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'customEvent:metric_name' }],
        metrics: [{ name: 'eventCount' }, { name: 'eventValue' }],
        dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: 'web_vitals' } } },
      }),
    }
  ).then((r) => r.json());
  console.log('\n[2] customEvent:metric_name (등록되면 LCP/CLS/INP/FCP/TTFB 분포):');
  if (r2.error) {
    console.log('  ❌ ERROR:', r2.error.message);
  } else if ((r2.rows ?? []).length === 0) {
    console.log('  (빈 결과 — 미등록 또는 데이터 없음)');
  } else {
    for (const row of r2.rows ?? []) {
      console.log(`  ${row.dimensionValues[0].value || '(unset)'}: count=${row.metricValues[0].value}, sumValue=${row.metricValues[1].value}`);
    }
  }

  // 3) Custom dimension 시도 — metric_rating
  const r3 = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY}:runReport`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'customEvent:metric_rating' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: 'web_vitals' } } },
      }),
    }
  ).then((r) => r.json());
  console.log('\n[3] customEvent:metric_rating (good/needs-improvement/poor 분포):');
  if (r3.error) {
    console.log('  ❌ ERROR:', r3.error.message);
  } else if ((r3.rows ?? []).length === 0) {
    console.log('  (빈 결과 — 미등록 또는 데이터 없음)');
  } else {
    for (const row of r3.rows ?? []) {
      console.log(`  ${row.dimensionValues[0].value || '(unset)'}: count=${row.metricValues[0].value}`);
    }
  }
})().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
