import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseAdminClient } from '@/lib/auth/server';
import { validateInternalCronRequest } from '@/lib/security/internal-cron-auth';
import { sendSolapiBatch, buildBatchIdempotencyKey } from '@/lib/sms/solapi-batch';
import { isNightInKst, personalizeSmsText } from '@/lib/sms/broadcast-body';

export const runtime = 'nodejs';
export const maxDuration = 300;

const CHUNK_SIZE = 100;
const THROTTLE_MS = 500;
const LEASE_SECONDS = 120; // 청크당 시간보다 충분히 커서 발송 중 만료 없음; run 사망 시 2분 후 resume

export async function GET(request: NextRequest) {
  const authError = validateInternalCronRequest(request);
  if (authError) return authError;

  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch (err) {
    console.error('[sms-broadcast-dispatch] admin client init failed:', err);
    return NextResponse.json({ error: 'supabase credentials missing' }, { status: 500 });
  }

  // recipient_count > 0 가드: recipients INSERT 전 crash한 orphan broadcast를 자동 제외.
  const { data: broadcasts } = await supabase
    .from('sms_broadcasts')
    .select('id, channel, body_text, status, is_advertisement')
    .in('status', ['queued', 'sending'])
    .gt('recipient_count', 0)
    .order('queued_at', { ascending: true })
    .limit(5);

  if (!broadcasts || broadcasts.length === 0) {
    return NextResponse.json({ dispatched: 0 });
  }

  let totalDispatched = 0;

  for (const broadcast of broadcasts) {
    // 리스 락 획득. 다른 동시 run이 유효 락을 쥐고 있으면 token=null → 건너뜀(중복 발송 차단).
    const { data: lockToken, error: claimError } = await supabase.rpc(
      'claim_sms_broadcast_dispatch',
      { p_broadcast_id: broadcast.id, p_lease_seconds: LEASE_SECONDS }
    );
    if (claimError) {
      console.error(
        `[sms-broadcast-dispatch] claim RPC error for ${broadcast.id}:`,
        claimError.message
      );
      continue;
    }
    if (!lockToken) continue;

    // 광고 안전 가드: SMS_OPT_OUT_080 미설정 시 무료수신거부 번호가 placeholder라
    // 정통망법 위반 발송이 된다. 광고 broadcast는 락 보유 상태에서 failed로 마킹하고 중단.
    const isAd = (broadcast.is_advertisement ?? false) as boolean;
    if (isAd && !process.env.SMS_OPT_OUT_080) {
      console.error(
        `[sms-broadcast-dispatch] SMS_OPT_OUT_080 missing — refusing ad ${broadcast.id}`
      );
      const { error: failMarkError } = await supabase
        .from('sms_broadcasts')
        .update({ status: 'failed', dispatch_locked_until: null, dispatch_lock_token: null })
        .eq('id', broadcast.id)
        .eq('dispatch_lock_token', lockToken);
      if (failMarkError) {
        console.error(
          `[sms-broadcast-dispatch] failed to mark ${broadcast.id} failed:`,
          failMarkError.message
        );
      }
      continue;
    }

    let hasMore = true;

    while (hasMore) {
      // 청크마다 리스 갱신. 빼앗겼으면(token 불일치) 즉시 중단(중복 방지).
      const { data: renewed, error: renewError } = await supabase.rpc(
        'renew_sms_broadcast_dispatch',
        { p_broadcast_id: broadcast.id, p_token: lockToken, p_lease_seconds: LEASE_SECONDS }
      );
      if (renewError) {
        console.error(
          `[sms-broadcast-dispatch] renew RPC error for ${broadcast.id}:`,
          renewError.message
        );
        break;
      }
      if (!renewed) break;

      // 관리자 취소 감지: 매 청크 시작 시 DB에서 status를 재조회한다.
      // cancelBroadcast 액션이 lock token 없이 'cancelled'로 설정할 수 있으므로
      // lock 보유 여부와 무관하게 여기서 확인한다.
      {
        const { data: currentStatus } = await supabase
          .from('sms_broadcasts')
          .select('status')
          .eq('id', broadcast.id)
          .single();
        if (currentStatus?.status === 'cancelled') {
          console.warn(
            `[sms-broadcast-dispatch] broadcast ${broadcast.id} was cancelled mid-run — stopping dispatch`
          );
          // 락 해제 (lock token 보유 시에만 반영되므로 다른 run과 충돌 없음)
          await supabase
            .from('sms_broadcasts')
            .update({ dispatch_locked_until: null, dispatch_lock_token: null })
            .eq('id', broadcast.id)
            .eq('dispatch_lock_token', lockToken);
          break;
        }
      }

      // 정통망법 §50 야간 도달시각 가드: 광고 브로드캐스트는 매 청크 발송 전 KST 시각을 재확인.
      // enqueue 차단만으로는 대량 발송이 21:00을 넘겨 도달하는 위반 소지가 있음.
      // 야간 진입 시 status를 queued로 되돌리고 락 해제 → 08:00 이후 cron이 재개.
      if (isAd && isNightInKst()) {
        console.warn(
          `[sms-broadcast-dispatch] ad broadcast ${broadcast.id} paused at night window — reverting to queued`
        );
        await supabase
          .from('sms_broadcasts')
          .update({ status: 'queued', dispatch_locked_until: null, dispatch_lock_token: null })
          .eq('id', broadcast.id)
          .eq('dispatch_lock_token', lockToken);
        break;
      }

      // 처리된 행은 sent/failed로 빠지므로 항상 pending 선두 청크만 가져온다(offset 누적 금지).
      const { data: pending } = await supabase
        .from('sms_broadcast_recipients')
        .select('id, phone, name')
        .eq('broadcast_id', broadcast.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true }) // 동순위 시 청크 경계 결정론화
        .limit(CHUNK_SIZE);

      if (!pending || pending.length === 0) {
        hasMore = false;
        break;
      }

      const pendingRows = pending as Array<{ id: string; phone: string; name: string | null }>;

      const batchItems = pendingRows.map((r) => ({
        to: r.phone,
        text: personalizeSmsText(broadcast.body_text as string, r.name),
      }));

      // Solapi엔 Idempotency-Key 없음 — 키는 로깅용. 중복 방지는 lease lock + 아래 pending→sent
      // 커밋을 다음 청크 재조회 전에 끝내는 순서로 보장(이미 sent면 다음 run이 선택하지 않음).
      void buildBatchIdempotencyKey(
        broadcast.id as string,
        pendingRows.map((r) => r.id)
      );
      const results = await sendSolapiBatch(batchItems);

      const sentAt = new Date().toISOString();

      // results[i] = batchItems[i] = pendingRows[i] (입력 순서 보존). 성공/실패 분리.
      const updateResults = await Promise.all(
        pendingRows.map(async (row, i) => {
          const res = results[i];
          if (res?.ok) {
            const { error } = await supabase
              .from('sms_broadcast_recipients')
              .update({
                status: 'sent',
                sent_at: sentAt,
                provider_message_id: res.messageId ?? null,
                segment: res.segment ?? null,
              })
              .eq('id', row.id);
            return { id: row.id, sent: true, error };
          }
          const { error } = await supabase
            .from('sms_broadcast_recipients')
            .update({ status: 'failed', error: res?.error ?? 'send failed' })
            .eq('id', row.id);
          return { id: row.id, sent: false, error };
        })
      );

      // status update 자체가 실패한 sent row: Solapi는 이미 발송했으므로 'sent' 재시도.
      // (supabase-js는 RLS/네트워크 에러 시 reject 않고 {error}로 resolve — 무시하면 pending 잔존→재발송.)
      const sentUpdateFailedIds = updateResults
        .filter((r) => r.sent && r.error)
        .map((r) => {
          console.error(
            `[sms-broadcast-dispatch] sent-update failed for ${r.id}:`,
            r.error?.message
          );
          return r.id;
        });
      if (sentUpdateFailedIds.length > 0) {
        const retry = await Promise.all(
          sentUpdateFailedIds.map(async (id) => {
            const { error } = await supabase
              .from('sms_broadcast_recipients')
              .update({ status: 'sent', sent_at: sentAt })
              .eq('id', id);
            return { id, error };
          })
        );
        const stillFailed = retry.filter((r) => r.error).map((r) => r.id);
        if (stillFailed.length > 0) {
          console.error(
            `[sms-broadcast-dispatch] sent-update permanently failed for ${stillFailed.length} rows ` +
              `(already sent via Solapi; marking 'failed' to break re-dispatch loop):`,
            stillFailed
          );
          await supabase
            .from('sms_broadcast_recipients')
            .update({ status: 'failed', error: 'sent via Solapi but status update failed' })
            .in('id', stillFailed);
        }
      }

      // 청크마다 진행 카운트 재집계(running 합산 아님 — 락 인계·재개에도 정확). 락 보유 시에만.
      const { count: sentSoFar } = await supabase
        .from('sms_broadcast_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('broadcast_id', broadcast.id)
        .eq('status', 'sent');
      const { count: failedSoFar } = await supabase
        .from('sms_broadcast_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('broadcast_id', broadcast.id)
        .eq('status', 'failed');
      await supabase
        .from('sms_broadcasts')
        .update({ status: 'sending', sent_count: sentSoFar ?? 0, failed_count: failedSoFar ?? 0 })
        .eq('id', broadcast.id)
        .eq('dispatch_lock_token', lockToken);

      totalDispatched += pendingRows.length;

      if (pending.length < CHUNK_SIZE) {
        hasMore = false;
      } else {
        await new Promise((r) => setTimeout(r, THROTTLE_MS));
      }
    }

    // 전량 처리 후 finalize. select 에러를 무시하면 false finalize → orphan pending.
    const { data: remainingPending, error: remainingError } = await supabase
      .from('sms_broadcast_recipients')
      .select('id')
      .eq('broadcast_id', broadcast.id)
      .eq('status', 'pending')
      .limit(1);

    if (remainingError) {
      console.error(
        `[sms-broadcast-dispatch] remainingPending query failed for ${broadcast.id}:`,
        remainingError.message
      );
      continue; // 락 만료(120s) 후 다음 cron이 재시도
    }

    if (remainingPending.length === 0) {
      const { count: sentCount } = await supabase
        .from('sms_broadcast_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('broadcast_id', broadcast.id)
        .eq('status', 'sent');
      const { count: failedCount } = await supabase
        .from('sms_broadcast_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('broadcast_id', broadcast.id)
        .eq('status', 'failed');

      await supabase
        .from('sms_broadcasts')
        .update({
          status: 'sent',
          sent_count: sentCount ?? 0,
          failed_count: failedCount ?? 0,
          sent_at: new Date().toISOString(),
          dispatch_locked_until: null,
          dispatch_lock_token: null,
        })
        .eq('id', broadcast.id)
        .eq('dispatch_lock_token', lockToken); // 여전히 락 보유 중일 때만 finalize
    }
  }

  return NextResponse.json({ dispatched: totalDispatched });
}
