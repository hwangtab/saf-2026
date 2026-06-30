import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseAdminClient } from '@/lib/auth/server';
import { hashEmail } from '@/lib/email/email-hash';
import {
  verifyResendWebhook,
  parseResendEvent,
  extractRecipientEmail,
  isSuppressibleBounce,
} from '@/lib/email/resend-webhook';
import { notifyInboundEmail, processInboundEmail } from '@/lib/email/inbound';

export const runtime = 'nodejs';

// Resend 바운스/컴플레인 웹훅.
// 서명 검증(Svix 수동 HMAC) → 전 채널 suppress → 발송 통계(best-effort) 갱신.
export async function POST(req: NextRequest) {
  // 서명 검증을 위해 raw body 문자열을 그대로 읽는다 (JSON.parse 전).
  const rawBody = await req.text();

  const verified = verifyResendWebhook(
    rawBody,
    {
      svixId: req.headers.get('svix-id'),
      svixTimestamp: req.headers.get('svix-timestamp'),
      svixSignature: req.headers.get('svix-signature'),
    },
    process.env.RESEND_WEBHOOK_SECRET
  );
  if (!verified) {
    console.error('[resend-webhook] signature verification failed');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const event = parseResendEvent(json);
  if (!event) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const isComplaint = event.type === 'email.complained';
  const isBounce = event.type === 'email.bounced';
  const isReceived = event.type === 'email.received';

  // 관심 없는 이벤트(delivered/opened 등)는 200으로 ack — Resend 재시도 방지.
  if (!isComplaint && !isBounce && !isReceived) {
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  // 임시(transient) 등 비영구 바운스는 정상 수신자를 잃지 않도록 suppress 제외, log만.
  // 영구·불확실(type 누락)은 suppress(isSuppressibleBounce) — case-insensitive 판정으로
  // 'permanent' 대소문자 변형을 임시로 오분류하던 빈틈을 막는다.
  if (isBounce && !isSuppressibleBounce(event)) {
    console.warn('[resend-webhook] non-permanent bounce skipped:', event.data.bounce?.type);
    return NextResponse.json({ ok: true, soft_bounce: true });
  }

  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch (err) {
    console.error('[resend-webhook] missing supabase config:', err);
    return NextResponse.json({ error: 'Server config error' }, { status: 500 });
  }

  if (isReceived) {
    try {
      const inbound = await processInboundEmail(event, supabase);
      // 신규 수신일 때만 관리자 알림 — 웹훅 재시도로 중복 알림이 가지 않게 한다(M3).
      if (inbound.isNew) {
        await notifyInboundEmail(event, inbound.id, {
          textBody: inbound.textBody,
          htmlBody: inbound.htmlBody,
        }).catch((err) => {
          console.error('[resend-webhook] inbound notify failed:', err);
        });
      }
      return NextResponse.json({ ok: true, inbound_id: inbound.id });
    } catch (err) {
      console.error('[resend-webhook] inbound processing failed:', err);
      return NextResponse.json({ error: 'Inbound processing failed' }, { status: 500 });
    }
  }

  let email = extractRecipientEmail(event);
  // to가 없으면 resend_id(email_id)로 수신자 이메일을 역조회 — payload 형태 차이로
  // 바운스/컴플레인 suppression이 유실되는 빈틈을 막는다.
  if (!email && event.data.email_id) {
    const { data: row } = await supabase
      .from('email_broadcast_recipients')
      .select('email')
      .eq('resend_id', event.data.email_id)
      .limit(1)
      .maybeSingle();
    email = (row?.email as string | undefined) ?? null;
  }
  if (!email) {
    console.error('[resend-webhook] no recipient email in payload');
    return NextResponse.json({ error: 'No recipient' }, { status: 400 });
  }

  const reason = isComplaint ? 'complaint' : 'bounce';
  const recipientStatus = isComplaint ? 'complained' : 'bounced';
  const emailHash = hashEmail(email);

  // 1) 전 채널 영구 차단 (멱등 — Resend 재시도 안전)
  const { error: suppressError } = await supabase
    .from('email_suppressions')
    .upsert(
      { email_hash: emailHash, channel: 'all', reason },
      { onConflict: 'email_hash,channel', ignoreDuplicates: true }
    );
  if (suppressError) {
    console.error('[resend-webhook] suppression upsert error:', suppressError);
    // DB 에러는 500 — Resend가 재시도하도록.
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  // 2) 발송 통계 갱신 (resend_id 매칭, best-effort — 실패해도 suppress는 유지되므로 200).
  if (event.data.email_id) {
    const { error: statusError } = await supabase
      .from('email_broadcast_recipients')
      .update({
        status: recipientStatus,
        error: event.data.bounce?.message ?? event.type,
      })
      .eq('resend_id', event.data.email_id);
    if (statusError) {
      console.error('[resend-webhook] recipient status update error:', statusError);
    }
  }

  return NextResponse.json({ ok: true });
}
