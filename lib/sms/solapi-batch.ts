import crypto from 'crypto';

import { sendSolapiSms, type SolapiResult } from '@/lib/sms/solapi';

export interface BatchSmsItem {
  to: string;
  text: string;
}

const CONCURRENCY = 10;

// 청크 재발송 로깅용(멱등 헤더 없음 — Solapi 미지원). row id 정렬 해시.
export function buildBatchIdempotencyKey(broadcastId: string, recipientIds: string[]): string {
  const digest = crypto
    .createHash('sha256')
    .update([...recipientIds].sort().join(','))
    .digest('hex');
  return `sms_bcast_${broadcastId}_${digest.slice(0, 40)}`;
}

// 다건 SMS를 동시성 캡으로 발송하고 입력 순서대로 per-item 결과를 반환한다.
// Solapi는 Resend의 Idempotency-Key가 없으므로 배치 자체에 중복 방지가 없다 —
// 중복 발송 차단은 호출 측(dispatch)의 lease lock + pending→sent 커밋 순서에 의존.
// 절대 throw하지 않는다(개별 실패는 ok:false 항목으로 반환).
export async function sendSolapiBatch(items: BatchSmsItem[]): Promise<SolapiResult[]> {
  const results: SolapiResult[] = new Array(items.length);
  for (let start = 0; start < items.length; start += CONCURRENCY) {
    const slice = items.slice(start, start + CONCURRENCY);
    const settled = await Promise.all(
      slice.map(async (item, i) => {
        try {
          return { idx: start + i, res: await sendSolapiSms(item) };
        } catch (err) {
          return {
            idx: start + i,
            res: { ok: false, error: String(err) } as SolapiResult,
          };
        }
      })
    );
    for (const { idx, res } of settled) results[idx] = res;
  }
  return results;
}
