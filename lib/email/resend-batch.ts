// Resend batch 발송 API wrapper.
// POST /emails/batch (최대 100건/요청).
// lib/notify.ts의 resendFetch는 private·단건용이라 batch는 별도 구현.

import crypto from 'crypto';

export interface BatchEmailItem {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  reply_to?: string;
  // 선택: List-Unsubscribe 등 메일 헤더(원클릭 수신거부). Resend가 그대로 전달.
  headers?: Record<string, string>;
}

export interface BatchSendResult {
  ids: string[];
  error?: string;
}

export interface SendBatchOptions {
  // Resend Idempotency-Key 헤더. 같은 키로 재요청 시 Resend가 24h 내 중복 발송을 차단(캐시된 응답 반환).
  // dispatch 크래시/타임아웃/상태업데이트 실패로 같은 청크가 재발송돼도 수신자가 중복 수신하지 않게 한다.
  idempotencyKey?: string;
}

// 청크 재발송 시 동일 키로 매칭되도록, 수신자 row id를 "정렬해" 해시한다(조회 순서 변동에도 안정적).
// row id는 고유 UUID라 서로 다른 배치는 키가 충돌하지 않음 → 정당한 발송을 드롭하지 않는다.
export function buildBatchIdempotencyKey(broadcastId: string, recipientIds: string[]): string {
  const digest = crypto
    .createHash('sha256')
    .update([...recipientIds].sort().join(','))
    .digest('hex');
  return `bcast_${broadcastId}_${digest.slice(0, 40)}`;
}

// 최대 100건의 이메일을 Resend batch API로 발송.
// 429/5xx는 1회 재시도 (2초 대기).
// 항상 반환 — 절대 throw하지 않는다.
export async function sendBatch(
  items: BatchEmailItem[],
  options: SendBatchOptions = {}
): Promise<BatchSendResult> {
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
          ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
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
