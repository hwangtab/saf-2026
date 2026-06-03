'use server';

import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import { logAdminAction } from '@/app/actions/activity-log-writer';
import { validateUrl, validateTextLength } from '@/lib/utils/input-validation';
import type { BroadcastChannel, Recipient } from '@/lib/email/audiences/types';
import { MemberAudienceResolver } from '@/lib/email/audiences/member';
import { CustomerAudienceResolver } from '@/lib/email/audiences/customer';
import { PetitionAudienceResolver } from '@/lib/email/audiences/petition';
import { ArtworkBuyerAudienceResolver } from '@/lib/email/audiences/artwork-buyer';
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

  // CTA URL은 http(s)만 허용 — javascript:/data: 등 protocol 주입 차단.
  // validateUrl이 invalid protocol 시 throw — try/catch로 user-friendly 메시지 반환.
  let validatedCtaUrl: string | null;
  let validatedCtaLabel: string | null;
  try {
    validatedCtaUrl = ctaUrl ? validateUrl(ctaUrl, 'CTA URL') : null;
    validatedCtaLabel = ctaLabel ? validateTextLength(ctaLabel, 200, 'CTA 라벨') : null;
  } catch (err) {
    return {
      message: err instanceof Error ? err.message : 'CTA 입력 검증 실패',
      error: true,
    };
  }

  let resolver;
  if (channel === 'member') {
    resolver = new MemberAudienceResolver();
  } else if (channel === 'customer') {
    resolver = new CustomerAudienceResolver();
  } else if (channel === 'petition') {
    if (!input.petitionSlug) {
      return { message: '청원 채널은 petitionSlug가 필요합니다.', error: true };
    }
    resolver = new PetitionAudienceResolver(input.petitionSlug);
  } else {
    return { message: `채널 '${channel}'은 아직 지원하지 않습니다.`, error: true };
  }

  let recipients: Recipient[];
  try {
    recipients = await resolver.resolve();
  } catch (err) {
    console.error('[enqueue-broadcast] resolver error:', err);
    const message = err instanceof Error ? err.message : '수신자 추출 중 오류가 발생했습니다.';
    return { message, error: true };
  }
  if (recipients.length === 0) {
    return {
      message: '발송 대상 수신자가 없습니다. (전원 수신거부 또는 이메일 없음)',
      error: true,
    };
  }

  // 멱등 가드: 같은 admin이 같은 channel+subject로 최근 5분 내 큐에 올린(또는 발송 중인)
  // 캠페인이 있으면 새 broadcast를 만들지 않고 기존 ID 반환.
  // 더블 클릭 + 슬로우 네트워크 경합으로 두 캠페인이 생성되어 같은 수신자에게 두 번 발송되는 사고 방지.
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: existing, error: existingError } = await supabase
    .from('email_broadcasts')
    .select('id')
    .eq('created_by', admin.id)
    .eq('channel', channel)
    .eq('subject', subject)
    .in('status', ['queued', 'sending'])
    .gt('recipient_count', 0) // orphan broadcast(recipients INSERT 직전 crash) 제외
    .gte('created_at', fiveMinAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error('[enqueue-broadcast] idempotency check error:', existingError);
    // 검사 실패는 안전 측 — 차단보다 진행 (best-effort idempotency).
  }

  if (existing?.id) {
    return {
      message: '동일한 캠페인이 최근 등록되어 있습니다. 기존 발송이 진행 중입니다.',
      broadcastId: existing.id,
    };
  }

  const { data: broadcast, error: broadcastError } = await supabase
    .from('email_broadcasts')
    .insert({
      channel,
      petition_slug: petitionSlug ?? null,
      subject,
      body_md: bodyMd,
      cta_label: validatedCtaLabel,
      cta_url: validatedCtaUrl,
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

export async function previewAudience(
  channel: BroadcastChannel,
  filter?: {
    subset?: 'all' | 'artist' | 'exhibitor';
    petitionSlug?: string;
    artworkId?: string;
    advertising?: boolean;
  }
): Promise<{ total: number; breakdown: Record<string, number> }> {
  await requireAdmin();

  if (channel === 'member') {
    const recipients = await new MemberAudienceResolver().resolve({
      subset: filter?.subset ?? 'all',
    });
    const label =
      filter?.subset === 'artist'
        ? '작가'
        : filter?.subset === 'exhibitor'
          ? '출품자'
          : '작가·출품자';
    return { total: recipients.length, breakdown: { [label]: recipients.length } };
  }

  if (channel === 'customer') {
    if (filter?.artworkId) {
      const recipients = await new ArtworkBuyerAudienceResolver(filter.artworkId, {
        advertising: filter.advertising ?? false,
      }).resolve();
      return { total: recipients.length, breakdown: { 작품구매자: recipients.length } };
    }
    const recipients = await new CustomerAudienceResolver().resolve();
    return { total: recipients.length, breakdown: { '동의자·거래고객': recipients.length } };
  }

  if (channel === 'petition') {
    if (!filter?.petitionSlug) return { total: 0, breakdown: { '(청원 선택 필요)': 0 } };
    const recipients = await new PetitionAudienceResolver(filter.petitionSlug).resolve();
    return { total: recipients.length, breakdown: { 서명자: recipients.length } };
  }

  return { total: 0, breakdown: {} };
}

// 발송 대상 청원 드롭다운용 — 종료된 청원도 포함(종료 청원 서명자 결과 보고 메일 대상).
export async function getPetitionOptions(): Promise<Array<{ slug: string; title: string }>> {
  await requireAdmin();
  const supabase = await requireAdminClient();
  const { data, error } = await supabase
    .from('petitions')
    .select('slug, title')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[get-petition-options] error:', error);
    return [];
  }
  return data ?? [];
}
