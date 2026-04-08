'use server';

import { createSupabaseAdminClient } from '@/lib/auth/server';

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
  shippingAddress: string;
  shippingAddressDetail: string | null;
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
  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedPhone = phone.trim().replace(/[^0-9]/g, '');

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
      .filter((o) => (o.buyer_phone ?? '').replace(/[^0-9]/g, '') === trimmedPhone)
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
      shipping_address,
      shipping_address_detail,
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

  if (order.buyer_email.toLowerCase() !== trimmedEmail) {
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
      shippingAddress: order.shipping_address,
      shippingAddressDetail: order.shipping_address_detail,
      virtualAccount,
    },
  };
}
