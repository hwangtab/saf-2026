#!/usr/bin/env node
/**
 * GA4 빠른 점검 — web_vitals 이벤트 발생 자체 확인.
 * Custom dimension 미등록 상태에서도 동작.
 *
 * 인증 우선순위:
 *  1. GA4_OAUTH_CLIENT_ID + SECRET + REFRESH_TOKEN — 정식 자동화 (CI/로컬 영구 사용)
 *     refresh token으로 access token 자동 갱신 (1시간 만료 시 자동 재발급)
 *  2. GA4_ACCESS_TOKEN env — 로컬 즉석 점검용 fallback (1시간 만료, 수동 갱신)
 */

const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m && !process.env[m[1].trim()]) {
        process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
      }
    });
}

const PROPERTY_ID = process.env.GA4_PROPERTY_ID;

if (!PROPERTY_ID) {
  console.error('❌ GA4_PROPERTY_ID 미설정');
  process.exit(1);
}

const API_URL = `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`;

let runReport;

if (
  process.env.GA4_OAUTH_CLIENT_ID &&
  process.env.GA4_OAUTH_CLIENT_SECRET &&
  process.env.GA4_OAUTH_REFRESH_TOKEN
) {
  let cachedAccessToken = null;
  let tokenExpiresAt = 0;

  const refreshAccessToken = async () => {
    const params = new URLSearchParams({
      client_id: process.env.GA4_OAUTH_CLIENT_ID,
      client_secret: process.env.GA4_OAUTH_CLIENT_SECRET,
      refresh_token: process.env.GA4_OAUTH_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    });
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Token refresh ${res.status}: ${JSON.stringify(data)}`);
    }
    cachedAccessToken = data.access_token;
    // expires_in는 초 단위. 60초 안전 마진.
    tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;
  };

  runReport = async (body) => {
    if (!cachedAccessToken || Date.now() >= tokenExpiresAt) {
      await refreshAccessToken();
    }
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`API ${res.status}: ${JSON.stringify(data)}`);
    return data;
  };
} else if (process.env.GA4_ACCESS_TOKEN) {
  runReport = async (body) => {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GA4_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`API ${res.status}: ${JSON.stringify(data)}`);
    return data;
  };
} else {
  console.error(
    '❌ 인증 정보 없음: GA4_OAUTH_CLIENT_ID/SECRET/REFRESH_TOKEN 3종 또는 GA4_ACCESS_TOKEN 필요'
  );
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

  // 3. web_vitals 발생 일자별 (배포 직후부터 추세)
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
    console.log('  (web_vitals 이벤트 발생 없음 — 배포 후 사용자 트래픽 미도달)');
  }
  console.log();

  // 4. Top pages (트래픽 분포)
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
