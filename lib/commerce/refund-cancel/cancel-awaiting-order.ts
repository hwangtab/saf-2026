import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';

import { extractLineItems } from '@/lib/orders/record-artwork-sales';
import {
  releaseReservedArtworksIfUnowned,
  type ReleaseReservedArtworksResult,
} from '@/lib/orders/reservations';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';
import type { Database } from '@/types/supabase';

export type CancelAwaitingOrderClient = SupabaseClient<Database>;

export type CancelAwaitingDepositOrder = {
  id: string;
  order_no: string;
  artwork_id?: string | null;
  order_items?: unknown;
};

export type CancelAwaitingDepositWarning = {
  code: 'RESERVATION_RELEASE_FAILED';
  errors: ReleaseReservedArtworksResult['errors'];
};

export type CancelAwaitingDepositOrderInput = {
  supabase: CancelAwaitingOrderClient;
  order: CancelAwaitingDepositOrder;
  now: string;
};

export type CancelAwaitingDepositOrderOutcome =
  | { ok: true; artworkIds: string[]; warnings: CancelAwaitingDepositWarning[] }
  | { ok: false; code: 'ORDER_UPDATE_FAILED'; error: string }
  | { ok: false; code: 'ORDER_STATE_MISMATCH' };

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? error);
  }
  return String(error);
}

function getArtworkIds(order: CancelAwaitingDepositOrder) {
  const lineItems = extractLineItems(order);
  const ids =
    lineItems.length > 0
      ? lineItems.map((item) => item.artwork_id)
      : order.artwork_id
        ? [order.artwork_id]
        : [];

  return Array.from(new Set(ids.filter(Boolean)));
}

export async function cancelAwaitingDepositOrder({
  supabase,
  order,
  now,
}: CancelAwaitingDepositOrderInput): Promise<CancelAwaitingDepositOrderOutcome> {
  const { data: updatedRows, error: updateError } = await supabase
    .from('orders')
    .update({ status: 'cancelled', cancelled_at: now, updated_at: now })
    .eq('id', order.id)
    .eq('status', 'awaiting_deposit')
    .select('id');

  if (updateError) {
    return { ok: false, code: 'ORDER_UPDATE_FAILED', error: errorMessage(updateError) };
  }

  if (!updatedRows || updatedRows.length === 0) {
    return { ok: false, code: 'ORDER_STATE_MISMATCH' };
  }

  const artworkIds = getArtworkIds(order);
  const warnings: CancelAwaitingDepositWarning[] = [];
  const releaseResult = await releaseReservedArtworksIfUnowned(supabase, artworkIds, now);

  if (releaseResult.errors) {
    warnings.push({ code: 'RESERVATION_RELEASE_FAILED', errors: releaseResult.errors });
  }

  for (const artworkId of artworkIds) {
    revalidatePath(`/artworks/${artworkId}`);
    revalidatePath(`/en/artworks/${artworkId}`);
  }
  if (artworkIds.length > 0) {
    revalidatePublicArtworkSurfaces();
  }

  return { ok: true, artworkIds, warnings };
}
