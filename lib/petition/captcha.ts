/**
 * hCaptcha 토큰 서버 검증 (siteverify).
 *
 * HCAPTCHA_SECRET 미설정 시 graceful skip — 로컬·스테이징에서 봇 차단 없이도
 * 폼이 동작하도록 한다. 운영 환경에서는 반드시 설정.
 */

interface VerifyResult {
  ok: boolean;
  skipped?: boolean;
  errorCodes?: string[];
}

export async function verifyHCaptcha(
  token: string | null | undefined,
  remoteIp?: string | null
): Promise<VerifyResult> {
  const secret = process.env.HCAPTCHA_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[petition/captcha] HCAPTCHA_SECRET 미설정 (production)');
      return { ok: false, errorCodes: ['secret-not-configured'] };
    }
    console.warn('[petition/captcha] HCAPTCHA_SECRET 미설정 — 검증 skip (개발 모드)');
    return { ok: true, skipped: true };
  }

  if (!token || token.length < 10) {
    return { ok: false, errorCodes: ['missing-input-response'] };
  }

  const params = new URLSearchParams();
  params.set('secret', secret);
  params.set('response', token);
  if (remoteIp) params.set('remoteip', remoteIp);

  try {
    const res = await fetch('https://api.hcaptcha.com/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = (await res.json()) as {
      success: boolean;
      'error-codes'?: string[];
    };
    return data.success
      ? { ok: true }
      : { ok: false, errorCodes: data['error-codes'] ?? ['unknown'] };
  } catch (err) {
    console.error('[petition/captcha] verify error:', err);
    return { ok: false, errorCodes: ['network-error'] };
  }
}
