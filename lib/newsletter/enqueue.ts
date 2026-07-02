// 뉴스레터 발송 등록 — 채널별 수신자 resolve → 교차 중복 제거 → 채널당 email_broadcasts 1행 생성.
// server action(즉시 발송)과 broadcast-dispatch cron(예약 도래)이 공용하므로 lib에 위치.
// ⚠ 서버 전용 — audiences가 admin client를 사용. client 컴포넌트는 channels.ts만 import할 것.

import { CustomerAudienceResolver } from '@/lib/email/audiences/customer';
import { MemberAudienceResolver } from '@/lib/email/audiences/member';
import type { Recipient } from '@/lib/email/audiences/types';
import type { createSupabaseAdminClient } from '@/lib/auth/server';
import { blocksToText, parseNewsletterBlocks } from '@/lib/newsletter/blocks';
import type { NewsletterChannel } from '@/lib/newsletter/channels';
import type { Json } from '@/types/supabase';

export type { NewsletterChannel };

export interface NewsletterSendRow {
  id: string;
  issue_no: number;
  slug: string;
  title: string;
  preheader: string;
  blocks: unknown;
  is_advertisement: boolean;
  audience_channels: string[];
  created_by: string | null;
}

// 채널 간 중복 수신 제거 — 앞 채널 우선. 작가이면서 구매자인 사람은 1통만 받는다.
export function dedupeAcrossChannels(
  lists: Array<{ channel: NewsletterChannel; recipients: Recipient[] }>
): Array<{ channel: NewsletterChannel; recipients: Recipient[] }> {
  const seen = new Set<string>();
  return lists.map(({ channel, recipients }) => ({
    channel,
    recipients: recipients.filter((r) => {
      if (seen.has(r.emailHash)) return false;
      seen.add(r.emailHash);
      return true;
    }),
  }));
}

export async function enqueueNewsletterBroadcasts(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  newsletter: NewsletterSendRow
): Promise<{ broadcastIds: string[]; totalRecipients: number; error?: string }> {
  const empty = { broadcastIds: [] as string[], totalRecipients: 0 };

  if (!newsletter.title.trim()) return { ...empty, error: '제목이 비어 있습니다.' };

  let blocks;
  try {
    blocks = parseNewsletterBlocks(newsletter.blocks);
  } catch (err) {
    return { ...empty, error: err instanceof Error ? err.message : '블록 검증 실패' };
  }
  if (blocks.length === 0) return { ...empty, error: '블록이 비어 있습니다.' };

  const channels = newsletter.audience_channels.filter(
    (c): c is NewsletterChannel => c === 'customer' || c === 'member'
  );
  if (channels.length === 0) return { ...empty, error: '발송 채널이 선택되지 않았습니다.' };

  const resolved: Array<{ channel: NewsletterChannel; recipients: Recipient[] }> = [];
  for (const channel of channels) {
    const resolver =
      channel === 'customer' ? new CustomerAudienceResolver() : new MemberAudienceResolver();
    try {
      resolved.push({ channel, recipients: await resolver.resolve() });
    } catch (err) {
      console.error(`[newsletter-enqueue] ${channel} resolver error:`, err);
      return { ...empty, error: `수신자 추출 실패 (${channel})` };
    }
  }

  const deduped = dedupeAcrossChannels(resolved).filter((l) => l.recipients.length > 0);
  const totalRecipients = deduped.reduce((sum, l) => sum + l.recipients.length, 0);
  if (totalRecipients === 0) {
    return { ...empty, error: '발송 대상 수신자가 없습니다. (전원 수신거부 또는 이메일 없음)' };
  }

  const bodyText = blocksToText(blocks);
  const broadcastIds: string[] = [];

  for (const { channel, recipients } of deduped) {
    const { data: broadcast, error: bErr } = await supabase
      .from('email_broadcasts')
      .insert({
        channel,
        subject: newsletter.title,
        body_html: '', // 뉴스레터는 blocks로 렌더 — body_html 미사용(디스패처가 newsletter_id로 분기)
        body_text: bodyText,
        audience_filter: { newsletterSlug: newsletter.slug } as Json,
        is_advertisement: newsletter.is_advertisement,
        newsletter_id: newsletter.id,
        status: 'queued',
        recipient_count: recipients.length,
        created_by: newsletter.created_by,
        queued_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (bErr || !broadcast) {
      console.error('[newsletter-enqueue] insert broadcast error:', bErr);
      return { broadcastIds, totalRecipients, error: '캠페인 생성에 실패했습니다.' };
    }

    const { error: rErr } = await supabase.from('email_broadcast_recipients').insert(
      recipients.map((r) => ({
        broadcast_id: broadcast.id,
        email: r.email,
        name: r.name,
        locale: r.locale,
        status: 'pending',
      }))
    );

    if (rErr) {
      await supabase.from('email_broadcasts').update({ status: 'failed' }).eq('id', broadcast.id);
      console.error('[newsletter-enqueue] insert recipients error:', rErr);
      return { broadcastIds, totalRecipients, error: '수신자 큐 등록에 실패했습니다.' };
    }

    broadcastIds.push(broadcast.id);
  }

  return { broadcastIds, totalRecipients };
}
