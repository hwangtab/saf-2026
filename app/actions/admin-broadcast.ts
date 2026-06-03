'use server';

import * as React from 'react';

import { render } from '@react-email/render';

import { logAdminAction } from '@/app/actions/activity-log-writer';
import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import { hashEmail, PETITION_SALT } from '@/lib/email/email-hash';
import { sendBatch } from '@/lib/email/resend-batch';
import { generateUnsubscribeToken } from '@/lib/email/unsubscribe-token';
import { splitAndPersonalize } from '@/lib/email/broadcast-body';
import { ArtworkBuyerAudienceResolver } from '@/lib/email/audiences/artwork-buyer';
import { CustomerAudienceResolver } from '@/lib/email/audiences/customer';
import { MemberAudienceResolver } from '@/lib/email/audiences/member';
import { PetitionAudienceResolver } from '@/lib/email/audiences/petition';
import type { BroadcastChannel, Recipient } from '@/lib/email/audiences/types';
import { MAX_DIRECT_RECIPIENTS } from '@/lib/email/broadcast-segment';
import { validateUrl, validateTextLength } from '@/lib/utils/input-validation';
import { matchesAnySearch } from '@/lib/search-utils';
import type { ActionState } from '@/types';
import type { Json } from '@/types/supabase';
import BroadcastEmail from '@/emails/broadcast';

export interface EnqueueBroadcastInput {
  channel: BroadcastChannel;
  subject: string;
  bodyMd: string;
  ctaLabel?: string;
  ctaUrl?: string;
  petitionSlug?: string;
  audienceFilter?: Record<string, unknown>;
  isAdvertisement?: boolean;
}

export interface BroadcastArtworkSearchResult {
  id: string;
  title: string;
  titleEn: string | null;
  artistName: string | null;
  artistNameEn: string | null;
  status: string | null;
  image: string | null;
}

// 브로드캐스트를 큐에 등록.
// 1) 수신자 추출 → 2) email_broadcasts INSERT → 3) email_broadcast_recipients INSERT → 4) 활동 로그.
export async function enqueueBroadcast(
  input: EnqueueBroadcastInput
): Promise<ActionState & { broadcastId?: string; deduped?: boolean }> {
  const admin = await requireAdmin();

  const supabase = await requireAdminClient();

  const { channel, subject, bodyMd, ctaLabel, ctaUrl, petitionSlug } = input;
  const audienceFilter = input.audienceFilter ?? {};

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
  let isAdvertisement = false;
  if (channel === 'member') {
    resolver = new MemberAudienceResolver();
  } else if (channel === 'customer') {
    if (typeof audienceFilter.artworkId === 'string') {
      isAdvertisement = input.isAdvertisement ?? false;
      resolver = new ArtworkBuyerAudienceResolver(audienceFilter.artworkId, {
        advertising: isAdvertisement,
      });
    } else {
      isAdvertisement = true; // 광범위 고객 마케팅 세그먼트 = 항상 광고(법적)
      resolver = new CustomerAudienceResolver();
    }
  } else if (channel === 'petition') {
    if (!petitionSlug) {
      return { message: '청원 채널은 petitionSlug가 필요합니다.', error: true };
    }
    resolver = new PetitionAudienceResolver(petitionSlug);
  } else {
    return { message: `채널 '${channel}'은 그룹 전체 선택을 지원하지 않습니다.`, error: true };
  }

  let recipients: Recipient[];
  try {
    recipients = await resolver.resolve(audienceFilter);
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
      message:
        '같은 채널·제목의 캠페인이 최근 5분 내에 이미 등록돼 발송 중입니다. 새로 발송되지 않았습니다.',
      broadcastId: existing.id,
      deduped: true,
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
      audience_filter: audienceFilter as Json,
      is_advertisement: isAdvertisement,
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
    is_advertisement: isAdvertisement,
    subject,
  });

  return {
    message: `${recipients.length}명에게 발송을 시작했습니다.`,
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

// 미리보기 수신자 수 — DB count 함수(count_*_audience)로 행 전송 없이 계산.
// RPC 실패(미적용 환경·일시 오류) 시 resolver로 폴백해 기능이 절대 깨지지 않게 한다.
// 미리보기 표시 전용이며 실제 발송은 resolver를 독립적으로 쓰므로, RPC 드리프트의 영향은 표시값에 한정.
async function countAudienceViaRpc(
  rpc: string,
  args: Record<string, unknown>,
  fallback: () => Promise<number>
): Promise<number> {
  try {
    const supabase = (await requireAdminClient()) as unknown as {
      rpc: (
        fn: string,
        params: Record<string, unknown>
      ) => Promise<{ data: unknown; error: { message?: string } | null }>;
    };
    const { data, error } = await supabase.rpc(rpc, args);
    if (error) throw new Error(error.message ?? `${rpc} rpc error`);
    const n = typeof data === 'number' ? data : Number(data);
    if (!Number.isFinite(n)) throw new Error(`${rpc} returned non-numeric`);
    return n;
  } catch (err) {
    console.error(`[previewAudience] ${rpc} failed — resolver 폴백:`, err);
    return fallback();
  }
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
    const subset = filter?.subset ?? 'all';
    const total = await countAudienceViaRpc(
      'count_member_audience',
      { p_subset: subset, p_salt: PETITION_SALT },
      async () => (await new MemberAudienceResolver().resolve({ subset })).length
    );
    const label = subset === 'artist' ? '작가' : subset === 'exhibitor' ? '출품자' : '작가·출품자';
    return { total, breakdown: { [label]: total } };
  }

  if (channel === 'customer') {
    if (filter?.artworkId) {
      const artworkId = filter.artworkId;
      const advertising = filter.advertising ?? false;
      const total = await countAudienceViaRpc(
        'count_artwork_buyer_audience',
        { p_artwork_id: artworkId, p_advertising: advertising, p_salt: PETITION_SALT },
        async () =>
          (await new ArtworkBuyerAudienceResolver(artworkId, { advertising }).resolve()).length
      );
      return { total, breakdown: { 작품구매자: total } };
    }
    const total = await countAudienceViaRpc(
      'count_customer_audience',
      { p_salt: PETITION_SALT },
      async () => (await new CustomerAudienceResolver().resolve()).length
    );
    return { total, breakdown: { '동의자·거래고객': total } };
  }

  if (channel === 'petition') {
    if (!filter?.petitionSlug) return { total: 0, breakdown: { '(청원 선택 필요)': 0 } };
    const slug = filter.petitionSlug;
    const total = await countAudienceViaRpc(
      'count_petition_audience',
      { p_slug: slug, p_salt: PETITION_SALT },
      async () => (await new PetitionAudienceResolver(slug).resolve()).length
    );
    return { total, breakdown: { 서명자: total } };
  }

  return { total: 0, breakdown: {} };
}

// 발송 대상 청원 드롭다운용 — 종료된 청원도 포함(종료 청원 서명자 결과 보고 메일 대상).
// isActive로 진행/종료를 구분해 UI에서 종료 청원 오발송을 시각적으로 방지.
export async function getPetitionOptions(): Promise<
  Array<{ slug: string; title: string; isActive: boolean }>
> {
  await requireAdmin();
  const supabase = await requireAdminClient();
  const { data, error } = await supabase
    .from('petitions')
    .select('slug, title, is_active')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[get-petition-options] error:', error);
    return [];
  }
  return (data ?? []).map((p) => ({
    slug: p.slug as string,
    title: p.title as string,
    isActive: Boolean(p.is_active),
  }));
}

export async function searchBroadcastArtworks(
  query: string
): Promise<{ results: BroadcastArtworkSearchResult[]; total: number }> {
  await requireAdmin();

  const normalizedQuery = query.normalize('NFC').trim().slice(0, 120);
  if (!normalizedQuery) return { results: [], total: 0 };

  const supabase = await requireAdminClient();
  const { data, error } = await supabase
    .from('artworks')
    .select(
      `
      id,
      title,
      title_en,
      status,
      images,
      artists(name_ko, name_en)
    `
    )
    .order('created_at', { ascending: false })
    .limit(2000);

  if (error) {
    console.error('[search-broadcast-artworks] error:', error);
    return { results: [], total: 0 };
  }

  const matched = (data ?? []).filter((artwork) => {
    const artist = Array.isArray(artwork.artists) ? artwork.artists[0] : artwork.artists;
    return matchesAnySearch(normalizedQuery, [
      artwork.title,
      artwork.title_en,
      artist?.name_ko,
      artist?.name_en,
    ]);
  });

  return {
    total: matched.length,
    results: matched.slice(0, 12).map((artwork) => {
      const artist = Array.isArray(artwork.artists) ? artwork.artists[0] : artwork.artists;
      const images = Array.isArray(artwork.images) ? artwork.images : [];
      return {
        id: artwork.id,
        title: artwork.title,
        titleEn: artwork.title_en,
        artistName: artist?.name_ko ?? null,
        artistNameEn: artist?.name_en ?? null,
        status: artwork.status,
        image: typeof images[0] === 'string' ? images[0] : null,
      };
    }),
  };
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.saf2026.com';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? '씨앗페 <noreply@saf2026.com>';

export async function enqueueIndividualBroadcast(input: {
  recipients: Array<{ email: string; name: string | null }>;
  subject: string;
  bodyMd: string;
  ctaLabel?: string;
  ctaUrl?: string;
  isAdvertisement: boolean;
}): Promise<ActionState & { broadcastId?: string; deduped?: boolean }> {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const { recipients, subject, bodyMd, ctaLabel, ctaUrl, isAdvertisement } = input;

  if (!subject.trim() || !bodyMd.trim())
    return { message: '제목과 본문은 필수입니다.', error: true };
  if (recipients.length === 0) return { message: '수신자를 1명 이상 선택하세요.', error: true };
  // 임의 대량 발송(오발송·도메인 평판 훼손) 방어 — 한도 초과는 그룹 발송 채널로 유도.
  if (recipients.length > MAX_DIRECT_RECIPIENTS) {
    return {
      message: `직접 지정은 한 번에 최대 ${MAX_DIRECT_RECIPIENTS.toLocaleString('ko-KR')}명까지 보낼 수 있습니다. (${recipients.length.toLocaleString('ko-KR')}명 선택됨)`,
      error: true,
    };
  }

  let validatedCtaUrl: string | null;
  let validatedCtaLabel: string | null;
  try {
    validatedCtaUrl = ctaUrl ? validateUrl(ctaUrl, 'CTA URL') : null;
    validatedCtaLabel = ctaLabel ? validateTextLength(ctaLabel, 200, 'CTA 라벨') : null;
  } catch (err) {
    return { message: err instanceof Error ? err.message : 'CTA 입력 검증 실패', error: true };
  }

  const { data: suppressions } = await supabase
    .from('email_suppressions')
    .select('email_hash')
    .in('channel', isAdvertisement ? ['individual', 'customer', 'all'] : ['individual', 'all']);
  const suppressed = new Set((suppressions ?? []).map((s) => s.email_hash as string));

  const seen = new Set<string>();
  const rows: Array<{ email: string; name: string | null; locale: string; status: string }> = [];
  for (const r of recipients) {
    const email = r.email.toLowerCase().trim();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    if (suppressed.has(hashEmail(email))) continue;
    rows.push({ email, name: r.name, locale: 'ko', status: 'pending' });
  }
  if (rows.length === 0)
    return { message: '발송 가능한 수신자가 없습니다. (전원 수신거부)', error: true };

  // 멱등 가드: 같은 admin이 같은 제목으로 최근 5분 내 individual 발송을 큐에 올린(또는 발송 중인)
  // 경우 새 broadcast를 만들지 않고 기존 ID 반환 (더블 클릭 중복 발송 방지).
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: existingBroadcast } = await supabase
    .from('email_broadcasts')
    .select('id')
    .eq('created_by', admin.id)
    .eq('channel', 'individual')
    .eq('subject', subject)
    .in('status', ['queued', 'sending'])
    .gt('recipient_count', 0)
    .gte('created_at', fiveMinAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingBroadcast?.id) {
    return {
      message:
        '같은 제목의 개별 발송이 최근 5분 내에 이미 등록돼 발송 중입니다. 새로 발송되지 않았습니다.',
      broadcastId: existingBroadcast.id,
      deduped: true,
    };
  }

  const { data: broadcast, error: bErr } = await supabase
    .from('email_broadcasts')
    .insert({
      channel: 'individual',
      subject,
      body_md: bodyMd,
      cta_label: validatedCtaLabel,
      cta_url: validatedCtaUrl,
      audience_filter: { mode: 'search' } as Json,
      is_advertisement: isAdvertisement,
      status: 'queued',
      recipient_count: rows.length,
      created_by: admin.id,
      queued_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (bErr || !broadcast) {
    console.error('[enqueue-individual] insert broadcast error:', bErr);
    return { message: '캠페인 생성에 실패했습니다.', error: true };
  }

  const { error: rErr } = await supabase
    .from('email_broadcast_recipients')
    .insert(rows.map((r) => ({ ...r, broadcast_id: broadcast.id })));
  if (rErr) {
    await supabase.from('email_broadcasts').update({ status: 'failed' }).eq('id', broadcast.id);
    return { message: '수신자 큐 등록에 실패했습니다.', error: true };
  }

  await logAdminAction('broadcast_enqueued', 'email_broadcast', broadcast.id, {
    channel: 'individual',
    recipient_count: rows.length,
    is_advertisement: isAdvertisement,
    subject,
  });
  return {
    message: `${rows.length}명에게 발송을 시작했습니다.`,
    broadcastId: broadcast.id,
  };
}

// 작성 중인 내용으로 관리자 본인에게 테스트 1통 즉시 발송(큐 우회). 실전 0건 리스크 완화.
export async function sendTestEmail(input: {
  subject: string;
  bodyMd: string;
  ctaLabel?: string;
  ctaUrl?: string;
  isAdvertisement: boolean;
}): Promise<ActionState> {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  if (!input.subject.trim() || !input.bodyMd.trim())
    return { message: '제목과 본문은 필수입니다.', error: true };

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, name')
    .eq('id', admin.id)
    .single();
  const to = profile?.email as string | undefined;
  if (!to) return { message: '관리자 이메일을 찾을 수 없습니다.', error: true };

  let validatedCtaUrl: string | null;
  let validatedCtaLabel: string | null;
  try {
    validatedCtaUrl = input.ctaUrl ? validateUrl(input.ctaUrl, 'CTA URL') : null;
    validatedCtaLabel = input.ctaLabel ? validateTextLength(input.ctaLabel, 200, 'CTA 라벨') : null;
  } catch (err) {
    return { message: err instanceof Error ? err.message : 'CTA 입력 검증 실패', error: true };
  }

  const emailHash = hashEmail(to.toLowerCase().trim());
  const unsubToken = generateUnsubscribeToken(emailHash, 'individual');
  if (!unsubToken) {
    console.warn(
      '[sendTestEmail] EMAIL_UNSUB_SECRET 미설정 — 수신거부 링크가 무효 상태로 발송됩니다.'
    );
  }
  const unsubscribeUrl = unsubToken
    ? `${SITE_URL}/api/email/unsubscribe?t=${unsubToken}`
    : `${SITE_URL}/api/email/unsubscribe?invalid=1`;

  const html = await render(
    React.createElement(BroadcastEmail, {
      channel: 'individual',
      isAdvertisement: input.isAdvertisement,
      recipientName: (profile?.name as string | null) ?? null,
      subject: input.subject,
      bodyParagraphs: splitAndPersonalize(input.bodyMd, (profile?.name as string | null) ?? null),
      ctaLabel: validatedCtaLabel,
      ctaUrl: validatedCtaUrl,
      unsubscribeUrl,
      locale: 'ko',
    })
  );
  const subject = input.isAdvertisement
    ? `(광고) [테스트] ${input.subject}`
    : `[테스트] ${input.subject}`;
  const result = await sendBatch([{ from: FROM_EMAIL, to, subject, html }]);
  if (result.error || result.ids.length === 0) {
    return { message: `테스트 발송 실패: ${result.error ?? '알 수 없는 오류'}`, error: true };
  }
  return { message: `테스트 이메일을 ${to}로 보냈습니다.` };
}
