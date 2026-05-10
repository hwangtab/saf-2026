#!/usr/bin/env node
/**
 * GA4 page report probe — admin-analytics.ts의 pageReport fetch와 동일 query로
 * production에서 데이터가 정상 반환되는지 server-side 검증.
 */
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env.local');
fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m && !process.env[m[1].trim()]) {
    process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
});

(async () => {
  const params = new URLSearchParams({
    client_id: process.env.GA4_OAUTH_CLIENT_ID,
    client_secret: process.env.GA4_OAUTH_CLIENT_SECRET,
    refresh_token: process.env.GA4_OAUTH_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  });
  const tok = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  }).then((r) => r.json());

  const PROP = process.env.GA4_PROPERTY_ID;
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${PROP}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tok.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'pageTitle' }, { name: 'pagePath' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'activeUsers' },
          { name: 'screenPageViewsPerUser' },
          { name: 'userEngagementDuration' },
          { name: 'eventCount' },
        ],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 10,
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    console.error('FAIL:', res.status, JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log(`\nrows: ${(data.rows || []).length} / rowCount: ${data.rowCount || 0}\n`);
  console.log(
    'TOP — title (path) | views | users | views/user | avg engagement | events'
  );
  console.log('-'.repeat(120));
  for (const row of data.rows || []) {
    const title = (row.dimensionValues[0].value || '').slice(0, 50);
    const path = (row.dimensionValues[1].value || '').slice(0, 30);
    const views = row.metricValues[0].value;
    const users = Number(row.metricValues[1].value);
    const vpu = Number(row.metricValues[2].value).toFixed(2);
    const engagementSec = Number(row.metricValues[3].value);
    const avgEngage = users > 0 ? (engagementSec / users).toFixed(0) : '0';
    const events = row.metricValues[4].value;
    console.log(
      `${title.padEnd(50)} ${path.padEnd(30)} ${views.padStart(6)} ${String(users).padStart(5)} ${vpu.padStart(5)} ${avgEngage.padStart(4)}s ${events.padStart(5)}`
    );
  }
})().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
