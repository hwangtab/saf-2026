#!/usr/bin/env node
/**
 * 작품 구매 계좌이체 입금안내 알림톡 템플릿 등록·심사 신청.
 *
 * 사용법:
 *   node --env-file=.env.local scripts/register-bank-transfer-alimtalk-template.mjs query
 *   node --env-file=.env.local scripts/register-bank-transfer-alimtalk-template.mjs create
 *   node --env-file=.env.local scripts/register-bank-transfer-alimtalk-template.mjs submit
 *   node --env-file=.env.local scripts/register-bank-transfer-alimtalk-template.mjs status
 *
 * 환경변수:
 *   SOLAPI_API_KEY, SOLAPI_API_SECRET
 *   SOLAPI_KAKAO_CHANNEL_ID      # create 시 필요. query로 확인.
 *   SOLAPI_KAKAO_CATEGORY_CODE   # 선택. 기본 01500020001(기관/단체·일반단체)
 */
import crypto from 'crypto';

const API = 'https://api.solapi.com';
const apiKey = process.env.SOLAPI_API_KEY;
const apiSecret = process.env.SOLAPI_API_SECRET;
const channelId = process.env.SOLAPI_KAKAO_CHANNEL_ID;
const categoryCode = process.env.SOLAPI_KAKAO_CATEGORY_CODE || '01500020001';

const TEMPLATE = {
  name: process.env.SOLAPI_BANK_TRANSFER_TEMPLATE_NAME || '작품구매_계좌이체입금안내_v2',
  content: [
    '[씨앗페] 계좌이체 입금 안내',
    '',
    '#{name}님, 작품 주문이 접수되었습니다.',
    '',
    '▶ 작가: #{artist}',
    '▶ 작품: #{title}',
    '▶ 금액: #{amount}',
    '▶ 입금계좌: #{bank} #{account}',
    '▶ 예금주: #{holder}',
    '▶ 입금기한: #{due}',
    '',
    '입금 확인 후 작품 준비가 시작됩니다.',
  ].join('\n'),
};

if (!apiKey || !apiSecret) {
  console.error('SOLAPI_API_KEY / SOLAPI_API_SECRET 미설정');
  process.exit(1);
}

function authHeader() {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(32).toString('hex');
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(date + salt)
    .digest('hex');
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

async function call(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const raw = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = raw;
  }
  return { status: res.status, ok: res.ok, data: parsed };
}

function templateList(data) {
  return Array.isArray(data?.templateList) ? data.templateList : [];
}

async function listTemplates() {
  return call('GET', '/kakao/v2/templates?limit=100');
}

function findTemplate(data) {
  return templateList(data).find((t) => t.name === TEMPLATE.name);
}

async function query() {
  console.log('=== 카카오 채널 목록 (GET /kakao/v2/channels) ===');
  const ch = await call('GET', '/kakao/v2/channels');
  console.log('status', ch.status);
  console.log(JSON.stringify(ch.data, null, 2));

  console.log('\n=== 템플릿 카테고리 (GET /kakao/v2/channels/categories) ===');
  const cat = await call('GET', '/kakao/v2/channels/categories');
  console.log('status', cat.status);
  console.log(JSON.stringify(cat.data, null, 2));
}

async function status() {
  console.log(`=== 계좌이체 입금안내 템플릿 상태: ${TEMPLATE.name} ===`);
  const res = await listTemplates();
  console.log('status', res.status);
  const tpl = findTemplate(res.data);
  if (!tpl) {
    console.log('템플릿 없음');
    return;
  }
  console.log(JSON.stringify(tpl, null, 2));
  console.log(`\nVercel env 승인 후 교체값: SOLAPI_KAKAO_TEMPLATE_VIRTUAL_ACCOUNT_ISSUED=${tpl.templateId}`);
}

async function requestInspection(templateId) {
  const res = await call('POST', `/kakao/v2/templates/${templateId}/inspection`);
  if (res.ok || res.status === 409) return res;
  return call('PUT', `/kakao/v2/templates/${templateId}/inspection`);
}

async function submit() {
  const list = await listTemplates();
  const tpl = findTemplate(list.data);
  if (!tpl) {
    console.error(`${TEMPLATE.name} 템플릿이 없습니다. 먼저 create를 실행하세요.`);
    process.exit(1);
  }
  if (tpl.status !== 'PENDING') {
    console.log(`검수요청 대상 아님: ${tpl.name} (${tpl.templateId}) status=${tpl.status}`);
    return;
  }
  console.log(`검수요청: ${tpl.name} (${tpl.templateId})`);
  const res = await requestInspection(tpl.templateId);
  console.log('status', res.status);
  console.log(JSON.stringify(res.data, null, 2));
}

async function create() {
  if (!channelId) {
    console.error(
      'create 실행 전 SOLAPI_KAKAO_CHANNEL_ID 환경변수가 필요합니다.\n' +
        '먼저 `query`로 channelId를 확인한 뒤 지정하세요.'
    );
    process.exit(1);
  }

  const existing = await listTemplates();
  const found = findTemplate(existing.data);
  if (found) {
    console.log(`기존 템플릿 사용: ${found.name} (${found.templateId}) status=${found.status}`);
    if (found.status === 'PENDING') await submit();
    else console.log(`검수요청 생략: status=${found.status}`);
    console.log(`Vercel env 승인 후 교체값: SOLAPI_KAKAO_TEMPLATE_VIRTUAL_ACCOUNT_ISSUED=${found.templateId}`);
    return;
  }

  console.log(`생성: ${TEMPLATE.name}`);
  const body = {
    channelId,
    name: TEMPLATE.name,
    content: TEMPLATE.content,
    categoryCode,
    messageType: 'BA',
    emphasizeType: 'NONE',
  };

  const res = await call('POST', '/kakao/v2/templates', body);
  console.log('생성 status', res.status);
  console.log(JSON.stringify(res.data, null, 2));

  const templateId = res.data?.templateId;
  if (!res.ok || !templateId) {
    console.error('템플릿 생성 실패 — 심사요청 건너뜀');
    process.exit(1);
  }

  console.log(`심사요청: ${templateId}`);
  const insp = await requestInspection(templateId);
  console.log('심사 status', insp.status);
  console.log(JSON.stringify(insp.data, null, 2));
  console.log(`Vercel env 승인 후 교체값: SOLAPI_KAKAO_TEMPLATE_VIRTUAL_ACCOUNT_ISSUED=${templateId}`);
}

const cmd = process.argv[2];
if (cmd === 'query') await query();
else if (cmd === 'create') await create();
else if (cmd === 'submit') await submit();
else if (cmd === 'status') await status();
else {
  console.error('명령을 지정하세요: query | create | submit | status');
  process.exit(1);
}
