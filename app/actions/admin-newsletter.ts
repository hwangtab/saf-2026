'use server';

import * as React from 'react';

import { render } from '@react-email/render';

import { logAdminAction } from '@/app/actions/activity-log-writer';
import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import { hashEmail } from '@/lib/email/email-hash';
import { buildReplyFromAddress, buildReplyToAddress } from '@/lib/email/inbound';
import { sendBatch } from '@/lib/email/resend-batch';
import { generateUnsubscribeToken } from '@/lib/email/unsubscribe-token';
import { sanitizeRichEmailHtml } from '@/lib/email/rich-content';
import {
  parseNewsletterBlocks,
  type ArtworkSnapshot,
  type NewsletterBlock,
} from '@/lib/newsletter/blocks';
import {
  enqueueNewsletterBroadcasts,
  type NewsletterChannel,
  type NewsletterSendRow,
} from '@/lib/newsletter/enqueue';
import { resolveArtworkVariantUrl } from '@/lib/utils/artwork-image';
import { SITE_URL } from '@/lib/constants';
import NewsletterEmail from '@/emails/newsletter';
import type { ActionState } from '@/types';
import type { Json } from '@/types/supabase';

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? buildReplyFromAddress();

export interface NewsletterListRow {
  id: string;
  issue_no: number;
  slug: string;
  title: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  updated_at: string;
}

export interface NewsletterDetail extends NewsletterListRow {
  preheader: string;
  blocks: unknown; // 클라이언트가 parseNewsletterBlocks로 파싱
  is_advertisement: boolean;
  audience_channels: string[];
}

export interface UpdateNewsletterInput {
  title: string;
  preheader: string;
  slug: string;
  isAdvertisement: boolean;
  blocks: unknown;
}

export interface PreviewInput {
  issueNo: number;
  title: string;
  preheader: string;
  isAdvertisement: boolean;
  blocks: unknown;
}

const NEWSLETTER_DETAIL_COLUMNS =
  'id, issue_no, slug, title, preheader, blocks, status, audience_channels, scheduled_at, sent_at, is_advertisement, updated_at';

// text 블록 html은 저장·미리보기 공통으로 기존 이메일 sanitize 파이프라인 통과.
function sanitizeBlocks(blocks: NewsletterBlock[]): NewsletterBlock[] {
  return blocks.map((b) => (b.type === 'text' ? { ...b, html: sanitizeRichEmailHtml(b.html) } : b));
}

// 발송 전 블록 이미지 URL 존재 검증(HEAD) — 깨진 이미지가 실린 채 발송되는 것 차단 (스펙 §6).
// 첫 번째 응답하지 않는 URL을 반환, 전부 정상이면 null.
async function findBrokenImageUrl(blocks: NewsletterBlock[]): Promise<string | null> {
  const urls: string[] = [];
  for (const b of blocks) {
    if (b.type === 'cover' && b.imageUrl) urls.push(b.imageUrl);
    else if (b.type === 'artworkCard') urls.push(b.snapshot.imageUrl);
    else if (b.type === 'eventBanner' && b.imageUrl) urls.push(b.imageUrl);
  }
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      if (!res.ok) return url;
    } catch {
      return url;
    }
  }
  return null;
}

export async function getNewsletters(): Promise<NewsletterListRow[]> {
  await requireAdmin();
  const supabase = await requireAdminClient();
  const { data, error } = await supabase
    .from('newsletters')
    .select('id, issue_no, slug, title, status, scheduled_at, sent_at, updated_at')
    .order('issue_no', { ascending: false });
  if (error) {
    console.error('[get-newsletters] error:', error);
    return [];
  }
  return (data ?? []) as NewsletterListRow[];
}

export async function getNewsletter(id: string): Promise<NewsletterDetail | null> {
  await requireAdmin();
  const supabase = await requireAdminClient();
  const { data, error } = await supabase
    .from('newsletters')
    .select(NEWSLETTER_DETAIL_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('[get-newsletter] error:', error);
    return null;
  }
  return (data as NewsletterDetail | null) ?? null;
}

// 다음 호수(max+1)와 KST 기준 'YYYY-MM' slug(충돌 시 -2, -3 접미) 생성.
async function nextIssueNoAndSlug(supabase: Awaited<ReturnType<typeof requireAdminClient>>) {
  const { data: maxRow } = await supabase
    .from('newsletters')
    .select('issue_no')
    .order('issue_no', { ascending: false })
    .limit(1)
    .maybeSingle();
  const issueNo = ((maxRow?.issue_no as number | undefined) ?? 0) + 1;

  const kst = new Date(Date.now() + 9 * 3600_000);
  const base = `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}`;
  let slug = base;
  for (let n = 2; n <= 20; n++) {
    const { data: existing } = await supabase
      .from('newsletters')
      .select('id')
      .eq('slug', slug)
      .maybeSingle();
    if (!existing) break;
    slug = `${base}-${n}`;
  }
  return { issueNo, slug };
}

export async function createNewsletter(): Promise<ActionState & { id?: string }> {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const { issueNo, slug } = await nextIssueNoAndSlug(supabase);

  const defaultBlocks: NewsletterBlock[] = [
    { id: crypto.randomUUID(), type: 'cover', title: '', subtitle: '', imageUrl: '' },
    { id: crypto.randomUUID(), type: 'text', html: '<p></p>' },
  ];

  const { data, error } = await supabase
    .from('newsletters')
    .insert({
      issue_no: issueNo,
      slug,
      title: '',
      preheader: '',
      blocks: defaultBlocks as unknown as Json,
      status: 'draft',
      created_by: admin.id,
    })
    .select('id')
    .single();
  if (error || !data) {
    console.error('[create-newsletter] error:', error);
    return { message: '뉴스레터 생성에 실패했습니다.', error: true };
  }
  await logAdminAction('newsletter_created', 'newsletter', data.id, { issue_no: issueNo, slug });
  return { message: `제${issueNo}호 초안을 만들었습니다.`, id: data.id };
}

export async function updateNewsletter(
  id: string,
  input: UpdateNewsletterInput
): Promise<ActionState> {
  await requireAdmin();
  const supabase = await requireAdminClient();

  let blocks: NewsletterBlock[];
  try {
    blocks = sanitizeBlocks(parseNewsletterBlocks(input.blocks));
  } catch (err) {
    return { message: err instanceof Error ? err.message : '블록 검증 실패', error: true };
  }

  const slug = input.slug.trim();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    return { message: 'slug는 영소문자·숫자·하이픈만 사용할 수 있습니다.', error: true };
  }
  const title = input.title.trim();
  if (title.length > 200) return { message: '제목은 200자 이하여야 합니다.', error: true };
  const preheader = input.preheader.trim();
  if (preheader.length > 200)
    return { message: '미리보기 문구는 200자 이하여야 합니다.', error: true };

  const { data, error } = await supabase
    .from('newsletters')
    .update({
      title,
      preheader,
      slug,
      is_advertisement: input.isAdvertisement,
      blocks: blocks as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'draft') // 초안만 수정 가능 — scheduled/sending/sent 잠금
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[update-newsletter] error:', error);
    const isUnique = error.code === '23505';
    return {
      message: isUnique ? '이미 사용 중인 slug입니다.' : '저장에 실패했습니다.',
      error: true,
    };
  }
  if (!data) return { message: '초안 상태에서만 수정할 수 있습니다.', error: true };
  return { message: '저장했습니다.' };
}

export async function deleteNewsletter(id: string): Promise<ActionState> {
  await requireAdmin();
  const supabase = await requireAdminClient();
  const { data, error } = await supabase
    .from('newsletters')
    .delete()
    .eq('id', id)
    .eq('status', 'draft')
    .select('id')
    .maybeSingle();
  if (error) {
    console.error('[delete-newsletter] error:', error);
    return { message: '삭제에 실패했습니다.', error: true };
  }
  if (!data) return { message: '초안 상태에서만 삭제할 수 있습니다.', error: true };
  await logAdminAction('newsletter_deleted', 'newsletter', id, {});
  return { message: '초안을 삭제했습니다.' };
}

export async function duplicateNewsletter(id: string): Promise<ActionState & { id?: string }> {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const source = await getNewsletter(id);
  if (!source) return { message: '원본 뉴스레터를 찾을 수 없습니다.', error: true };

  const { issueNo, slug } = await nextIssueNoAndSlug(supabase);
  const { data, error } = await supabase
    .from('newsletters')
    .insert({
      issue_no: issueNo,
      slug,
      title: source.title,
      preheader: source.preheader,
      blocks: source.blocks as Json,
      status: 'draft',
      is_advertisement: source.is_advertisement,
      audience_channels: source.audience_channels,
      created_by: admin.id,
    })
    .select('id')
    .single();
  if (error || !data) {
    console.error('[duplicate-newsletter] error:', error);
    return { message: '복제에 실패했습니다.', error: true };
  }
  return { message: `제${issueNo}호 초안으로 복제했습니다.`, id: data.id };
}

export async function getNewsletterArtworkSnapshot(
  artworkId: string
): Promise<ActionState & { snapshot?: ArtworkSnapshot }> {
  await requireAdmin();
  const supabase = await requireAdminClient();
  const { data, error } = await supabase
    .from('artworks')
    .select('id, title, description, price, images, artists(name_ko, name_en)')
    .eq('id', artworkId)
    .maybeSingle();
  if (error || !data) return { message: '작품을 찾을 수 없습니다.', error: true };

  const artist = Array.isArray(data.artists) ? data.artists[0] : data.artists;
  const images = Array.isArray(data.images) ? data.images : [];
  const first = typeof images[0] === 'string' ? images[0] : '';
  const imageUrl = first ? resolveArtworkVariantUrl(first, 'card') : '';
  if (!/^https?:\/\//i.test(imageUrl)) {
    return { message: '이 작품은 이메일에 쓸 수 있는 이미지 URL이 없습니다.', error: true };
  }

  return {
    message: 'ok',
    snapshot: {
      title: data.title,
      artistName: (artist?.name_ko as string | null) ?? (artist?.name_en as string | null) ?? '',
      imageUrl,
      description: ((data.description as string | null) ?? '').trim(),
      price: ((data.price as string | null) ?? '').trim(),
      url: `${SITE_URL}/artworks/${data.id}`,
    },
  };
}

export async function renderNewsletterPreview(
  input: PreviewInput
): Promise<ActionState & { html?: string }> {
  await requireAdmin();
  let blocks: NewsletterBlock[];
  try {
    blocks = sanitizeBlocks(parseNewsletterBlocks(input.blocks));
  } catch (err) {
    return { message: err instanceof Error ? err.message : '블록 검증 실패', error: true };
  }
  const html = await render(
    React.createElement(NewsletterEmail, {
      issueNo: input.issueNo,
      title: input.title.trim() || '(제목 없음)',
      preheader: input.preheader,
      blocks,
      isAdvertisement: input.isAdvertisement,
      unsubscribeUrl: `${SITE_URL}/api/email/unsubscribe?invalid=1`,
      webUrl: `${SITE_URL}/newsletter`,
      locale: 'ko',
    })
  );
  return { message: 'ok', html };
}

// 관리자 본인에게 테스트 1통 즉시 발송 (sendTestEmail 패턴).
export async function sendNewsletterTest(id: string): Promise<ActionState> {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const newsletter = await getNewsletter(id);
  if (!newsletter) return { message: '뉴스레터를 찾을 수 없습니다.', error: true };

  let blocks: NewsletterBlock[];
  try {
    blocks = parseNewsletterBlocks(newsletter.blocks);
  } catch (err) {
    return { message: err instanceof Error ? err.message : '블록 검증 실패', error: true };
  }
  if (!newsletter.title.trim() || blocks.length === 0) {
    return { message: '제목과 블록을 먼저 저장하세요.', error: true };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', admin.id)
    .single();
  const to = profile?.email as string | undefined;
  if (!to) return { message: '관리자 이메일을 찾을 수 없습니다.', error: true };

  const unsubToken = generateUnsubscribeToken(hashEmail(to.toLowerCase().trim()), 'individual');
  const unsubscribeUrl = unsubToken
    ? `${SITE_URL}/api/email/unsubscribe?t=${unsubToken}`
    : `${SITE_URL}/api/email/unsubscribe?invalid=1`;

  const html = await render(
    React.createElement(NewsletterEmail, {
      issueNo: newsletter.issue_no,
      title: newsletter.title,
      preheader: newsletter.preheader,
      blocks,
      isAdvertisement: newsletter.is_advertisement,
      unsubscribeUrl,
      webUrl: `${SITE_URL}/newsletter/${newsletter.slug}`,
      locale: 'ko',
    })
  );
  const subject = newsletter.is_advertisement
    ? `(광고) [테스트] ${newsletter.title}`
    : `[테스트] ${newsletter.title}`;
  const result = await sendBatch([
    { from: FROM_EMAIL, to, subject, html, reply_to: buildReplyToAddress() },
  ]);
  if (result.error || result.ids.length === 0) {
    return { message: `테스트 발송 실패: ${result.error ?? '알 수 없는 오류'}`, error: true };
  }
  return { message: `테스트 이메일을 ${to}로 보냈습니다.` };
}

export async function sendNewsletterNow(
  id: string,
  channels: NewsletterChannel[]
): Promise<ActionState> {
  await requireAdmin();
  const supabase = await requireAdminClient();
  if (channels.length === 0) return { message: '발송 채널을 선택하세요.', error: true };

  // 원자적 claim: draft → sending. status 가드 UPDATE라 더블클릭·동시 요청에도 1회만 성공.
  const { data: claimed, error: claimError } = await supabase
    .from('newsletters')
    .update({
      status: 'sending',
      audience_channels: channels,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'draft')
    .select(
      'id, issue_no, slug, title, preheader, blocks, is_advertisement, audience_channels, created_by'
    )
    .maybeSingle();
  if (claimError || !claimed) {
    return {
      message: '발송을 시작할 수 없습니다. (초안 상태가 아니거나 이미 발송 중)',
      error: true,
    };
  }

  // 이미지 URL 검증 — 깨진 URL이면 draft로 복원 후 차단 (파싱 실패는 enqueue가 동일 검증으로 처리)
  try {
    const broken = await findBrokenImageUrl(parseNewsletterBlocks(claimed.blocks));
    if (broken) {
      await supabase
        .from('newsletters')
        .update({ status: 'draft' })
        .eq('id', id)
        .eq('status', 'sending');
      return { message: `이미지 URL이 응답하지 않습니다: ${broken}`, error: true };
    }
  } catch {
    // parseNewsletterBlocks 실패 — 아래 enqueue가 같은 검증으로 에러 메시지를 만들고 draft 복원 경로를 탄다
  }

  const result = await enqueueNewsletterBroadcasts(supabase, claimed as NewsletterSendRow);
  if (result.error) {
    if (result.broadcastIds.length === 0) {
      // 아무 채널도 등록 못 함 — draft로 복원해 재시도 가능하게
      await supabase
        .from('newsletters')
        .update({ status: 'draft' })
        .eq('id', id)
        .eq('status', 'sending');
      return { message: result.error, error: true };
    }
    // 일부 채널은 이미 큐에 올라가 발송된다 — sending 유지, 관리자에게 부분 실패 알림
    return { message: `일부 채널만 등록되었습니다: ${result.error}`, error: true };
  }

  await logAdminAction('newsletter_send', 'newsletter', id, {
    channels,
    recipient_count: result.totalRecipients,
  });
  return {
    message: `${result.totalRecipients.toLocaleString('ko-KR')}명에게 발송을 시작했습니다.`,
  };
}

export async function scheduleNewsletter(
  id: string,
  channels: NewsletterChannel[],
  scheduledAtIso: string
): Promise<ActionState> {
  await requireAdmin();
  const supabase = await requireAdminClient();
  if (channels.length === 0) return { message: '발송 채널을 선택하세요.', error: true };

  const at = new Date(scheduledAtIso);
  if (Number.isNaN(at.getTime()) || at.getTime() < Date.now() + 60_000) {
    return { message: '예약 시각은 최소 1분 이후여야 합니다.', error: true };
  }

  // 원자적 claim: draft → scheduled. status 가드 UPDATE라 검증-저장 사이에 다른 관리자가
  // blocks를 바꿀 수 없다 (updateNewsletter·deleteNewsletter 둘 다 status='draft' 가드).
  // claim 성공 시 returned blocks가 실제 예약된 blocks — TOCTOU 소멸.
  const { data: claimed, error: claimError } = await supabase
    .from('newsletters')
    .update({
      status: 'scheduled',
      scheduled_at: at.toISOString(),
      audience_channels: channels,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('status', 'draft')
    .select('id, blocks')
    .maybeSingle();
  if (claimError || !claimed) {
    return { message: '초안 상태에서만 예약할 수 있습니다.', error: true };
  }

  // claim된 행의 blocks로 이미지 검증 — 검증 실패 시 scheduled → draft 복원
  try {
    const broken = await findBrokenImageUrl(parseNewsletterBlocks(claimed.blocks));
    if (broken) {
      await supabase
        .from('newsletters')
        .update({ status: 'draft', scheduled_at: null })
        .eq('id', id)
        .eq('status', 'scheduled');
      return { message: `이미지 URL이 응답하지 않습니다: ${broken}`, error: true };
    }
  } catch (err) {
    await supabase
      .from('newsletters')
      .update({ status: 'draft', scheduled_at: null })
      .eq('id', id)
      .eq('status', 'scheduled');
    return { message: err instanceof Error ? err.message : '블록 검증 실패', error: true };
  }

  await logAdminAction('newsletter_schedule', 'newsletter', id, {
    channels,
    scheduled_at: at.toISOString(),
  });
  return {
    message: `${at.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} 발송으로 예약했습니다.`,
  };
}

export async function cancelNewsletterSchedule(id: string): Promise<ActionState> {
  await requireAdmin();
  const supabase = await requireAdminClient();
  const { data, error } = await supabase
    .from('newsletters')
    .update({ status: 'draft', scheduled_at: null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'scheduled')
    .select('id')
    .maybeSingle();
  if (error || !data) return { message: '예약 상태가 아닙니다.', error: true };
  return { message: '예약을 취소했습니다. 초안으로 되돌렸습니다.' };
}
