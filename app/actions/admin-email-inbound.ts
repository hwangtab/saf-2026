'use server';

import { revalidatePath } from 'next/cache';

import { logAdminAction } from '@/app/actions/activity-log-writer';
import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import { sendInboundReply } from '@/lib/email/inbound';
import type { ActionState } from '@/types';
import type { Json } from '@/types/supabase';

export type InboundEmailRow = {
  id: string;
  resend_email_id: string;
  message_id: string | null;
  from_email: string | null;
  to_emails: string[];
  cc_emails: string[];
  subject: string | null;
  text_body: string | null;
  html_body: string | null;
  headers: Json;
  attachments: Json;
  status: string;
  matched_broadcast_recipient_id: string | null;
  received_at: string;
  replied_at: string | null;
  reply_resend_id: string | null;
};

export type InboundEmailPageQuery = {
  page?: number;
  pageSize?: number;
};

export type InboundEmailPaginatedResult = {
  rows: InboundEmailRow[];
  total: number;
  page: number;
  pageSize: number;
};

const DEFAULT_INBOUND_EMAIL_PAGE_SIZE = 25;
const MAX_INBOUND_EMAIL_PAGE_SIZE = 100;

function normalizeInboundEmailPageQuery(query: InboundEmailPageQuery = {}) {
  const page = Math.max(1, Math.floor(Number(query.page) || 1));
  const requestedPageSize = Math.floor(Number(query.pageSize) || DEFAULT_INBOUND_EMAIL_PAGE_SIZE);
  const pageSize = Math.min(MAX_INBOUND_EMAIL_PAGE_SIZE, Math.max(1, requestedPageSize));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { page, pageSize, from, to };
}

export async function getInboundMessages(
  query: InboundEmailPageQuery = {}
): Promise<InboundEmailPaginatedResult> {
  await requireAdmin();
  const supabase = await requireAdminClient();
  const { page, pageSize, from, to } = normalizeInboundEmailPageQuery(query);

  const { data, error, count } = await supabase
    .from('email_inbound_messages')
    .select(
      'id, resend_email_id, message_id, from_email, to_emails, cc_emails, subject, text_body, html_body, headers, attachments, status, matched_broadcast_recipient_id, received_at, replied_at, reply_resend_id',
      { count: 'exact' }
    )
    .order('received_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('[get-inbound-messages] error:', error);
    return { rows: [], total: 0, page, pageSize };
  }

  return {
    rows: (data ?? []) as InboundEmailRow[],
    total: typeof count === 'number' ? count : data?.length ?? 0,
    page,
    pageSize,
  };
}

export async function replyToInboundMessage(input: {
  inboundId: string;
  body: string;
}): Promise<ActionState> {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { message: 'RESEND_API_KEY가 설정되지 않았습니다.', error: true };

  const result = await sendInboundReply({
    supabase,
    inboundId: input.inboundId,
    body: input.body,
    apiKey,
    adminId: admin.id,
  });

  if (!result.error) {
    await logAdminAction('email_inbound_replied', 'email_inbound_message', input.inboundId, {
      inbound_id: input.inboundId,
    });
    revalidatePath('/admin/email');
  }

  return result;
}
