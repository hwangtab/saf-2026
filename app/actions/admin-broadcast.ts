'use server';

import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import { logAdminAction } from '@/app/actions/activity-log-writer';
import type { BroadcastChannel } from '@/lib/email/audiences/types';
import { MemberAudienceResolver } from '@/lib/email/audiences/member';
import { CustomerAudienceResolver } from '@/lib/email/audiences/customer';
import type { ActionState } from '@/types';
import type { Json } from '@/types/supabase';

export interface EnqueueBroadcastInput {
  channel: BroadcastChannel;
  subject: string;
  bodyMd: string;
  ctaLabel?: string;
  ctaUrl?: string;
  petitionSlug?: string;
  audienceFilter?: Record<string, unknown>;
}

// 브로드캐스트를 큐에 등록.
// 1) 수신자 추출 → 2) email_broadcasts INSERT → 3) email_broadcast_recipients INSERT → 4) 활동 로그.
export async function enqueueBroadcast(
  input: EnqueueBroadcastInput
): Promise<ActionState & { broadcastId?: string }> {
  const admin = await requireAdmin();

  const supabase = await requireAdminClient();

  const { channel, subject, bodyMd, ctaLabel, ctaUrl, petitionSlug, audienceFilter } = input;

  if (!subject.trim() || !bodyMd.trim()) {
    return { message: '제목과 본문은 필수입니다.', error: true };
  }

  let resolver;
  if (channel === 'member') {
    resolver = new MemberAudienceResolver();
  } else if (channel === 'customer') {
    resolver = new CustomerAudienceResolver();
  } else {
    return { message: `채널 '${channel}'은 아직 지원하지 않습니다.`, error: true };
  }

  const recipients = await resolver.resolve();
  if (recipients.length === 0) {
    return {
      message: '발송 대상 수신자가 없습니다. (전원 수신거부 또는 이메일 없음)',
      error: true,
    };
  }

  const { data: broadcast, error: broadcastError } = await supabase
    .from('email_broadcasts')
    .insert({
      channel,
      petition_slug: petitionSlug ?? null,
      subject,
      body_md: bodyMd,
      cta_label: ctaLabel ?? null,
      cta_url: ctaUrl ?? null,
      audience_filter: (audienceFilter ?? {}) as Json,
      status: 'queued',
      recipient_count: recipients.length,
      created_by: admin.id,
      queued_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (broadcastError || !broadcast) {
    console.error('[enqueue-broadcast] insert broadcast error:', broadcastError);
    return { message: '캠페인 생성에 실패했습니다.', error: true };
  }

  const rows = recipients.map((r) => ({
    broadcast_id: broadcast.id,
    email: r.email,
    name: r.name,
    locale: r.locale,
    status: 'pending',
  }));

  const { error: recipientsError } = await supabase.from('email_broadcast_recipients').insert(rows);

  if (recipientsError) {
    await supabase.from('email_broadcasts').update({ status: 'failed' }).eq('id', broadcast.id);
    console.error('[enqueue-broadcast] insert recipients error:', recipientsError);
    return { message: '수신자 큐 등록에 실패했습니다.', error: true };
  }

  await logAdminAction('broadcast_enqueued', 'email_broadcast', broadcast.id, {
    channel,
    recipient_count: recipients.length,
    subject,
  });

  return {
    message: `${recipients.length}명에게 발송 예약되었습니다.`,
    broadcastId: broadcast.id,
  };
}

export async function getBroadcasts() {
  await requireAdmin();

  const supabase = await requireAdminClient();

  const { data, error } = await supabase
    .from('email_broadcasts')
    .select(
      'id, channel, subject, status, recipient_count, sent_count, failed_count, created_at, queued_at, sent_at'
    )
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[get-broadcasts] error:', error);
    return [];
  }
  return (data ?? []) as Array<{
    id: string;
    channel: string;
    subject: string;
    status: string;
    recipient_count: number | null;
    sent_count: number | null;
    failed_count: number | null;
    created_at: string | null;
    queued_at: string | null;
    sent_at: string | null;
  }>;
}

export async function previewAudience(channel: BroadcastChannel): Promise<{
  total: number;
  breakdown: Record<string, number>;
}> {
  await requireAdmin();

  if (channel === 'member') {
    const resolver = new MemberAudienceResolver();
    const recipients = await resolver.resolve();
    return { total: recipients.length, breakdown: { member: recipients.length } };
  }

  if (channel === 'customer') {
    const resolver = new CustomerAudienceResolver();
    const recipients = await resolver.resolve();
    return {
      total: recipients.length,
      breakdown: { '동의자·거래고객': recipients.length },
    };
  }

  return { total: 0, breakdown: {} };
}
