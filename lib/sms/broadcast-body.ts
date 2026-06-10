// 정보통신망법 §50 SMS 광고 본문 가드 + 개인화 + SMS/LMS 세그먼트 판정.
// 광고성(is_advertisement) 발송에만 prefix/무료수신거부/야간 가드 적용. 정보성(member/individual 비광고)은 비대상.
// dispatch route와 enqueue action이 모두 이 모듈을 소비 — 규칙 단일 출처.

export const AD_PREFIX = '(광고)';
export const BRAND_TAG = '[씨앗페]';
// 광고 야간 차단 창: KST 21:00(포함)~08:00(미포함). 도달 시각 기준.
export const AD_NIGHT_WINDOW = { startHour: 21, endHour: 8 };
// SMS↔LMS 경계(바이트). 90바이트 이하 SMS.
const SMS_BYTE_LIMIT = 90;

const FREE_OPT_OUT_RE = /무료\s*수신\s*거부|무료\s*거부|수신거부\s*무료/;
const AD_PREFIX_RE = /^\(광고\)/;

// 운영 080 무료수신거부 번호. 미설정 시 placeholder — dispatch route가 ad 발송을 거부(Task 15).
export function optOutNumber(): string {
  return process.env.SMS_OPT_OUT_080 ?? '080-000-0000';
}

export function personalizeSmsText(text: string, name: string | null): string {
  return text.replace(/\{\{\s*name\s*\}\}/g, name && name.trim() ? name.trim() : '회원');
}

// EUC-KR 근사: ASCII(<128) 1바이트, 그 외(한글 등) 2바이트. Solapi가 최종 판정하나 UI/검증 근사용.
export function smsByteLength(text: string): number {
  let bytes = 0;
  for (const ch of text) {
    bytes += ch.codePointAt(0)! < 128 ? 1 : 2;
  }
  return bytes;
}

export function smsSegment(text: string): 'SMS' | 'LMS' {
  return smsByteLength(text) <= SMS_BYTE_LIMIT ? 'SMS' : 'LMS';
}

// 도달 시각이 KST 21:00~08:00 야간이면 true(광고 발송 차단).
export function isNightInKst(now: Date = new Date()): boolean {
  // KST = UTC+9, DST 없음.
  const kstHour = (now.getUTCHours() + 9) % 24;
  const { startHour, endHour } = AD_NIGHT_WINDOW;
  return kstHour >= startHour || kstHour < endHour;
}

export interface AdValidation {
  ok: boolean;
  reason?: string;
}

// 광고 본문이 (광고) 정확 표기 + 브랜드명 + 무료수신거부를 모두 포함하는지 검증.
export function validateAdvertisementText(text: string): AdValidation {
  if (!AD_PREFIX_RE.test(text)) {
    return { ok: false, reason: '광고 문자는 정확히 "(광고)"로 시작해야 합니다.' };
  }
  if (!text.includes(BRAND_TAG)) {
    return { ok: false, reason: '발신 브랜드명([씨앗페])이 본문에 포함되어야 합니다.' };
  }
  if (!FREE_OPT_OUT_RE.test(text)) {
    return { ok: false, reason: '무료 수신거부 안내가 본문에 포함되어야 합니다.' };
  }
  return { ok: true };
}

// 광고 본문 자동 보정: (광고) prefix + 브랜드 + 무료수신거부 080 라인을 멱등적으로 부착.
export function buildAdvertisementText(body: string, optOut: string = optOutNumber()): string {
  let out = body.trim();
  if (!out.includes(BRAND_TAG)) out = `${BRAND_TAG} ${out}`;
  if (!AD_PREFIX_RE.test(out)) out = `${AD_PREFIX}${out}`;
  if (!FREE_OPT_OUT_RE.test(out)) out = `${out}\n무료수신거부 ${optOut}`;
  return out;
}
