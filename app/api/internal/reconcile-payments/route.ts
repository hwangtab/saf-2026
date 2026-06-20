import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { fetchPaymentByOrderId } from '@/lib/integrations/toss/confirm';
import { cancelPayment } from '@/lib/integrations/toss/cancel';
import { resolveOrderProvider } from '@/lib/integrations/toss/config';
import { notifyEmail } from '@/lib/notify';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { validateInternalCronRequest } from '@/lib/security/internal-cron-auth';
import { deriveAndSyncArtworkStatus } from '@/app/actions/admin-artworks';
import { recordOrderArtworkSales, extractLineItems } from '@/lib/orders/record-artwork-sales';
import {
  releaseReservedArtworksIfUnowned,
  reserveUniqueArtworksOrRollback,
} from '@/lib/orders/reservations';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';
import { ensureTossPaymentRecord } from '@/lib/payments/toss-payment-record';

export const runtime = 'nodejs';

function hasPaymentRows(order: { payments?: unknown }): boolean {
  if (Array.isArray(order.payments)) return order.payments.length > 0;
  return Boolean(order.payments);
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
      'id, order_no, artwork_id, total_amount, buyer_name, buyer_phone, metadata, status, payments(id)'
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

        // 1) payment 레코드가 없으면 생성
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

        // 2) 주문 → paid (멱등성: pending_payment일 때만)
        // SELECT로 업데이트된 행 수를 확인 — 0행이면 이미 cancelled 등으로 상태 변경됨
        const { data: updatedOrders, error: orderUpdateError } = await supabase
          .from('orders')
          .update({
            status: 'paid',
            paid_at: tossPayment.approvedAt ?? now,
            // 기존 metadata 보존 후 병합
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
          errors.push(`${order.order_no}: order update failed: ${orderUpdateError.message}`);
          continue;
        }

        // 주문 상태 전환에 실패한 경우 (이미 cancelled 등) → artwork_sales 생성 스킵
        if (!updatedOrders || updatedOrders.length === 0) {
          console.error(
            `[reconcile-payments] SKIP: ${order.order_no} — order no longer pending_payment, skipping artwork_sales`
          );
          continue;
        }

        // 3) artwork_sales 레코드가 없으면 생성 (중복 방지) — 다품목 지원.
        // order_items가 있으면 라인별로, 비면(legacy 단건) order.artwork_id로 fallback.
        // recordOrderArtworkSales는 내부 멱등(active 매출 존재 시 skip)이므로 수동 existingSale 가드 불필요.
        const lineItems = extractLineItems(order);
        const salesLines =
          lineItems.length > 0
            ? lineItems
            : order.artwork_id
              ? [{ artwork_id: order.artwork_id, quantity: 1, unit_price: order.total_amount }]
              : [];

        if (salesLines.length > 0) {
          const salesResult = await recordOrderArtworkSales(supabase, {
            orderId: order.id,
            orderNo: order.order_no,
            lineItems: salesLines,
            source: 'toss',
            sourceDetail: provider === 'widget' ? 'toss_widget' : 'toss_api',
            buyerName: order.buyer_name,
            buyerPhone: order.buyer_phone,
            soldAt: tossPayment.approvedAt ?? now,
          });

          if (salesResult.inserted === false && salesResult.reason === 'artwork_taken') {
            // 동시 구매 경합: 다른 주문이 이 unique 작품을 먼저 가져감. 결제는 완료됐으나
            // 작품 매출을 기록할 수 없음. reconcile은 드문 failsafe라 자동 환불은 하지 않고
            // 운영팀이 수동 환불하도록 에러로 보고 + 작품 상태 동기화 스킵.
            errors.push(
              `${order.order_no}: artwork already taken by another order (동시 구매 경합 — 수동 환불 검토 필요)`
            );
            continue;
          }

          if (salesResult.inserted === false && salesResult.reason === 'error') {
            errors.push(`${order.order_no}: artwork_sales insert failed: ${salesResult.error}`);
            continue;
          }

          // artwork_sales 반영 후 작품 상태 동기화 + 공개 페이지 캐시 무효화 — 전 품목 루프.
          // outer supabase가 이미 admin 클라이언트이므로 재사용 (루프마다 신규 client 생성 회피)
          for (const item of salesLines) {
            await deriveAndSyncArtworkStatus(supabase, item.artwork_id);
          }
          revalidatePublicArtworkSurfaces();
          for (const item of salesLines) {
            revalidatePath(`/artworks/${item.artwork_id}`);
            revalidatePath(`/en/artworks/${item.artwork_id}`);
          }
        }

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
