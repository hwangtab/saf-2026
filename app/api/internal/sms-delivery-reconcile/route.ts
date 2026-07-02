import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseAdminClient } from '@/lib/auth/server';
import { validateInternalCronRequest } from '@/lib/security/internal-cron-auth';
import { withCronRun } from '@/lib/monitoring/cron-run';
import { fetchSolapiMessageStatuses } from '@/lib/sms/solapi';
import { hashPhone } from '@/lib/sms/phone-hash';

export const runtime = 'nodejs';
export const maxDuration = 120;

// Solapi 상태 코드 중 영구 실패(결번/서비스정지 등)로 판단해 suppression 등록할 것들.
// 참고: https://developers.solapi.com/references/messages/status-codes
// 보수적으로 적용 — 명백한 번호/단말 영구 오류만 포함. 일시적 오류(네트워크 등)는 제외.
const PERMANENT_FAILURE_CODES = new Set([
  '3020', // 결번
  '3021', // 결번
  '3022', // 결번
  '3023', // 결번
  '3024', // 결번
  '3025', // 서비스정지
  '3030', // 수신거부
  '3031', // 수신거부 단말
  '3032', // 수신거부 단말
  '3040', // 번호 변경
]);

/**
 * Solapi status + statusCode → DB 상태 매핑 (보수적).
 * - COMPLETE + '4000' → 'delivered' (수신완료 확인)
 * - COMPLETE + 그 외   → 'undelivered' (종료됐으나 미수신 — 'sent'로 영영 잔존하지 않게 종결, L9)
 * - FAILED            → 'undelivered' (명확한 실패)
 * - PENDING / SENDING / 그 외 → null (아직 최종 상태 아님, 그대로 'sent')
 */
function mapToDeliveryStatus(
  status: string,
  statusCode: string
): 'delivered' | 'undelivered' | null {
  if (status === 'COMPLETE') return statusCode === '4000' ? 'delivered' : 'undelivered';
  if (status === 'FAILED') return 'undelivered';
  // PENDING / SENDING 등 미결 상태 → null (아직 최종 아님)
  return null;
}

/**
 * 영구 실패 코드인지 여부 (suppression 등록 판단용).
 * 일시 오류(전원꺼짐·음영지역 등)를 영구 차단하지 않도록, 정규식 광역 매칭 없이
 * 명시적으로 큐레이션한 번호/단말 영구 오류 집합만 suppression 대상으로 한정한다(M2).
 */
function isPermanentFailure(statusCode: string): boolean {
  return PERMANENT_FAILURE_CODES.has(statusCode);
}

export const GET = withCronRun('sms-delivery-reconcile', cronHandler);

async function cronHandler(request: NextRequest) {
  const authError = validateInternalCronRequest(request);
  if (authError) return authError;

  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch (err) {
    console.error('[sms-delivery-reconcile] admin client init failed:', err);
    return NextResponse.json({ error: 'supabase credentials missing' }, { status: 500 });
  }

  // 1. 미결 'sent' rows 수집 (최근 3일, provider_message_id 있는 것)
  const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: recipientRows, error: recipientsErr } = await supabase
    .from('sms_broadcast_recipients')
    .select('id, provider_message_id, phone')
    .eq('status', 'sent')
    .not('provider_message_id', 'is', null)
    .gte('sent_at', since)
    .limit(500);

  if (recipientsErr) {
    console.error('[sms-delivery-reconcile] recipients query failed:', recipientsErr.message);
    return NextResponse.json({ error: 'recipients query failed' }, { status: 500 });
  }

  const { data: logRows, error: logsErr } = await supabase
    .from('sms_logs')
    .select('id, provider_message_id')
    .eq('status', 'sent')
    .not('provider_message_id', 'is', null)
    .gte('created_at', since)
    .limit(500);

  if (logsErr) {
    console.error('[sms-delivery-reconcile] logs query failed:', logsErr.message);
    return NextResponse.json({ error: 'logs query failed' }, { status: 500 });
  }

  const recipients = (recipientRows ?? []) as Array<{
    id: string;
    provider_message_id: string;
    phone: string | null;
  }>;
  const logs = (logRows ?? []) as Array<{ id: string; provider_message_id: string }>;

  // 2. 모든 provider_message_id 수집 후 Solapi 일괄 조회
  const allMessageIds = [
    ...new Set([
      ...recipients.map((r) => r.provider_message_id),
      ...logs.map((l) => l.provider_message_id),
    ]),
  ];

  const statusMap = await fetchSolapiMessageStatuses(allMessageIds);

  const checked = allMessageIds.length;
  let delivered = 0;
  let undelivered = 0;
  let suppressed = 0;

  // 3a. sms_broadcast_recipients 업데이트
  for (const row of recipients) {
    const info = statusMap[row.provider_message_id];
    if (!info) continue; // Solapi에서 아직 없음 → 무시

    const newStatus = mapToDeliveryStatus(info.status, info.statusCode);
    if (!newStatus) continue; // 아직 최종 상태 아님

    const { error } = await supabase
      .from('sms_broadcast_recipients')
      .update({
        status: newStatus,
        ...(newStatus === 'undelivered' && info.reason ? { error: info.reason } : {}),
      })
      .eq('id', row.id)
      .eq('status', 'sent'); // idempotent: 이미 다른 상태로 바뀐 경우 무시

    if (error) {
      console.error(
        `[sms-delivery-reconcile] recipient update failed for ${row.id}:`,
        error.message
      );
      continue;
    }

    if (newStatus === 'delivered') delivered++;
    if (newStatus === 'undelivered') {
      undelivered++;
      // 3b. 영구 실패 번호 → sms_suppressions 등록 (보수적: 30xx 코드만)
      if (isPermanentFailure(info.statusCode) && row.phone) {
        const phoneHash = hashPhone(row.phone);
        const { error: suppErr } = await supabase.from('sms_suppressions').upsert(
          {
            phone_hash: phoneHash,
            channel: 'all',
            reason: `bounce:${info.statusCode}`,
          },
          { onConflict: 'phone_hash' }
        );
        if (suppErr) {
          console.error(`[sms-delivery-reconcile] suppression upsert failed:`, suppErr.message);
        } else {
          suppressed++;
        }
      }
    }
  }

  // 3c. sms_logs 업데이트
  for (const row of logs) {
    const info = statusMap[row.provider_message_id];
    if (!info) continue;

    const newStatus = mapToDeliveryStatus(info.status, info.statusCode);
    if (!newStatus) continue;

    const { error } = await supabase
      .from('sms_logs')
      .update({
        status: newStatus,
        ...(newStatus === 'undelivered' && info.reason ? { error: info.reason } : {}),
      })
      .eq('id', row.id)
      .eq('status', 'sent');

    if (error) {
      console.error(`[sms-delivery-reconcile] log update failed for ${row.id}:`, error.message);
    }
    // delivered/undelivered 카운트는 recipient side에서만 집계 (logs는 단건 트랜잭션용)
  }

  return NextResponse.json({ checked, delivered, undelivered, suppressed });
}
