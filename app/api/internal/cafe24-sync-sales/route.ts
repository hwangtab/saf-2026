import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import {
  syncCafe24SalesFromOrders,
  type Cafe24SalesSyncResult,
} from '@/lib/integrations/cafe24/sync-sales';

export const runtime = 'nodejs';
const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';
const SYNC_ISSUE_DEDUP_WINDOW_HOURS = 6;
const MAX_SYNC_ISSUE_ERRORS = 30;

function normalizeSyncIssueText(value: string): string {
  return value
    .trim()
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g, '<timestamp>')
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
      '<uuid>'
    )
    .replace(/\b\d+\b/g, '#');
}

function getSyncIssueMessages(result: Cafe24SalesSyncResult): string[] {
  return result.errors
    .map((error) => error.trim())
    .filter((error) => error.length > 0)
    .slice(0, MAX_SYNC_ISSUE_ERRORS);
}

function getPrimarySyncIssue(result: Cafe24SalesSyncResult, level: 'warning' | 'failed'): string {
  const issueMessage = getSyncIssueMessages(result)[0];
  if (issueMessage) return issueMessage;
  if (result.reason?.trim()) return result.reason.trim();
  return level === 'failed' ? '오류' : '일부 항목 확인 필요';
}

function buildSyncIssueFingerprint(
  result: Cafe24SalesSyncResult,
  level: 'warning' | 'failed'
): string {
  const normalizedErrors = getSyncIssueMessages(result).map(normalizeSyncIssueText);
  const normalizedReason = normalizeSyncIssueText(result.reason || '');

  return JSON.stringify({
    level,
    mallId: result.mallId || 'unknown',
    reason: normalizedReason,
    errors: normalizedErrors,
  });
}

async function hasRecentDuplicateSyncIssue(input: {
  action: string;
  targetId: string;
  fingerprint: string;
}): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const sinceIso = new Date(
    Date.now() - SYNC_ISSUE_DEDUP_WINDOW_HOURS * 60 * 60 * 1000
  ).toISOString();

  const { data, error } = await supabase
    .from('activity_logs')
    .select('id, metadata, created_at')
    .eq('actor_id', SYSTEM_ACTOR_ID)
    .eq('actor_role', 'system')
    .eq('actor_name', 'Cafe24 Sales Sync Job')
    .eq('action', input.action)
    .eq('target_id', input.targetId)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    throw new Error(`최근 동기화 로그 중복 조회 실패: ${error.message}`);
  }

  return (data || []).some((row) => {
    const metadata =
      row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : null;
    return metadata?.fingerprint === input.fingerprint;
  });
}

async function logSyncIssue(result: Cafe24SalesSyncResult, level: 'warning' | 'failed') {
  try {
    const action = level === 'failed' ? 'cafe24_sales_sync_failed' : 'cafe24_sales_sync_warning';
    const targetId = result.mallId || 'unknown';
    const issueMessages = getSyncIssueMessages(result);
    const primaryIssue = getPrimarySyncIssue(result, level);
    const fingerprint = buildSyncIssueFingerprint(result, level);

    if (
      await hasRecentDuplicateSyncIssue({
        action,
        targetId,
        fingerprint,
      })
    ) {
      return;
    }

    const supabase = createSupabaseAdminClient();
    const summary = `Cafe24 판매 동기화 ${level === 'failed' ? '실패' : '경고'}: ${primaryIssue}`;

    await supabase.from('activity_logs').insert({
      actor_id: SYSTEM_ACTOR_ID,
      actor_role: 'system',
      actor_name: 'Cafe24 Sales Sync Job',
      actor_email: null,
      action,
      target_type: 'artwork',
      target_id: targetId,
      summary,
      metadata: {
        fingerprint,
        mall_id: result.mallId,
        window_from: result.windowFrom,
        window_to: result.windowTo,
        orders_fetched: result.ordersFetched,
        order_items_fetched: result.orderItemsFetched,
        inserted: result.inserted,
        voided: result.voided,
        duplicate_skipped: result.duplicateSkipped,
        manual_mirror_purged: result.manualMirrorPurged,
        failed_orders: result.failedOrders,
        sold_out_lock_failed: result.soldOutLockFailed,
        reason: result.reason || null,
        primary_error: primaryIssue,
        errors: issueMessages,
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
    const fingerprint = JSON.stringify({
      level: 'failed',
      mallId: input.mallId,
      reason: normalizeSyncIssueText(input.reason),
      mode: 'unhandled_exception',
    });

    if (
      await hasRecentDuplicateSyncIssue({
        action: 'cafe24_sales_sync_failed',
        targetId: input.mallId,
        fingerprint,
      })
    ) {
      return;
    }

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
        fingerprint,
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
