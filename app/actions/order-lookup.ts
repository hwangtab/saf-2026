'use server';

import { createSupabaseAdminClient } from '@/lib/auth/server';

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

export type OrderLookupResult =
  | { success: true; order: OrderPublicInfo }
  | { success: false; error: string };

export async function lookupOrder(orderNo: string, buyerEmail: string): Promise<OrderLookupResult> {
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

  // 이메일 검증 (대소문자 무시)
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

  // 결제 정보 (가상계좌 포함)
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
