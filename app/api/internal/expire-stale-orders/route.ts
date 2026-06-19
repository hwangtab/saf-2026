import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { notifyEmail, sendBuyerEmail, extractBuyerLocale } from '@/lib/notify';
import { sendBuyerSms } from '@/lib/sms/buyer-sms';
import {
  getOrderNotificationInfo,
  type OrderNotificationInfo,
} from '@/lib/utils/get-order-notification-info';
import { validateInternalCronRequest } from '@/lib/security/internal-cron-auth';
import { extractLineItems } from '@/lib/orders/record-artwork-sales';
import { releaseReservedArtworksIfUnowned } from '@/lib/orders/reservations';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';
import { runAllSettled } from '@/lib/server/after-response';

export const runtime = 'nodejs';

/**
 * 알림 카드의 취소 주문 한 항목을 멀티라인으로 만든다 — 작품·작가 / 구매자(연락처·이메일) /
 * 금액·주문번호 / 관리자 페이지 링크. notify.ts 렌더러가 \n을 <br>로, URL을 클릭 링크로 변환.
 * info 조회 실패 시 주문번호만 표기.
 */
function summarizeCancelledOrder(
  info: OrderNotificationInfo | null,
  fallbackOrderNo?: string | null
): string {
  if (!info) {
    return fallbackOrderNo ? `${fallbackOrderNo} (상세 조회 실패)` : '상세 조회 실패';
  }
  const title = info.artworkTitle || '작품 미상';
  const artist = info.artistName || '작가 미상';
  const buyer = info.buyerName || '구매자 미상';
  const contact = [info.buyerPhone, info.buyerEmail].filter((s) => !!s && s.length > 0).join(' · ');
  const amount = `₩${info.totalAmount.toLocaleString('ko-KR')}`;
  const orderNo = info.orderNo || fallbackOrderNo || '';

  const lines = [
    `「${title}」 · ${artist}`,
    `구매자 ${buyer}${contact ? ` (${contact})` : ''}`,
    `${amount}${orderNo ? ` · ${orderNo}` : ''}`,
  ];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    lines.push(`${siteUrl}/admin/orders/${info.orderId}`);
  }
  return lines.join('\n');
}

/** 알림 이메일에 상세로 나열할 최대 주문 수. 초과분은 "외 N건"으로 요약. */
const NOTIFY_DETAIL_CAP = 30;

/**
 * 1) Cancels pending_payment orders older than 30 minutes.
 * 2) Cancels awaiting_deposit orders older than 24 hours + restores artwork reserved→available.
 * Called every 10 minutes by Vercel Cron (vercel.json).
 * Requires Bearer CRON_SECRET authorization.
 */
export async function GET(request: NextRequest) {
  const authError = validateInternalCronRequest(request);
  if (authError) {
    return authError;
  }

  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch (err) {
    console.error('[expire-stale-orders] admin client init failed:', err);
    return NextResponse.json({ error: 'Supabase admin credentials are missing.' }, { status: 500 });
  }

  const now = new Date().toISOString();

  // ── 1) pending_payment: 30분 초과 자동 취소 ──────────────────────────────────
  const pendingCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  const { data: expiredPending, error: pendingFetchError } = await supabase
    .from('orders')
    .select('id')
    .eq('status', 'pending_payment')
    .lt('created_at', pendingCutoff);

  if (pendingFetchError) {
    return NextResponse.json({ error: pendingFetchError.message }, { status: 500 });
  }

  let pendingCancelled = 0;
  let pendingInfos: (OrderNotificationInfo | null)[] = [];
  if (expiredPending && expiredPending.length > 0) {
    const ids = expiredPending.map((o: { id: string }) => o.id);
    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update({ status: 'cancelled', cancelled_at: now })
      .in('id', ids)
      .eq('status', 'pending_payment')
      .select('id');

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    pendingCancelled = updated?.length ?? 0;

    // 실제 취소된 주문의 상세(작품·작가·구매자)를 알림용으로 수집.
    if (updated && updated.length > 0) {
      pendingInfos = await Promise.all(
        updated.map((o: { id: string }) => getOrderNotificationInfo(supabase, { id: o.id }))
      );
    }
  }

  // ── 2) awaiting_deposit: 24시간 초과 자동 취소 + artwork reserved→available ──
  const depositCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: expiredDeposit, error: depositFetchError } = await supabase
    .from('orders')
    .select(
      'id, artwork_id, buyer_email, buyer_name, order_no, total_amount, metadata, order_items(artwork_id, quantity, unit_price)'
    )
    .eq('status', 'awaiting_deposit')
    .eq('deposit_auto_cancel_paused', false) // 관리자가 자동취소 보류한 주문은 만료 제외
    .lt('created_at', depositCutoff);

  if (depositFetchError) {
    return NextResponse.json({ error: depositFetchError.message }, { status: 500 });
  }

  let depositCancelled = 0;
  let depositInfos: (OrderNotificationInfo | null)[] = [];
  if (expiredDeposit && expiredDeposit.length > 0) {
    const ids = expiredDeposit.map((o: { id: string }) => o.id);
    const { data: updated, error: updateError } = await supabase
      .from('orders')
      .update({ status: 'cancelled', cancelled_at: now })
      .in('id', ids)
      .eq('status', 'awaiting_deposit')
      .select('id');

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    depositCancelled = updated?.length ?? 0;

    // 실제 취소된 주문만 이메일 발송 (fetched ≠ updated 방지)
    const updatedIds = new Set((updated ?? []).map((r: { id: string }) => r.id));
    const actuallyCancelled = expiredDeposit.filter((o) => updatedIds.has(o.id));

    // 취소 주문 상세(작품·작가·구매자)를 한 번에 수집 — 구매자 이메일과 관리자 알림 양쪽에서 재사용.
    const depositInfoById = new Map<string, OrderNotificationInfo | null>();
    await Promise.all(
      actuallyCancelled.map(async (o) => {
        depositInfoById.set(o.id, await getOrderNotificationInfo(supabase, { id: o.id }));
      })
    );
    depositInfos = actuallyCancelled.map((o) => depositInfoById.get(o.id) ?? null);

    const buyerNotificationTasks: Array<() => Promise<unknown>> = [];
    for (const expiredOrder of actuallyCancelled) {
      if (expiredOrder.buyer_email && expiredOrder.order_no) {
        const info = depositInfoById.get(expiredOrder.id);
        const locale = extractBuyerLocale(expiredOrder.metadata);
        buyerNotificationTasks.push(
          () =>
            sendBuyerEmail(
              expiredOrder.buyer_email!,
              'auto_cancelled',
              {
                orderNo: expiredOrder.order_no!,
                buyerName: expiredOrder.buyer_name ?? '',
                artworkTitle: info?.artworkTitle ?? '',
                artistName: info?.artistName ?? '',
                amount: expiredOrder.total_amount ?? 0,
              },
              locale
            ),
          () =>
            sendBuyerSms(
              info?.buyerPhone,
              'auto_cancelled',
              {
                buyerName: expiredOrder.buyer_name ?? '',
                artworkTitle: info?.artworkTitle ?? '',
                amount: expiredOrder.total_amount ?? 0,
              },
              locale,
              expiredOrder.order_no!
            )
        );
      }
    }
    await runAllSettled('expire-stale-orders.buyerNotifications', buyerNotificationTasks);

    // 실제 취소된 주문의 artwork reserved→available 복원 — 다품목 지원.
    // 각 주문의 order_items 전 품목을 복원 대상으로 수집. order_items가 비면(legacy 단건)
    // o.artwork_id로 fallback.
    // Set 으로 dedupe — limited/open edition은 같은 artwork_id로 여러 awaiting_deposit 주문이
    // 동시에 만료될 수 있고, 중복 ID는 revalidatePath 중복 호출 등 redundant work를 유발.
    const artworkIds = Array.from(
      new Set(
        actuallyCancelled.flatMap((o) => {
          const lineItems = extractLineItems(o);
          return lineItems.length > 0
            ? lineItems.map((item) => item.artwork_id)
            : o.artwork_id
              ? [o.artwork_id]
              : [];
        })
      )
    );

    if (artworkIds.length > 0) {
      const releaseResult = await releaseReservedArtworksIfUnowned(supabase, artworkIds, now);

      if (releaseResult.errors) {
        console.error('[expire-stale-orders] artwork status restore failed:', releaseResult.errors);
        await notifyEmail('error', '만료 크론: 작품 상태 복원 실패', {
          에러: releaseResult.errors
            .map((item) => `${item.artworkId}: ${String(item.error)}`)
            .join('\n'),
          작품수: `${artworkIds.length}건`,
        });
      } else {
        // reserved → available 복원 후 공개 페이지 캐시 무효화
        revalidatePublicArtworkSurfaces();
        artworkIds.forEach((id) => {
          revalidatePath(`/artworks/${id}`);
          revalidatePath(`/en/artworks/${id}`);
        });
      }
    }
  }

  const totalCancelled = pendingCancelled + depositCancelled;
  if (totalCancelled > 0) {
    console.error(
      `[expire-stale-orders] cancelled ${pendingCancelled} pending + ${depositCancelled} awaiting_deposit orders`
    );

    const fields: Record<string, string> = {
      미결제취소: `${pendingCancelled}건`,
      입금대기취소: `${depositCancelled}건`,
    };

    // 취소된 주문을 사유별로 한 줄씩 나열 — 관리자가 어떤 작품·작가·구매자인지 즉시 파악 가능.
    const details = [
      ...pendingInfos.map((info) => ({ reason: '미결제', info })),
      ...depositInfos.map((info) => ({ reason: '입금대기', info })),
    ];
    details.slice(0, NOTIFY_DETAIL_CAP).forEach((d, i) => {
      fields[`${i + 1}. ${d.reason}`] = summarizeCancelledOrder(d.info);
    });
    if (details.length > NOTIFY_DETAIL_CAP) {
      fields['…'] = `외 ${details.length - NOTIFY_DETAIL_CAP}건 (관리자 주문 목록에서 확인)`;
    }

    await notifyEmail('warning', `만료 주문 자동 취소 (${totalCancelled}건)`, fields);
  }

  return NextResponse.json({
    cancelled: totalCancelled,
    pending_cancelled: pendingCancelled,
    deposit_cancelled: depositCancelled,
  });
}
