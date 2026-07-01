import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/supabase';

export type BuyerOrderMutationClient = SupabaseClient<Database>;

export type UpdateBuyerShippingInput = {
  shippingName: string;
  shippingPhone: string;
  shippingPostalCode?: string;
  shippingAddress: string;
  shippingAddressDetail?: string;
  shippingMemo?: string;
};

export type UpdateBuyerShippingMutationInput = {
  orderNo: string;
  buyerEmail: string;
  sessionUserId: string | null;
  shipping: UpdateBuyerShippingInput;
};

export type UpdateBuyerShippingMutationResult =
  | { success: true }
  | {
      success: false;
      error: 'REQUIRED' | 'INVALID_INPUT' | 'NOT_FOUND' | 'INVALID_STATUS' | 'UPDATE_FAILED';
    };

type BuyerOrderRow = {
  id: string;
  status: string;
  buyer_email: string | null;
  buyer_user_id: string | null;
};

function normalizeShippingInput(data: UpdateBuyerShippingInput) {
  return {
    shippingName: data.shippingName.trim(),
    shippingPhone: data.shippingPhone.trim(),
    shippingPostalCode: data.shippingPostalCode?.trim() ?? '',
    shippingAddress: data.shippingAddress.trim(),
    shippingAddressDetail: data.shippingAddressDetail?.trim() ?? '',
    shippingMemo: data.shippingMemo?.trim() ?? '',
  };
}

export async function updateBuyerShippingMutation(
  supabase: BuyerOrderMutationClient,
  { orderNo, buyerEmail, sessionUserId, shipping }: UpdateBuyerShippingMutationInput
): Promise<UpdateBuyerShippingMutationResult> {
  const trimmedOrderNo = orderNo.trim();
  const trimmedEmail = buyerEmail.trim().toLowerCase();
  const normalized = normalizeShippingInput(shipping);

  if (!trimmedOrderNo || (!trimmedEmail && !sessionUserId)) {
    return { success: false, error: 'REQUIRED' };
  }

  if (
    !normalized.shippingName ||
    !normalized.shippingPhone ||
    !normalized.shippingAddress ||
    trimmedOrderNo.length > 50 ||
    trimmedEmail.length > 254 ||
    normalized.shippingName.length > 50 ||
    normalized.shippingPhone.length > 20 ||
    normalized.shippingPostalCode.length > 10 ||
    normalized.shippingAddress.length > 200 ||
    normalized.shippingAddressDetail.length > 200 ||
    normalized.shippingMemo.length > 500
  ) {
    return { success: false, error: 'INVALID_INPUT' };
  }

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, status, buyer_email, buyer_user_id')
    .eq('order_no', trimmedOrderNo)
    .maybeSingle();

  if (error || !order) return { success: false, error: 'NOT_FOUND' };

  const orderRow = order as BuyerOrderRow;
  const isOwner = !!sessionUserId && orderRow.buyer_user_id === sessionUserId;

  if (!isOwner && !trimmedEmail) return { success: false, error: 'NOT_FOUND' };
  if (!isOwner && orderRow.buyer_email?.toLowerCase() !== trimmedEmail) {
    return { success: false, error: 'NOT_FOUND' };
  }
  if (!['paid', 'preparing'].includes(orderRow.status)) {
    return { success: false, error: 'INVALID_STATUS' };
  }

  const postalCodeUpdate = normalized.shippingPostalCode
    ? { shipping_postal_code: normalized.shippingPostalCode }
    : {};

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      shipping_name: normalized.shippingName,
      shipping_phone: normalized.shippingPhone,
      shipping_address: normalized.shippingAddress,
      shipping_address_detail: normalized.shippingAddressDetail || null,
      shipping_memo: normalized.shippingMemo || null,
      ...postalCodeUpdate,
    })
    .eq('id', orderRow.id)
    .in('status', ['paid', 'preparing']);

  if (updateError) return { success: false, error: 'UPDATE_FAILED' };

  return { success: true };
}
