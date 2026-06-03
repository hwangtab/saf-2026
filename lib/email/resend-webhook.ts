import crypto from 'crypto';

// Resend(=Svix) 웹훅 이벤트 형태. 관심 필드만 정의.
export type ResendWebhookEvent = {
  type: string;
  created_at?: string;
  data: {
    email_id?: string;
    to?: string[] | string;
    from?: string;
    subject?: string;
    bounce?: { type?: string; subType?: string; message?: string };
  };
};

// replay 방지: timestamp가 현재로부터 ±5분을 벗어나면 거부.
const TOLERANCE_SECONDS = 5 * 60;

/**
 * Svix(=Resend) 웹훅 서명을 svix 패키지 없이 수동 검증.
 * 스킴: secret = `whsec_<base64>`. prefix 제거 후 base64 디코드 → HMAC key.
 *       signedContent = `${svix-id}.${svix-timestamp}.${rawBody}`.
 *       HMAC-SHA256(key, signedContent) → base64 → svix-signature의 `v1,<sig>` 항목과 timing-safe 비교.
 *       svix-signature 헤더는 "v1,<sig> v1,<sig2>"처럼 공백 구분 다중 서명 가능.
 */
export function verifyResendWebhook(
  rawBody: string,
  headers: { svixId: string | null; svixTimestamp: string | null; svixSignature: string | null },
  secret: string | undefined
): boolean {
  const { svixId, svixTimestamp, svixSignature } = headers;
  if (!secret || !svixId || !svixTimestamp || !svixSignature) return false;

  const ts = Number(svixTimestamp);
  if (!Number.isFinite(ts)) return false;
  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - ts) > TOLERANCE_SECONDS) return false;

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64');
  const expectedBuf = Buffer.from(expected, 'base64');

  return svixSignature.split(' ').some((part) => {
    const commaIdx = part.indexOf(',');
    if (commaIdx === -1) return false;
    const version = part.slice(0, commaIdx);
    const sig = part.slice(commaIdx + 1);
    if (version !== 'v1' || !sig) return false;
    const sigBuf = Buffer.from(sig, 'base64');
    return sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);
  });
}

export function parseResendEvent(body: unknown): ResendWebhookEvent | null {
  if (typeof body !== 'object' || body === null) return null;
  const e = body as Record<string, unknown>;
  if (typeof e.type !== 'string') return null;
  if (typeof e.data !== 'object' || e.data === null) return null;
  return e as ResendWebhookEvent;
}

export function extractRecipientEmail(event: ResendWebhookEvent): string | null {
  const to = event.data.to;
  if (Array.isArray(to)) return to[0] ?? null;
  if (typeof to === 'string') return to;
  return null;
}

// 바운스를 영구 차단(suppress) 대상으로 볼지 판정.
// - 영구(permanent) 바운스 → suppress (대소문자 무시: 'Permanent'/'permanent' 모두)
// - bounce.type 누락 → 보수적으로 suppress (영구 바운스를 다른 표기로 받아 임시로 오분류 →
//   죽은 주소에 반복 발송하는 사고를 막기 위함)
// - 임시(transient) 등 명시적 비영구 → suppress 제외(정상 수신자 보호)
export function isSuppressibleBounce(event: ResendWebhookEvent): boolean {
  if (event.type !== 'email.bounced') return false;
  const type = event.data.bounce?.type?.toLowerCase();
  return !type || type === 'permanent';
}
