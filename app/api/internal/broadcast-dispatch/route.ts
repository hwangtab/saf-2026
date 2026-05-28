import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { render } from '@react-email/render';
import type { Database } from '@/types/supabase';
import * as React from 'react';

import { validateInternalCronRequest } from '@/lib/security/internal-cron-auth';
import { sendBatch } from '@/lib/email/resend-batch';
import { generateUnsubscribeToken } from '@/lib/email/unsubscribe-token';
import { hashEmail } from '@/lib/email/email-hash';
import BroadcastEmail from '@/emails/broadcast';

export const runtime = 'nodejs';
export const maxDuration = 300;

const CHUNK_SIZE = 100;
const THROTTLE_MS = 500;
const LEASE_SECONDS = 120; // 청크당 시간(~5s)보다 충분히 커서 발송 중 만료 없음; run 사망 시 2분 후 resume
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.saf2026.com';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@saf2026.com';

export async function GET(request: NextRequest) {
  const authError = validateInternalCronRequest(request);
  if (authError) return authError;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !adminKey) {
    return NextResponse.json({ error: 'supabase credentials missing' }, { status: 500 });
  }

  const supabase = createClient<Database>(supabaseUrl, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${adminKey}` } },
  });

  const { data: broadcasts } = await supabase
    .from('email_broadcasts')
    .select('id, channel, subject, body_md, cta_label, cta_url, status')
    .in('status', ['queued', 'sending'])
    .order('queued_at', { ascending: true })
    .limit(5);

  if (!broadcasts || broadcasts.length === 0) {
    return NextResponse.json({ dispatched: 0 });
  }

  let totalDispatched = 0;

  for (const broadcast of broadcasts) {
    // 리스 락 획득. 다른 동시 run(매분 cron, maxDuration 초과 발송)이 락을 쥐고 있으면
    // token이 null → 이 브로드캐스트는 건너뛴다(중복 발송 차단).
    const { data: lockToken, error: claimError } = await supabase.rpc('claim_broadcast_dispatch', {
      p_broadcast_id: broadcast.id,
      p_lease_seconds: LEASE_SECONDS,
    });
    if (claimError) {
      console.error(
        `[broadcast-dispatch] claim RPC error for ${broadcast.id}:`,
        claimError.message
      );
      continue;
    }
    if (!lockToken) continue;

    let hasMore = true;

    while (hasMore) {
      // 청크마다 리스 갱신. 실패(token 불일치)면 락을 빼앗긴 것 → 즉시 중단(중복 방지).
      const { data: renewed, error: renewError } = await supabase.rpc('renew_broadcast_dispatch', {
        p_broadcast_id: broadcast.id,
        p_token: lockToken,
        p_lease_seconds: LEASE_SECONDS,
      });
      if (renewError) {
        console.error(
          `[broadcast-dispatch] renew RPC error for ${broadcast.id}:`,
          renewError.message
        );
        break;
      }
      if (!renewed) break;

      // 처리된 행은 sent/failed로 빠지므로 항상 pending 선두 청크만 가져온다
      // (offset 누적 금지 — pending 변형 중 offset 증가는 행 누락 버그).
      const { data: pending } = await supabase
        .from('email_broadcast_recipients')
        .select('id, email, name, locale')
        .eq('broadcast_id', broadcast.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(CHUNK_SIZE);

      if (!pending || pending.length === 0) {
        hasMore = false;
        break;
      }

      const bodyParagraphs = (broadcast.body_md as string)
        .split(/\n\n+/)
        .map((p: string) => p.trim())
        .filter(Boolean);

      const batchItems = await Promise.all(
        (
          pending as Array<{
            id: string;
            email: string;
            name: string | null;
            locale: string;
          }>
        ).map(async (r) => {
          const emailHash = hashEmail(r.email);
          const unsubToken = generateUnsubscribeToken(
            emailHash,
            broadcast.channel as 'customer' | 'member' | 'petition'
          );
          const unsubscribeUrl = unsubToken
            ? `${SITE_URL}/api/email/unsubscribe?t=${unsubToken}`
            : `${SITE_URL}/api/email/unsubscribe?invalid=1`;

          const emailEl = React.createElement(BroadcastEmail, {
            channel: broadcast.channel as 'customer' | 'member' | 'petition',
            recipientName: r.name,
            subject: broadcast.subject as string,
            bodyParagraphs,
            ctaLabel: broadcast.cta_label as string | null,
            ctaUrl: broadcast.cta_url as string | null,
            unsubscribeUrl,
            locale: r.locale === 'en' ? 'en' : 'ko',
          });

          const html = await render(emailEl);
          const isAd = broadcast.channel === 'customer';
          const subject = isAd
            ? `(광고) ${broadcast.subject as string}`
            : (broadcast.subject as string);

          return { from: FROM_EMAIL, to: r.email, subject, html };
        })
      );

      const result = await sendBatch(batchItems);

      const pendingRows = pending as Array<{ id: string }>;

      // result.ids[i] = batchItems[i] = pendingRows[i]의 Resend 메시지 ID (요청 순서 보존).
      // 웹훅(app/api/webhooks/resend)이 resend_id로 바운스/컴플레인을 매칭하므로 수신자별로 저장.
      const sentAt = new Date().toISOString();
      const sentUpdates = result.ids.map((resendId, i) => ({
        id: pendingRows[i].id,
        resendId,
      }));
      const failedIds = pendingRows.slice(result.ids.length).map((r) => r.id);

      await Promise.all(
        sentUpdates.map(({ id, resendId }) =>
          supabase
            .from('email_broadcast_recipients')
            .update({ status: 'sent', sent_at: sentAt, resend_id: resendId })
            .eq('id', id)
        )
      );

      if (failedIds.length > 0) {
        await supabase
          .from('email_broadcast_recipients')
          .update({ status: 'failed', error: result.error ?? 'batch partial failure' })
          .in('id', failedIds);
      }

      totalDispatched += sentUpdates.length;

      if (pending.length < CHUNK_SIZE) {
        hasMore = false;
      } else {
        await new Promise((r) => setTimeout(r, THROTTLE_MS));
      }
    }

    // 전량 처리 후 카운터 집계 및 broadcast status 갱신
    const { data: remainingPending } = await supabase
      .from('email_broadcast_recipients')
      .select('id')
      .eq('broadcast_id', broadcast.id)
      .eq('status', 'pending')
      .limit(1);

    if (!remainingPending || remainingPending.length === 0) {
      const { count: sentCount } = await supabase
        .from('email_broadcast_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('broadcast_id', broadcast.id)
        .eq('status', 'sent');

      const { count: failedCount } = await supabase
        .from('email_broadcast_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('broadcast_id', broadcast.id)
        .eq('status', 'failed');

      await supabase
        .from('email_broadcasts')
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
