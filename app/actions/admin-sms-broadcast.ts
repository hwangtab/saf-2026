'use server';

import { logAdminAction } from '@/app/actions/activity-log-writer';
import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import { CustomerSmsAudienceResolver } from '@/lib/sms/audiences/customer';
import { MemberSmsAudienceResolver } from '@/lib/sms/audiences/member';
import { PetitionSmsAudienceResolver } from '@/lib/sms/audiences/petition';
import { resolveIndividualSmsRecipients } from '@/lib/sms/audiences/individual';
import type { SmsBroadcastChannel, SmsRecipient } from '@/lib/sms/audiences/types';
import { MAX_DIRECT_RECIPIENTS } from '@/lib/sms/broadcast-segment';
import {
  buildAdvertisementText,
  isNightInKst,
  optOutNumber,
  validateAdvertisementText,
} from '@/lib/sms/broadcast-body';
import { sendSolapiSms } from '@/lib/sms/solapi';
import { normalizeKoreanMobile } from '@/lib/sms/phone';
import type { ActionState } from '@/types';
import type { Json } from '@/types/supabase';

export interface EnqueueSmsBroadcastInput {
  channel: SmsBroadcastChannel; // 'member' | 'customer' | 'petition'
  bodyText: string;
  petitionSlug?: string;
  audienceFilter?: Record<string, unknown>;
}

// 광고 본문을 §50 가드로 보정·검증. 야간이면 차단. ok면 정규화된 본문 반환.
function gateAdvertisementBody(
  bodyText: string
): { ok: true; body: string } | { ok: false; message: string } {
  // 무료수신거부 번호(SMS_OPT_OUT_080) 미설정 시 본문에 placeholder가 박힌 채 통과돼
  // 정통망법 위반 발송으로 이어질 수 있다. enqueue 단계에서 즉시 거부 (M7: placeholder escape 차단).
  if (!process.env.SMS_OPT_OUT_080) {
    return {
      ok: false,
      message:
        '무료수신거부 번호(SMS_OPT_OUT_080)가 설정되지 않아 광고 문자를 발송할 수 없습니다. 운영자에게 080 번호 등록을 요청하세요.',
    };
  }
  if (isNightInKst()) {
    return {
      ok: false,
      message: '광고 문자는 야간(21:00~08:00)에 발송할 수 없습니다. 주간에 다시 시도해 주세요.',
    };
  }
  const corrected = buildAdvertisementText(bodyText, optOutNumber());
  const validation = validateAdvertisementText(corrected);
  if (!validation.ok) {
    return { ok: false, message: validation.reason ?? '광고 본문 검증에 실패했습니다.' };
  }
  return { ok: true, body: corrected };
}

export async function enqueueSmsBroadcast(
  input: EnqueueSmsBroadcastInput
): Promise<ActionState & { broadcastId?: string; deduped?: boolean }> {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const { channel } = input;
  const audienceFilter = input.audienceFilter ?? {};

  if (!input.bodyText.trim()) return { message: '본문은 필수입니다.', error: true };

  let resolver;
  let isAdvertisement = false;
  if (channel === 'member') {
    resolver = new MemberSmsAudienceResolver();
  } else if (channel === 'customer') {
    isAdvertisement = true; // 광범위 고객 마케팅 = 항상 광고(법적)
    resolver = new CustomerSmsAudienceResolver();
  } else if (channel === 'petition') {
    if (!input.petitionSlug) {
      return { message: '청원 채널은 petitionSlug가 필요합니다.', error: true };
    }
    resolver = new PetitionSmsAudienceResolver(input.petitionSlug);
  } else {
    return { message: `채널 '${channel}'은 그룹 발송을 지원하지 않습니다.`, error: true };
  }

  // 광고면 §50 가드(야간·표기·무료거부)를 INSERT 전에 통과시킨다.
  let bodyText = input.bodyText.trim();
  if (isAdvertisement) {
    const gate = gateAdvertisementBody(bodyText);
    if (!gate.ok) return { message: gate.message, error: true };
    bodyText = gate.body;
  }

  let recipients: SmsRecipient[];
  try {
    recipients = await resolver.resolve(audienceFilter);
  } catch (err) {
    console.error('[enqueue-sms-broadcast] resolver error:', err);
    const message = err instanceof Error ? err.message : '수신자 추출 중 오류가 발생했습니다.';
    return { message, error: true };
  }
  if (recipients.length === 0) {
    return { message: '발송 대상 수신자가 없습니다. (전원 수신거부 또는 번호 없음)', error: true };
  }

  // 멱등 가드: 같은 admin·channel·body로 최근 5분 내 큐/발송 중 캠페인이 있으면 기존 ID 반환.
  // petition 채널은 slug까지 일치해야 dedup — 서로 다른 청원에 같은 본문을 보낼 때
  // 두 번째가 첫 번째로 잘못 dedup되어 미발송되던 갭(M4) 방지.
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  let dedupQuery = supabase
    .from('sms_broadcasts')
    .select('id')
    .eq('created_by', admin.id)
    .eq('channel', channel)
    .eq('body_text', bodyText)
    .in('status', ['queued', 'sending'])
    .gt('recipient_count', 0)
    .gte('created_at', fiveMinAgo);
  if (channel === 'petition' && input.petitionSlug) {
    dedupQuery = dedupQuery.eq('audience_filter->>petitionSlug', input.petitionSlug);
  }
  const { data: existing } = await dedupQuery
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return {
      message:
        '같은 채널·본문의 캠페인이 최근 5분 내에 이미 등록돼 발송 중입니다. 새로 발송되지 않았습니다.',
      broadcastId: existing.id,
      deduped: true,
    };
  }

  // petition 채널은 petitionSlug를 audience_filter에 포함해 저장 (sms_broadcasts에 별도 컬럼 없음).
  const finalAudienceFilter =
    channel === 'petition' && input.petitionSlug
      ? { ...audienceFilter, petitionSlug: input.petitionSlug }
      : audienceFilter;

  const { data: broadcast, error: broadcastError } = await supabase
    .from('sms_broadcasts')
    .insert({
      channel,
      body_text: bodyText,
      audience_filter: finalAudienceFilter as Json,
      is_advertisement: isAdvertisement,
      status: 'queued',
      recipient_count: recipients.length,
      created_by: admin.id,
      queued_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (broadcastError || !broadcast) {
    console.error('[enqueue-sms-broadcast] insert broadcast error:', broadcastError);
    return { message: '캠페인 생성에 실패했습니다.', error: true };
  }

  const rows = recipients.map((r) => ({
    broadcast_id: broadcast.id,
    phone: r.phone,
    name: r.name,
    status: 'pending',
  }));
  const { error: recipientsError } = await supabase.from('sms_broadcast_recipients').insert(rows);
  if (recipientsError) {
    await supabase.from('sms_broadcasts').update({ status: 'failed' }).eq('id', broadcast.id);
    console.error('[enqueue-sms-broadcast] insert recipients error:', recipientsError);
    return { message: '수신자 큐 등록에 실패했습니다.', error: true };
  }

  await logAdminAction('sms_broadcast_enqueued', 'sms_broadcast', broadcast.id, {
    channel,
    recipient_count: recipients.length,
    is_advertisement: isAdvertisement,
  });

  return { message: `${recipients.length}명에게 발송을 시작했습니다.`, broadcastId: broadcast.id };
}

export async function enqueueIndividualSmsBroadcast(input: {
  contacts: Array<{ phone: string; name: string | null }>;
  bodyText: string;
  isAdvertisement: boolean;
}): Promise<ActionState & { broadcastId?: string; deduped?: boolean }> {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const { contacts, isAdvertisement } = input;

  if (!input.bodyText.trim()) return { message: '본문은 필수입니다.', error: true };
  if (contacts.length === 0) return { message: '수신자를 1명 이상 선택하세요.', error: true };
  if (contacts.length > MAX_DIRECT_RECIPIENTS) {
    return {
      message: `직접 지정은 한 번에 최대 ${MAX_DIRECT_RECIPIENTS.toLocaleString('ko-KR')}명까지 보낼 수 있습니다. (${contacts.length.toLocaleString('ko-KR')}명 선택됨)`,
      error: true,
    };
  }

  let bodyText = input.bodyText.trim();
  if (isAdvertisement) {
    const gate = gateAdvertisementBody(bodyText);
    if (!gate.ok) return { message: gate.message, error: true };
    bodyText = gate.body;
  }

  const rows = await resolveIndividualSmsRecipients(contacts, isAdvertisement, supabase);
  if (rows.length === 0) {
    return { message: '발송 가능한 수신자가 없습니다. (전원 수신거부 또는 비-010)', error: true };
  }

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: existingBroadcast } = await supabase
    .from('sms_broadcasts')
    .select('id')
    .eq('created_by', admin.id)
    .eq('channel', 'individual')
    .eq('body_text', bodyText)
    .in('status', ['queued', 'sending'])
    .gt('recipient_count', 0)
    .gte('created_at', fiveMinAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingBroadcast?.id) {
    return {
      message:
        '같은 본문의 개별 발송이 최근 5분 내에 이미 등록돼 발송 중입니다. 새로 발송되지 않았습니다.',
      broadcastId: existingBroadcast.id,
      deduped: true,
    };
  }

  const { data: broadcast, error: bErr } = await supabase
    .from('sms_broadcasts')
    .insert({
      channel: 'individual',
      body_text: bodyText,
      audience_filter: { mode: 'direct' } as Json,
      is_advertisement: isAdvertisement,
      status: 'queued',
      recipient_count: rows.length,
      created_by: admin.id,
      queued_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (bErr || !broadcast) {
    console.error('[enqueue-individual-sms] insert broadcast error:', bErr);
    return { message: '캠페인 생성에 실패했습니다.', error: true };
  }

  const { error: rErr } = await supabase
    .from('sms_broadcast_recipients')
    .insert(rows.map((r) => ({ ...r, broadcast_id: broadcast.id })));
  if (rErr) {
    await supabase.from('sms_broadcasts').update({ status: 'failed' }).eq('id', broadcast.id);
    return { message: '수신자 큐 등록에 실패했습니다.', error: true };
  }

  await logAdminAction('sms_broadcast_enqueued', 'sms_broadcast', broadcast.id, {
    channel: 'individual',
    recipient_count: rows.length,
    is_advertisement: isAdvertisement,
  });
  return { message: `${rows.length}명에게 발송을 시작했습니다.`, broadcastId: broadcast.id };
}

export type SmsPageQuery = { page?: number; pageSize?: number };

export type SmsBroadcastRow = {
  id: string;
  channel: string;
  body_text: string;
  status: string;
  is_advertisement: boolean | null;
  recipient_count: number | null;
  sent_count: number | null;
  failed_count: number | null;
  created_at: string | null;
  queued_at: string | null;
  sent_at: string | null;
};

export type SmsPaginatedResult<T> = { rows: T[]; total: number; page: number; pageSize: number };

const DEFAULT_SMS_PAGE_SIZE = 25;
const MAX_SMS_PAGE_SIZE = 100;

function normalizeSmsPageQuery(query: SmsPageQuery = {}) {
  const page = Math.max(1, Math.floor(Number(query.page) || 1));
  const requested = Math.floor(Number(query.pageSize) || DEFAULT_SMS_PAGE_SIZE);
  const pageSize = Math.min(MAX_SMS_PAGE_SIZE, Math.max(1, requested));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { page, pageSize, from, to };
}

export async function getSmsBroadcasts(
  query: SmsPageQuery = {}
): Promise<SmsPaginatedResult<SmsBroadcastRow>> {
  await requireAdmin();
  const supabase = await requireAdminClient();
  const { page, pageSize, from, to } = normalizeSmsPageQuery(query);

  const { data, error, count } = await supabase
    .from('sms_broadcasts')
    .select(
      'id, channel, body_text, status, is_advertisement, recipient_count, sent_count, failed_count, created_at, queued_at, sent_at',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('[get-sms-broadcasts] error:', error);
    return { rows: [], total: 0, page, pageSize };
  }
  return {
    rows: (data ?? []) as SmsBroadcastRow[],
    total: typeof count === 'number' ? count : (data?.length ?? 0),
    page,
    pageSize,
  };
}

export async function previewSmsAudience(
  channel: SmsBroadcastChannel,
  filter?: { subset?: 'all' | 'artist' | 'exhibitor'; petitionSlug?: string }
): Promise<{ total: number; breakdown: Record<string, number> }> {
  await requireAdmin();
  // SMS는 email의 count_*_audience RPC가 없으므로 resolver로 직접 계산.
  if (channel === 'member') {
    const subset = filter?.subset ?? 'all';
    const total = (await new MemberSmsAudienceResolver().resolve({ subset })).length;
    const label = subset === 'artist' ? '작가' : subset === 'exhibitor' ? '출품자' : '작가·출품자';
    return { total, breakdown: { [label]: total } };
  }
  if (channel === 'customer') {
    const total = (await new CustomerSmsAudienceResolver().resolve()).length;
    return { total, breakdown: { '동의자·거래고객': total } };
  }
  if (channel === 'petition') {
    if (!filter?.petitionSlug) return { total: 0, breakdown: { '(청원 선택 필요)': 0 } };
    const total = (await new PetitionSmsAudienceResolver(filter.petitionSlug).resolve()).length;
    return { total, breakdown: { 서명자: total } };
  }
  return { total: 0, breakdown: {} };
}

// 실패한 수신자를 다시 pending으로 되돌려 cron 재발송을 트리거한다.
// 광고 §50 야간 차단 및 무료수신거부 검증은 dispatch cron이 재개 시 자동 재적용한다.
export async function retryFailedRecipients(
  broadcastId: string
): Promise<ActionState & { retried?: number }> {
  await requireAdmin();
  const supabase = await requireAdminClient();

  // 브로드캐스트 상태 로드
  const { data: broadcast, error: fetchError } = await supabase
    .from('sms_broadcasts')
    .select('id, status, failed_count')
    .eq('id', broadcastId)
    .single();

  if (fetchError || !broadcast) {
    return { message: '캠페인을 찾을 수 없습니다.', error: true };
  }
  if (!['sent', 'failed'].includes(broadcast.status)) {
    return {
      message: '발송이 완료된(sent/failed) 캠페인만 재시도할 수 있습니다.',
      error: true,
    };
  }
  const failedCount = broadcast.failed_count ?? 0;
  if (failedCount === 0) {
    return { message: '실패한 수신자가 없습니다.', error: true };
  }

  // 실패 수신자를 pending으로 복원 (error, provider_message_id, sent_at 초기화)
  const { error: recipientsError } = await supabase
    .from('sms_broadcast_recipients')
    .update({
      status: 'pending',
      error: null,
      provider_message_id: null,
      sent_at: null,
    })
    .eq('broadcast_id', broadcastId)
    .eq('status', 'failed');

  if (recipientsError) {
    console.error('[retry-failed-recipients] recipients update error:', recipientsError);
    return { message: '수신자 상태 복원에 실패했습니다.', error: true };
  }

  // 브로드캐스트를 queued로 되돌려 cron이 재개하도록 한다.
  // failed_count를 0으로 리셋 — cron이 청크 완료 후 재집계함.
  // sent_count는 유지 (이미 발송된 건 보존).
  const { error: broadcastError } = await supabase
    .from('sms_broadcasts')
    .update({
      status: 'queued',
      failed_count: 0,
      dispatch_lock_token: null,
      dispatch_locked_until: null,
    })
    .eq('id', broadcastId);

  if (broadcastError) {
    console.error('[retry-failed-recipients] broadcast update error:', broadcastError);
    return { message: '캠페인 상태 업데이트에 실패했습니다.', error: true };
  }

  await logAdminAction('sms_broadcast_retry', 'sms_broadcast', broadcastId, {
    retried: failedCount,
  });

  return {
    message: `${failedCount.toLocaleString('ko-KR')}명에게 재발송을 시작했습니다.`,
    retried: failedCount,
  };
}

// 큐 대기 중이거나 발송 중인 캠페인을 취소한다.
// sending 상태에서 취소 시 dispatch cron의 while 루프가 다음 청크에서 status를 재확인하고 중단한다.
export async function cancelBroadcast(broadcastId: string): Promise<ActionState> {
  await requireAdmin();
  const supabase = await requireAdminClient();

  const { data: broadcast, error: fetchError } = await supabase
    .from('sms_broadcasts')
    .select('id, status')
    .eq('id', broadcastId)
    .single();

  if (fetchError || !broadcast) {
    return { message: '캠페인을 찾을 수 없습니다.', error: true };
  }

  if (!['queued', 'sending'].includes(broadcast.status)) {
    return {
      message:
        '이미 발송 완료/취소된 캠페인입니다. 발송 대기(queued) 또는 발송 중(sending) 상태만 취소할 수 있습니다.',
      error: true,
    };
  }

  // sending 중이라면 lock token을 보유한 cron run이 있을 수 있다.
  // dispatch cron의 while 루프가 다음 청크 시작 시 status를 재확인하고 중단하므로
  // lock token 없이 status만 cancelled로 변경해도 안전하다.
  const { error: updateError } = await supabase
    .from('sms_broadcasts')
    .update({
      status: 'cancelled',
      dispatch_lock_token: null,
      dispatch_locked_until: null,
    })
    .eq('id', broadcastId);

  if (updateError) {
    console.error('[cancel-broadcast] update error:', updateError);
    return { message: '캠페인 취소에 실패했습니다.', error: true };
  }

  await logAdminAction('sms_broadcast_cancel', 'sms_broadcast', broadcastId, {
    previous_status: broadcast.status,
  });

  return { message: '캠페인 발송을 취소했습니다.' };
}

// 작성 중인 본문으로 관리자 본인 번호에 테스트 1통 즉시 발송(큐 우회).
export async function sendTestSms(input: {
  bodyText: string;
  isAdvertisement: boolean;
}): Promise<ActionState> {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  if (!input.bodyText.trim()) return { message: '본문은 필수입니다.', error: true };

  const { data: profile } = await supabase
    .from('profiles')
    .select('phone, name')
    .eq('id', admin.id)
    .single();
  const to = normalizeKoreanMobile(profile?.phone as string | null);
  if (!to) {
    return { message: '관리자 전화번호(010)가 마이페이지에 등록되어 있지 않습니다.', error: true };
  }

  let bodyText = input.bodyText.trim();
  if (input.isAdvertisement) {
    const gate = gateAdvertisementBody(bodyText);
    if (!gate.ok) return { message: gate.message, error: true };
    bodyText = `[테스트] ${gate.body}`;
  } else {
    bodyText = `[테스트] ${bodyText}`;
  }

  const result = await sendSolapiSms({ to, text: bodyText });
  if (!result.ok) {
    return { message: `테스트 발송 실패: ${result.error ?? '알 수 없는 오류'}`, error: true };
  }
  return { message: `테스트 SMS를 ${to}로 보냈습니다.` };
}
