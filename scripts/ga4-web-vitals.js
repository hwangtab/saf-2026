#!/usr/bin/env node
/**
 * GA4 Web Vitals 데이터 조회 스크립트.
 *
 * OAuth access token으로 GA4 Data API REST 직접 호출 (service account 우회).
 *
 * 사용:
 *   node scripts/ga4-web-vitals.js [--days N]
 *
 * 환경:
 *   GA4_PROPERTY_ID=531750491 (.env.local)
 *   GA4_ACCESS_TOKEN=ya29.... (.env.local, 1시간 유효)
 */

const path = require('path');
const fs = require('fs');

// .env.local 로드
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .forEach((line) => {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) {
        const key = m[1].trim();
        const value = m[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = value;
      }
    });
}

const PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const ACCESS_TOKEN = process.env.GA4_ACCESS_TOKEN;

if (!PROPERTY_ID || !ACCESS_TOKEN) {
  console.error('❌ GA4_PROPERTY_ID 또는 GA4_ACCESS_TOKEN 미설정');
  process.exit(1);
}

const args = process.argv.slice(2);
const daysIdx = args.indexOf('--days');
const days = daysIdx >= 0 ? parseInt(args[daysIdx + 1], 10) : 7;
const startDate = `${days}daysAgo`;

const API_URL = `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`;

async function runReport(body) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  console.log(`\n=== GA4 Web Vitals 보고서 (최근 ${days}일) ===\n`);

  // 1. metric별 측정 수 + 평균값
  let overall;
  try {
    overall = await runReport({
      dateRanges: [{ startDate, endDate: 'today' }],
      dimensions: [{ name: 'customEvent:metric_name' }],
      metrics: [{ name: 'eventCount' }, { name: 'eventValue' }],
      dimensionFilter: {
        filter: {
          fieldName: 'eventName',
          stringFilter: { value: 'web_vitals' },
        },
      },
    });
  } catch (err) {
    console.error('❌ API 호출 에러:', err.message);
    return;
  }

  if (!overall.rows || overall.rows.length === 0) {
    console.log('⚠️  web_vitals 이벤트 데이터 없음.');
    console.log('  가능한 원인:');
    console.log('  - 배포 후 측정 시작 전 (commit 67e23661 배포 필요)');
    console.log('  - 사용자 트래픽이 아직 없음 (5~10분 대기)');
    console.log('  - GA4 보고 처리 지연 (실시간 보고서 외 일반 보고서는 24~48시간 지연)\n');

    // 일반 페이지뷰 데이터로 트래픽 자체는 있는지 확인
    const traffic = await runReport({
      dateRanges: [{ startDate, endDate: 'today' }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 10,
    });
    if (traffic.rows && traffic.rows.length > 0) {
      console.log('=== 참고: 최근 ' + days + '일 이벤트 발생 (web_vitals 외) ===');
      traffic.rows.forEach((r) => {
        console.log(`  ${r.dimensionValues[0].value.padEnd(20)} ${r.metricValues[0].value}`);
      });
    } else {
      console.log('전체 이벤트도 0 — 사이트 트래픽 자체가 없음.');
    }
    return;
  }

  console.log('=== Metric별 측정 수 + 평균값 ===');
  overall.rows.forEach((row) => {
    const name = row.dimensionValues[0].value || '(unknown)';
    const count = row.metricValues[0].value;
    const totalValue = Number(row.metricValues[1].value);
    const countNum = Number(count);
    const avg = countNum > 0 ? (totalValue / countNum).toFixed(1) : 'N/A';
    const isCls = name === 'CLS';
    const display = isCls ? `${(avg / 1000).toFixed(3)} avg` : `${avg}ms avg`;
    console.log(`  ${name.padEnd(8)} count=${count.padStart(5)}  ${display}`);
  });
  console.log();

  // 2. rating 분포
  const byRating = await runReport({
    dateRanges: [{ startDate, endDate: 'today' }],
    dimensions: [
      { name: 'customEvent:metric_name' },
      { name: 'customEvent:metric_rating' },
    ],
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        stringFilter: { value: 'web_vitals' },
      },
    },
  });

  if (byRating.rows && byRating.rows.length > 0) {
    console.log('=== Metric × Rating 분포 ===');
    const grouped = {};
    byRating.rows.forEach((row) => {
      const metric = row.dimensionValues[0].value || '?';
      const rating = row.dimensionValues[1].value || '?';
      const count = parseInt(row.metricValues[0].value, 10);
      if (!grouped[metric]) grouped[metric] = { good: 0, 'needs-improvement': 0, poor: 0, total: 0 };
      if (grouped[metric][rating] !== undefined) grouped[metric][rating] = count;
      grouped[metric].total += count;
    });
    Object.entries(grouped).forEach(([metric, dist]) => {
      const goodPct = dist.total > 0 ? ((dist.good / dist.total) * 100).toFixed(1) : '0.0';
      const niPct = dist.total > 0 ? ((dist['needs-improvement'] / dist.total) * 100).toFixed(1) : '0.0';
      const poorPct = dist.total > 0 ? ((dist.poor / dist.total) * 100).toFixed(1) : '0.0';
      console.log(
        `  ${metric.padEnd(8)} good=${goodPct}%  ni=${niPct}%  poor=${poorPct}%  (total ${dist.total})`
      );
    });
    console.log();
  }

  // 3. LCP가 가장 나쁜 페이지 top 10
  const byPageLcp = await runReport({
    dateRanges: [{ startDate, endDate: 'today' }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'eventCount' }, { name: 'eventValue' }],
    dimensionFilter: {
      andGroup: {
        expressions: [
          {
            filter: {
              fieldName: 'eventName',
              stringFilter: { value: 'web_vitals' },
            },
          },
          {
            filter: {
              fieldName: 'customEvent:metric_name',
              stringFilter: { value: 'LCP' },
            },
          },
        ],
      },
    },
    orderBys: [{ metric: { metricName: 'eventValue' }, desc: true }],
    limit: 10,
  });

  if (byPageLcp.rows && byPageLcp.rows.length > 0) {
    console.log('=== LCP 가장 나쁜 페이지 Top 10 (count×value) ===');
    byPageLcp.rows.forEach((row) => {
      const pagePath = row.dimensionValues[0].value || '(unknown)';
      const count = Number(row.metricValues[0].value);
      const totalValue = Number(row.metricValues[1].value);
      const avg = count > 0 ? (totalValue / count).toFixed(0) : 0;
      const rating = avg > 4000 ? '❌ poor' : avg > 2500 ? '⚠️ ni  ' : '✅ good';
      console.log(`  ${rating}  avg=${String(avg).padStart(5)}ms  count=${String(count).padStart(3)}  ${pagePath}`);
    });
    console.log();
  }

  // 4. 디바이스별
  const byDevice = await runReport({
    dateRanges: [{ startDate, endDate: 'today' }],
    dimensions: [
      { name: 'deviceCategory' },
      { name: 'customEvent:metric_name' },
    ],
    metrics: [{ name: 'eventCount' }, { name: 'eventValue' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        stringFilter: { value: 'web_vitals' },
      },
    },
  });

  if (byDevice.rows && byDevice.rows.length > 0) {
    console.log('=== Device × Metric 평균 ===');
    byDevice.rows.forEach((row) => {
      const device = row.dimensionValues[0].value || '?';
      const metric = row.dimensionValues[1].value || '?';
      const count = Number(row.metricValues[0].value);
      const totalValue = Number(row.metricValues[1].value);
      const avg = count > 0 ? (totalValue / count).toFixed(1) : 0;
      console.log(`  ${device.padEnd(8)} ${metric.padEnd(6)} avg=${String(avg).padStart(8)}  count=${count}`);
    });
    console.log();
  }

  console.log('---');
  console.log('💡 Good 임계값:');
  console.log('  LCP ≤2500ms / CLS ≤0.1 / INP ≤200ms / FCP ≤1800ms / TTFB ≤800ms');
}

main().catch((err) => {
  console.error('❌ 에러:', err.message || err);
  process.exit(1);
});
