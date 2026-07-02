'use server';

import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import { sendBuyerEmail, type BuyerEmailType, type BuyerEmailData } from '@/lib/notify';
import { getOrderNotificationInfo } from '@/lib/utils/get-order-notification-info';
import { isResendableEmailType } from '@/lib/email/resendable-email-types';

export type EmailLogRow = {
  id: string;
  order_no: string | null;
  to_email: string;
  type: string;
  subject: string | null;
  status: string;
  error: string | null;
  provider_message_id: string | null;
  created_at: string;
};

export type EmailLogsParams = { status?: 'sent' | 'failed'; limit?: number };
export type EmailLogsResult = { logs: EmailLogRow[] };

const MAX_LIMIT = 200;

export async function getEmailLogs(params: EmailLogsParams = {}): Promise<EmailLogsResult> {
  await requireAdmin();
  const supabase = await requireAdminClient();

  const limit = Math.min(params.limit ?? 100, MAX_LIMIT);
  let query = supabase
    .from('email_logs')
    .select('id, order_no, to_email, type, subject, status, error, provider_message_id, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (params.status) query = query.eq('status', params.status);

  const { data, error } = await query;
  if (error) {
    console.error('[admin-email-logs] fetch failed:', error);
    return { logs: [] };
  }
  return { logs: (data ?? []) as EmailLogRow[] };
}

export async function resendEmailLog(
  logId: string
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await requireAdminClient();

  const { data: log } = await supabase
    .from('email_logs')
    .select('id, order_no, to_email, type, status')
    .eq('id', logId)
    .maybeSingle();

  if (!log) return { ok: false, error: '로그를 찾을 수 없습니다.' };
  if (log.status !== 'failed') {
    return { ok: false, error: '이미 발송된 건은 재발송할 수 없습니다.' };
  }
  if (!log.order_no) {
    return { ok: false, error: '주문번호가 없는 로그는 재발송할 수 없습니다.' };
  }
  if (!isResendableEmailType(log.type)) {
    return { ok: false, error: `재발송할 수 없는 유형입니다: ${log.type}` };
  }

  const info = await getOrderNotificationInfo(supabase, { orderNo: log.order_no });
  if (!info) return { ok: false, error: '원본 주문 정보를 찾을 수 없습니다.' };

  const type = log.type as BuyerEmailType;
  const data: BuyerEmailData = {
    orderNo: info.orderNo,
    buyerName: info.buyerName,
    artworkTitle: info.artworkTitle,
    artistName: info.artistName,
    amount: info.totalAmount,
    itemAmount: info.itemAmount,
    shippingAmount: info.shippingAmount,
    shipping: {
      name: info.shippingName,
      phone: info.shippingPhone,
      address: info.shippingAddress,
      memo: info.shippingMemo,
    },
  };

  if (type === 'shipped') {
    const { data: order } = await supabase
      .from('orders')
      .select('shipping_carrier, tracking_number')
      .eq('order_no', log.order_no)
      .maybeSingle();
    data.carrier = order?.shipping_carrier ?? undefined;
    data.trackingNumber = order?.tracking_number ?? undefined;
  }

  // 수신자는 원본 로그의 to_email 사용(주문 이메일과 다를 수 있음). sendBuyerEmail이 결과를 email_logs에 재기록.
  const result = await sendBuyerEmail(log.to_email, type, data, info.locale);
  if (!result) return { ok: false, error: '이메일 발송이 설정되지 않았습니다(RESEND 미설정).' };
  if (!result.ok) return { ok: false, error: result.error ?? '재발송에 실패했습니다.' };
  return { ok: true };
}
