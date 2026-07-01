import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';

import { deriveAndSyncArtworkStatus } from '@/lib/artworks/status';
import { ensureTossPaymentRecord } from '@/lib/payments/toss-payment-record';
import {
  extractLineItems,
  recordOrderArtworkSales,
  type ArtworkSaleLine,
} from '@/lib/orders/record-artwork-sales';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';
import type { PaymentProvider } from '@/lib/integrations/toss/config';
import type { TossConfirmResponse } from '@/lib/integrations/toss/types';
import type { Database, Json } from '@/types/supabase';

export type AdminClient = SupabaseClient<Database>;

export type MarkOrderPaidPayment = TossConfirmResponse;

export type MarkOrderPaidOrder = {
  id: string;
  order_no: string;
  artwork_id?: string | null;
  total_amount?: number | null;
  buyer_name?: string | null;
  buyer_phone?: string | null;
  metadata?: unknown;
  order_items?: unknown;
};

export type MarkOrderPaidInput = {
  supabase: AdminClient;
  order: MarkOrderPaidOrder;
  tossPayment: MarkOrderPaidPayment;
  provider: PaymentProvider;
  now: string;
  sourceStatuses: Array<'pending_payment' | 'awaiting_deposit'>;
  idempotencyKey: string;
  errors: string[];
};

export type MarkOrderPaidWarning =
  | { code: 'ARTWORK_SALES_FAILED'; error: string }
  | { code: 'NO_LINE_ITEMS' };

export type MarkOrderPaidOutcome =
  | { ok: true; salesLines: ArtworkSaleLine[]; warnings: MarkOrderPaidWarning[] }
  | { ok: false; code: 'PAYMENT_RECORD_FAILED'; error: string }
  | { ok: false; code: 'ORDER_UPDATE_FAILED'; error: string }
  | { ok: false; code: 'ORDER_STATE_MISMATCH' }
  | { ok: false; code: 'ARTWORK_TAKEN'; salesLines: ArtworkSaleLine[] }
  | { ok: false; code: 'ARTWORK_SALES_FAILED'; error: string; salesLines: ArtworkSaleLine[] };

export type MarkOrderPaidWithOutcomeInput = MarkOrderPaidInput & {
  continueOnSalesRecordFailure?: boolean;
  metadataPatch?: Record<string, Json | undefined>;
};

function metadataRecord(metadata: unknown): Record<string, Json | undefined> {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? (metadata as Record<string, Json | undefined>)
    : {};
}

function buildSalesLines(
  order: MarkOrderPaidOrder,
  tossPayment: MarkOrderPaidPayment
): ArtworkSaleLine[] {
  const lineItems = extractLineItems(order);
  if (lineItems.length > 0) return lineItems;
  if (!order.artwork_id) return [];

  return [
    {
      artwork_id: order.artwork_id,
      quantity: 1,
      unit_price: order.total_amount ?? tossPayment.totalAmount,
    },
  ];
}

async function syncArtworkStateAndPublicSurfaces(
  supabase: AdminClient,
  salesLines: ArtworkSaleLine[]
) {
  for (const item of salesLines) {
    await deriveAndSyncArtworkStatus(supabase, item.artwork_id);
  }
  revalidatePublicArtworkSurfaces();
  for (const item of salesLines) {
    revalidatePath(`/artworks/${item.artwork_id}`);
    revalidatePath(`/en/artworks/${item.artwork_id}`);
  }
}

export async function markOrderPaidWithOutcome({
  supabase,
  order,
  tossPayment,
  provider,
  now,
  sourceStatuses,
  idempotencyKey,
  continueOnSalesRecordFailure = false,
  metadataPatch,
}: MarkOrderPaidWithOutcomeInput): Promise<MarkOrderPaidOutcome> {
  const paymentRecordResult = await ensureTossPaymentRecord({
    supabase,
    orderId: order.id,
    tossPayment,
    idempotencyKey,
  });

  if (!paymentRecordResult.ok) {
    return {
      ok: false,
      code: 'PAYMENT_RECORD_FAILED',
      error: paymentRecordResult.error,
    };
  }

  const { data: updatedOrders, error: orderUpdateError } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      paid_at: tossPayment.approvedAt ?? now,
      metadata: {
        ...metadataRecord(order.metadata),
        ...(metadataPatch ?? {
          payment_method: tossPayment.method ?? null,
          reconciled: true,
        }),
      },
    })
    .eq('id', order.id)
    .in('status', sourceStatuses)
    .select('id');

  if (orderUpdateError) {
    return { ok: false, code: 'ORDER_UPDATE_FAILED', error: orderUpdateError.message };
  }

  if (!updatedOrders || updatedOrders.length === 0) {
    console.error(
      `[markOrderPaid] SKIP: ${order.order_no} — order no longer ${sourceStatuses.join('/')}, skipping artwork_sales`
    );
    return { ok: false, code: 'ORDER_STATE_MISMATCH' };
  }

  const salesLines = buildSalesLines(order, tossPayment);
  const warnings: MarkOrderPaidWarning[] = [];

  if (salesLines.length === 0) {
    if (continueOnSalesRecordFailure) {
      warnings.push({ code: 'NO_LINE_ITEMS' });
    }
    return { ok: true, salesLines, warnings };
  }

  const salesResult = await recordOrderArtworkSales(supabase, {
    orderId: order.id,
    orderNo: order.order_no,
    lineItems: salesLines,
    source: 'toss',
    sourceDetail: provider === 'widget' ? 'toss_widget' : 'toss_api',
    buyerName: order.buyer_name ?? null,
    buyerPhone: order.buyer_phone ?? null,
    soldAt: tossPayment.approvedAt ?? now,
  });

  if (salesResult.inserted === false && salesResult.reason === 'artwork_taken') {
    return { ok: false, code: 'ARTWORK_TAKEN', salesLines };
  }

  if (salesResult.inserted === false && salesResult.reason === 'error') {
    if (!continueOnSalesRecordFailure) {
      return { ok: false, code: 'ARTWORK_SALES_FAILED', error: salesResult.error, salesLines };
    }
    warnings.push({ code: 'ARTWORK_SALES_FAILED', error: salesResult.error });
  }

  if (salesResult.inserted === false && salesResult.reason === 'no_line_items') {
    if (continueOnSalesRecordFailure) {
      warnings.push({ code: 'NO_LINE_ITEMS' });
    }
  }

  await syncArtworkStateAndPublicSurfaces(supabase, salesLines);

  return { ok: true, salesLines, warnings };
}

export async function markOrderPaid(input: MarkOrderPaidInput): Promise<boolean> {
  const outcome = await markOrderPaidWithOutcome(input);

  if (outcome.ok) return true;

  if (outcome.code === 'PAYMENT_RECORD_FAILED') {
    input.errors.push(`${input.order.order_no}: payment insert failed: ${outcome.error}`);
  } else if (outcome.code === 'ORDER_UPDATE_FAILED') {
    input.errors.push(`${input.order.order_no}: order update failed: ${outcome.error}`);
  } else if (outcome.code === 'ARTWORK_TAKEN') {
    input.errors.push(
      `${input.order.order_no}: artwork already taken by another order (동시 구매 경합 — 수동 환불 검토 필요)`
    );
  } else if (outcome.code === 'ARTWORK_SALES_FAILED') {
    input.errors.push(`${input.order.order_no}: artwork_sales insert failed: ${outcome.error}`);
  }

  return false;
}
