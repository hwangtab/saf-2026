import type { SupabaseClient } from '@supabase/supabase-js';

import {
  formatRepresentativeTitle,
  getRepresentativeArtwork,
} from '@/lib/orders/representative-artwork';
import { formatBankTransferDueDate, getBankTransferInfo } from '@/lib/payments/bank-transfer-info';
import { normalizePhoneDigits } from '@/lib/utils/phone';
import type { Database } from '@/types/supabase';

export type PublicOrderLookupClient = SupabaseClient<Database>;
type PublicOrderLocale = 'ko' | 'en';

export type PublicOrderListItem = {
  orderNo: string;
  status: string;
  artworkTitle: string;
  artworkImage: string | null;
  /** 대표작품 id (작품 상세 링크용; 작품 삭제·식별 불가 시 null) */
  artworkId: string | null;
  totalAmount: number;
  createdAt: string;
};

export type BankTransferDisplay = {
  bankName: string;
  accountNumber: string;
  holderName: string;
  dueDate: string;
};

export type OrderPublicInfo = {
  orderNo: string;
  status: string;
  artworkTitle: string;
  artworkImage: string | null;
  /** 대표작품 id (작품 상세 링크용; 작품 삭제·식별 불가 시 null) */
  artworkId: string | null;
  artistName: string;
  itemAmount: number;
  shippingAmount: number;
  totalAmount: number;
  paymentMethod: string | null;
  /** 간편결제사 (payments.confirm_response.easyPay.provider — 예: '네이버페이'). 간편결제가 아니면 null */
  easyPayProvider: string | null;
  paidAt: string | null;
  createdAt: string;
  shippingName: string;
  shippingPhone: string | null;
  shippingAddress: string;
  shippingAddressDetail: string | null;
  shippingPostalCode: string | null;
  shippingMemo: string | null;
  shippingCarrier: string | null;
  trackingNumber: string | null;
  virtualAccount: {
    bankName: string;
    accountNumber: string;
    dueDate: string;
  } | null;
  bankTransfer: BankTransferDisplay | null;
};

export type OrderLookupListResult =
  | { success: true; orders: PublicOrderListItem[] }
  | { success: false; error: string };

export type OrderDetailResult =
  | { success: true; order: OrderPublicInfo }
  | { success: false; error: string };

export type OrderDetailRow = {
  info: OrderPublicInfo;
  buyerEmail: string | null;
  buyerUserId: string | null;
};

function extractPublicBuyerLocale(metadata: unknown): PublicOrderLocale {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return 'ko';
  return (metadata as Record<string, unknown>).locale === 'en' ? 'en' : 'ko';
}

function asMetadataRecord(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
}

function isManualBankTransfer(metadata: unknown): boolean {
  return asMetadataRecord(metadata).payment_provider === 'manual_bank_transfer';
}

function buildBankTransferDisplay(
  metadata: unknown,
  createdAt: string | null | undefined
): BankTransferDisplay {
  const meta = asMetadataRecord(metadata);
  const bankTransfer =
    meta.bank_transfer &&
    typeof meta.bank_transfer === 'object' &&
    !Array.isArray(meta.bank_transfer)
      ? (meta.bank_transfer as Record<string, unknown>)
      : {};
  const fallback = getBankTransferInfo();
  const baseTime = createdAt ? new Date(createdAt).getTime() : NaN;
  const base = Number.isFinite(baseTime) ? baseTime : Date.now();
  const fallbackDueDate = formatBankTransferDueDate(
    new Date(base + fallback.deadlineHours * 60 * 60 * 1000),
    extractPublicBuyerLocale(metadata)
  );

  return {
    bankName:
      typeof bankTransfer.bankName === 'string' && bankTransfer.bankName.trim()
        ? bankTransfer.bankName
        : fallback.bankName,
    accountNumber:
      typeof bankTransfer.accountNumber === 'string' && bankTransfer.accountNumber.trim()
        ? bankTransfer.accountNumber
        : fallback.accountNumber,
    holderName:
      typeof bankTransfer.holderName === 'string' && bankTransfer.holderName.trim()
        ? bankTransfer.holderName
        : fallback.holderName,
    dueDate:
      typeof bankTransfer.dueDate === 'string' && bankTransfer.dueDate.trim()
        ? bankTransfer.dueDate
        : fallbackDueDate,
  };
}

export async function lookupPublicOrdersByBuyer(
  supabase: PublicOrderLookupClient,
  {
    name,
    email,
    phone,
  }: {
    name: string;
    email: string;
    phone: string;
  }
): Promise<OrderLookupListResult> {
  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedPhone = normalizePhoneDigits(phone);

  if (!trimmedName || !trimmedEmail || !trimmedPhone) {
    return { success: false, error: 'REQUIRED' };
  }

  if (trimmedName.length > 50 || trimmedEmail.length > 254 || trimmedPhone.length > 20) {
    return { success: false, error: 'INVALID_INPUT' };
  }

  const { data: orders, error } = await supabase
    .from('orders')
    .select(
      `
      order_no,
      status,
      total_amount,
      created_at,
      metadata,
      artworks (
        id,
        title,
        images
      ),
      order_items (
        artworks (
          id,
          title,
          images
        )
      )
    `
    )
    .eq('buyer_name', trimmedName)
    .eq('buyer_email', trimmedEmail)
    .neq('status', 'pending_payment')
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: 'NOT_FOUND' };
  }

  const { data: phoneVerifiedOrders } = await supabase
    .from('orders')
    .select('order_no, buyer_phone')
    .eq('buyer_name', trimmedName)
    .eq('buyer_email', trimmedEmail)
    .neq('status', 'pending_payment');

  const verifiedOrderNos = new Set(
    ((phoneVerifiedOrders as Array<{ order_no: string; buyer_phone?: string | null }> | null) ?? [])
      .filter((o) => normalizePhoneDigits(o.buyer_phone ?? '') === trimmedPhone)
      .map((o) => o.order_no)
  );

  if (verifiedOrderNos.size === 0) {
    return { success: false, error: 'NOT_FOUND' };
  }

  const result: PublicOrderListItem[] = (
    (orders as Array<{
      order_no: string;
      status: string;
      total_amount: number;
      created_at: string;
      metadata?: unknown;
      artworks?: unknown;
      order_items?: unknown;
    }> | null) ?? []
  )
    .filter((o) => verifiedOrderNos.has(o.order_no))
    .map((o) => {
      const locale = extractPublicBuyerLocale(o.metadata);
      const unknownLabel = locale === 'en' ? 'Unknown' : '알 수 없음';

      const rep = getRepresentativeArtwork(o.order_items);
      const singleArtwork = o.artworks as {
        id: string;
        title: string;
        images: string[];
      } | null;
      const singleImages = singleArtwork?.images ?? [];

      const artworkTitle =
        rep.count > 0 && rep.title
          ? formatRepresentativeTitle(rep.title, rep.count, locale)
          : (singleArtwork?.title ?? unknownLabel);
      const artworkImage =
        rep.count > 0 ? rep.image : singleImages.length > 0 ? singleImages[0] : null;
      const artworkId = rep.count > 0 ? rep.artworkId : (singleArtwork?.id ?? null);

      return {
        orderNo: o.order_no,
        status: o.status,
        artworkTitle,
        artworkImage,
        artworkId,
        totalAmount: o.total_amount,
        createdAt: o.created_at,
      };
    });

  return { success: true, orders: result };
}

export async function fetchPublicOrderDetailRow(
  supabase: PublicOrderLookupClient,
  orderNo: string
): Promise<OrderDetailRow | null> {
  const { data: order, error } = await supabase
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
      shipping_postal_code,
      shipping_address,
      shipping_address_detail,
      shipping_memo,
      shipping_carrier,
      tracking_number,
      buyer_email,
      buyer_user_id,
      metadata,
      artworks (
        id,
        title,
        images,
        artists (
          name_ko
        )
      ),
      order_items (
        artworks (
          id,
          title,
          images,
          artists (
            name_ko
          )
        )
      )
    `
    )
    .eq('order_no', orderNo)
    .maybeSingle();

  if (error || !order) return null;

  const orderRow = order as {
    id: string;
    order_no: string;
    status: string;
    item_amount: number;
    shipping_amount: number;
    total_amount: number;
    paid_at: string | null;
    created_at: string;
    shipping_name: string;
    shipping_phone?: string | null;
    shipping_postal_code?: string | null;
    shipping_address: string;
    shipping_address_detail: string | null;
    shipping_memo?: string | null;
    shipping_carrier?: string | null;
    tracking_number?: string | null;
    buyer_email: string | null;
    buyer_user_id: string | null;
    metadata?: unknown;
    artworks?: unknown;
    order_items?: unknown;
  };

  const locale = extractPublicBuyerLocale(orderRow.metadata);
  const unknownLabel = locale === 'en' ? 'Unknown' : '알 수 없음';

  const artworkRow = orderRow.artworks as {
    id: string;
    title: string;
    images: string[];
    artists: { name_ko: string } | { name_ko: string }[] | null;
  } | null;

  const rep = getRepresentativeArtwork(orderRow.order_items);

  const singleArtistRow = artworkRow?.artists;
  const singleArtistName = Array.isArray(singleArtistRow)
    ? singleArtistRow[0]?.name_ko
    : singleArtistRow?.name_ko;

  const artworkTitle =
    rep.count > 0 && rep.title
      ? formatRepresentativeTitle(rep.title, rep.count, locale)
      : (artworkRow?.title ?? unknownLabel);
  const artistName =
    rep.count > 0 ? (rep.artistName ?? unknownLabel) : (singleArtistName ?? unknownLabel);

  const singleImages = artworkRow?.images ?? [];
  const artworkImage = rep.count > 0 ? rep.image : singleImages.length > 0 ? singleImages[0] : null;
  const artworkId = rep.count > 0 ? rep.artworkId : (artworkRow?.id ?? null);

  let paymentMethod: string | null = null;
  let easyPayProvider: string | null = null;
  let virtualAccount: OrderPublicInfo['virtualAccount'] = null;
  let bankTransfer: OrderPublicInfo['bankTransfer'] = null;

  const { data: paymentRecord } = await supabase
    .from('payments')
    .select('method, confirm_response')
    .eq('order_id', orderRow.id)
    .maybeSingle();

  if (paymentRecord) {
    const payment = paymentRecord as {
      method?: string | null;
      confirm_response?: unknown;
    };
    paymentMethod = payment.method ?? null;

    if (payment.confirm_response) {
      const easyPay = (payment.confirm_response as { easyPay?: { provider?: unknown } }).easyPay;
      if (typeof easyPay?.provider === 'string' && easyPay.provider.length > 0) {
        easyPayProvider = easyPay.provider;
      }
    }

    if (
      orderRow.status === 'awaiting_deposit' &&
      !isManualBankTransfer(orderRow.metadata) &&
      payment.confirm_response
    ) {
      const resp = payment.confirm_response as {
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
  if (orderRow.status === 'awaiting_deposit' && isManualBankTransfer(orderRow.metadata)) {
    bankTransfer = buildBankTransferDisplay(orderRow.metadata, orderRow.created_at);
  }

  return {
    info: {
      orderNo: orderRow.order_no,
      status: orderRow.status,
      artworkTitle,
      artworkImage,
      artworkId,
      artistName,
      itemAmount: orderRow.item_amount,
      shippingAmount: orderRow.shipping_amount,
      totalAmount: orderRow.total_amount,
      paymentMethod,
      easyPayProvider,
      paidAt: orderRow.paid_at,
      createdAt: orderRow.created_at,
      shippingName: orderRow.shipping_name,
      shippingPhone: orderRow.shipping_phone ?? null,
      shippingPostalCode: orderRow.shipping_postal_code ?? null,
      shippingAddress: orderRow.shipping_address,
      shippingAddressDetail: orderRow.shipping_address_detail,
      shippingMemo: orderRow.shipping_memo ?? null,
      shippingCarrier: orderRow.shipping_carrier ?? null,
      trackingNumber: orderRow.tracking_number ?? null,
      virtualAccount,
      bankTransfer,
    },
    buyerEmail: orderRow.buyer_email,
    buyerUserId: orderRow.buyer_user_id,
  };
}
