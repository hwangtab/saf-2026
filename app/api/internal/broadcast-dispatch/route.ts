import { NextRequest, NextResponse } from 'next/server';
import { render } from '@react-email/render';
import * as React from 'react';

import { createSupabaseAdminClient } from '@/lib/auth/server';
import { validateInternalCronRequest } from '@/lib/security/internal-cron-auth';
import { withCronRun } from '@/lib/monitoring/cron-run';
import { sendBatch, buildBatchIdempotencyKey } from '@/lib/email/resend-batch';
import { buildReplyFromAddress, buildReplyToAddress } from '@/lib/email/inbound';
import { generateUnsubscribeToken } from '@/lib/email/unsubscribe-token';
import { hashEmail } from '@/lib/email/email-hash';
import BroadcastEmail from '@/emails/broadcast';
import NewsletterEmail from '@/emails/newsletter';
import { parseNewsletterBlocks, type NewsletterBlock } from '@/lib/newsletter/blocks';
import { enqueueNewsletterBroadcasts, type NewsletterSendRow } from '@/lib/newsletter/enqueue';
import { personalizeRichEmailHtml, personalizeRichEmailText } from '@/lib/email/rich-content';
import { validateResendRecipientEmail } from '@/lib/email/resend-recipient';

export const runtime = 'nodejs';
export const maxDuration = 300;

const CHUNK_SIZE = 100;
const THROTTLE_MS = 500;
const LEASE_SECONDS = 120; // 청크당 시간(~5s)보다 충분히 커서 발송 중 만료 없음; run 사망 시 2분 후 resume
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.saf2026.com';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? buildReplyFromAddress();

export const GET = withCronRun('broadcast-dispatch', cronHandler);

async function cronHandler(request: NextRequest) {
  const authError = validateInternalCronRequest(request);
  if (authError) return authError;

  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch (err) {
    console.error('[broadcast-dispatch] admin client init failed:', err);
    return NextResponse.json({ error: 'supabase credentials missing' }, { status: 500 });
  }

  // 예약 뉴스레터 도래분 발송 등록. status 가드 UPDATE(scheduled → sending)가 원자적 claim이라
  // 매분 중복 실행·동시 run에도 1회만 성공한다. 등록 실패 시 draft로 복원해 무한 재시도 대신
  // 관리자가 확인하게 한다 (스케줄은 해제됨 — 로그로 관찰).
  const { data: dueNewsletters } = await supabase
    .from('newsletters')
    .select('id')
    .eq('status', 'scheduled')
    .lte('scheduled_at', new Date().toISOString())
    .limit(3);

  for (const due of dueNewsletters ?? []) {
    const { data: claimed } = await supabase
      .from('newsletters')
      .update({ status: 'sending' })
      .eq('id', due.id)
      .eq('status', 'scheduled')
      .select(
        'id, issue_no, slug, title, preheader, blocks, is_advertisement, audience_channels, created_by'
      )
      .maybeSingle();
    if (!claimed) continue;

    const result = await enqueueNewsletterBroadcasts(supabase, claimed as NewsletterSendRow);
    if (result.error && result.broadcastIds.length === 0) {
      console.error(`[broadcast-dispatch] newsletter ${due.id} enqueue failed: ${result.error}`);
      await supabase
        .from('newsletters')
        .update({ status: 'draft', scheduled_at: null })
        .eq('id', due.id)
        .eq('status', 'sending');
    } else if (result.error) {
      // 부분 실패: 일부 채널은 큐됐고(발송됨) 일부는 드롭. sending 유지 — 성공분 완료 시
      // finalize 훅이 sent로 마감. 드롭된 채널은 로그로만 관찰 가능하므로 반드시 기록.
      console.error(
        `[broadcast-dispatch] newsletter ${due.id} partial enqueue (${result.broadcastIds.length} channel(s) queued): ${result.error}`
      );
    }
  }

  // recipient_count > 0 가드: enqueueBroadcast가 recipients INSERT 전에 crash한 orphan broadcast를
  // 자동 dispatch에서 제외 (sent_count=0인 상태로 silently 'sent' 마킹되는 회귀 차단).
  // commit d0f39bba의 멱등 가드 정책과 동일 원칙.
  const { data: broadcasts } = await supabase
    .from('email_broadcasts')
    .select(
      'id, channel, subject, body_html, body_text, cta_label, cta_url, status, is_advertisement, newsletter_id'
    )
    .in('status', ['queued', 'sending'])
    .gt('recipient_count', 0)
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

    // EMAIL_UNSUB_SECRET 누락 시 silent하게 invalid=1 URL로 발송되어 정통망법 위반.
    // 환경변수 미설정이면 broadcast를 failed로 마킹하고 발송 중단.
    const sanityToken = generateUnsubscribeToken(
      'sanity-check-hash',
      broadcast.channel as 'customer' | 'member' | 'petition' | 'individual'
    );
    if (!sanityToken) {
      console.error(
        `[broadcast-dispatch] EMAIL_UNSUB_SECRET missing — refusing to send ${broadcast.id}`
      );
      const { error: failMarkError } = await supabase
        .from('email_broadcasts')
        .update({
          status: 'failed',
          dispatch_locked_until: null,
          dispatch_lock_token: null,
        })
        .eq('id', broadcast.id)
        .eq('dispatch_lock_token', lockToken);
      if (failMarkError) {
        console.error(
          `[broadcast-dispatch] failed to mark ${broadcast.id} as failed:`,
          failMarkError.message
        );
      }
      continue;
    }

    // 뉴스레터 브로드캐스트면 블록을 1회 로드·검증 — 수신자별 렌더에서 재사용.
    // 로드/검증 실패 시 failed 마킹 (silent skip은 queued 고착 → 매분 재시도 낭비).
    let newsletterRender: {
      issueNo: number;
      title: string;
      preheader: string;
      blocks: NewsletterBlock[];
      webUrl: string;
    } | null = null;
    if (broadcast.newsletter_id) {
      const { data: nl } = await supabase
        .from('newsletters')
        .select('issue_no, title, preheader, slug, blocks')
        .eq('id', broadcast.newsletter_id)
        .maybeSingle();
      let parsedBlocks: NewsletterBlock[] | null = null;
      if (nl) {
        try {
          parsedBlocks = parseNewsletterBlocks(nl.blocks);
        } catch (err) {
          console.error(`[broadcast-dispatch] newsletter blocks invalid for ${broadcast.id}:`, err);
        }
      }
      if (!nl || !parsedBlocks) {
        await supabase
          .from('email_broadcasts')
          .update({ status: 'failed', dispatch_locked_until: null, dispatch_lock_token: null })
          .eq('id', broadcast.id)
          .eq('dispatch_lock_token', lockToken);
        continue;
      }
      newsletterRender = {
        issueNo: nl.issue_no as number,
        title: nl.title as string,
        preheader: (nl.preheader as string) ?? '',
        blocks: parsedBlocks,
        webUrl: `${SITE_URL}/newsletter/${nl.slug as string}`,
      };
    }

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
        .order('id', { ascending: true }) // created_at 동순위 시 청크 경계 결정론화(행 누락·중복선택 방지)
        .limit(CHUNK_SIZE);

      if (!pending || pending.length === 0) {
        hasMore = false;
        break;
      }

      const pendingRows = pending as Array<{
        id: string;
        email: string;
        name: string | null;
        locale: string;
      }>;
      const validRows: typeof pendingRows = [];
      const invalidRows: Array<{ id: string; reason: string }> = [];

      for (const row of pendingRows) {
        const validation = validateResendRecipientEmail(row.email);
        if (validation.valid) {
          validRows.push(row);
        } else {
          invalidRows.push({ id: row.id, reason: validation.reason });
        }
      }

      if (invalidRows.length > 0) {
        await Promise.all(
          invalidRows.map(({ id, reason }) =>
            supabase
              .from('email_broadcast_recipients')
              .update({ status: 'failed', error: `invalid recipient email: ${reason}` })
              .eq('id', id)
          )
        );
      }

      const batchItems = await Promise.all(
        validRows.map(async (r) => {
          const bodyHtml = personalizeRichEmailHtml(broadcast.body_html as string, r.name);
          const bodyText = personalizeRichEmailText((broadcast.body_text as string) ?? '', r.name);
          const emailHash = hashEmail(r.email);
          const unsubToken = generateUnsubscribeToken(
            emailHash,
            broadcast.channel as 'customer' | 'member' | 'petition' | 'individual'
          );
          const unsubscribeUrl = unsubToken
            ? `${SITE_URL}/api/email/unsubscribe?t=${unsubToken}`
            : `${SITE_URL}/api/email/unsubscribe?invalid=1`;

          const emailEl = newsletterRender
            ? React.createElement(NewsletterEmail, {
                issueNo: newsletterRender.issueNo,
                title: newsletterRender.title,
                preheader: newsletterRender.preheader,
                // {{name}} 개인화는 text 블록에만 적용 (스냅샷·CTA는 불변)
                blocks: newsletterRender.blocks.map((b) =>
                  b.type === 'text' ? { ...b, html: personalizeRichEmailHtml(b.html, r.name) } : b
                ),
                isAdvertisement: (broadcast.is_advertisement ?? false) as boolean,
                unsubscribeUrl,
                webUrl: newsletterRender.webUrl,
                locale: r.locale === 'en' ? ('en' as const) : ('ko' as const),
              })
            : React.createElement(BroadcastEmail, {
                channel: broadcast.channel as 'customer' | 'member' | 'petition' | 'individual',
                isAdvertisement: (broadcast.is_advertisement ?? false) as boolean,
                recipientName: r.name,
                subject: broadcast.subject as string,
                bodyHtml,
                ctaLabel: broadcast.cta_label as string | null,
                ctaUrl: broadcast.cta_url as string | null,
                unsubscribeUrl,
                locale: r.locale === 'en' ? 'en' : 'ko',
              });

          const html = await render(emailEl);
          const isAd = (broadcast.is_advertisement ?? false) as boolean;
          const adPrefix = r.locale === 'en' ? '(Advertisement) ' : '(광고) ';
          const subject = isAd
            ? `${adPrefix}${broadcast.subject as string}`
            : (broadcast.subject as string);

          // RFC 8058 원클릭 수신거부 — Gmail/Apple Mail의 네이티브 수신거부 UI 노출(스팸 평판 개선).
          // unsubscribe 라우트 POST가 query의 토큰을 받으므로 One-Click POST가 그대로 처리된다.
          // 유효 토큰이 있을 때만 헤더 부여(secret 누락 broadcast는 앞단에서 발송 거부됨).
          const headers = unsubToken
            ? {
                'List-Unsubscribe': `<${unsubscribeUrl}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
              }
            : undefined;

          return {
            from: FROM_EMAIL,
            to: r.email,
            subject,
            html,
            text: bodyText,
            reply_to: buildReplyToAddress(r.id),
            headers,
          };
        })
      );

      if (validRows.length === 0) {
        continue;
      }

      // 멱등 키: 같은 청크가 재발송돼도(크래시·타임아웃·상태업데이트 실패 후 다음 cron 재시도)
      // Resend가 중복 발송을 차단. row id 정렬 해시라 재발송 시 동일 청크에 안정적으로 매칭된다.
      const idempotencyKey = buildBatchIdempotencyKey(
        broadcast.id as string,
        validRows.map((r) => r.id)
      );
      const result = await sendBatch(batchItems, { idempotencyKey });

      // result.ids[i] = batchItems[i] = pendingRows[i]의 Resend 메시지 ID (요청 순서 보존).
      // 웹훅(app/api/webhooks/resend)이 resend_id로 바운스/컴플레인을 매칭하므로 수신자별로 저장.
      const sentAt = new Date().toISOString();
      const sentUpdates = result.ids.map((resendId, i) => ({
        id: validRows[i].id,
        resendId,
      }));
      const failedIds = validRows.slice(result.ids.length).map((r) => r.id);

      // 각 UPDATE 결과를 명시 검사. supabase-js는 RLS/네트워크 에러 시 reject하지 않고
      // {error} 객체로 resolve — 이를 무시하면 row가 'pending'으로 남아 다음 cron이 같은
      // 수신자에게 재발송한다(중복 발송 버그).
      const updateResults = await Promise.all(
        sentUpdates.map(async ({ id, resendId }) => {
          const { error } = await supabase
            .from('email_broadcast_recipients')
            .update({ status: 'sent', sent_at: sentAt, resend_id: resendId })
            .eq('id', id);
          return { id, error };
        })
      );

      const updateFailedIds = updateResults
        .filter((r) => r.error)
        .map((r) => {
          console.error(
            `[broadcast-dispatch] sent-update failed for ${r.id}:`,
            r.error?.message ?? r.error
          );
          return r.id;
        });

      if (updateFailedIds.length > 0) {
        // Resend는 이미 발송했으므로 'failed'가 아닌 'sent'로 재시도.
        // 일시적 RLS/네트워크 오류였다면 두 번째에서 성공해 pending 잔존 방지.
        const retryResults = await Promise.all(
          updateFailedIds.map(async (id) => {
            const { error } = await supabase
              .from('email_broadcast_recipients')
              .update({ status: 'sent', sent_at: sentAt })
              .eq('id', id);
            return { id, error };
          })
        );

        // 2차도 실패한 row: 이미 Resend로 발송됐는데 상태를 기록하지 못함.
        // pending으로 두면 다음 cron이 무한 재시도(멱등 키로 중복 수신은 막히나 broadcast가
        // 영원히 'sending'에 고착). 'failed'로 마킹해 루프를 끊고 finalize 가능하게 한다
        // — 이미 발송됐으나 기록 실패임을 error에 명시(failed_count에 소폭 반영되는 트레이드오프).
        const stillFailedIds = retryResults.filter((r) => r.error).map((r) => r.id);
        if (stillFailedIds.length > 0) {
          console.error(
            `[broadcast-dispatch] sent-update permanently failed for ${stillFailedIds.length} rows ` +
              `(already sent via Resend; marking 'failed' to break re-dispatch loop):`,
            stillFailedIds
          );
          await supabase
            .from('email_broadcast_recipients')
            .update({ status: 'failed', error: 'sent via Resend but status update failed' })
            .in('id', stillFailedIds);
        }
      }

      if (failedIds.length > 0) {
        await supabase
          .from('email_broadcast_recipients')
          .update({ status: 'failed', error: result.error ?? 'batch partial failure' })
          .in('id', failedIds);
      }

      // 청크마다 진행 카운트를 DB에서 재집계해 갱신 — 발송 중에도 이력에서 진행률이 보인다.
      // (running 합산이 아니라 재집계라 크래시/락 인계 후 재개에도 정확). 락 보유 시에만 기록.
      const { count: sentSoFar } = await supabase
        .from('email_broadcast_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('broadcast_id', broadcast.id)
        .eq('status', 'sent');
      const { count: failedSoFar } = await supabase
        .from('email_broadcast_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('broadcast_id', broadcast.id)
        .eq('status', 'failed');
      await supabase
        .from('email_broadcasts')
        .update({
          status: 'sending',
          sent_count: sentSoFar ?? 0,
          failed_count: failedSoFar ?? 0,
        })
        .eq('id', broadcast.id)
        .eq('dispatch_lock_token', lockToken);

      totalDispatched += sentUpdates.length;

      if (pending.length < CHUNK_SIZE) {
        hasMore = false;
      } else {
        await new Promise((r) => setTimeout(r, THROTTLE_MS));
      }
    }

    // 전량 처리 후 카운터 집계 및 broadcast status 갱신
    // select 에러를 silent하게 무시하면 data가 null → 잔존 없음으로 오인 →
    // status='sent'로 false finalize → pending row가 영원히 발송되지 않는 orphan 버그.
    const { data: remainingPending, error: remainingError } = await supabase
      .from('email_broadcast_recipients')
      .select('id')
      .eq('broadcast_id', broadcast.id)
      .eq('status', 'pending')
      .limit(1);

    if (remainingError) {
      console.error(
        `[broadcast-dispatch] remainingPending query failed for ${broadcast.id}:`,
        remainingError.message
      );
      // finalize 보류 — 락은 만료(120s) 후 다음 cron이 재시도.
      continue;
    }

    if (remainingPending.length === 0) {
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

      // 뉴스레터: 연결된 모든 채널 broadcast가 종결되면 뉴스레터도 sent로 마감.
      if (broadcast.newsletter_id) {
        const { data: activeSiblings, error: siblingsError } = await supabase
          .from('email_broadcasts')
          .select('id')
          .eq('newsletter_id', broadcast.newsletter_id)
          .in('status', ['queued', 'sending'])
          .limit(1);
        if (siblingsError) {
          console.error(
            `[broadcast-dispatch] newsletter ${broadcast.newsletter_id} sibling query failed:`,
            siblingsError.message
          );
        }
        if (activeSiblings && activeSiblings.length === 0) {
          await supabase
            .from('newsletters')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', broadcast.newsletter_id)
            .eq('status', 'sending');
        }
      }
    }
  }

  return NextResponse.json({ dispatched: totalDispatched });
}
