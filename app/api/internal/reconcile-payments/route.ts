import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { fetchPaymentByOrderId } from '@/lib/integrations/toss/confirm';
import { cancelPayment } from '@/lib/integrations/toss/cancel';
import { resolveOrderProvider } from '@/lib/integrations/toss/config';
import { notifyEmail } from '@/lib/notify';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { validateInternalCronRequest } from '@/lib/security/internal-cron-auth';
import { extractLineItems } from '@/lib/orders/record-artwork-sales';
import {
  releaseReservedArtworksIfUnowned,
  reserveUniqueArtworksOrRollback,
} from '@/lib/orders/reservations';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';
import { ensureTossPaymentRecord } from '@/lib/payments/toss-payment-record';
import { markOrderPaid } from '@/lib/commerce/payment-lifecycle/mark-order-paid';

export const runtime = 'nodejs';

function clampInteger(raw: string | null, fallback: number, min: number, max: number): number {
  if (raw == null || raw.trim() === '') return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function parseBackfillLookbackDays(searchParams: URLSearchParams): number {
  return clampInteger(searchParams.get('lookbackDays'), 30, 1, 90);
}

function parseBackfillLimit(searchParams: URLSearchParams): number {
  return clampInteger(searchParams.get('limit'), 100, 1, 500);
}

function hasPaymentRows(order: { payments?: unknown }): boolean {
  if (Array.isArray(order.payments)) return order.payments.length > 0;
  return Boolean(order.payments);
}

function metadataRecord(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
}

function isManualBankTransferOrder(metadata: unknown): boolean {
  return metadataRecord(metadata).payment_provider === 'manual_bank_transfer';
}

/**
 * Reconciliation cron: 결제-주문 불일치 자동 보정.
 *
 * 시나리오: Toss confirm API는 성공했지만 이후 DB 작업(payment INSERT, order UPDATE,
 * artwork_sales INSERT) 중 하나가 실패하면 → 고객은 결제했는데 주문이 pending_payment로
 * 남아 30분 후 자동 취소되는 문제.
 *
 * 동작:
 * 1) pending_payment 상태 + 5분 이상 경과한 주문을 찾음
 * 2) Toss API에서 orderId(=order_no)로 결제 상태 조회
 * 3) DONE → payment 레코드 보정, 주문 paid 전환, artwork_sales 생성
 * 4) WAITING_FOR_DEPOSIT → 주문 awaiting_deposit 전환
 *
 * 매 10분 Vercel Cron 실행 (expire-stale-orders 직후).
 */
export async function GET(request: NextRequest) {
  const authError = validateInternalCronRequest(request);
  if (authError) {
    return authError;
  }

  // System cron route: service-role client (no user session context).
  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch (err) {
    console.error('[reconcile-payments] admin client init failed:', err);
    return NextResponse.json({ error: 'Supabase admin credentials are missing.' }, { status: 500 });
  }

  const searchParams = request.nextUrl.searchParams;
  const scope = searchParams.get('scope');

  if (scope === 'missing-payments-backfill') {
    const lookbackDays = parseBackfillLookbackDays(searchParams);
    const backfillLimit = parseBackfillLimit(searchParams);
    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

    const { data: settledOrders, error: backfillFetchError } = await supabase
      .from('orders')
      .select(
        'id, order_no, artwork_id, total_amount, buyer_name, buyer_phone, metadata, status, order_items(artwork_id, quantity, unit_price), payments!left(id)'
      )
      .in('status', ['paid', 'awaiting_deposit'])
      .gte('created_at', since)
      .is('payments', null)
      .or(
        'metadata->>payment_provider.is.null,metadata->>payment_provider.neq.manual_bank_transfer'
      )
      .order('created_at', { ascending: false })
      .limit(backfillLimit);

    if (backfillFetchError) {
      return NextResponse.json({ error: backfillFetchError.message }, { status: 500 });
    }

    const missingPaymentOrders = settledOrders ?? [];
    let reconciled = 0;
    const errors: string[] = [];

    for (const order of missingPaymentOrders) {
      try {
        if (isManualBankTransferOrder(order.metadata)) continue;

        const provider = resolveOrderProvider(order.metadata);
        const tossPayment = await fetchPaymentByOrderId(order.order_no, provider);
        if (!tossPayment) {
          errors.push(`${order.order_no}: Toss payment not found for missing payment backfill`);
          continue;
        }

        if (order.status === 'awaiting_deposit' && tossPayment.status === 'DONE') {
          const repaired = await markOrderPaid({
            supabase,
            order,
            tossPayment,
            provider,
            now: new Date().toISOString(),
            sourceStatuses: ['awaiting_deposit'],
            idempotencyKey: `backfill-missing-payment-${order.order_no}`,
            errors,
          });
          if (repaired) reconciled++;
          continue;
        }

        const expectedTossStatus =
          order.status === 'paid'
            ? 'DONE'
            : order.status === 'awaiting_deposit'
              ? 'WAITING_FOR_DEPOSIT'
              : null;

        if (expectedTossStatus && tossPayment.status !== expectedTossStatus) {
          errors.push(
            `${order.order_no}: order is ${order.status} but Toss status is ${tossPayment.status}`
          );
          continue;
        }

        const paymentRecordResult = await ensureTossPaymentRecord({
          supabase,
          orderId: order.id,
          tossPayment,
          idempotencyKey: `backfill-missing-payment-${order.order_no}`,
        });

        if (!paymentRecordResult.ok) {
          errors.push(
            `${order.order_no}: missing payment backfill failed: ${paymentRecordResult.error}`
          );
          continue;
        }

        reconciled++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${order.order_no}: ${msg}`);
      }
    }

    return NextResponse.json({
      scope,
      lookbackDays,
      limit: backfillLimit,
      checked: missingPaymentOrders.length,
      reconciled,
      ...(errors.length > 0 ? { errors } : {}),
    });
  }

  // 5분~28분 경과한 pending_payment 주문 (5분 미만은 정상 결제 진행 중일 수 있고,
  // 30분 이상은 expire-stale-orders 크론이 이미 취소함 — 2분 안전 마진)
  const minAge = new Date(Date.now() - 28 * 60 * 1000).toISOString();
  const maxAge = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: staleOrders, error: fetchError } = await supabase
    .from('orders')
    .select(
      'id, order_no, artwork_id, total_amount, buyer_name, buyer_phone, metadata, order_items(artwork_id, quantity, unit_price)'
    )
    .eq('status', 'pending_payment')
    .gt('created_at', minAge)
    .lt('created_at', maxAge);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const { data: settledOrders, error: missingPaymentFetchError } = await supabase
    .from('orders')
    .select(
      'id, order_no, artwork_id, total_amount, buyer_name, buyer_phone, metadata, status, order_items(artwork_id, quantity, unit_price), payments(id)'
    )
    .in('status', ['paid', 'awaiting_deposit'])
    .gt('created_at', minAge)
    .lt('created_at', maxAge);

  if (missingPaymentFetchError) {
    return NextResponse.json({ error: missingPaymentFetchError.message }, { status: 500 });
  }

  const missingPaymentOrders = (settledOrders ?? []).filter((order) => !hasPaymentRows(order));

  if ((!staleOrders || staleOrders.length === 0) && missingPaymentOrders.length === 0) {
    return NextResponse.json({ reconciled: 0, checked: 0 });
  }

  let reconciled = 0;
  const errors: string[] = [];

  for (const order of staleOrders ?? []) {
    try {
      // 주문별 provider 해석 — 위젯/레거시 MID 시크릿이 다르므로 반드시 매칭되는 provider로 호출
      const provider = resolveOrderProvider(order.metadata);

      // Toss API에서 결제 상태 확인
      const tossPayment = await fetchPaymentByOrderId(order.order_no, provider);

      if (!tossPayment) continue; // Toss에 결제 기록 없음 → 미결제, 스킵

      const now = new Date().toISOString();
      const existingMetadata = (order.metadata as Record<string, unknown>) ?? {};

      if (tossPayment.status === 'DONE') {
        // ── 결제 완료인데 DB에 반영 안 된 케이스 → 보정 ──
        const repaired = await markOrderPaid({
          supabase,
          order,
          tossPayment,
          provider,
          now,
          sourceStatuses: ['pending_payment'],
          idempotencyKey: `reconcile-${order.order_no}`,
          errors,
        });

        if (!repaired) continue;

        reconciled++;
        console.error(
          `[reconcile-payments] FIXED: ${order.order_no} — Toss DONE, DB was pending_payment`
        );
      } else if (tossPayment.status === 'WAITING_FOR_DEPOSIT') {
        // ── 가상계좌 입금 대기인데 DB에 반영 안 된 케이스 ──

        // payment 레코드 보정
        const paymentRecordResult = await ensureTossPaymentRecord({
          supabase,
          orderId: order.id,
          tossPayment,
          idempotencyKey: `reconcile-${order.order_no}`,
        });

        if (!paymentRecordResult.ok) {
          errors.push(`${order.order_no}: payment insert failed: ${paymentRecordResult.error}`);
          continue;
        }

        // 주문을 입금대기로 열기 전에 unique 작품 예약이 먼저 성공해야 한다.
        const depositLineItems = extractLineItems(order);
        const reserveArtworkIds =
          depositLineItems.length > 0
            ? depositLineItems.map((item) => item.artwork_id)
            : order.artwork_id
              ? [order.artwork_id]
              : [];

        const reservationResult = await reserveUniqueArtworksOrRollback(
          supabase,
          reserveArtworkIds,
          now
        );

        if (!reservationResult.ok) {
          let cancelOk = false;
          let cancelError: unknown = null;
          try {
            const cancelResult = await cancelPayment(
              tossPayment.paymentKey,
              { cancelReason: '작품 예약 실패로 가상계좌 주문 자동 취소 (reconcile)' },
              `auto-cancel-reservation-${order.order_no}`,
              provider
            );
            cancelOk = cancelResult.success;
            if (!cancelResult.success) cancelError = cancelResult.error;
          } catch (err) {
            cancelError = err;
          }

          const { error: orderCancelError } = await supabase
            .from('orders')
            .update({ status: 'cancelled', cancelled_at: now })
            .eq('id', order.id)
            .eq('status', 'pending_payment');
          if (orderCancelError) {
            errors.push(`${order.order_no}: reservation failure order cancel failed`);
          }

          if (cancelOk) {
            const { error: paymentCancelError } = await supabase
              .from('payments')
              .update({ status: 'CANCELED', cancelled_at: now })
              .eq('payment_key', tossPayment.paymentKey);
            if (paymentCancelError) {
              errors.push(`${order.order_no}: reservation failure payment cancel sync failed`);
            }
          } else {
            errors.push(
              `${order.order_no}: reservation failed for ${reservationResult.failedArtworkId}; Toss cancel failed (${String(cancelError)})`
            );
          }
          continue;
        }

        // 주문 → awaiting_deposit
        const { data: updatedOrders, error: orderUpdateError } = await supabase
          .from('orders')
          .update({
            status: 'awaiting_deposit',
            metadata: {
              ...existingMetadata,
              payment_method: tossPayment.method ?? null,
              reconciled: true,
            },
          })
          .eq('id', order.id)
          .eq('status', 'pending_payment')
          .select('id');

        if (orderUpdateError) {
          await releaseReservedArtworksIfUnowned(
            supabase,
            reservationResult.reservedArtworkIds,
            new Date().toISOString()
          );
          errors.push(`${order.order_no}: order update failed: ${orderUpdateError.message}`);
          continue;
        }

        if (!updatedOrders || updatedOrders.length === 0) {
          await releaseReservedArtworksIfUnowned(
            supabase,
            reservationResult.reservedArtworkIds,
            new Date().toISOString()
          );
          try {
            const cancelResult = await cancelPayment(
              tossPayment.paymentKey,
              { cancelReason: '주문 상태 경합으로 가상계좌 주문 자동 취소 (reconcile)' },
              `auto-cancel-race-${order.order_no}`,
              provider
            );
            if (cancelResult.success) {
              await supabase
                .from('payments')
                .update({ status: 'CANCELED', cancelled_at: new Date().toISOString() })
                .eq('payment_key', tossPayment.paymentKey);
            } else {
              errors.push(
                `${order.order_no}: VA race cancel failed: ${cancelResult.error.message}`
              );
            }
          } catch (err) {
            errors.push(`${order.order_no}: VA race cancel failed: ${String(err)}`);
          }
          console.error(
            `[reconcile-payments] SKIP: ${order.order_no} — order no longer pending_payment`
          );
          continue;
        }

        for (const artworkId of reservationResult.reservedArtworkIds) {
          revalidatePath(`/artworks/${artworkId}`);
          revalidatePath(`/en/artworks/${artworkId}`);
        }
        if (reservationResult.reservedArtworkIds.length > 0) {
          revalidatePublicArtworkSurfaces();
        }

        reconciled++;
        console.error(
          `[reconcile-payments] FIXED: ${order.order_no} — Toss WAITING_FOR_DEPOSIT, DB was pending_payment`
        );
      }
      // CANCELED, ABORTED, EXPIRED 등은 무시 — expire-stale-orders가 처리
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${order.order_no}: ${msg}`);
      console.error(`[reconcile-payments] ERROR: ${order.order_no}:`, err);
    }
  }

  for (const order of missingPaymentOrders) {
    try {
      const provider = resolveOrderProvider(order.metadata);
      const tossPayment = await fetchPaymentByOrderId(order.order_no, provider);
      if (!tossPayment) continue;

      if (order.status === 'awaiting_deposit' && tossPayment.status === 'DONE') {
        const repaired = await markOrderPaid({
          supabase,
          order,
          tossPayment,
          provider,
          now: new Date().toISOString(),
          sourceStatuses: ['awaiting_deposit'],
          idempotencyKey: `reconcile-missing-payment-${order.order_no}`,
          errors,
        });

        if (repaired) {
          reconciled++;
          console.error(
            `[reconcile-payments] FIXED: ${order.order_no} — Toss DONE, DB was awaiting_deposit without payment row`
          );
        }
        continue;
      }

      const expectedTossStatus =
        order.status === 'paid'
          ? 'DONE'
          : order.status === 'awaiting_deposit'
            ? 'WAITING_FOR_DEPOSIT'
            : null;
      if (expectedTossStatus && tossPayment.status !== expectedTossStatus) {
        errors.push(
          `${order.order_no}: order is ${order.status} but Toss status is ${tossPayment.status}`
        );
        continue;
      }

      const paymentRecordResult = await ensureTossPaymentRecord({
        supabase,
        orderId: order.id,
        tossPayment,
        idempotencyKey: `reconcile-missing-payment-${order.order_no}`,
      });

      if (!paymentRecordResult.ok) {
        errors.push(
          `${order.order_no}: missing payment repair failed: ${paymentRecordResult.error}`
        );
        continue;
      }

      reconciled++;
      console.error(
        `[reconcile-payments] FIXED: ${order.order_no} — order was ${order.status}, payment row was missing`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${order.order_no}: ${msg}`);
      console.error(`[reconcile-payments] ERROR: ${order.order_no}:`, err);
    }
  }

  const checked = (staleOrders?.length ?? 0) + missingPaymentOrders.length;

  // 결과 알림
  if (errors.length > 0) {
    await notifyEmail('error', `결제 보정 크론 에러 (${errors.length}건)`, {
      검사: `${checked}건`,
      보정: `${reconciled}건`,
      에러: errors.slice(0, 3).join('\n'),
    });
  } else if (reconciled > 0) {
    await notifyEmail('warning', `결제 보정 완료 (${reconciled}건)`, {
      검사: `${checked}건`,
      보정: `${reconciled}건`,
    });
  }

  return NextResponse.json({
    checked,
    reconciled,
    ...(errors.length > 0 ? { errors } : {}),
  });
}
