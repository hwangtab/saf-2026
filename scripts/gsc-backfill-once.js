#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');

// .env.local 로드
const envPath = path.join(process.cwd(), '.env.local');
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const m = line.match(/^([^#=]+)=(.*)/);
  if (m && !process.env[m[1].trim()]) {
    process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
});

const SA_KEY_JSON = process.env.GSC_SERVICE_ACCOUNT_KEY;
if (!SA_KEY_JSON) {
  console.error('[gsc-backfill] GSC_SERVICE_ACCOUNT_KEY 환경변수 미설정');
  process.exit(1);
}
let SA_KEY;
try {
  SA_KEY = JSON.parse(SA_KEY_JSON);
} catch (err) {
  console.error('[gsc-backfill] GSC_SERVICE_ACCOUNT_KEY JSON 파싱 실패:', err.message);
  process.exit(1);
}
const SITE_URL = process.env.GSC_SITE_URL || 'sc-domain:saf2026.com';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const auth = new google.auth.JWT({
  email: SA_KEY.client_email,
  key: SA_KEY.private_key,
  scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
});

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const wm = google.webmasters({ version: 'v3', auth });

async function fetchDay(date) {
  const res = await wm.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      startDate: date, endDate: date,
      dimensions: ['query', 'page'],
      rowLimit: 5000,
      dataState: 'final',
    },
  });
  return (res.data.rows ?? []).map(r => ({
    date,
    query: r.keys?.[0] ?? null,
    page: r.keys?.[1] ?? null,
    impressions: Math.round(Number(r.impressions ?? 0)),
    clicks: Math.round(Number(r.clicks ?? 0)),
    ctr: Math.round(Number(r.ctr ?? 0) * 10000) / 10000,
    position: Math.round(Number(r.position ?? 0) * 100) / 100,
  }));
}

(async () => {
  // D-2 ~ D-28 (26일치 backfill)
  const dates = [];
  for (let i = 2; i <= 28; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }

  console.log(`GSC backfill: ${dates[dates.length-1]} ~ ${dates[0]} (${dates.length}일)`);
  console.log(`Site: ${SITE_URL}\n`);

  let totalRows = 0;
  for (const date of dates) {
    try {
      const rows = await fetchDay(date);
      if (rows.length === 0) {
        process.stdout.write(`  ${date}: 0 rows (GSC 미처리)\n`);
        continue;
      }
      const { error } = await supabase
        .from('gsc_metrics')
        .upsert(rows, { onConflict: 'date,query,page' });
      if (error) {
        console.error(`  ${date}: upsert 실패 — ${error.message}`);
      } else {
        totalRows += rows.length;
        process.stdout.write(`  ${date}: ${rows.length} rows OK\n`);
      }
    } catch (e) {
      console.error(`  ${date}: fetch 실패 — ${e.message}`);
    }
  }
  console.log(`\n✅ 완료: 총 ${totalRows}개 행 upsert`);
})();
