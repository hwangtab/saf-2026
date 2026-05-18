#!/usr/bin/env node
/**
 * GA4 Property에 Service Account를 viewer로 추가하는 1회성 스크립트.
 *
 * GA4 Admin UI("Google 계정과 일치하지 않음" 에러)를 우회해 Admin API 직접 호출.
 * hwangtab@gmail.com OAuth로 인증하여 SA 이메일을 property viewer에 추가.
 *
 * 사전 준비:
 *   1. OAuth Playground(https://developers.google.com/oauthplayground)에서
 *      https://www.googleapis.com/auth/analytics.manage.users 스코프로 access token 발급
 *   2. .env.local에 GA4_ADMIN_ACCESS_TOKEN=<발급받은 access token> 추가
 *
 * 실행:
 *   node scripts/ga4-grant-sa-access.js
 *
 * 성공 후: GA4 Admin → 속성 액세스 관리에서 SA 이메일이 뷰어로 표시됨.
 * idempotent: 이미 추가된 경우 409 ALREADY_EXISTS 응답 — 에러 아님.
 */

'use strict';

const path = require('path');
const fs = require('fs');

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

const PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const ACCESS_TOKEN = process.env.GA4_ADMIN_ACCESS_TOKEN;
const SA_EMAIL = 'saf2026-ga-reader@saf2026.iam.gserviceaccount.com';

if (!PROPERTY_ID) {
  console.error('❌ GA4_PROPERTY_ID 미설정');
  process.exit(1);
}

if (!ACCESS_TOKEN) {
  console.error('❌ GA4_ADMIN_ACCESS_TOKEN 미설정');
  console.error('');
  console.error('  설정 방법:');
  console.error('  1. https://developers.google.com/oauthplayground 접속 (hwangtab@gmail.com)');
  console.error('  2. Step 1: https://www.googleapis.com/auth/analytics.manage.users 선택');
  console.error('  3. Step 2: Authorize APIs → Exchange code for tokens');
  console.error('  4. Access token 복사 → .env.local에 GA4_ADMIN_ACCESS_TOKEN=<token> 추가');
  console.error('  5. 다시 실행');
  process.exit(1);
}

(async () => {
  const url = `https://analyticsadmin.googleapis.com/v1alpha/properties/${PROPERTY_ID}/accessBindings`;

  console.log(`\n=== GA4 Property ${PROPERTY_ID}에 SA 뷰어 권한 추가 ===`);
  console.log(`  SA: ${SA_EMAIL}`);
  console.log(`  역할: VIEWER\n`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user: SA_EMAIL,
      roles: ['predefinedRoles/viewer'],
    }),
  });

  const data = await res.json();

  if (res.ok) {
    console.log('✅ 성공!');
    console.log(`  accessBinding: ${data.name}`);
    console.log(`  user: ${data.user}`);
    console.log(`  roles: ${data.roles?.join(', ')}`);
    console.log('');
    console.log('다음 단계:');
    console.log('  1. .env.local에 GA4_SERVICE_ACCOUNT_KEY 추가 (SA JSON 문자열화)');
    console.log('     예: GA4_SERVICE_ACCOUNT_KEY=$(cat ~/.saf2026-secrets/ga4-service-account.json | tr -d "\\n")');
    console.log('  2. Vercel env에 GA4_SERVICE_ACCOUNT_KEY 등록');
    console.log('  3. GitHub Secrets에 GA4_SERVICE_ACCOUNT_KEY 등록');
    console.log('  4. node scripts/ga4-quick-check.js 로 동작 검증');
  } else if (res.status === 409 || data.error?.status === 'ALREADY_EXISTS') {
    console.log('ℹ️  이미 추가된 SA (ALREADY_EXISTS) — 정상 상태');
    console.log('  GA4 Admin → 속성 액세스 관리에서 뷰어 확인 가능');
  } else if (res.status === 403) {
    console.error(`❌ 권한 없음 (403). access token 스코프를 확인하세요.`);
    console.error(`   analytics.manage.users 스코프가 포함된 토큰이 필요합니다.`);
    console.error(`   오류: ${JSON.stringify(data.error ?? data)}`);
    process.exit(1);
  } else if (res.status === 401) {
    console.error('❌ 인증 실패 (401). GA4_ADMIN_ACCESS_TOKEN이 만료됐습니다.');
    console.error('   OAuth Playground에서 새 access token을 발급받아 .env.local에 업데이트하세요.');
    process.exit(1);
  } else {
    console.error(`❌ API 오류 (${res.status}): ${JSON.stringify(data)}`);
    process.exit(1);
  }
})();
