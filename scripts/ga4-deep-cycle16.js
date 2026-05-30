#!/usr/bin/env node
'use strict';
const { runReport } = require('./lib/ga4-auth');

async function go() {
  const src = await runReport({
    dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
    metrics: [{ name: 'sessions' }, { name: 'screenPageViews' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 15,
  });
  console.log('=== Source/Medium top 15 (7d) ===');
  if (src.rows) src.rows.forEach(r => console.log(`  ${r.dimensionValues[0].value}/${r.dimensionValues[1].value}  sess=${r.metricValues[0].value}  pv=${r.metricValues[1].value}`));

  const land = await runReport({
    dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'landingPagePlusQueryString' }],
    metrics: [{ name: 'sessions' }, { name: 'bounceRate' }, { name: 'averageSessionDuration' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 15,
  });
  console.log('\n=== Top landing pages (7d) ===');
  if (land.rows) land.rows.forEach(r => console.log(`  sess=${r.metricValues[0].value} bounce=${(r.metricValues[1].value*100).toFixed(0)}% avgDur=${(+r.metricValues[2].value).toFixed(0)}s  ${r.dimensionValues[0].value}`));

  const dev = await runReport({
    dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'deviceCategory' }],
    metrics: [{ name: 'sessions' }, { name: 'bounceRate' }, { name: 'conversions' }],
  });
  console.log('\n=== Device (7d) ===');
  if (dev.rows) dev.rows.forEach(r => console.log(`  ${r.dimensionValues[0].value}  sess=${r.metricValues[0].value} bounce=${(r.metricValues[1].value*100).toFixed(0)}% conv=${r.metricValues[2].value}`));

  const country = await runReport({
    dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'country' }],
    metrics: [{ name: 'sessions' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 10,
  });
  console.log('\n=== Country top 10 (7d) ===');
  if (country.rows) country.rows.forEach(r => console.log(`  ${r.dimensionValues[0].value}  sess=${r.metricValues[0].value}`));

  const aw = await runReport({
    dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
    dimensions: [{ name: 'pagePath' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'userEngagementDuration' }],
    dimensionFilter: { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value: '/artworks' } } },
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 20,
  });
  console.log('\n=== Top /artworks pages (7d) ===');
  if (aw.rows) aw.rows.forEach(r => console.log(`  pv=${r.metricValues[0].value} engage=${(+r.metricValues[1].value/1000).toFixed(0)}s  ${r.dimensionValues[0].value}`));
}
go().catch(e => { console.error(e.message); process.exit(1); });
