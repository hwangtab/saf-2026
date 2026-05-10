import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateInternalCronRequest } from '@/lib/security/internal-cron-auth';
import { fetchGscDataRange, fetchGscDataForDate } from '@/lib/gsc-client';

export const runtime = 'nodejs';
// GSC API 호출은 외부 네트워크 + OAuth refresh가 매번 일어나므로 시간 여유 필요
export const maxDuration = 300;

/**
 * Google Search Console 데이터를 매일 fetch해 gsc_metrics 테이블에 upsert.
 *
 * - schedule: vercel.json 'crons' 설정에서 매일 새벽 5시 KST(UTC 20:00)에 실행
 * - GSC가 보통 2일 lag — 어제·오늘 데이터는 비어 있어 무의미.
 *   매번 (오늘 -2일 ~ 오늘 -8일) 7일치 fetch해 upsert.
 *   같은 (date, query, page) 조합은 unique constraint로 idempotent.
 * - 30일 이전 데이터는 정리 (DB 비용 + 분석 가치 모두 낮음)
 *
 * 인증: Bearer CRON_SECRET (다른 internal cron과 동일 패턴).
 */
export async function GET(request: NextRequest) {
  const authError = validateInternalCronRequest(request);
  if (authError) return authError;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !adminKey) {
    return NextResponse.json({ error: 'Supabase admin credentials are missing.' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${adminKey}` } },
  });

  // 1) GSC에서 7일치 fetch (lag 2일 + 7일치 = D-2 ~ D-8)
  // DEBUG: production sync 0건 진단을 위해 첫 날짜 직접 fetch + error를 응답에 노출.
  // 정상화 후 이 블록 제거 예정.
  const debugSiteUrl = process.env.GSC_SITE_URL;
  const probeDate = new Date();
  probeDate.setUTCDate(probeDate.getUTCDate() - 2);
  const probeDateStr = probeDate.toISOString().slice(0, 10);
  let probeError: string | null = null;
  let probeRowCount = -1;
  try {
    const probeResult = await fetchGscDataForDate(probeDateStr);
    probeRowCount = probeResult.rows.length;
  } catch (err) {
    const e = err as { message?: string; code?: number; response?: { data?: unknown } };
    probeError =
      `code=${e.code ?? '?'} msg=${(e.message ?? '').slice(0, 200)} ` +
      `resp=${JSON.stringify(e.response?.data ?? {}).slice(0, 300)}`;
  }

  let dailyResults;
  try {
    dailyResults = await fetchGscDataRange({ daysBack: 7, startOffset: 2 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown GSC fetch error';
    console.error('[gsc-sync] fetch failed:', err);
    return NextResponse.json({ error: 'GSC fetch failed', message }, { status: 502 });
  }

  // 2) Supabase에 upsert
  let totalInserted = 0;
  let totalSkipped = 0;
  for (const day of dailyResults) {
    if (day.rows.length === 0) {
      totalSkipped++;
      continue;
    }
    const rows = day.rows.map((r) => ({
      date: day.date,
      query: r.query,
      page: r.page,
      impressions: Math.round(r.impressions),
      clicks: Math.round(r.clicks),
      ctr: Math.round(r.ctr * 10000) / 10000,
      position: Math.round(r.position * 100) / 100,
    }));

    // upsert by (date, query, page) unique constraint
    const { error } = await supabase
      .from('gsc_metrics')
      .upsert(rows, { onConflict: 'date,query,page' });

    if (error) {
      console.error(`[gsc-sync] upsert failed for ${day.date}:`, error);
      // 한 날짜 실패해도 다음 날짜 계속 — 최선 노력
      continue;
    }
    totalInserted += rows.length;
  }

  // 3) 30일 이전 데이터 cleanup
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 30);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const { count: deletedCount, error: deleteError } = await supabase
    .from('gsc_metrics')
    .delete({ count: 'exact' })
    .lt('date', cutoffStr);
  if (deleteError) {
    console.error('[gsc-sync] cleanup failed:', deleteError);
  }

  return NextResponse.json({
    syncedDays: dailyResults.length,
    skippedDays: totalSkipped,
    insertedRows: totalInserted,
    deletedOldRows: deletedCount ?? 0,
    debug: {
      siteUrl: debugSiteUrl,
      probeDate: probeDateStr,
      probeRowCount,
      probeError,
      dailyResultsCount: dailyResults.length,
    },
  });
}
