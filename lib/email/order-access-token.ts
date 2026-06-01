import crypto from 'crypto';

// HMAC-SHA256 기반 무상태 주문 조회 토큰.
// 형식: base64url("ord|"+orderNo).HMAC_SHA256_hex(secret, payload)
//
// 이메일 본문 링크 전용. 토큰 소유(= 그 결제/배송 이메일을 받은 사람) 자체가 인증이므로
// 로그인·재입력 없이 주문 상세로 직행한다(수신거부 토큰과 동일한 신뢰 모델). 만료 없음 —
// 주문은 배송·AS 등으로 오래 추적해야 하고, 서명으로 위조가 차단되므로 안전하다.
//
// secret은 이메일 토큰 카테고리를 공유(EMAIL_UNSUB_SECRET). payload의 'ord|' 접두사가
// 수신거부 토큰('emailHash|channel')과 형식을 분리해 상호 오용을 막는다.
const TOKEN_PREFIX = 'ord|';

export function signOrderAccessToken(orderNo: string): string | null {
  const secret = process.env.EMAIL_UNSUB_SECRET;
  if (!secret || !orderNo) return null;

  const payload = Buffer.from(`${TOKEN_PREFIX}${orderNo}`).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyOrderAccessToken(token: string): string | null {
  const secret = process.env.EMAIL_UNSUB_SECRET;
  if (!secret || !token) return null;

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
    if (!decoded.startsWith(TOKEN_PREFIX)) return null;
    const orderNo = decoded.slice(TOKEN_PREFIX.length);
    return orderNo || null;
  } catch {
    return null;
  }
}
