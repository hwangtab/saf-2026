#!/usr/bin/env node
/**
 * GA4 Web Stream defaultUri를 production 도메인으로 정정.
 * 현재: https://saf2026.com (www. 누락)
 * 변경: https://www.saf2026.com
 *
 * 측정 자체엔 무관하다는 게 GA4 docs 공식 입장이지만,
 * 메타 정확성 + 일부 origin-derived 처리(Enhanced Measurement, attribution) 안전 확보.
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
const TARGET_URI = 'https://www.saf2026.com';

async function getToken() {
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
  if (!res.ok) throw new Error(`token refresh ${res.status}: ${JSON.stringify(data)}`);
  return data.access_token;
}

(async () => {
  const token = await getToken();

  // 1) stream 목록 가져와서 첫 web stream의 name 확인
  const lst = await fetch(
    `https://analyticsadmin.googleapis.com/v1beta/properties/${PROPERTY_ID}/dataStreams`,
    { headers: { Authorization: `Bearer ${token}` } }
  ).then((r) => r.json());

  const web = (lst.dataStreams ?? []).find((s) => s.type === 'WEB_DATA_STREAM');
  if (!web) {
    console.error('Web stream 없음');
    process.exit(1);
  }
  console.log('대상 stream:', web.name);
  console.log('현재 defaultUri:', web.webStreamData?.defaultUri);

  if (web.webStreamData?.defaultUri === TARGET_URI) {
    console.log('이미 정확. 변경 스킵.');
    return;
  }

  // 2) PATCH
  const patchUrl = `https://analyticsadmin.googleapis.com/v1beta/${web.name}?updateMask=webStreamData.defaultUri`;
  const patchRes = await fetch(patchUrl, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ webStreamData: { defaultUri: TARGET_URI } }),
  });
  const patchData = await patchRes.json();
  if (!patchRes.ok) {
    console.error('PATCH 실패:', patchRes.status, patchData);
    process.exit(1);
  }
  console.log('PATCH 성공');
  console.log('  새 defaultUri:', patchData.webStreamData?.defaultUri);
})().catch((err) => {
  console.error('FAIL:', err.message);
  process.exit(1);
});
