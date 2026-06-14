import type { ActionState } from '@/types';
import type { Json } from '@/types/supabase';
import type { ResendWebhookEvent } from './resend-webhook';

const RESEND_API_BASE = 'https://api.resend.com';
const DEFAULT_REPLY_DOMAIN = 'saf2026.com';
const DEFAULT_REPLY_LOCAL_PART = 'hello';

type SupabaseLike = {
  from: (table: string) => any;
};

export type ReceivedEmailContent = {
  id?: string;
  html?: string | null;
  text?: string | null;
  headers?: Record<string, string> | null;
  attachments?: unknown[] | null;
  message_id?: string | null;
};

function asArray(value: string[] | string | undefined): string[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return [value];
  return [];
}

function sanitizeCorrelationId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '');
}

function normalizeHeaderValue(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return null;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractPlusTag(address: string): string | null {
  const match = address.match(/^[^@\s+]+\+([^@\s]+)@/);
  return match?.[1] ? sanitizeCorrelationId(match[1]) : null;
}

export function buildReplyToAddress(correlationId?: string | null): string {
  const domain = process.env.RESEND_REPLY_DOMAIN ?? DEFAULT_REPLY_DOMAIN;
  const cleaned = correlationId ? sanitizeCorrelationId(correlationId) : '';
  return cleaned
    ? `${DEFAULT_REPLY_LOCAL_PART}+${cleaned}@${domain}`
    : `${DEFAULT_REPLY_LOCAL_PART}@${domain}`;
}

export function buildReplyFromAddress(displayName = '씨앗페'): string {
  return `${displayName} <${buildReplyToAddress()}>`;
}

export function buildReplyHeaders(messageId: string | null, referencesHeader?: string | null) {
  if (!messageId) return {};
  const references = referencesHeader?.trim()
    ? `${referencesHeader.trim()} ${messageId}`
    : messageId;
  return {
    'In-Reply-To': messageId,
    References: references,
  };
}

export async function fetchReceivedEmail(
  emailId: string,
  apiKey: string
): Promise<ReceivedEmailContent> {
  const res = await fetch(
    `${RESEND_API_BASE}/emails/receiving/${encodeURIComponent(emailId)}?html_format=cid`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as ReceivedEmailContent;
}

async function findMatchedRecipientId(
  supabase: SupabaseLike,
  event: ResendWebhookEvent,
  content?: ReceivedEmailContent
): Promise<string | null> {
  for (const address of asArray(event.data.to)) {
    const tag = extractPlusTag(address);
    if (tag) {
      const { data } = await supabase
        .from('email_broadcast_recipients')
        .select('id')
        .eq('id', tag)
        .limit(1)
        .maybeSingle();
      if (data?.id) return data.id as string;
    }
  }

  const headers = content?.headers ?? {};
  const candidates = [
    normalizeHeaderValue(headers['in-reply-to']),
    normalizeHeaderValue(headers['In-Reply-To']),
    normalizeHeaderValue(event.data.message_id),
  ].filter(Boolean) as string[];

  for (const value of candidates) {
    const { data } = await supabase
      .from('email_broadcast_recipients')
      .select('id')
      .eq('resend_id', value)
      .limit(1)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }

  return null;
}

export async function processInboundEmail(
  event: ResendWebhookEvent,
  supabase: SupabaseLike
): Promise<{ id: string; isNew: boolean }> {
  if (event.type !== 'email.received') throw new Error(`Unsupported event type: ${event.type}`);
  const emailId = event.data.email_id;
  if (!emailId) throw new Error('Missing email_id');

  const apiKey = process.env.RESEND_INBOUND_API_KEY ?? process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY not set');

  const basePayload = {
    resend_email_id: emailId,
    message_id: event.data.message_id ?? null,
    from_email: event.data.from ?? null,
    to_emails: asArray(event.data.to),
    cc_emails: asArray(event.data.cc),
    subject: event.data.subject ?? null,
    attachments: (event.data.attachments ?? []) as unknown as Json,
    status: 'new',
    received_at: event.data.created_at ?? event.created_at ?? new Date().toISOString(),
  };

  // status='new'는 신규 insert에서만 적용. 웹훅 재시도(at-least-once)로 같은 resend_email_id가
  // 다시 들어와도 read/replied로 처리한 상태를 'new'로 되돌리지 않게 ON CONFLICT DO NOTHING (M3).
  const { data: insertedRows, error: insertError } = await supabase
    .from('email_inbound_messages')
    .upsert(basePayload, { onConflict: 'resend_email_id', ignoreDuplicates: true })
    .select('id');
  if (insertError) throw new Error(insertError.message ?? 'Inbound upsert failed');

  const isNew = (insertedRows?.length ?? 0) > 0;
  let inboundId = insertedRows?.[0]?.id as string | undefined;
  if (!inboundId) {
    // 충돌(이미 존재)으로 insert가 no-op이면 기존 행의 id를 다시 조회.
    const { data: existing } = await supabase
      .from('email_inbound_messages')
      .select('id')
      .eq('resend_email_id', emailId)
      .maybeSingle();
    inboundId = existing?.id as string | undefined;
  }
  if (!inboundId) throw new Error('Inbound upsert failed: no id');

  const content = await fetchReceivedEmail(emailId, apiKey);
  const headers = content.headers ?? {};
  const matchedRecipientId = await findMatchedRecipientId(supabase, event, content);
  const inReplyTo =
    normalizeHeaderValue(headers['in-reply-to']) ?? normalizeHeaderValue(headers['In-Reply-To']);
  const referencesHeader =
    normalizeHeaderValue(headers.references) ?? normalizeHeaderValue(headers.References);

  // 본문/매칭 등 enrich. status는 의도적으로 제외 — 재처리 시 관리자 상태 보존(M3).
  const { status: _status, ...baseWithoutStatus } = basePayload;
  const payload = {
    ...baseWithoutStatus,
    message_id: event.data.message_id ?? content.message_id ?? null,
    in_reply_to: inReplyTo,
    references_header: referencesHeader,
    from_email: event.data.from ?? content.headers?.from ?? null,
    text_body: content.text ?? null,
    html_body: content.html ?? null,
    headers: (headers ?? {}) as Json,
    attachments: (content.attachments ?? event.data.attachments ?? []) as unknown as Json,
    matched_broadcast_recipient_id: matchedRecipientId,
  };

  const { error: updateError } = await supabase
    .from('email_inbound_messages')
    .update(payload)
    .eq('id', inboundId);
  if (updateError) throw new Error(updateError.message ?? 'Inbound update failed');

  return { id: inboundId, isNew };
}

export async function notifyInboundEmail(
  event: ResendWebhookEvent,
  inboundId: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  const toRaw = process.env.NOTIFY_EMAIL_TO;
  if (!apiKey || !from || !toRaw) return;

  const to = toRaw.includes(',')
    ? toRaw
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
    : toRaw;
  const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.saf2026.com'}/admin/email`;
  const subject = `[씨앗페] 이메일 회신 수신: ${event.data.subject ?? '(제목 없음)'}`;
  const html = `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;line-height:1.6;">
    <h2>이메일 회신이 도착했습니다</h2>
    <p><strong>보낸 사람:</strong> ${escapeHtml(event.data.from ?? '확인 중')}</p>
    <p><strong>제목:</strong> ${escapeHtml(event.data.subject ?? '(제목 없음)')}</p>
    <p><strong>수신 ID:</strong> ${escapeHtml(inboundId)}</p>
    <p><a href="${adminUrl}">관리자 이메일 화면에서 확인</a></p>
  </body></html>`;

  const res = await fetch(`${RESEND_API_BASE}/emails`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[inbound-email] notify failed:', res.status, text.slice(0, 200));
  }
}

export async function sendInboundReply({
  supabase,
  inboundId,
  body,
  apiKey,
  adminId,
}: {
  supabase: SupabaseLike;
  inboundId: string;
  body: string;
  apiKey: string;
  adminId: string;
}): Promise<ActionState> {
  const trimmed = body.trim();
  if (!trimmed) return { message: '답장 본문을 입력해주세요.', error: true };

  const { data: inbound, error } = await supabase
    .from('email_inbound_messages')
    .select('id, from_email, subject, message_id, references_header')
    .eq('id', inboundId)
    .maybeSingle();
  if (error || !inbound) return { message: '받은 회신을 찾을 수 없습니다.', error: true };

  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) return { message: 'RESEND_FROM_EMAIL이 설정되지 않았습니다.', error: true };

  const subject = String(inbound.subject ?? '')
    .toLowerCase()
    .startsWith('re:')
    ? (inbound.subject as string)
    : `Re: ${inbound.subject ?? '(제목 없음)'}`;
  const headers = buildReplyHeaders(
    (inbound.message_id as string | null) ?? null,
    (inbound.references_header as string | null) ?? null
  );
  const html = `<div>${escapeHtml(trimmed).replace(/\n/g, '<br>')}</div>`;

  const res = await fetch(`${RESEND_API_BASE}/emails`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [inbound.from_email],
      subject,
      html,
      text: trimmed,
      headers,
      reply_to: buildReplyToAddress(),
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { message: `답장 발송 실패: Resend ${res.status} ${text.slice(0, 160)}`, error: true };
  }

  const sent = (await res.json().catch(() => ({}))) as { id?: string };
  const { error: updateError } = await supabase
    .from('email_inbound_messages')
    .update({
      status: 'replied',
      replied_at: new Date().toISOString(),
      replied_by: adminId,
      reply_resend_id: sent.id ?? null,
    })
    .eq('id', inboundId);
  if (updateError) return { message: '답장은 발송됐지만 상태 저장에 실패했습니다.', error: true };

  return { message: '답장을 발송했습니다.' };
}
