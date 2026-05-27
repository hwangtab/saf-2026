// Resend batch 발송 API wrapper.
// POST /emails/batch (최대 100건/요청).
// lib/notify.ts의 resendFetch는 private·단건용이라 batch는 별도 구현.

export interface BatchEmailItem {
  from: string;
  to: string;
  subject: string;
  html: string;
}

export interface BatchSendResult {
  ids: string[];
  error?: string;
}

// 최대 100건의 이메일을 Resend batch API로 발송.
// 429/5xx는 1회 재시도 (2초 대기).
// 항상 반환 — 절대 throw하지 않는다.
export async function sendBatch(items: BatchEmailItem[]): Promise<BatchSendResult> {
  if (items.length === 0) return { ids: [] };
  if (items.length > 100) {
    console.error('[resend-batch] items.length > 100, truncating to 100');
    items = items.slice(0, 100);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ids: [], error: 'RESEND_API_KEY not set' };

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    try {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(items),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const body = (await res.json()) as { data?: Array<{ id: string }> };
        const ids = (body.data ?? []).map((d) => d.id).filter(Boolean);
        return { ids };
      }

      const text = await res.text();

      if (attempt === 0 && (res.status === 429 || res.status >= 500)) {
        console.error(
          `[resend-batch] ${res.status} on attempt 0, retry in 2s: ${text.slice(0, 200)}`
        );
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      return { ids: [], error: `Resend ${res.status}: ${text.slice(0, 300)}` };
    } catch (err) {
      clearTimeout(timeout);

      if (attempt === 0) {
        console.error('[resend-batch] network error on attempt 0, retry in 2s:', err);
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      return { ids: [], error: String(err) };
    }
  }

  return { ids: [], error: 'exhausted retries' };
}
