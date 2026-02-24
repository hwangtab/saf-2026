import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import {
  syncCafe24SalesFromOrders,
  type Cafe24SalesSyncResult,
} from '@/lib/integrations/cafe24/sync-sales';

export const runtime = 'nodejs';
const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

async function logSyncIssue(result: Cafe24SalesSyncResult, level: 'warning' | 'failed') {
  try {
    const supabase = createSupabaseAdminClient();
    const action = level === 'failed' ? 'cafe24_sales_sync_failed' : 'cafe24_sales_sync_warning';
    const summary =
      level === 'failed'
        ? `Cafe24 판매 동기화 실패: ${result.reason || '오류'}`
        : `Cafe24 판매 동기화 경고: ${result.errors.length}건`;

    await supabase.from('activity_logs').insert({
      actor_id: SYSTEM_ACTOR_ID,
      actor_role: 'system',
      actor_name: 'Cafe24 Sales Sync Job',
      actor_email: null,
      action,
      target_type: 'artwork',
      target_id: result.mallId || 'unknown',
      summary,
      metadata: {
        mall_id: result.mallId,
        window_from: result.windowFrom,
        window_to: result.windowTo,
        orders_fetched: result.ordersFetched,
        order_items_fetched: result.orderItemsFetched,
        inserted: result.inserted,
        duplicate_skipped: result.duplicateSkipped,
        manual_mirror_purged: result.manualMirrorPurged,
        failed_orders: result.failedOrders,
        sold_out_lock_failed: result.soldOutLockFailed,
        reason: result.reason || null,
        errors: result.errors.slice(0, 30),
      },
      before_snapshot: null,
      after_snapshot: null,
      reversible: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[cafe24-sync-sales] activity log write failed: ${message}`);
  }
}

async function logUnhandledSyncException(input: {
  mallId: string;
  reason: string;
  forceWindowFromIso: string | null;
  forceWindowToIso: string | null;
}) {
  try {
    const supabase = createSupabaseAdminClient();
    await supabase.from('activity_logs').insert({
      actor_id: SYSTEM_ACTOR_ID,
      actor_role: 'system',
      actor_name: 'Cafe24 Sales Sync Job',
      actor_email: null,
      action: 'cafe24_sales_sync_failed',
      target_type: 'artwork',
      target_id: input.mallId,
      summary: `Cafe24 판매 동기화 치명 오류: ${input.reason}`,
      metadata: {
        mall_id: input.mallId,
        reason: input.reason,
        window_from: input.forceWindowFromIso,
        window_to: input.forceWindowToIso,
        mode: 'unhandled_exception',
      },
      before_snapshot: null,
      after_snapshot: null,
      reversible: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[cafe24-sync-sales] unhandled exception log write failed: ${message}`);
  }
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const forceWindowFromIso = request.nextUrl.searchParams.get('from');
    const forceWindowToIso = request.nextUrl.searchParams.get('to');
    const result = await syncCafe24SalesFromOrders({
      forceWindowFromIso,
      forceWindowToIso,
    });

    // 판매 동기화가 성공하면 공개 목록/상세 캐시를 재검증해 상세/목록 상태 불일치를 방지한다.
    if (result.ok) {
      revalidatePath('/');
      revalidatePath('/artworks');
      revalidatePath('/artworks/[id]', 'page');
      revalidatePath('/artworks/artist/[artist]', 'page');
    }

    if (!result.ok) {
      await logSyncIssue(result, 'failed');
    } else if (result.errors.length > 0) {
      await logSyncIssue(result, 'warning');
    }

    return NextResponse.json(result, {
      status: result.ok ? 200 : 500,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const mallId = process.env.CAFE24_MALL_ID?.trim() || 'unknown';
    const forceWindowFromIso = request.nextUrl.searchParams.get('from');
    const forceWindowToIso = request.nextUrl.searchParams.get('to');
    await logUnhandledSyncException({
      mallId,
      reason: message,
      forceWindowFromIso,
      forceWindowToIso,
    });
    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
