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

export async function getInboundMessages(): Promise<InboundEmailRow[]> {
  await requireAdmin();
  const supabase = await requireAdminClient();

  const { data, error } = await supabase
    .from('email_inbound_messages')
    .select(
      'id, resend_email_id, message_id, from_email, to_emails, cc_emails, subject, text_body, html_body, headers, attachments, status, matched_broadcast_recipient_id, received_at, replied_at, reply_resend_id'
    )
    .order('received_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[get-inbound-messages] error:', error);
    return [];
  }

  return (data ?? []) as InboundEmailRow[];
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
