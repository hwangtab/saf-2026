import type { SupabaseClient } from '@supabase/supabase-js';

import { deriveAndSyncArtworkStatus } from '@/lib/artworks/status';
import type { Database } from '@/types/supabase';

export type DepositConfirmationClient = SupabaseClient<Database>;

export type DepositConfirmationOrder = {
  id: string;
  order_no: string;
  status: string;
  artwork_id: string | null;
  total_amount: number;
  buyer_name: string | null;
  buyer_phone: string | null;
  buyer_email: string | null;
  metadata: unknown;
  order_items?: Array<{
    artwork_id: string;
    quantity: number;
    unit_price: number;
  }> | null;
};

export type ConfirmDepositMutationInput = {
  orderId: string;
  now: string;
};

export type ConfirmDepositMutationResult = {
  order: DepositConfirmationOrder;
  artworkIds: string[];
};

const GENERIC_CONFIRM_FAILURE_MESSAGE =
  '판매 기록 생성에 실패해 입금 확인을 중단했습니다. 작품 판매 상태와 주문을 확인해 주세요.';

function extractArtworkIds(confirmedRows: unknown): string[] {
  const confirmed = Array.isArray(confirmedRows) ? confirmedRows[0] : null;
  const artworkIds =
    confirmed &&
    typeof confirmed === 'object' &&
    Array.isArray((confirmed as { artwork_ids?: unknown }).artwork_ids)
      ? (confirmed as { artwork_ids: unknown[] }).artwork_ids
      : [];

  return artworkIds.filter((id): id is string => typeof id === 'string' && id.length > 0);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? error);
  }
  return String(error);
}

export async function confirmDepositMutation(
  supabase: DepositConfirmationClient,
  { orderId, now }: ConfirmDepositMutationInput
): Promise<ConfirmDepositMutationResult> {
  const { data: order, error } = await supabase
    .from('orders')
    .select(
      'id, order_no, status, artwork_id, total_amount, buyer_name, buyer_phone, buyer_email, metadata, order_items(artwork_id, quantity, unit_price)'
    )
    .eq('id', orderId)
    .single();

  if (error || !order) throw new Error('주문을 찾을 수 없습니다.');
  if (order.status !== 'awaiting_deposit') {
    throw new Error(`입금 확인은 입금 대기 상태에서만 가능합니다. (현재 상태: ${order.status})`);
  }

  const { data: confirmedRows, error: confirmError } = await supabase.rpc(
    'confirm_bank_transfer_order',
    {
      p_order_id: orderId,
      p_sold_at: now,
    }
  );

  if (confirmError) {
    const message = errorMessage(confirmError);
    if (message.includes('UNIQUE_EDITION_TAKEN')) {
      throw new Error(
        '이미 다른 주문이 결제 완료한 작품입니다. 이 주문은 입금 확인할 수 없으니 구매자에게 환불을 안내해 주세요.'
      );
    }
    throw new Error(GENERIC_CONFIRM_FAILURE_MESSAGE);
  }

  const artworkIds = extractArtworkIds(confirmedRows);
  if (artworkIds.length === 0) {
    throw new Error(GENERIC_CONFIRM_FAILURE_MESSAGE);
  }

  for (const artworkId of artworkIds) {
    await deriveAndSyncArtworkStatus(supabase, artworkId);
  }

  return {
    order: order as DepositConfirmationOrder,
    artworkIds,
  };
}
