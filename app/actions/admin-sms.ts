'use server';

import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import { logAdminAction } from '@/app/actions/activity-log-writer';
import { sendBuyerSms, type BuyerSmsType, type BuyerSmsData } from '@/lib/sms/buyer-sms';

export type SmsLogRow = {
  id: string;
  order_no: string | null;
  to_phone: string;
  type: string;
  provider: string;
  provider_message_id: string | null;
  status: string;
  segment: string | null;
  error: string | null;
  created_at: string;
};

export type SmsLogsParams = {
  page?: number;
  pageSize?: number;
  type?: string;
  status?: string;
  from?: string;
  to?: string;
  q?: string;
};

export type SmsLogsResult = {
  rows: SmsLogRow[];
  total: number;
  page: number;
  pageSize: number;
};

const DEFAULT_SMS_PAGE_SIZE = 25;
const MAX_SMS_PAGE_SIZE = 100;

function normalizeSmsPageQuery(params: SmsLogsParams) {
  const page = Math.max(1, Math.floor(Number(params.page) || 1));
  const requested = Math.floor(Number(params.pageSize) || DEFAULT_SMS_PAGE_SIZE);
  const pageSize = Math.min(MAX_SMS_PAGE_SIZE, Math.max(1, requested));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { page, pageSize, from, to };
}

export async function getSmsLogs(params: SmsLogsParams = {}): Promise<SmsLogsResult> {
  await requireAdmin();

  const supabase = await requireAdminClient();
  const { page, pageSize, from, to } = normalizeSmsPageQuery(params);

  let query = supabase
    .from('sms_logs')
    .select(
      'id, order_no, to_phone, type, provider, provider_message_id, status, segment, error, created_at',
      { count: 'exact' }
    );

  if (params.type) query = query.eq('type', params.type);
  if (params.status) query = query.eq('status', params.status);
  if (params.from) query = query.gte('created_at', `${params.from}T00:00:00.000Z`);
  if (params.to) query = query.lte('created_at', `${params.to}T23:59:59.999Z`);
  if (params.q && params.q.trim()) {
    const term = params.q
      .trim()
      .slice(0, 100)
      .replace(/[,()"\\%_*]/g, '');
    query = query.or(`to_phone.ilike.%${term}%,order_no.ilike.%${term}%`);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('[get-sms-logs] error:', error);
    return { rows: [], total: 0, page, pageSize };
  }

  return {
    rows: (data ?? []) as SmsLogRow[],
    total: typeof count === 'number' ? count : (data?.length ?? 0),
    page,
    pageSize,
  };
}

const RESENDABLE_TYPES = new Set<BuyerSmsType>([
  'payment_confirmed',
  // virtual_account_issued 제외: 계좌 정보(은행/계좌번호/입금기한)가 orders에 저장되지 않아
  // 재발송 시 깨진 본문(입금안내: / / ₩...)이 구매자에게 전송됨
  'deposit_confirmed',
  'shipped',
  'delivered',
  'refunded',
  'auto_cancelled',
]);

function extractLocale(metadata: unknown): 'ko' | 'en' {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return 'ko';
  return (metadata as Record<string, unknown>).locale === 'en' ? 'en' : 'ko';
}

export async function resendSms(logId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await requireAdminClient();

  const { data: logData, error: logError } = await supabase
    .from('sms_logs')
    .select('id, order_no, to_phone, type, status')
    .eq('id', logId)
    .maybeSingle();

  const log = logData;
  if (logError || !log) {
    return { ok: false, error: '발송 로그를 찾을 수 없습니다.' };
  }
  if (!log.order_no) {
    return { ok: false, error: '주문번호가 없는 로그는 재발송할 수 없습니다.' };
  }
  if (!RESENDABLE_TYPES.has(log.type as BuyerSmsType)) {
    return { ok: false, error: `재발송할 수 없는 유형입니다: ${log.type}` };
  }

  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .select(
      'order_no, buyer_name, buyer_phone, total_amount, shipping_carrier, tracking_number, metadata, artworks(title)'
    )
    .eq('order_no', log.order_no)
    .maybeSingle();

  const order = orderData;
  if (orderError || !order) {
    return { ok: false, error: '원본 주문을 찾을 수 없습니다.' };
  }

  const artwork = Array.isArray(order.artworks) ? order.artworks[0] : order.artworks;
  const type = log.type as BuyerSmsType;
  const locale = extractLocale(order.metadata);
  const data: BuyerSmsData = {
    buyerName: order.buyer_name ?? '',
    artworkTitle: (artwork?.title as string | undefined) ?? '',
    amount: order.total_amount ?? 0,
    carrier: order.shipping_carrier ?? undefined,
    trackingNumber: order.tracking_number ?? undefined,
  };

  try {
    await sendBuyerSms(order.buyer_phone, type, data, locale, order.order_no);
  } catch (err) {
    console.error('[resend-sms] send failed:', err);
    return { ok: false, error: '재발송 중 오류가 발생했습니다.' };
  }

  await logAdminAction('sms_resent', 'sms_log', logId, {
    order_no: log.order_no,
    type,
    to_phone: log.to_phone,
  });

  return { ok: true };
}
