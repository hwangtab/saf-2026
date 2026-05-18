#!/usr/bin/env node
/**
 * GA4 property + data stream 진단.
 * 1) Admin API로 property 메타데이터 조회 (살아있는지, currencyCode, timeZone)
 * 2) Data Streams 목록 + measurement ID 일치 여부
 * 3) Realtime API로 현재 active user
 * 4) 최근 30일 totalUsers (어디까지 이벤트가 들어왔는지 일자별)
 *
 * 인증: scripts/lib/ga4-auth.js (SA > OAuth > dev token 우선순위)
 */

'use strict';

const { PROPERTY_ID, apiCall } = require('./lib/ga4-auth');

const EXPECTED_MEASUREMENT_ID = 'G-8K0TPPEL9W';

(async () => {
  console.log(`\n=== GA4 Property ${PROPERTY_ID} 진단 ===\n`);

  // 1) Property 메타데이터
  const meta = await apiCall(
    `https://analyticsadmin.googleapis.com/v1beta/properties/${PROPERTY_ID}`
  );
  console.log('[1] Property 메타데이터');
  if (meta.ok) {
    console.log(`  name: ${meta.data.displayName}`);
    console.log(`  timeZone: ${meta.data.timeZone}`);
    console.log(`  currencyCode: ${meta.data.currencyCode}`);
    console.log(`  createTime: ${meta.data.createTime}`);
    console.log(`  deleted: ${meta.data.deleted ?? false}`);
    console.log(`  serviceLevel: ${meta.data.serviceLevel ?? 'GOOGLE_ANALYTICS_STANDARD'}`);
  } else {
    console.log(`  ❌ ${meta.status}: ${JSON.stringify(meta.data)}`);
  }

  // 2) Data Streams
  const streams = await apiCall(
    `https://analyticsadmin.googleapis.com/v1beta/properties/${PROPERTY_ID}/dataStreams`
  );
  console.log('\n[2] Data Streams');
  if (streams.ok) {
    for (const s of streams.data.dataStreams ?? []) {
      console.log(`  - ${s.displayName} (${s.type})`);
      if (s.webStreamData) {
        const id = s.webStreamData.measurementId;
        const match =
          id === EXPECTED_MEASUREMENT_ID ? '✓ 일치' : `❌ 불일치 (예상 ${EXPECTED_MEASUREMENT_ID})`;
        console.log(`    measurementId: ${id} ${match}`);
        console.log(`    defaultUri: ${s.webStreamData.defaultUri}`);
      }
    }
  } else {
    console.log(`  ❌ ${streams.status}: ${JSON.stringify(streams.data)}`);
  }

  const firstStreamId =
    (streams.data.dataStreams ?? [])[0]?.name?.split('/').pop() ?? '';

  // 3) Realtime API — 현재 활성 사용자
  const realtime = await apiCall(
    `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runRealtimeReport`,
    { metrics: [{ name: 'activeUsers' }] }
  );
  console.log('\n[3] Realtime — 활성 사용자');
  if (realtime.ok) {
    const total = realtime.data.totals?.[0]?.metricValues?.[0]?.value ?? '0';
    console.log(`  현재 활성 사용자: ${total}`);
    console.log(`  rows: ${realtime.data.rowCount ?? 0}`);
  } else {
    console.log(`  ❌ ${realtime.status}: ${JSON.stringify(realtime.data)}`);
  }

  // 3-A) Data Retention
  const filtersV1 = await apiCall(
    `https://analyticsadmin.googleapis.com/v1beta/properties/${PROPERTY_ID}/dataRetentionSettings`
  );
  console.log('\n[3-A] Data Retention');
  if (filtersV1.ok) {
    console.log(`  eventDataRetention: ${filtersV1.data.eventDataRetention}`);
    console.log(`  resetUserDataOnNewActivity: ${filtersV1.data.resetUserDataOnNewActivity}`);
  } else {
    console.log(`  ❌ ${filtersV1.status}: ${JSON.stringify(filtersV1.data).slice(0, 200)}`);
  }

  // 3-B) Measurement Protocol Secrets
  const dataFilters = await apiCall(
    `https://analyticsadmin.googleapis.com/v1alpha/properties/${PROPERTY_ID}/dataStreams/${firstStreamId}/measurementProtocolSecrets`
  );
  console.log('\n[3-B] Measurement Protocol Secrets (확인용)');
  if (dataFilters.ok) {
    console.log(`  count: ${dataFilters.data.measurementProtocolSecrets?.length ?? 0}`);
  } else {
    console.log(`  ${dataFilters.status} (필수 아님)`);
  }

  // 3-C) Enhanced Measurement
  const enhanced = await apiCall(
    `https://analyticsadmin.googleapis.com/v1alpha/properties/${PROPERTY_ID}/dataStreams/${firstStreamId}/enhancedMeasurementSettings`
  );
  console.log('\n[3-C] Enhanced Measurement');
  if (enhanced.ok) {
    console.log(`  streamEnabled: ${enhanced.data.streamEnabled}`);
    console.log(`  pageViews: ${enhanced.data.pageViewsEnabled}`);
    console.log(`  scrolls: ${enhanced.data.scrollsEnabled}`);
    console.log(`  outboundClicks: ${enhanced.data.outboundClicksEnabled}`);
    console.log(`  siteSearch: ${enhanced.data.siteSearchEnabled}`);
  } else {
    console.log(`  ❌ ${enhanced.status}: ${JSON.stringify(enhanced.data).slice(0, 300)}`);
  }

  // 3-D) Event Create Rules
  const propFilters = await apiCall(
    `https://analyticsadmin.googleapis.com/v1alpha/properties/${PROPERTY_ID}/dataStreams/${firstStreamId}/eventCreateRules`
  );
  console.log('\n[3-D] Event Create Rules');
  if (propFilters.ok) {
    console.log(`  count: ${propFilters.data.eventCreateRules?.length ?? 0}`);
  } else {
    console.log(`  ${propFilters.status}`);
  }

  // 3-E) Property-level Data Filters
  const dfilters = await apiCall(
    `https://analyticsadmin.googleapis.com/v1alpha/properties/${PROPERTY_ID}/dataFilters`
  );
  console.log('\n[3-E] ⚠️  Property Data Filters (Internal/Developer Traffic 등)');
  if (dfilters.ok) {
    const list = dfilters.data.dataFilters ?? [];
    if (list.length === 0) {
      console.log('  (필터 없음)');
    } else {
      for (const f of list) {
        console.log(`  - ${f.displayName ?? f.name}`);
        console.log(`    filterType: ${f.filterType}`);
        console.log(`    state: ${f.state}`);
        if (f.stringFilter) console.log(`    stringFilter: ${JSON.stringify(f.stringFilter)}`);
        if (f.parameterName) console.log(`    parameter: ${f.parameterName}`);
      }
    }
  } else {
    console.log(`  ❌ ${dfilters.status}: ${JSON.stringify(dfilters.data).slice(0, 300)}`);
  }

  // 4) 최근 30일 일자별 totalUsers
  const daily = await apiCall(
    `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`,
    {
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'totalUsers' }, { name: 'eventCount' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
      limit: 31,
    }
  );
  console.log('\n[4] 최근 30일 일자별 (totalUsers / eventCount)');
  if (daily.ok) {
    const rows = daily.data.rows ?? [];
    if (rows.length === 0) {
      console.log('  (데이터 0건 — property가 트래픽 수신 중지된 상태)');
    } else {
      for (const r of rows) {
        const date = r.dimensionValues[0].value;
        const users = r.metricValues[0].value;
        const events = r.metricValues[1].value;
        console.log(`  ${date}: users=${users.padStart(4)}, events=${events.padStart(5)}`);
      }
    }
  } else {
    console.log(`  ❌ ${daily.status}: ${JSON.stringify(daily.data)}`);
  }

  console.log('');
})().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
