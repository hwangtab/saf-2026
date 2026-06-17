import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

import type { Json } from '@/types/supabase';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { fetchPayment } from '@/lib/integrations/toss/confirm';
import { resolveOrderProvider, type PaymentProvider } from '@/lib/integrations/toss/config';
import {
  parseWebhookPayload,
  verifyWebhookRequest,
  verifyDepositCallbackSecret,
  isDepositCallback,
  isPaymentStatusChanged,
  isEventOrderId,
} from '@/lib/integrations/toss/webhook';
import { deriveAndSyncArtworkStatus } from '@/app/actions/admin-artworks';
import { recordOrderArtworkSales, extractLineItems } from '@/lib/orders/record-artwork-sales';
import { notifyEmail, sendBuyerEmail, extractBuyerLocale } from '@/lib/notify';
import { sendBuyerSms } from '@/lib/sms/buyer-sms';
import {
  buildAdminNotificationFields,
  getOrderNotificationInfo,
} from '@/lib/utils/get-order-notification-info';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';
import { runAllSettled } from '@/lib/server/after-response';

const CANCELED_STATUSES = new Set(['CANCELED', 'PARTIAL_CANCELED']);

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // SEC-04: 웹훅 시크릿 검증 (PAYMENT_STATUS_CHANGED / DEPOSIT_CALLBACK 공통)
  if (!verifyWebhookRequest(req)) {
    console.error('[toss-webhook] Webhook secret verification failed');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = parseWebhookPayload(body);
  if (!payload) {
    console.error('[toss-webhook] Invalid payload received');
    return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
  }

  // 이벤트(추도식) 결제는 작품 결제와 같은 domestic MID(saf202i818)를 공유하므로
  // STATUS_CHANGED/DEPOSIT_CALLBACK 웹훅이 이 엔드포인트로 들어오지만, event_registrations +
  // event confirm route가 전체 라이프사이클을 처리한다. 작품 웹훅(payments/orders 기반)은
  // 이벤트 결제를 찾지 못해 provider를 api_v1(cafe24 secret)로 잘못 추정 → fetchPayment가
  // saf202i818 결제를 cafe24 secret으로 조회 → 404 → '검증 실패' 알림 + 500 재시도 폭주
  // (2026-06-15 회귀: EVT 결제마다 거짓 알림). 작품 웹훅이 처리할 수 없는 영역이므로
  // 즉시 200으로 ack(Toss 재시도 중단)한 뒤 무시한다.
  if (isEventOrderId(payload.data.orderId)) {
    return NextResponse.json({ received: true, status: 'ignored_event' }, { status: 200 });
  }

  const supabase = createSupabaseAdminClient();

  if (isDepositCallback(payload)) {
    const paymentKey = payload.data.paymentKey;

    // Find payment record — distinguish Supabase errors from "not found"
    const { data: paymentRecord, error: paymentLookupError } = await supabase
      .from('payments')
      .select('id, order_id, webhook_responses, confirm_response')
      .eq('payment_key', paymentKey)
      .maybeSingle();

    if (paymentLookupError) {
      // DB 에러: 인증 실패가 아닌 서버 에러 — Toss가 재시도할 수 있도록 500 반환
      console.error('[toss-webhook] payment lookup failed:', paymentLookupError);
      after(() =>
        notifyEmail('error', '웹훅 DB 조회 실패', {
          paymentKey,
          에러: paymentLookupError.message,
        })
      );
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    let provider: PaymentProvider = 'api_v1';
    if (paymentRecord?.order_id) {
      const { data: orderForProvider } = await supabase
        .from('orders')
        .select('metadata')
        .eq('id', paymentRecord.order_id)
        .single();
      provider = resolveOrderProvider(orderForProvider?.metadata);
    }

    // SEC-04a: Verify per-payment secret from confirm_response.virtualAccount.secret
    const storedSecret =
      (
        paymentRecord?.confirm_response as
          | { virtualAccount?: { secret?: string } }
          | null
          | undefined
      )?.virtualAccount?.secret ?? null;

    if (!verifyDepositCallbackSecret(payload, storedSecret)) {
      console.error(`[toss-webhook] DEPOSIT_CALLBACK secret verification failed: ${paymentKey}`);
      after(() =>
        notifyEmail('error', '웹훅 검증 실패 (DEPOSIT_CALLBACK)', {
          paymentKey,
          사유: 'per-payment secret 불일치',
        })
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (payload.data.paymentStatus === 'DONE') {
      // SEC-04b: Double-verify from Toss API
      const verified = await fetchPayment(paymentKey, provider);
      if (!verified || verified.status !== 'DONE') {
        console.error(`[toss-webhook] Toss API double-verify failed: ${paymentKey}`);
        after(() =>
          notifyEmail('error', '웹훅 Toss API 이중검증 실패', {
            paymentKey,
            사유: verified ? `상태 불일치: ${verified.status}` : 'API 응답 없음',
          })
        );
        // 일시적 API 장애일 수 있으므로 500 반환 → Toss 재시도 유도
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
      }

      if (paymentRecord) {
        // 멱등성 가드: 이미 paid 상태이면 중복 처리 방지
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('status, artwork_id, order_no')
          .eq('id', paymentRecord.order_id)
          .single();
        if (existingOrder?.status === 'paid') {
          return NextResponse.json({ received: true }, { status: 200 });
        }

        // Update payment status
        const existingWebhooks = Array.isArray(paymentRecord.webhook_responses)
          ? paymentRecord.webhook_responses
          : [];
        const { error: paymentUpdateError } = await supabase
          .from('payments')
          .update({
            status: 'DONE',
            approved_at: new Date().toISOString(),
            webhook_responses: [...existingWebhooks, body as Json],
          })
          .eq('id', paymentRecord.id);

        if (paymentUpdateError) {
          console.error(`[toss-webhook] payment UPDATE failed: ${paymentKey}`, paymentUpdateError);
        }

        // Update order status (awaiting_deposit → paid)
        const { data: updatedOrders, error: orderUpdateError } = await supabase
          .from('orders')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', paymentRecord.order_id)
          .eq('status', 'awaiting_deposit')
          .select('id');

        if (orderUpdateError) {
          console.error(
            `[toss-webhook] order UPDATE failed: ${existingOrder?.order_no}`,
            orderUpdateError
          );
          after(() =>
            notifyEmail('error', '웹훅 주문 상태 업데이트 실패', {
              주문번호: existingOrder?.order_no ?? '',
              paymentKey,
              에러: orderUpdateError.message,
            })
          );
        }

        // artwork_sales + artwork 상태 갱신은 주문 UPDATE 성공 시에만
        if (updatedOrders && updatedOrders.length > 0) {
          const { data: order } = await supabase
            .from('orders')
            .select(
              'artwork_id, total_amount, order_no, buyer_name, buyer_phone, buyer_email, metadata, order_items(artwork_id, quantity, unit_price)'
            )
            .eq('id', paymentRecord.order_id)
            .single();

          // 동시 구매 경합 패배(artwork_taken) 시 자동 환불 분기로 빠지므로 플래그로 가드.
          // 정상 입금완료 알림(admin 입금확인 + 구매자 deposit_confirmed)은 작품을 줄 수 있을 때만.
          let contestLost = false;

          if (order) {
            const lineItems = extractLineItems(order);
            const salesResult = await recordOrderArtworkSales(supabase, {
              orderId: paymentRecord.order_id,
              orderNo: order.order_no,
              lineItems,
              source: 'toss',
              sourceDetail: provider === 'widget' ? 'toss_widget' : 'toss_api',
              buyerName: order.buyer_name,
              buyerPhone: order.buyer_phone,
              soldAt: new Date().toISOString(),
            });

            if (salesResult.inserted === false && salesResult.reason === 'artwork_taken') {
              // 동시 구매 경합 패배: 다른 주문이 이 unique 작품의 active 매출을 먼저 기록했고
              // (enforce_unique_edition_single_active_sale 트리거가 INSERT 차단), 이쪽은 입금이 이미
              // 완료된 상태다. 작품을 줄 수 없으므로 자동 환불 + 주문 refunded 마킹.
              // ⚠ confirm route의 artwork_taken 분기 미러 — deriveAndSyncArtworkStatus/추가 매출 금지
              //   (이 주문엔 줄 작품이 없고, 작품은 승자 주문 소유라 건드리면 안 됨).
              //   가상계좌(VA)는 입금된 실금액이므로 cancelPayment가 환불 처리(전액 취소).
              contestLost = true;
              console.error(
                `[toss-webhook] DEPOSIT_CALLBACK DONE unique 작품 경합 패배 — 자동 환불 진행: ${order.order_no}`
              );

              // 주문 paid → refunded (optimistic lock: 방금 paid로 올린 이 주문만)
              const { error: refundMarkError } = await supabase
                .from('orders')
                .update({ status: 'refunded', refunded_at: new Date().toISOString() })
                .eq('id', paymentRecord.order_id)
                .eq('status', 'paid');
              if (refundMarkError) {
                console.error(
                  `[toss-webhook] 경합 패배 주문 refunded 마킹 실패: ${order.order_no}`,
                  refundMarkError
                );
              }

              // 재고 누수 방지: 이 주문의 다른(안 팔린) 라인 작품이 reserved로 남으면 해제한다.
              // 승자 주문이 소유한 sold 작품은 .eq('status','reserved') 가드로 제외됨.
              const takenReleaseIds = lineItems.map((item) => item.artwork_id);
              if (takenReleaseIds.length > 0) {
                const { error: releaseError } = await supabase
                  .from('artworks')
                  .update({ status: 'available', updated_at: new Date().toISOString() })
                  .in('id', takenReleaseIds)
                  .eq('status', 'reserved');
                if (releaseError) {
                  console.error(
                    '[toss-webhook] DEPOSIT_CALLBACK 경합 패배 reserved→available 해제 실패:',
                    releaseError
                  );
                }
                for (const artworkId of takenReleaseIds) {
                  revalidatePath(`/artworks/${artworkId}`);
                  revalidatePath(`/en/artworks/${artworkId}`);
                }
                revalidatePublicArtworkSurfaces();
              }

              // 자동 환불 + 결과별 알림 — 웹훅 응답을 블로킹하지 않도록 after()로 처리.
              // 환불 성공이 확인된 뒤에만 구매자에게 '환불' 안내(실패했는데 환불됐다고 잘못 알리는 것 방지).
              const buyerEmail = order.buyer_email;
              const buyerName = order.buyer_name ?? '';
              const buyerPhone = order.buyer_phone;
              const refundAmount = order.total_amount ?? 0;
              const refundOrderNo = order.order_no ?? '';
              const refundLocale = extractBuyerLocale(order.metadata);
              const refundOrderId = paymentRecord.order_id;
              after(async () => {
                const { cancelPayment } = await import('@/lib/integrations/toss/cancel');
                let refundOk = false;
                try {
                  const result = await cancelPayment(
                    paymentKey,
                    { cancelReason: '동시 구매 경합으로 작품이 이미 판매되어 자동 환불' },
                    `auto-refund-taken-${refundOrderNo || paymentKey}`,
                    provider
                  );
                  refundOk = result.success;
                  if (!result.success) {
                    console.error(
                      '[toss-webhook] DEPOSIT_CALLBACK 경합 패배 자동 환불 거부:',
                      result.error
                    );
                  }
                } catch (err) {
                  console.error('[toss-webhook] DEPOSIT_CALLBACK 경합 패배 자동 환불 실패:', err);
                }

                if (refundOk) {
                  // 주문은 refunded인데 payments가 DONE으로 남는 불일치 해소.
                  const { error: paymentSyncError } = await supabase
                    .from('payments')
                    .update({ status: 'CANCELED', cancelled_at: new Date().toISOString() })
                    .eq('order_id', refundOrderId);
                  if (paymentSyncError) {
                    console.error(
                      '[toss-webhook] DEPOSIT_CALLBACK 경합 패배 payments status 정합 실패:',
                      paymentSyncError
                    );
                  }
                  await runAllSettled(
                    'toss-webhook.depositCallback.autoRefund.successNotifications',
                    [
                      () =>
                        notifyEmail('info', '동시 구매 경합 — 자동 환불 완료 (가상계좌 입금분)', {
                          주문번호: refundOrderNo,
                          paymentKey,
                          참고: '다른 주문이 unique 작품을 먼저 가져가 입금분 자동 환불 완료.',
                        }),
                      ...(buyerEmail
                        ? [
                            () =>
                              sendBuyerEmail(
                                buyerEmail,
                                'refunded',
                                {
                                  orderNo: refundOrderNo,
                                  buyerName,
                                  artworkTitle: '',
                                  artistName: '',
                                  amount: refundAmount,
                                },
                                refundLocale
                              ),
                          ]
                        : []),
                      () =>
                        sendBuyerSms(
                          buyerPhone,
                          'refunded',
                          { buyerName, artworkTitle: '', amount: refundAmount },
                          refundLocale,
                          refundOrderNo || undefined
                        ),
                    ]
                  );
                } else {
                  // 환불 실패 — 구매자에게 '환불' 안내하지 않고 운영팀에 즉시 수동환불 요청.
                  // VA는 실입금분이라 refundReceiveAccount(환불 계좌)가 필요할 수 있어 자동 취소가
                  // 거부될 수 있다 — 이 경우 운영팀이 수동으로 환불 계좌를 받아 처리해야 한다.
                  await runAllSettled(
                    'toss-webhook.depositCallback.autoRefund.failureNotifications',
                    [
                      () =>
                        notifyEmail(
                          'error',
                          '🚨 동시 구매 경합 자동 환불 실패 — 즉시 수동 환불 필요 (가상계좌 입금분)',
                          {
                            주문번호: refundOrderNo,
                            paymentKey,
                            금액: `₩${refundAmount.toLocaleString('ko-KR')}`,
                            참고: '가상계좌 입금 완료됐으나 작품은 타인 선점, 자동 환불 실패(환불 계좌 필요 가능성). 구매자 안내 보류 — 즉시 수동 환불 처리 요망.',
                          }
                        ),
                    ]
                  );
                }
              });
            } else if (salesResult.inserted === false && salesResult.reason === 'error') {
              console.error(
                `[toss-webhook] artwork_sales INSERT failed (error): ${order.order_no}`,
                salesResult.error
              );
              after(() =>
                notifyEmail('error', '웹훅 판매 기록 생성 실패', {
                  주문번호: order.order_no,
                  에러: salesResult.error,
                })
              );
            } else if (salesResult.inserted === false && salesResult.reason === 'no_line_items') {
              console.error(`[toss-webhook] paid deposit with no order_items: ${order.order_no}`);
              after(() =>
                notifyEmail('error', '입금 완료 주문에 품목 없음 — 판매 기록 누락', {
                  주문번호: order.order_no ?? '',
                  참고: '입금+주문 완료이나 order_items가 비어 매출 미기록 — 수동 확인 필요',
                })
              );
            }

            // 정상 케이스만 artwork 상태 재계산(reserved → sold). 경합 패배는 작품을 건드리지 않음.
            if (!contestLost) {
              for (const item of lineItems) {
                await deriveAndSyncArtworkStatus(supabase, item.artwork_id);
              }
              if (lineItems.length > 0) {
                revalidatePublicArtworkSurfaces();
                for (const item of lineItems) {
                  revalidatePath(`/artworks/${item.artwork_id}`);
                  revalidatePath(`/en/artworks/${item.artwork_id}`);
                }
              }
            }
          }

          // 정상 입금완료 알림은 작품을 줄 수 있을 때만. 경합 패배 시 거짓 "입금 확인/배송 예정" 안내 금지.
          if (!contestLost) {
            const depositInfo = await getOrderNotificationInfo(supabase, {
              id: paymentRecord.order_id,
            });

            const buyerEmail = order?.buyer_email;
            after(async () => {
              await runAllSettled('tossWebhook.depositPaid.notifications', [
                () =>
                  depositInfo
                    ? notifyEmail(
                        'payment',
                        '가상계좌 입금 확인',
                        buildAdminNotificationFields(depositInfo)
                      )
                    : notifyEmail('payment', '가상계좌 입금 확인', {
                        주문번호: order?.order_no ?? '',
                        금액: `₩${(order?.total_amount ?? 0).toLocaleString('ko-KR')}`,
                      }),
                ...(buyerEmail
                  ? [
                      () =>
                        sendBuyerEmail(
                          buyerEmail,
                          'deposit_confirmed',
                          {
                            orderNo: order?.order_no ?? '',
                            buyerName: order?.buyer_name ?? '',
                            artworkTitle: depositInfo?.artworkTitle ?? '',
                            artistName: depositInfo?.artistName ?? '',
                            amount: order?.total_amount ?? 0,
                            itemAmount: depositInfo?.itemAmount,
                            shippingAmount: depositInfo?.shippingAmount,
                            shipping: depositInfo
                              ? {
                                  name: depositInfo.shippingName,
                                  phone: depositInfo.shippingPhone,
                                  address: depositInfo.shippingAddress,
                                  memo: depositInfo.shippingMemo,
                                }
                              : undefined,
                          },
                          extractBuyerLocale(order?.metadata)
                        ),
                    ]
                  : []),
                () =>
                  sendBuyerSms(
                    order?.buyer_phone,
                    'deposit_confirmed',
                    {
                      buyerName: order?.buyer_name ?? '',
                      artworkTitle: depositInfo?.artworkTitle ?? '',
                      amount: order?.total_amount ?? 0,
                    },
                    extractBuyerLocale(order?.metadata),
                    order?.order_no ?? undefined
                  ),
              ]);
            });
          }
        }
      } else {
        // paymentRecord가 DB에 없는데 Toss에서 DONE 수신 — 심각한 정합성 문제
        console.error(`[toss-webhook] DEPOSIT_CALLBACK DONE but no payment record: ${paymentKey}`);
        after(() =>
          notifyEmail('error', '웹훅 수신: 결제 기록 없이 입금 완료', {
            paymentKey,
            주문ID: payload.data.orderId,
            참고: 'payments 테이블에 해당 paymentKey 미존재 — reconciliation 또는 수동 확인 필요',
          })
        );
        return NextResponse.json({ error: 'Payment record not found' }, { status: 500 });
      }
    } else if (payload.data.paymentStatus === 'CANCELED') {
      // 가상계좌 만료 또는 취소 — 주문 상태 변경 + artwork 복원
      console.error(`[toss-webhook] DEPOSIT_CALLBACK CANCELED: ${paymentKey}`);

      if (paymentRecord) {
        const now = new Date().toISOString();

        // awaiting_deposit → cancelled
        const { data: cancelledOrders, error: cancelError } = await supabase
          .from('orders')
          .update({ status: 'cancelled', cancelled_at: now })
          .eq('id', paymentRecord.order_id)
          .eq('status', 'awaiting_deposit')
          .select('id, artwork_id, order_items(artwork_id, quantity, unit_price)');

        if (cancelError) {
          console.error(
            '[toss-webhook] DEPOSIT_CALLBACK CANCELED order update failed:',
            cancelError
          );
        }

        // artwork reserved → available 복원 — order_items 전 품목 루프
        if (cancelledOrders && cancelledOrders.length > 0) {
          const cancelledOrder = cancelledOrders[0];
          const lineItems = extractLineItems(cancelledOrder);
          // order_items가 비면 legacy 단건 artwork_id로 fallback
          const artworkIds =
            lineItems.length > 0
              ? lineItems.map((item) => item.artwork_id)
              : cancelledOrder.artwork_id
                ? [cancelledOrder.artwork_id]
                : [];
          for (const artworkId of artworkIds) {
            const { error: artworkError } = await supabase
              .from('artworks')
              .update({ status: 'available', updated_at: now })
              .eq('id', artworkId)
              .eq('status', 'reserved');
            if (artworkError) {
              console.error('[toss-webhook] artwork reserved→available failed:', artworkError);
            }
            revalidatePath(`/artworks/${artworkId}`);
            revalidatePath(`/en/artworks/${artworkId}`);
          }
          if (artworkIds.length > 0) {
            revalidatePublicArtworkSurfaces();
          }
        }
      }

      after(() =>
        notifyEmail('warning', '가상계좌 입금 취소/만료', {
          paymentKey,
          주문ID: payload.data.orderId,
        })
      );
    }
  } else if (isPaymentStatusChanged(payload)) {
    const paymentKey = payload.data.paymentKey;
    const orderId = payload.data.orderId;
    const newStatus = payload.data.status;

    // Resolve provider from payment → order metadata.
    // ABORTED 주문은 confirm 단계 전이라 payments 테이블에 행이 없을 수 있음 →
    // payments 조회 실패 시 orders.order_no(=Toss orderId)로 직접 fallback.
    let provider: PaymentProvider = 'api_v1';
    const { data: providerLookup } = await supabase
      .from('payments')
      .select('orders!inner(metadata)')
      .eq('payment_key', paymentKey)
      .maybeSingle();
    if (providerLookup?.orders) {
      const orderRow = Array.isArray(providerLookup.orders)
        ? providerLookup.orders[0]
        : providerLookup.orders;
      provider = resolveOrderProvider(orderRow?.metadata);
    } else {
      // payments 행 없음 → orders 테이블에서 직접 metadata 조회
      const { data: orderRow } = await supabase
        .from('orders')
        .select('metadata')
        .eq('order_no', orderId)
        .maybeSingle();
      if (orderRow) {
        provider = resolveOrderProvider(orderRow.metadata);
      }
    }

    // ABORTED/EXPIRED 등 confirm 전 종결 상태는 payments 행이 없을 수 있음. 추가로:
    // pending_payment 상태인 주문이 있으면 cancelled로 정리 — 그렇지 않으면 30분간
    // 살아남아 unique 작품의 다음 구매 시도가 RPC pending_count 때문에 차단됨.
    const ABORTED_STATUSES = new Set(['ABORTED', 'EXPIRED']);
    if (ABORTED_STATUSES.has(newStatus)) {
      const { data: paymentExists } = await supabase
        .from('payments')
        .select('id')
        .eq('payment_key', paymentKey)
        .maybeSingle();

      // paymentKey 기반 payments 행이 없으면 confirm 전 종결.
      // orders.order_no(=Toss orderId)로 pending_payment 주문 cancelled 처리.
      // SEC: 헤더 없이 들어온 웹훅은 위조 가능성 있으므로, Toss API 재검증 후에만 취소.
      // paymentKey가 Toss에 실재하지 않거나 status가 일치하지 않으면 무시.
      if (!paymentExists) {
        const tossPayAborted = await fetchPayment(paymentKey, provider);
        if (!tossPayAborted || !ABORTED_STATUSES.has(tossPayAborted.status)) {
          console.error(
            `[toss-webhook] ABORTED webhook rejected — paymentKey not in Toss API or status mismatch (API: ${tossPayAborted?.status ?? 'null'}): ${paymentKey}`
          );
          return NextResponse.json({ received: true, status: 'ignored' }, { status: 200 });
        }

        const { data: cancelled } = await supabase
          .from('orders')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
          .eq('order_no', orderId)
          .eq('status', 'pending_payment')
          .select('order_no');

        if (cancelled && cancelled.length > 0) {
          console.error(
            `[toss-webhook] auto-cancelled pending order ${orderId} on ${newStatus} webhook`
          );
        }
        return NextResponse.json(
          { received: true, status: 'aborted_pending_cleared' },
          { status: 200 }
        );
      }
    }

    // Toss API double-verify BEFORE any DB mutations
    const verified = await fetchPayment(paymentKey, provider);
    if (!verified) {
      console.error(`[toss-webhook] STATUS_CHANGED Toss API verify failed: ${paymentKey}`);
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id, webhook_responses')
        .eq('payment_key', paymentKey)
        .single();
      if (existingPayment) {
        const existingWebhooks = Array.isArray(existingPayment.webhook_responses)
          ? existingPayment.webhook_responses
          : [];
        const { error: auditErr } = await supabase
          .from('payments')
          .update({ webhook_responses: [...existingWebhooks, body as Json] })
          .eq('id', existingPayment.id);
        if (auditErr) console.error('[toss-webhook] audit trail write failed:', auditErr);
      }
      after(() =>
        notifyEmail('error', '웹훅 Toss API 검증 실패 (STATUS_CHANGED)', {
          paymentKey,
          수신상태: newStatus,
        })
      );
      // 일시적 API 장애일 수 있으므로 500 반환 → Toss 재시도 유도
      return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }

    if (verified.status !== newStatus) {
      console.error(
        `[toss-webhook] STATUS_CHANGED mismatch: webhook=${newStatus}, API=${verified.status}`
      );
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id, webhook_responses')
        .eq('payment_key', paymentKey)
        .single();
      if (existingPayment) {
        const existingWebhooks = Array.isArray(existingPayment.webhook_responses)
          ? existingPayment.webhook_responses
          : [];
        const { error: auditErr } = await supabase
          .from('payments')
          .update({ webhook_responses: [...existingWebhooks, body as Json] })
          .eq('id', existingPayment.id);
        if (auditErr) console.error('[toss-webhook] audit trail write failed:', auditErr);
      }
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Update payment status
    const { data: paymentRow, error: paymentFetchError } = await supabase
      .from('payments')
      .select('id, order_id, status, webhook_responses')
      .eq('payment_key', paymentKey)
      .single();

    if (paymentFetchError || !paymentRow) {
      console.error(`[toss-webhook] STATUS_CHANGED payment fetch failed: ${paymentKey}`);
      // DB 오류 시 500 반환 → Toss 재시도 유도
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const existingWebhooks = Array.isArray(paymentRow.webhook_responses)
      ? paymentRow.webhook_responses
      : [];

    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({ status: newStatus, webhook_responses: [...existingWebhooks, body as Json] })
      .eq('id', paymentRow.id);

    if (paymentUpdateError) {
      console.error(
        `[toss-webhook] payment status UPDATE failed: ${paymentKey}`,
        paymentUpdateError
      );
    }

    // PAYMENT_STATUS_CHANGED DONE — confirm route 실패 안전망.
    // 정상 흐름: confirm/route.ts가 INSERT payment + UPDATE order → paid + INSERT artwork_sales까지 처리.
    // 실패 시나리오: payment 기록은 성공했으나 order UPDATE 또는 artwork_sales INSERT에서 실패하면
    // order는 pending_payment로 stuck. reconcile cron이 5~28분 window에서 처리하지만 그 사이의
    // gap을 webhook으로 즉시 보정한다. 멱등성은 order.status 가드로 확보.
    if (newStatus === 'DONE' && paymentRow.order_id) {
      const { data: existingOrder } = await supabase
        .from('orders')
        .select(
          'status, artwork_id, order_no, buyer_email, buyer_name, buyer_phone, total_amount, metadata, order_items(artwork_id, quantity, unit_price)'
        )
        .eq('id', paymentRow.order_id)
        .single();

      if (
        existingOrder &&
        existingOrder.status !== 'paid' &&
        !['refunded', 'cancelled'].includes(existingOrder.status)
      ) {
        const now = new Date().toISOString();

        // pending_payment / awaiting_deposit → paid (멱등 가드: 이미 paid이면 매칭 안 됨)
        const { data: updatedOrders, error: orderUpdateError } = await supabase
          .from('orders')
          .update({ status: 'paid', paid_at: now })
          .eq('id', paymentRow.order_id)
          .in('status', ['pending_payment', 'awaiting_deposit'])
          .select('id');

        if (orderUpdateError) {
          console.error(
            `[toss-webhook] STATUS_CHANGED DONE order UPDATE failed: ${existingOrder.order_no}`,
            orderUpdateError
          );
        }

        const lineItems = extractLineItems(existingOrder);

        // 동시 구매 경합 패배(artwork_taken) 시 자동 환불 분기로 빠지므로 플래그로 가드.
        // 정상 결제완료 알림(구매자 payment_confirmed)은 작품을 줄 수 있을 때만.
        let contestLost = false;

        // artwork_sales INSERT — confirm route가 이미 INSERT했다면 헬퍼 내부 멱등으로 skip
        if (updatedOrders && updatedOrders.length > 0 && lineItems.length > 0) {
          // source_detail은 order metadata에서 resolve한 provider 기준.
          // 보고서에서 widget/api_v1 구분이 유지되도록 하드코딩 회피.
          const salesResult = await recordOrderArtworkSales(supabase, {
            orderId: paymentRow.order_id,
            orderNo: existingOrder.order_no,
            lineItems,
            source: 'toss',
            sourceDetail: provider === 'widget' ? 'toss_widget' : 'toss_api',
            buyerName: existingOrder.buyer_name,
            buyerPhone: existingOrder.buyer_phone,
            soldAt: now,
          });

          if (salesResult.inserted === false && salesResult.reason === 'artwork_taken') {
            // 동시 구매 경합 패배: 다른 주문이 이 unique 작품의 active 매출을 먼저 기록했고
            // (트리거가 INSERT 차단), 이쪽은 결제가 이미 캡처된 상태다. 작품을 줄 수 없으므로
            // 자동 환불 + 주문 refunded 마킹. ⚠ confirm route의 artwork_taken 분기 미러 —
            // deriveAndSyncArtworkStatus/추가 매출 금지(작품은 승자 주문 소유).
            // 위에서 막 paid로 올렸으므로 refunded로 되돌린다.
            contestLost = true;
            console.error(
              `[toss-webhook] STATUS_CHANGED DONE unique 작품 경합 패배 — 자동 환불 진행: ${existingOrder.order_no}`
            );

            const { error: refundMarkError } = await supabase
              .from('orders')
              .update({ status: 'refunded', refunded_at: new Date().toISOString() })
              .eq('id', paymentRow.order_id)
              .eq('status', 'paid');
            if (refundMarkError) {
              console.error(
                `[toss-webhook] 경합 패배 주문 refunded 마킹 실패: ${existingOrder.order_no}`,
                refundMarkError
              );
            }

            // 재고 누수 방지: 이 주문의 다른(안 팔린) 라인 작품이 reserved로 남으면 해제한다.
            // 승자 주문이 소유한 sold 작품은 .eq('status','reserved') 가드로 제외됨. (card 경로는
            // reserved가 없어 no-op이지만 방어적으로 둠.)
            const takenReleaseIds = lineItems.map((item) => item.artwork_id);
            if (takenReleaseIds.length > 0) {
              const { error: releaseError } = await supabase
                .from('artworks')
                .update({ status: 'available', updated_at: new Date().toISOString() })
                .in('id', takenReleaseIds)
                .eq('status', 'reserved');
              if (releaseError) {
                console.error(
                  '[toss-webhook] STATUS_CHANGED 경합 패배 reserved→available 해제 실패:',
                  releaseError
                );
              }
              for (const artworkId of takenReleaseIds) {
                revalidatePath(`/artworks/${artworkId}`);
                revalidatePath(`/en/artworks/${artworkId}`);
              }
              revalidatePublicArtworkSurfaces();
            }

            // 자동 환불 + 결과별 알림 — 웹훅 응답을 블로킹하지 않도록 after()로 처리.
            // 환불 성공이 확인된 뒤에만 구매자에게 '환불' 안내.
            const buyerEmail = existingOrder.buyer_email;
            const buyerName = existingOrder.buyer_name ?? '';
            const buyerPhone = existingOrder.buyer_phone;
            const refundAmount = existingOrder.total_amount ?? 0;
            const refundOrderNo = existingOrder.order_no ?? '';
            const refundLocale = extractBuyerLocale(existingOrder.metadata);
            const refundOrderId = paymentRow.order_id;
            after(async () => {
              const { cancelPayment } = await import('@/lib/integrations/toss/cancel');
              let refundOk = false;
              try {
                const result = await cancelPayment(
                  paymentKey,
                  { cancelReason: '동시 구매 경합으로 작품이 이미 판매되어 자동 환불' },
                  `auto-refund-taken-${refundOrderNo || paymentKey}`,
                  provider
                );
                refundOk = result.success;
                if (!result.success) {
                  console.error(
                    '[toss-webhook] STATUS_CHANGED 경합 패배 자동 환불 거부:',
                    result.error
                  );
                }
              } catch (err) {
                console.error('[toss-webhook] STATUS_CHANGED 경합 패배 자동 환불 실패:', err);
              }

              if (refundOk) {
                // 주문은 refunded인데 payments가 DONE으로 남는 불일치 해소.
                const { error: paymentSyncError } = await supabase
                  .from('payments')
                  .update({ status: 'CANCELED', cancelled_at: new Date().toISOString() })
                  .eq('order_id', refundOrderId);
                if (paymentSyncError) {
                  console.error(
                    '[toss-webhook] STATUS_CHANGED 경합 패배 payments status 정합 실패:',
                    paymentSyncError
                  );
                }
                await runAllSettled('toss-webhook.statusChanged.autoRefund.successNotifications', [
                  () =>
                    notifyEmail('info', '동시 구매 경합 — 자동 환불 완료', {
                      주문번호: refundOrderNo,
                      paymentKey,
                      참고: '다른 주문이 unique 작품을 먼저 가져가 자동 환불 완료.',
                    }),
                  ...(buyerEmail
                    ? [
                        () =>
                          sendBuyerEmail(
                            buyerEmail,
                            'refunded',
                            {
                              orderNo: refundOrderNo,
                              buyerName,
                              artworkTitle: '',
                              artistName: '',
                              amount: refundAmount,
                            },
                            refundLocale
                          ),
                      ]
                    : []),
                  () =>
                    sendBuyerSms(
                      buyerPhone,
                      'refunded',
                      { buyerName, artworkTitle: '', amount: refundAmount },
                      refundLocale,
                      refundOrderNo || undefined
                    ),
                ]);
              } else {
                // 환불 실패 — 구매자 안내 보류, 운영팀 즉시 수동환불 요청.
                // 가상계좌 입금분이면 환불 계좌(refundReceiveAccount)가 필요해 자동 취소가 거부될 수 있음.
                await runAllSettled('toss-webhook.statusChanged.autoRefund.failureNotifications', [
                  () =>
                    notifyEmail('error', '🚨 동시 구매 경합 자동 환불 실패 — 즉시 수동 환불 필요', {
                      주문번호: refundOrderNo,
                      paymentKey,
                      금액: `₩${refundAmount.toLocaleString('ko-KR')}`,
                      참고: '결제는 캡처됐으나 작품은 타인 선점, 자동 환불 실패(가상계좌면 환불 계좌 필요 가능성). 구매자 안내 보류 — 즉시 수동 환불 처리 요망.',
                    }),
                ]);
              }
            });
          } else if (salesResult.inserted === false && salesResult.reason === 'error') {
            console.error(
              `[toss-webhook] STATUS_CHANGED DONE artwork_sales INSERT failed (error): ${existingOrder.order_no}`,
              salesResult.error
            );
            after(() =>
              notifyEmail('error', '웹훅 판매 기록 생성 실패 (STATUS_CHANGED)', {
                주문번호: existingOrder.order_no ?? '',
                paymentKey,
                에러: salesResult.error,
              })
            );
          }

          // 정상 케이스만 artwork 상태 재계산. 경합 패배는 작품을 건드리지 않음.
          if (!contestLost) {
            for (const item of lineItems) {
              await deriveAndSyncArtworkStatus(supabase, item.artwork_id);
            }
            revalidatePublicArtworkSurfaces();
            for (const item of lineItems) {
              revalidatePath(`/artworks/${item.artwork_id}`);
              revalidatePath(`/en/artworks/${item.artwork_id}`);
            }
          }
        }

        // confirm route 실패를 webhook이 보정한 경우, 구매자 결제완료 알림이 누락되지 않게 발송.
        // (confirm route는 정상 경로에서 payment_confirmed를 보내지만, 그 단계에서 실패하면 미발송)
        // 경합 패배(contestLost) 시에는 작품을 못 줬으므로 거짓 결제완료 안내 금지 — 위 환불 분기가 처리.
        if (updatedOrders && updatedOrders.length > 0 && !contestLost) {
          const paidInfo = await getOrderNotificationInfo(supabase, { id: paymentRow.order_id });
          const buyerLocale = extractBuyerLocale(existingOrder.metadata);
          const buyerEmail = existingOrder.buyer_email;
          after(async () => {
            await runAllSettled('tossWebhook.statusChangedDone.notifications', [
              () =>
                notifyEmail('warning', '결제 webhook 보정 — confirm route 실패 추정', {
                  주문번호: existingOrder.order_no ?? '',
                  paymentKey,
                  상태: newStatus,
                  참고: 'confirm route 실패로 추정 — payment 기록은 있으나 order/artwork_sales 미반영 상태에서 webhook이 복구',
                }),
              ...(buyerEmail
                ? [
                    () =>
                      sendBuyerEmail(
                        buyerEmail,
                        'payment_confirmed',
                        {
                          orderNo: existingOrder.order_no ?? '',
                          buyerName: existingOrder.buyer_name ?? '',
                          artworkTitle: paidInfo?.artworkTitle ?? '',
                          artistName: paidInfo?.artistName ?? '',
                          amount: existingOrder.total_amount ?? 0,
                          itemAmount: paidInfo?.itemAmount,
                          shippingAmount: paidInfo?.shippingAmount,
                        },
                        buyerLocale
                      ),
                  ]
                : []),
              () =>
                sendBuyerSms(
                  existingOrder.buyer_phone,
                  'payment_confirmed',
                  {
                    buyerName: existingOrder.buyer_name ?? '',
                    artworkTitle: paidInfo?.artworkTitle ?? '',
                    amount: existingOrder.total_amount ?? 0,
                  },
                  buyerLocale,
                  existingOrder.order_no ?? undefined
                ),
            ]);
          });
        }
      }
    }

    // Cascade cancel to order + artwork_sales when Toss marks payment as canceled
    if (CANCELED_STATUSES.has(newStatus) && paymentRow.order_id) {
      const { data: existingOrder } = await supabase
        .from('orders')
        .select(
          'status, artwork_id, order_no, buyer_email, buyer_name, buyer_phone, total_amount, metadata, order_items(artwork_id, quantity, unit_price)'
        )
        .eq('id', paymentRow.order_id)
        .single();

      if (existingOrder && !['refunded', 'cancelled'].includes(existingOrder.status)) {
        const now = new Date().toISOString();

        const { error: orderCancelError } = await supabase
          .from('orders')
          .update({ status: 'refunded', refunded_at: now })
          .eq('id', paymentRow.order_id)
          .not('status', 'in', '(refunded,cancelled)');

        if (orderCancelError) {
          console.error(
            `[toss-webhook] order cancel UPDATE failed: ${existingOrder.order_no}`,
            orderCancelError
          );
        }

        // Void artwork_sales — 다품목 주문은 해당 order의 active 매출 전부 void
        const { error: voidError } = await supabase
          .from('artwork_sales')
          .update({ voided_at: now, void_reason: 'Toss 웹훅 취소 자동 처리' })
          .eq('order_id', paymentRow.order_id)
          .is('voided_at', null);

        if (voidError) {
          console.error(
            `[toss-webhook] artwork_sales void failed: ${existingOrder.order_no}`,
            voidError
          );
        }

        const lineItems = extractLineItems(existingOrder);
        // order_items가 비면 legacy 단건 artwork_id로 fallback
        const artworkIds =
          lineItems.length > 0
            ? lineItems.map((item) => item.artwork_id)
            : existingOrder.artwork_id
              ? [existingOrder.artwork_id]
              : [];

        // 작품 상태 재동기화 — sale 유무와 무관하게 실행.
        // deriveAndSync는 활성 판매가 없으면 sold→available로 복원한다(confirm 실패로 sale 없이
        // sold만 된 작품이 환불 후 영구 잠기던 버그 방지). reserved→available은 deriveAndSync
        // 범위 밖(awaiting_deposit 취소 케이스)이라 별도 복원.
        for (const artworkId of artworkIds) {
          await deriveAndSyncArtworkStatus(supabase, artworkId);

          const { error: artworkError } = await supabase
            .from('artworks')
            .update({ status: 'available', updated_at: now })
            .eq('id', artworkId)
            .eq('status', 'reserved');
          if (artworkError) {
            console.error('[toss-webhook] artwork reserved→available failed:', artworkError);
          }
          revalidatePath(`/artworks/${artworkId}`);
          revalidatePath(`/en/artworks/${artworkId}`);
        }
        if (artworkIds.length > 0) {
          revalidatePublicArtworkSurfaces();
        }

        const refundInfo = await getOrderNotificationInfo(supabase, {
          id: paymentRow.order_id,
        });

        // 관리자 + 구매자 환불 알림 — after(): 응답 후 실행 보장 — 알림 fetch abort 방지
        after(async () => {
          await runAllSettled('tossWebhook.canceled.notifications', [
            () =>
              refundInfo
                ? notifyEmail(
                    'warning',
                    'Toss 결제 취소 수신',
                    buildAdminNotificationFields(refundInfo, {
                      상태: newStatus,
                      paymentKey,
                    })
                  )
                : notifyEmail('warning', 'Toss 결제 취소 수신', {
                    주문번호: existingOrder.order_no ?? '',
                    상태: newStatus,
                    paymentKey,
                  }),
            ...(existingOrder.buyer_email
              ? [
                  () =>
                    sendBuyerEmail(
                      existingOrder.buyer_email!,
                      'refunded',
                      {
                        orderNo: existingOrder.order_no ?? '',
                        buyerName: existingOrder.buyer_name ?? '',
                        artworkTitle: refundInfo?.artworkTitle ?? '',
                        artistName: refundInfo?.artistName ?? '',
                        amount: existingOrder.total_amount ?? 0,
                        itemAmount: refundInfo?.itemAmount,
                        shippingAmount: refundInfo?.shippingAmount,
                      },
                      extractBuyerLocale(existingOrder.metadata)
                    ),
                ]
              : []),
            () =>
              sendBuyerSms(
                existingOrder.buyer_phone,
                'refunded',
                {
                  buyerName: existingOrder.buyer_name ?? '',
                  artworkTitle: '',
                  amount: existingOrder.total_amount ?? 0,
                },
                extractBuyerLocale(existingOrder.metadata),
                existingOrder.order_no ?? undefined
              ),
          ]);
        });
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
