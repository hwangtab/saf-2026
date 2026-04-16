import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { notifyEmail, sendBuyerEmail } from '@/lib/notify';
import { getArtworkEmailInfo } from '@/lib/utils/get-artwork-email-info';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';

export const runtime = 'nodejs';

/**
 * 1) Cancels pending_payment orders older than 30 minutes.
 * 2) Cancels awaiting_deposit orders older than 24 hours + restores artwork reserved→available.
 * Called every 10 minutes by Vercel Cron (vercel.json).
 * Requires Bearer CRON_SECRET authorization.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${cronSecret}`;
  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !adminKey) {
    return NextResponse.json({ error: 'Supabase admin credentials are missing.' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${adminKey}` } },
  });

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
  }

  // ── 2) awaiting_deposit: 24시간 초과 자동 취소 + artwork reserved→available ──
  const depositCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: expiredDeposit, error: depositFetchError } = await supabase
    .from('orders')
    .select('id, artwork_id, buyer_email, buyer_name, order_no, total_amount')
    .eq('status', 'awaiting_deposit')
    .lt('created_at', depositCutoff);

  if (depositFetchError) {
    return NextResponse.json({ error: depositFetchError.message }, { status: 500 });
  }

  let depositCancelled = 0;
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

    for (const expiredOrder of actuallyCancelled) {
      if (expiredOrder.buyer_email && expiredOrder.order_no) {
        void (async () => {
          try {
            const { artworkTitle, artistName } = await getArtworkEmailInfo(
              supabase,
              expiredOrder.artwork_id
            );
            void sendBuyerEmail(expiredOrder.buyer_email!, 'auto_cancelled', {
              orderNo: expiredOrder.order_no!,
              buyerName: expiredOrder.buyer_name ?? '',
              artworkTitle,
              artistName,
              amount: expiredOrder.total_amount ?? 0,
            });
          } catch (err) {
            console.error('[expire-stale-orders] email failed:', err);
          }
        })();
      }
    }

    // 실제 취소된 주문의 artwork reserved→available 복원
    const artworkIds = actuallyCancelled
      .map((o) => o.artwork_id)
      .filter((id): id is string => !!id);

    if (artworkIds.length > 0) {
      const { error: artworkError } = await supabase
        .from('artworks')
        .update({ status: 'available', updated_at: now })
        .in('id', artworkIds)
        .eq('status', 'reserved'); // 멱등성: reserved 상태일 때만 변경

      if (artworkError) {
        console.error('[expire-stale-orders] artwork status restore failed:', artworkError);
        await notifyEmail('error', '만료 크론: 작품 상태 복원 실패', {
          에러: artworkError.message,
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
    await notifyEmail('warning', `만료 주문 자동 취소 (${totalCancelled}건)`, {
      미결제취소: `${pendingCancelled}건`,
      입금대기취소: `${depositCancelled}건`,
    });
  }

  return NextResponse.json({
    cancelled: totalCancelled,
    pending_cancelled: pendingCancelled,
    deposit_cancelled: depositCancelled,
  });
}
