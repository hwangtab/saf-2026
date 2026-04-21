import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

import type { Json } from '@/types/supabase';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { confirmPayment } from '@/lib/integrations/toss/confirm';
import { sanitizeConfirmResponse, sanitizeMethodDetail } from '@/lib/integrations/toss/sanitize';
import { notifyEmail, sendBuyerEmail } from '@/lib/notify';
import {
  buildAdminNotificationFields,
  getOrderNotificationInfo,
} from '@/lib/utils/get-order-notification-info';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';
import { deriveAndSyncArtworkStatus } from '@/app/actions/admin-artworks';
import { apiError, getRequestLocale } from '@/lib/api-locale';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const reqLocale = getRequestLocale(req);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: apiError('invalid_json', reqLocale) }, { status: 400 });
  }

  const { paymentKey, orderId, amount } = body as {
    paymentKey?: unknown;
    orderId?: unknown;
    amount?: unknown;
  };

  if (typeof paymentKey !== 'string' || typeof orderId !== 'string' || typeof amount !== 'number') {
    return NextResponse.json({ error: apiError('missing_fields', reqLocale) }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  // Find the order by order_no — metadata 포함 (병합 시 필요)
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(
      'id, total_amount, status, artwork_id, order_no, buyer_name, buyer_phone, buyer_email, metadata'
    )
    .eq('order_no', orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: apiError('order_not_found', reqLocale) }, { status: 404 });
  }

  // 주문 생성 시 저장된 locale 우선, 없으면 Accept-Language
  const storedLocale = (order.metadata as Record<string, unknown> | null)?.locale as
    | 'ko'
    | 'en'
    | undefined;
  const buyerLocale: 'ko' | 'en' =
    storedLocale === 'en' ? 'en' : storedLocale === 'ko' ? 'ko' : reqLocale;

  // SEC-01: Amount must match exactly
  if (order.total_amount !== amount) {
    return NextResponse.json({ error: apiError('amount_mismatch', reqLocale) }, { status: 400 });
  }

  // Guard: pending_payment 상태에서만 승인 진행
  if (order.status !== 'pending_payment') {
    if (order.status === 'paid') {
      return NextResponse.json({ success: true, alreadyPaid: true });
    }
    return NextResponse.json(
      { error: `${apiError('invalid_order_status', reqLocale)} (${order.status})` },
      { status: 400 }
    );
  }

  // 레이스 컨디션 방지: createOrder와 confirm 사이에 동일 작품의 다른 주문이
  // 결제 완료될 수 있으므로, Toss confirm 호출 직전에 availability 재확인.
  // 이 체크 이후 artwork_sales INSERT 사이의 잔여 윈도우는 짧지만 0은 아님 —
  // 완전한 원자성 보장을 위해서는 artwork_sales(artwork_id) WHERE voided_at IS NULL
  // partial UNIQUE constraint를 DB 마이그레이션으로 추가하는 것이 권장됨.
  if (order.artwork_id) {
    const { data: availResult, error: availError } = await supabase.rpc(
      'check_artwork_availability',
      { p_artwork_id: order.artwork_id }
    );
    const isAvailable = Array.isArray(availResult) && availResult[0]?.is_available === true;
    if (availError || !isAvailable) {
      // 작품이 이미 판매됨 — 주문 취소 후 안내
      await supabase
        .from('orders')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', order.id)
        .eq('status', 'pending_payment');
      return NextResponse.json({ error: apiError('artwork_sold_out', reqLocale) }, { status: 409 });
    }
  }

  // Confirm with Toss
  const idempotencyKey = `confirm-${orderId}`;
  const confirmResult = await confirmPayment({ paymentKey, orderId, amount }, idempotencyKey);

  if (!confirmResult.success) {
    // Mark order as cancelled on failure (optimistic lock: pending_payment일 때만)
    const { error: cancelError } = await supabase
      .from('orders')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', order.id)
      .eq('status', 'pending_payment');

    if (cancelError) {
      console.error('[confirm] order cancel failed:', cancelError);
    }

    // fire-and-forget: 알림이 사용자 응답을 블로킹하면 안 됨
    void notifyEmail('error', '결제 승인 실패', {
      주문번호: orderId,
      에러코드: confirmResult.error.code,
      메시지: confirmResult.error.message,
    });

    return NextResponse.json(
      { error: confirmResult.error.message || apiError('payment_confirmation_failed', reqLocale) },
      { status: 400 }
    );
  }

  const tossResponse = confirmResult.data;
  const isVirtualAccount = tossResponse.status === 'WAITING_FOR_DEPOSIT';
  const isDone = tossResponse.status === 'DONE';

  // Insert payment record — PII(카드번호·승인번호·휴대폰)는 저장 전 sanitize.
  // virtualAccount.secret은 후속 입금 콜백 검증에 필요하므로 sanitize 함수가 보존.
  const { error: paymentInsertError } = await supabase.from('payments').insert({
    order_id: order.id,
    payment_key: tossResponse.paymentKey,
    toss_order_id: tossResponse.orderId,
    method: tossResponse.method ?? null,
    method_detail: sanitizeMethodDetail(tossResponse) as Json,
    amount: tossResponse.totalAmount,
    currency: tossResponse.currency ?? 'KRW',
    status: tossResponse.status,
    approved_at: tossResponse.approvedAt ?? null,
    confirm_response: sanitizeConfirmResponse(tossResponse) as Json,
    idempotency_key: idempotencyKey,
  });

  if (paymentInsertError) {
    console.error('[confirm] payment INSERT 실패:', paymentInsertError);
    void notifyEmail('error', '결제 기록 저장 실패', {
      주문번호: orderId,
      에러: paymentInsertError.message,
      참고: '결제는 승인 완료, 결제 기록만 누락 — reconciliation cron이 보정 예정',
    });
    // 500 반환하지 않고 계속 진행 — 결제는 이미 Toss에서 승인됨
  }

  // Update order status with optimistic lock (.eq status guard) + metadata merge
  const newOrderStatus = isDone ? 'paid' : isVirtualAccount ? 'awaiting_deposit' : order.status;
  const existingMetadata = (order.metadata as Record<string, unknown>) ?? {};

  const { data: updatedOrders, error: orderUpdateError } = await supabase
    .from('orders')
    .update({
      status: newOrderStatus,
      paid_at: isDone ? new Date().toISOString() : null,
      metadata: { ...existingMetadata, payment_method: tossResponse.method ?? null },
    })
    .eq('id', order.id)
    .eq('status', 'pending_payment') // optimistic lock — 레이스로 cancelled 된 경우 스킵
    .select('id');

  if (orderUpdateError) {
    console.error('[confirm] order UPDATE 실패:', orderUpdateError);
    void notifyEmail('error', '결제 후 주문 상태 업데이트 실패', {
      주문번호: orderId,
      에러: orderUpdateError.message,
      참고: '결제는 완료, 주문 상태 반영 실패 — reconciliation cron이 보정 예정',
    });
  }

  // 가상계좌 발급 시 artwork 예약 처리 (createBankTransferOrder와 동일)
  if (isVirtualAccount && updatedOrders && updatedOrders.length > 0 && order.artwork_id) {
    await supabase
      .from('artworks')
      .update({ status: 'reserved' })
      .eq('id', order.artwork_id)
      .eq('status', 'available');
    revalidatePublicArtworkSurfaces();
    revalidatePath(`/artworks/${order.artwork_id}`);
    revalidatePath(`/en/artworks/${order.artwork_id}`);
  }

  // 레이스 컨디션: Toss 결제 성공 but 주문이 이미 취소된 경우 — 자동 환불
  // (cancelPendingOrder가 confirm API 호출 중 동시에 실행된 경우)
  if (isDone && !orderUpdateError && (!updatedOrders || updatedOrders.length === 0)) {
    after(async () => {
      const { cancelPayment } = await import('@/lib/integrations/toss/cancel');
      try {
        await cancelPayment(
          paymentKey as string,
          { cancelReason: '주문 취소 후 결제 승인 — 자동 환불' },
          `auto-refund-${orderId}`
        );
      } catch (err) {
        console.error('[confirm] auto-refund failed:', err);
      }
      void notifyEmail('error', '결제 승인 후 주문 취소 감지 — 자동 환불 시도', {
        주문번호: orderId,
        paymentKey: paymentKey as string,
        참고: '결제 승인과 주문 취소가 동시에 발생. 자동 환불을 시도했으나 결과를 수동 확인해주세요.',
      });
    });
  }

  // If fully paid, insert artwork_sales record
  // (DB trigger update_artwork_status_on_sale will mark artwork as sold)
  if (isDone && updatedOrders && updatedOrders.length > 0) {
    const { error: salesInsertError } = await supabase.from('artwork_sales').insert({
      artwork_id: order.artwork_id,
      sale_price: order.total_amount,
      quantity: 1,
      source: 'toss',
      source_detail: 'toss_api',
      order_id: order.id,
      external_order_id: order.order_no,
      buyer_name: order.buyer_name,
      buyer_phone: order.buyer_phone,
      sold_at: new Date().toISOString(),
    });

    if (salesInsertError) {
      console.error('[confirm] artwork_sales INSERT 실패:', salesInsertError);
      void notifyEmail('error', '결제 후 판매 기록 생성 실패', {
        주문번호: orderId,
        에러: salesInsertError.message,
        참고: '결제+주문 완료, 판매 기록만 누락 — reconciliation cron이 보정 예정',
      });
    }

    // BUG 40: DB 트리거 실패 대비 방어적으로 artwork 상태 동기화
    if (order.artwork_id) {
      await deriveAndSyncArtworkStatus(supabase, order.artwork_id);
    }
  }

  // 알림용 주문 컨텍스트 (작품/작가/배송지/항목별 금액 포함) — admin/buyer 공통
  const notifyInfo = await getOrderNotificationInfo(supabase, { id: order.id });

  // 결제 완료 시 공개 작품 페이지 캐시 무효화
  if (isDone && order.artwork_id) {
    revalidatePublicArtworkSurfaces();
    revalidatePath(`/artworks/${order.artwork_id}`);
    revalidatePath(`/en/artworks/${order.artwork_id}`);
  }

  // 결제 성공 알림 — fire-and-forget: 응답 전송 후 백그라운드 처리
  if (isDone) {
    if (notifyInfo) {
      void notifyEmail(
        'payment',
        '결제 승인 완료',
        buildAdminNotificationFields(notifyInfo, {
          결제수단: tossResponse.method ?? '알 수 없음',
        })
      );
    } else {
      void notifyEmail('payment', '결제 승인 완료', {
        주문번호: orderId,
        결제수단: tossResponse.method ?? '알 수 없음',
        금액: `₩${tossResponse.totalAmount.toLocaleString()}`,
      });
    }
    if (order.buyer_email) {
      void sendBuyerEmail(
        order.buyer_email,
        'payment_confirmed',
        {
          orderNo: orderId,
          buyerName: order.buyer_name ?? '',
          artworkTitle: notifyInfo?.artworkTitle ?? '',
          artistName: notifyInfo?.artistName ?? '',
          amount: tossResponse.totalAmount,
          paymentMethod: tossResponse.method ?? undefined,
          itemAmount: notifyInfo?.itemAmount,
          shippingAmount: notifyInfo?.shippingAmount,
          shipping: notifyInfo
            ? {
                name: notifyInfo.shippingName,
                phone: notifyInfo.shippingPhone,
                address: notifyInfo.shippingAddress,
                memo: notifyInfo.shippingMemo,
              }
            : undefined,
        },
        buyerLocale
      );
    }
  } else if (isVirtualAccount) {
    const va = tossResponse.virtualAccount as
      | { bankName?: string; accountNumber?: string; dueDate?: string }
      | null
      | undefined;
    if (notifyInfo) {
      void notifyEmail(
        'info',
        '가상계좌 발급 완료 (입금 대기)',
        buildAdminNotificationFields(notifyInfo, {
          은행: va?.bankName,
          계좌번호: va?.accountNumber,
          입금기한: va?.dueDate,
        })
      );
    } else {
      void notifyEmail('info', '가상계좌 발급 완료 (입금 대기)', {
        주문번호: orderId,
        금액: `₩${tossResponse.totalAmount.toLocaleString()}`,
      });
    }
    if (order.buyer_email) {
      void sendBuyerEmail(
        order.buyer_email,
        'virtual_account_issued',
        {
          orderNo: orderId,
          buyerName: order.buyer_name ?? '',
          artworkTitle: notifyInfo?.artworkTitle ?? '',
          artistName: notifyInfo?.artistName ?? '',
          amount: tossResponse.totalAmount,
          virtualAccount: {
            bankName: va?.bankName,
            accountNumber: va?.accountNumber,
            dueDate: va?.dueDate,
          },
        },
        buyerLocale
      );
    }
  }

  return NextResponse.json({
    success: true,
    status: tossResponse.status,
    virtualAccount: isVirtualAccount ? (tossResponse.virtualAccount ?? null) : null,
  });
}
