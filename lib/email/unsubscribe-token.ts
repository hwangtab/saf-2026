import crypto from 'crypto';

import type { BroadcastChannel } from './audiences/types';

// HMAC-SHA256 기반 무상태 수신거부 토큰.
// 형식: base64url(emailHash|channel).HMAC_SHA256_hex(secret, payload)
// 로그인 불필요, 타임아웃 없음 (법적 무료·간편 수신거부 요건 충족).
export function generateUnsubscribeToken(
  emailHash: string,
  channel: BroadcastChannel
): string | null {
  const secret = process.env.EMAIL_UNSUB_SECRET;
  if (!secret) return null;

  const payload = Buffer.from(`${emailHash}|${channel}`).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyUnsubscribeToken(
  token: string
): { emailHash: string; channel: BroadcastChannel } | null {
  const secret = process.env.EMAIL_UNSUB_SECRET;
  if (!secret) return null;

  const dotIndex = token.lastIndexOf('.');
  if (dotIndex === -1) return null;

  const payload = token.slice(0, dotIndex);
  const sig = token.slice(dotIndex + 1);

  const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const expectedBuf = Buffer.from(expectedSig);
  const actualBuf = Buffer.from(sig);

  if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
    return null;
  }

  try {
    const decoded = Buffer.from(payload, 'base64url').toString('utf-8');
    const pipeIndex = decoded.lastIndexOf('|');
    if (pipeIndex === -1) return null;

    const emailHash = decoded.slice(0, pipeIndex);
    const raw = decoded.slice(pipeIndex + 1);
    if (!(['customer', 'member', 'petition'] as const).includes(raw as BroadcastChannel)) {
      return null;
    }
    const channel = raw as BroadcastChannel;

    return { emailHash, channel };
  } catch {
    return null;
  }
}
