'use server';

import { headers } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { cancelPayment } from '@/lib/integrations/toss/cancel';
import { deriveAndSyncArtworkStatus } from '@/app/actions/admin-artworks';
import { sendBuyerEmail } from '@/lib/notify';
import { getArtworkEmailInfo } from '@/lib/utils/get-artwork-email-info';
import { rateLimit } from '@/lib/rate-limit';

/** Strip non-digits and normalise +82 → 0 prefix */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  // +821012345678 → 821012345678 → 01012345678
  if (digits.startsWith('82') && digits.length > 10) {
    return '0' + digits.slice(2);
  }
  return digits;
}

export type OrderListItem = {
  orderNo: string;
  status: string;
  artworkTitle: string;
  artworkImage: string | null;
  totalAmount: number;
  createdAt: string;
};

export type OrderPublicInfo = {
  orderNo: string;
  status: string;
  artworkTitle: string;
  artworkImage: string | null;
  artistName: string;
  itemAmount: number;
  shippingAmount: number;
  totalAmount: number;
  paymentMethod: string | null;
  paidAt: string | null;
  createdAt: string;
  shippingName: string;
  shippingPhone: string | null;
  shippingAddress: string;
  shippingAddressDetail: string | null;
  shippingMemo: string | null;
  shippingCarrier: string | null;
  trackingNumber: string | null;
  virtualAccount: {
    bankName: string;
    accountNumber: string;
    dueDate: string;
  } | null;
};

export type OrderLookupListResult =
  | { success: true; orders: OrderListItem[] }
  | { success: false; error: string };

export type OrderDetailResult =
  | { success: true; order: OrderPublicInfo }
  | { success: false; error: string };

export async function lookupOrders(
  name: string,
  email: string,
  phone: string
): Promise<OrderLookupListResult> {
  // Rate limiting — IP 기준 분당 5회
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(`lookupOrders:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!rl.success) {
    return { success: false, error: 'RATE_LIMITED' };
  }

  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedPhone = normalizePhone(phone);

  if (!trimmedName || !trimmedEmail || !trimmedPhone) {
    return { success: false, error: 'REQUIRED' };
  }

  const adminClient = createSupabaseAdminClient();

  const { data: orders, error } = await adminClient
    .from('orders')
    .select(
      `
      order_no,
      status,
      total_amount,
      created_at,
      artworks (
        title,
        images
      )
    `
    )
    .eq('buyer_name', trimmedName)
    .ilike('buyer_email', trimmedEmail)
    .neq('status', 'pending_payment')
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: 'NOT_FOUND' };
  }

  // 휴대폰 번호 검증 — DB에서 필터링 후 코드에서 2차 검증
  // (ilike로 phone까지 하면 인덱스 미사용, 소량이므로 코드 필터)
  const { data: phoneCheck } = await adminClient
    .from('orders')
    .select('order_no')
    .eq('buyer_name', trimmedName)
    .ilike('buyer_email', trimmedEmail)
    .neq('status', 'pending_payment');

  if (!phoneCheck) {
    return { success: false, error: 'NOT_FOUND' };
  }

  // 휴대폰 번호 일치하는 주문만 필터
  const { data: phoneVerifiedOrders } = await adminClient
    .from('orders')
    .select('order_no, buyer_phone')
    .eq('buyer_name', trimmedName)
    .ilike('buyer_email', trimmedEmail)
    .neq('status', 'pending_payment');

  const verifiedOrderNos = new Set(
    (phoneVerifiedOrders ?? [])
      .filter((o) => normalizePhone(o.buyer_phone ?? '') === trimmedPhone)
      .map((o) => o.order_no)
  );

  if (verifiedOrderNos.size === 0) {
    return { success: false, error: 'NOT_FOUND' };
  }

  const result: OrderListItem[] = (orders ?? [])
    .filter((o) => verifiedOrderNos.has(o.order_no))
    .map((o) => {
      const artwork = o.artworks as unknown as { title: string; images: string[] } | null;
      const images = artwork?.images ?? [];
      return {
        orderNo: o.order_no,
        status: o.status,
        artworkTitle: artwork?.title ?? '알 수 없음',
        artworkImage: images.length > 0 ? images[0] : null,
        totalAmount: o.total_amount,
        createdAt: o.created_at,
      };
    });

  return { success: true, orders: result };
}

export async function lookupOrderDetail(
  orderNo: string,
  buyerEmail: string
): Promise<OrderDetailResult> {
  // Rate limiting — IP 기준 분당 5회
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(`lookupOrderDetail:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!rl.success) {
    return { success: false, error: 'RATE_LIMITED' };
  }

  const trimmedOrderNo = orderNo.trim();
  const trimmedEmail = buyerEmail.trim().toLowerCase();

  if (!trimmedOrderNo || !trimmedEmail) {
    return { success: false, error: 'REQUIRED' };
  }

  const adminClient = createSupabaseAdminClient();

  const { data: order, error } = await adminClient
    .from('orders')
    .select(
      `
      id,
      order_no,
      status,
      item_amount,
      shipping_amount,
      total_amount,
      paid_at,
      created_at,
      shipping_name,
      shipping_phone,
      shipping_address,
      shipping_address_detail,
      shipping_memo,
      shipping_carrier,
      tracking_number,
      buyer_email,
      artworks (
        title,
        images,
        artists (
          name_ko
        )
      )
    `
    )
    .eq('order_no', trimmedOrderNo)
    .maybeSingle();

  if (error || !order) {
    return { success: false, error: 'NOT_FOUND' };
  }

  if (order.buyer_email?.toLowerCase() !== trimmedEmail) {
    return { success: false, error: 'NOT_FOUND' };
  }

  const artworkRow = order.artworks as unknown as {
    title: string;
    images: string[];
    artists: { name_ko: string } | { name_ko: string }[] | null;
  } | null;

  const artistRow = artworkRow?.artists;
  const artistName = Array.isArray(artistRow)
    ? (artistRow[0]?.name_ko ?? '알 수 없음')
    : (artistRow?.name_ko ?? '알 수 없음');

  const images = artworkRow?.images ?? [];
  const artworkImage = images.length > 0 ? images[0] : null;

  let paymentMethod: string | null = null;
  let virtualAccount: OrderPublicInfo['virtualAccount'] = null;

  const { data: paymentRecord } = await adminClient
    .from('payments')
    .select('method, confirm_response')
    .eq('order_id', order.id)
    .maybeSingle();

  if (paymentRecord) {
    paymentMethod = paymentRecord.method ?? null;

    if (order.status === 'awaiting_deposit' && paymentRecord.confirm_response) {
      const resp = paymentRecord.confirm_response as {
        virtualAccount?: {
          bankName?: string;
          accountNumber?: string;
          dueDate?: string;
        };
      };
      const va = resp.virtualAccount;
      if (va?.bankName && va?.accountNumber && va?.dueDate) {
        virtualAccount = {
          bankName: va.bankName,
          accountNumber: va.accountNumber,
          dueDate: va.dueDate,
        };
      }
    }
  }

  return {
    success: true,
    order: {
      orderNo: order.order_no,
      status: order.status,
      artworkTitle: artworkRow?.title ?? '알 수 없음',
      artworkImage,
      artistName,
      itemAmount: order.item_amount,
      shippingAmount: order.shipping_amount,
      totalAmount: order.total_amount,
      paymentMethod,
      paidAt: order.paid_at,
      createdAt: order.created_at,
      shippingName: order.shipping_name,
      shippingPhone: order.shipping_phone ?? null,
      shippingAddress: order.shipping_address,
      shippingAddressDetail: order.shipping_address_detail,
      shippingMemo: order.shipping_memo ?? null,
      shippingCarrier: order.shipping_carrier ?? null,
      trackingNumber: order.tracking_number ?? null,
      virtualAccount,
    },
  };
}

export type UpdateShippingInput = {
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingAddressDetail?: string;
  shippingMemo?: string;
};

export async function updateBuyerShipping(
  orderNo: string,
  buyerEmail: string,
  data: UpdateShippingInput
): Promise<{ success: true } | { success: false; error: string }> {
  // Rate limiting — IP 기준 분당 3회
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(`updateBuyerShipping:${ip}`, { limit: 3, windowMs: 60_000 });
  if (!rl.success) {
    return { success: false, error: 'RATE_LIMITED' };
  }

  const trimmedOrderNo = orderNo.trim();
  const trimmedEmail = buyerEmail.trim().toLowerCase();

  if (!trimmedOrderNo || !trimmedEmail) {
    return { success: false, error: 'REQUIRED' };
  }

  const adminClient = createSupabaseAdminClient();

  const { data: order, error } = await adminClient
    .from('orders')
    .select('id, status, buyer_email')
    .eq('order_no', trimmedOrderNo)
    .maybeSingle();

  if (error || !order) return { success: false, error: 'NOT_FOUND' };
  if (order.buyer_email?.toLowerCase() !== trimmedEmail)
    return { success: false, error: 'NOT_FOUND' };
  if (!['paid', 'preparing'].includes(order.status)) {
    return { success: false, error: 'INVALID_STATUS' };
  }

  const { error: updateError } = await adminClient
    .from('orders')
    .update({
      shipping_name: data.shippingName.trim(),
      shipping_phone: data.shippingPhone.trim(),
      shipping_address: data.shippingAddress.trim(),
      shipping_address_detail: data.shippingAddressDetail?.trim() ?? null,
      shipping_memo: data.shippingMemo?.trim() ?? null,
    })
    .eq('id', order.id);

  if (updateError) return { success: false, error: 'UPDATE_FAILED' };

  return { success: true };
}

export async function cancelBuyerOrder(
  orderNo: string,
  buyerEmail: string,
  cancelReason: string
): Promise<{ success: true } | { success: false; error: string }> {
  // Rate limiting — IP 기준 분당 3회
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(`cancelBuyerOrder:${ip}`, { limit: 3, windowMs: 60_000 });
  if (!rl.success) {
    return { success: false, error: 'RATE_LIMITED' };
  }

  const trimmedOrderNo = orderNo.trim();
  const trimmedEmail = buyerEmail.trim().toLowerCase();
  const trimmedReason = cancelReason.trim();

  if (!trimmedOrderNo || !trimmedEmail || !trimmedReason) {
    return { success: false, error: 'REQUIRED' };
  }

  const adminClient = createSupabaseAdminClient();

  const { data: order, error } = await adminClient
    .from('orders')
    .select('id, order_no, status, total_amount, artwork_id, buyer_email, buyer_name')
    .eq('order_no', trimmedOrderNo)
    .maybeSingle();

  if (error || !order) return { success: false, error: 'NOT_FOUND' };
  if (order.buyer_email?.toLowerCase() !== trimmedEmail)
    return { success: false, error: 'NOT_FOUND' };
  if (order.status !== 'paid') {
    return { success: false, error: 'INVALID_STATUS' };
  }

  const { data: payment } = await adminClient
    .from('payments')
    .select('id, payment_key, method')
    .eq('order_id', order.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!payment?.payment_key) return { success: false, error: 'NO_PAYMENT' };

  const cancelResult = await cancelPayment(
    payment.payment_key,
    { cancelReason: trimmedReason },
    `buyer-cancel-${order.order_no}`
  );

  if (!cancelResult.success) {
    return {
      success: false,
      error: `TOSS_CANCEL_FAILED: ${(cancelResult.error as { message?: string })?.message ?? ''}`,
    };
  }

  const now = new Date().toISOString();

  await adminClient
    .from('orders')
    .update({ status: 'cancelled', cancelled_at: now })
    .eq('id', order.id)
    .eq('status', 'paid');

  await adminClient
    .from('payments')
    .update({ status: 'CANCELED', cancelled_at: now })
    .eq('id', payment.id);

  const { data: sale } = await adminClient
    .from('artwork_sales')
    .select('id')
    .eq('order_id', order.id)
    .is('voided_at', null)
    .limit(1)
    .maybeSingle();

  if (sale) {
    await adminClient
      .from('artwork_sales')
      .update({ voided_at: now, void_reason: trimmedReason })
      .eq('id', sale.id);
  }

  if (order.artwork_id) {
    await deriveAndSyncArtworkStatus(adminClient, order.artwork_id);
  }

  // 구매자 환불 이메일 발송 (fire-and-forget)
  if (order.buyer_email) {
    void (async () => {
      try {
        const { artworkTitle, artistName } = await getArtworkEmailInfo(
          adminClient,
          order.artwork_id
        );
        void sendBuyerEmail(order.buyer_email!, 'refunded', {
          orderNo: order.order_no,
          buyerName: order.buyer_name ?? '',
          artworkTitle,
          artistName,
          amount: order.total_amount,
        });
      } catch (err) {
        console.error('[cancelBuyerOrder] email failed:', err);
      }
    })();
  }

  return { success: true };
}
