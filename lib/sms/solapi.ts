import crypto from 'crypto';

const SOLAPI_ENDPOINT = 'https://api.solapi.com/messages/v4/send';

export interface SolapiResult {
  ok: boolean;
  messageId?: string;
  segment?: 'SMS' | 'LMS' | 'MMS';
  error?: string;
}

/**
 * Solapi 단건 SMS 발송. resendFetch와 동일 철학:
 * env 미설정 시 no-op, never throw, 5초 타임아웃, 429/5xx 1회 재시도.
 * SMS/LMS 구분은 Solapi가 본문 byte 길이로 자동 판별.
 */
export async function sendSolapiSms(opts: { to: string; text: string }): Promise<SolapiResult> {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const from = process.env.SOLAPI_SENDER;
  if (!apiKey || !apiSecret || !from) return { ok: false, error: 'not-configured' };

  const body = JSON.stringify({ message: { to: opts.to, from, text: opts.text } });

  for (let attempt = 0; attempt < 2; attempt++) {
    const date = new Date().toISOString();
    const salt = crypto.randomBytes(32).toString('hex');
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(date + salt)
      .digest('hex');
    const authorization = `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(SOLAPI_ENDPOINT, {
        method: 'POST',
        headers: { Authorization: authorization, 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const raw = await res.text();
      if (res.ok) {
        let parsed: { statusCode?: string; messageId?: string; type?: string } = {};
        try {
          parsed = JSON.parse(raw);
        } catch {
          /* 비-JSON 응답이라도 200이면 성공 취급 */
        }
        // 단건 응답 statusCode '2000' = 정상 접수. 미존재 시 200만으로 성공 취급.
        if (parsed.statusCode && parsed.statusCode !== '2000') {
          console.error(`[solapi] non-2000 statusCode: ${raw.slice(0, 300)}`);
          return { ok: false, error: parsed.statusCode };
        }
        return {
          ok: true,
          messageId: parsed.messageId,
          segment: parsed.type as SolapiResult['segment'],
        };
      }

      if (attempt === 0 && (res.status === 429 || res.status >= 500)) {
        console.error(`[solapi] ${res.status}, retrying in 1s: ${raw.slice(0, 200)}`);
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      console.error(`[solapi] returned ${res.status}: ${raw.slice(0, 500)}`);
      return { ok: false, error: `http_${res.status}` };
    } catch (err) {
      clearTimeout(timeout);
      if (attempt === 0) {
        console.error('[solapi] failed, retrying in 1s:', err);
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      console.error('[solapi] send failed after retry:', err);
      return { ok: false, error: 'network' };
    }
  }
  return { ok: false, error: 'unknown' };
}
