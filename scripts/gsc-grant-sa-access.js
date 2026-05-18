#!/usr/bin/env node
/**
 * GSC Site Verification — SA를 saf2026.com verified owner로 등록하는 1회성 스크립트.
 *
 * Google Search Console은 UI에서 SA 이메일을 거부함 ("이메일 찾을 수 없음").
 * 유일한 우회책: SA가 Site Verification API를 통해 domain owner가 되면
 * Webmasters API (GSC) 자동 접근 권한 획득.
 *
 * 사용법:
 *   node scripts/gsc-grant-sa-access.js token   # DNS TXT 토큰 발급 (먼저 실행)
 *   node scripts/gsc-grant-sa-access.js verify  # DNS 추가 후 verify
 *   node scripts/gsc-grant-sa-access.js list    # SA의 verified sites 목록
 *
 * 사전 준비:
 *   GCP Console → APIs & Services → Library → "Google Site Verification API" → Enable
 *   (프로젝트: saf2026)
 *
 * 전체 흐름:
 *   1. node scripts/gsc-grant-sa-access.js token  → DNS TXT 값 출력
 *   2. saf2026.com DNS에 TXT 레코드 추가
 *   3. DNS 전파 확인: dig +short TXT saf2026.com
 *   4. node scripts/gsc-grant-sa-access.js verify → SA owner 등록 완료
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { google } = require('googleapis');

// .env.local 로드
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

const SA_KEY_JSON = process.env.GSC_SERVICE_ACCOUNT_KEY || process.env.GA4_SERVICE_ACCOUNT_KEY;
if (!SA_KEY_JSON) {
  console.error('❌ GSC_SERVICE_ACCOUNT_KEY (또는 GA4_SERVICE_ACCOUNT_KEY) 미설정');
  process.exit(1);
}

let SA_KEY;
try {
  SA_KEY = JSON.parse(SA_KEY_JSON);
} catch {
  console.error('❌ SA key JSON 파싱 실패 — .env.local 값을 확인하세요');
  process.exit(1);
}

const DOMAIN = 'saf2026.com';
const COMMAND = process.argv[2];

if (!['token', 'verify', 'list'].includes(COMMAND)) {
  console.error('사용법: node scripts/gsc-grant-sa-access.js <token|verify|list>');
  process.exit(1);
}

function getSaAuth(scopes) {
  return new google.auth.JWT({
    email: SA_KEY.client_email,
    key: SA_KEY.private_key,
    scopes,
  });
}

async function getToken() {
  console.log(`\n=== SA용 Site Verification DNS 토큰 발급 ===`);
  console.log(`  SA: ${SA_KEY.client_email}`);
  console.log(`  Domain: ${DOMAIN}\n`);

  const auth = getSaAuth(['https://www.googleapis.com/auth/siteverification']);
  const accessToken = (await auth.getAccessToken()).token;

  const res = await fetch('https://www.googleapis.com/siteVerification/v1/token', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      verificationMethod: 'DNS_TXT',
      site: { type: 'INET_DOMAIN', identifier: DOMAIN },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(`❌ 토큰 발급 실패 (${res.status}): ${JSON.stringify(data.error ?? data)}`);
    if (res.status === 403) {
      console.error('\n  GCP Console에서 Site Verification API가 활성화됐는지 확인하세요.');
      console.error('  APIs & Services → Library → "Google Site Verification API" → Enable');
      console.error('  (프로젝트: saf2026)');
    }
    process.exit(1);
  }

  console.log('✅ 토큰 발급 성공!\n');
  console.log('  다음 DNS TXT 레코드를 saf2026.com에 추가하세요:');
  console.log('  ───────────────────────────────────────────────');
  console.log('  Type:  TXT');
  console.log('  Host:  @ (apex)');
  console.log(`  Value: ${data.token}`);
  console.log('  TTL:   600 (10분)');
  console.log('  ───────────────────────────────────────────────');
  console.log('\n  ⚠️  기존 TXT 레코드 삭제 금지 — 추가만 할 것');
  console.log(`  전파 확인: dig +short TXT ${DOMAIN}`);
  console.log('\n  DNS 추가 후: node scripts/gsc-grant-sa-access.js verify');
}

async function checkDnsPropagation() {
  try {
    const { execFileSync } = require('child_process');
    const digOutput = execFileSync('dig', ['+short', 'TXT', DOMAIN], { encoding: 'utf8' });
    if (digOutput.includes('google-site-verification=')) {
      console.log('  ✅ DNS TXT 레코드 확인됨');
    } else {
      console.warn('  ⚠️  DNS에 google-site-verification TXT 레코드가 아직 없습니다.');
      console.warn(`  현재 TXT 레코드:\n${digOutput || '  (없음)'}`);
      console.warn('  DNS 추가 후 전파 완료(1~10분)까지 기다린 뒤 재실행하세요.\n');
    }
  } catch {
    console.warn('  ⚠️  dig 명령 실패 — DNS 확인 건너뜀');
  }
}

async function verify() {
  console.log(`\n=== SA로 ${DOMAIN} 소유권 인증 ===`);
  console.log(`  SA: ${SA_KEY.client_email}\n`);

  await checkDnsPropagation();

  const auth = getSaAuth(['https://www.googleapis.com/auth/siteverification']);
  const accessToken = (await auth.getAccessToken()).token;

  const res = await fetch(
    'https://www.googleapis.com/siteVerification/v1/webResource?verificationMethod=DNS_TXT',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        site: { type: 'INET_DOMAIN', identifier: DOMAIN },
      }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    console.error(`❌ Verify 실패 (${res.status}): ${JSON.stringify(data.error ?? data)}`);
    if (res.status === 400) {
      console.error('\n  DNS 레코드가 아직 전파되지 않았거나 토큰 값이 다릅니다.');
      console.error('  잠시 후 재시도 또는 token 단계부터 다시 실행.');
    }
    process.exit(1);
  }

  console.log(`\n✅ Verify 성공! SA가 ${DOMAIN} verified owner로 등록됨`);
  console.log(`  resource id: ${data.id}`);
  console.log(`  site type:   ${data.site?.type}`);
  console.log(`  owners:      ${data.owners?.join(', ')}`);
  // sc-domain property를 GSC에 명시적으로 추가 (sites.add)
  const scDomainUrl = `sc-domain:${DOMAIN}`;
  const addRes = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(scDomainUrl)}`,
    { method: 'PUT', headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (addRes.status === 204 || addRes.status === 200) {
    console.log(`\n  ✅ GSC에 ${scDomainUrl} 속성 추가됨`);
  } else {
    const errText = await addRes.text();
    console.warn(`\n  ⚠️  sites.add 응답 (${addRes.status}): ${errText}`);
  }

  console.log('\n  이제 GSC Webmasters API를 SA로 호출 가능합니다.');
  console.log('  확인: node scripts/gsc-grant-sa-access.js list');
  console.log('');

  await listSites();
}

async function listSites() {
  console.log('=== SA의 GSC 사이트 목록 ===');

  const auth = getSaAuth(['https://www.googleapis.com/auth/webmasters.readonly']);
  const accessToken = (await auth.getAccessToken()).token;

  const res = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await res.json();

  if (!res.ok) {
    console.error(`  sites.list 실패 (${res.status}): ${JSON.stringify(data.error ?? data)}`);
    console.error('  (verify 완료 직후엔 수 분 후 재시도)');
    return;
  }

  const sites = data.siteEntry ?? [];
  if (sites.length === 0) {
    console.log('  (사이트 없음 — verify 완료 직후라면 수 분 후 재시도)');
  } else {
    console.log('');
    sites.forEach((s) => console.log(`  ${(s.permissionLevel ?? '').padEnd(22)} ${s.siteUrl}`));
    const hasTarget = sites.some((s) => s.siteUrl?.includes('saf2026.com'));
    if (hasTarget) {
      console.log('\n  ✅ saf2026.com 접근 확인됨 — GSC sync 가능 상태');
      console.log('  다음 단계: curl -X POST https://www.saf2026.com/api/internal/gsc-sync \\');
      console.log('               -H "Authorization: Bearer $CRON_SECRET"');
    }
  }
}

(async () => {
  if (COMMAND === 'token') await getToken();
  else if (COMMAND === 'verify') await verify();
  else if (COMMAND === 'list') await listSites();
})();
