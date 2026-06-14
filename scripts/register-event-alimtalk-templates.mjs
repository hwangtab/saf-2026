#!/usr/bin/env node
/**
 * 오윤 40주기 추도식 알림톡 템플릿 3종 등록·심사 신청 (일회성 ops 스크립트).
 *
 * 기존 lib/sms/solapi.ts 와 동일한 HMAC-SHA256 인증을 재사용한다.
 * TS 러너(tsx/ts-node)가 없어 .mjs 로 작성하며, `node --env-file=.env.local` 로 실행한다.
 *
 * 사용법:
 *   node --env-file=.env.local scripts/register-event-alimtalk-templates.mjs query   # 채널/카테고리 조회 (읽기전용)
 *   node --env-file=.env.local scripts/register-event-alimtalk-templates.mjs create   # 템플릿 3종 생성 + 심사요청
 *   node --env-file=.env.local scripts/register-event-alimtalk-templates.mjs status   # 등록된 템플릿 목록 조회
 *
 * 환경변수: SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_KAKAO_PF_ID
 */
import crypto from 'crypto';

const API = 'https://api.solapi.com';
const apiKey = process.env.SOLAPI_API_KEY;
const apiSecret = process.env.SOLAPI_API_SECRET;
const pfId = process.env.SOLAPI_KAKAO_PF_ID;

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

// ── 템플릿 본문 3종 (사용자 확정) ───────────────────────────────────────────
const TEMPLATES = [
  {
    key: 'event_payment_confirmed',
    name: '추도식_신청확인',
    content: [
      '[씨앗페] 오윤 40주기 추도식 신청이 완료되었습니다.',
      '',
      '▶ 신청자: #{name}님',
      '▶ 인원: #{partySize}명',
      '▶ 회비: #{amount}원 (결제완료)',
      '',
      '▶ 일시: 7월 5일(일) 09:30 출발',
      '▶ 집결: 인사동 수운회관 옆',
      '▶ 일정: 11시 추도식 / 12시 종료 / 13시 30분 점심(인사동 풍류사랑)',
      '',
      '당일 안내사항은 추후 다시 연락드립니다.',
    ].join('\n'),
    buttons: [],
  },
  {
    key: 'event_waitlist',
    name: '추도식_대기등록',
    content: [
      '[씨앗페] 오윤 40주기 추도식 대기 신청이 접수되었습니다.',
      '',
      '#{name}님, 현재 버스 정원이 마감되어 대기자로 등록되었습니다.',
      '',
      '취소 등으로 자리가 나면 신청 순서대로 결제 안내를 보내드립니다.',
      '신청해 주셔서 감사합니다.',
    ].join('\n'),
    buttons: [],
  },
  {
    key: 'event_waitlist_payment',
    name: '추도식_대기자결제안내',
    content: [
      '[씨앗페] 오윤 40주기 추도식 좌석이 준비되었습니다.',
      '',
      '#{name}님, 대기 신청하신 추도식에 자리가 생겼습니다.',
      '',
      '▶ 인원: #{partySize}명',
      '▶ 회비: #{amount}원',
      '',
      '아래 [결제하기] 버튼에서 #{deadline}까지 결제하시면 참가가 확정됩니다.',
      '기한이 지나면 다음 대기자에게 안내됩니다.',
    ].join('\n'),
    buttons: [
      {
        buttonType: 'WL',
        buttonName: '결제하기',
        linkMo: 'https://www.saf2026.com/event/oh-yoon-memorial',
        linkPc: 'https://www.saf2026.com/event/oh-yoon-memorial',
      },
    ],
  },
];

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
  console.log('=== 등록 템플릿 목록 (GET /kakao/v2/templates) ===');
  const t = await call('GET', '/kakao/v2/templates?limit=50');
  console.log('status', t.status);
  console.log(JSON.stringify(t.data, null, 2));
}

/** 추도식_ 으로 시작하는 PENDING 템플릿을 검수요청한다 (PUT /kakao/v2/templates/{id}/inspection). */
async function submit() {
  const list = await call('GET', '/kakao/v2/templates?limit=50');
  const templates = (list.data?.templateList ?? []).filter(
    (t) => t.name?.startsWith('추도식_') && t.status === 'PENDING'
  );
  if (!templates.length) {
    console.log('검수요청 대상(추도식_ PENDING) 없음');
    return;
  }
  for (const tpl of templates) {
    console.log(`\n── 검수요청: ${tpl.name} (${tpl.templateId}) ──`);
    const res = await call('PUT', `/kakao/v2/templates/${tpl.templateId}/inspection`);
    console.log('status', res.status);
    console.log(JSON.stringify(res.data, null, 2));
  }
}

async function create() {
  const channelId = process.env.SOLAPI_KAKAO_CHANNEL_ID;
  const categoryCode = process.env.SOLAPI_KAKAO_CATEGORY_CODE;
  if (!channelId || !categoryCode) {
    console.error(
      'create 실행 전 SOLAPI_KAKAO_CHANNEL_ID, SOLAPI_KAKAO_CATEGORY_CODE 환경변수가 필요합니다.\n' +
        '먼저 `query` 로 channelId 와 categoryCode 를 확인한 뒤 inline 으로 지정하세요.'
    );
    process.exit(1);
  }

  for (const tpl of TEMPLATES) {
    console.log(`\n── 생성: ${tpl.name} (${tpl.key}) ──`);
    const body = {
      channelId,
      name: tpl.name,
      content: tpl.content,
      categoryCode,
      messageType: 'BA', // 기본형
      emphasizeType: 'NONE',
    };
    if (tpl.buttons.length) body.buttons = tpl.buttons;

    const res = await call('POST', '/kakao/v2/templates', body);
    console.log('생성 status', res.status);
    console.log(JSON.stringify(res.data, null, 2));

    const templateId = res.data?.templateId;
    if (res.ok && templateId) {
      console.log(`심사요청: ${templateId}`);
      const insp = await call('POST', `/kakao/v2/templates/${templateId}/inspection`);
      console.log('심사 status', insp.status);
      console.log(JSON.stringify(insp.data, null, 2));
    } else {
      console.error(`!! ${tpl.name} 생성 실패 — 심사요청 건너뜀`);
    }
  }
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
