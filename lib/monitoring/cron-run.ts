import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import type { Json } from '@/types/supabase';

type CronHandler = (request: NextRequest) => Promise<NextResponse>;

async function recordCronRun(
  name: string,
  entry: {
    startedAt: string;
    ok: boolean;
    status: number;
    summary: unknown;
    error: string | null;
  }
): Promise<void> {
  try {
    const db = createSupabaseAdminClient();
    await db.from('cron_runs').insert({
      name,
      started_at: entry.startedAt,
      finished_at: new Date().toISOString(),
      ok: entry.ok,
      status: entry.status,
      summary: (entry.summary ?? null) as Json,
      error: entry.error,
    });
  } catch (err) {
    // 기록 실패가 cron 자체를 절대 깨뜨리지 않도록 삼킨다(테이블 미배포 등 포함).
    console.error(`[cron-run] failed to record run for ${name}:`, err);
  }
}

/**
 * Internal cron route 핸들러를 감싸 실행 이력을 cron_runs에 남긴다.
 *
 * - 인증 실패(401)는 실제 cron 실행이 아니므로 기록하지 않음(외부 probe로 인한 row spam 방지).
 * - 그 외 모든 종료(200·500·throw)를 기록 → "미실행"은 row 부재로, "실패"는 ok=false로 감지.
 * - 기록은 응답 반환 전 수행하되 recordCronRun이 절대 throw하지 않아 cron 결과에 영향 없음.
 */
export function withCronRun(name: string, handler: CronHandler): CronHandler {
  return async (request: NextRequest) => {
    const startedAt = new Date().toISOString();
    let response: NextResponse;
    let error: string | null = null;

    try {
      response = await handler(request);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      response = NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }

    if (response.status !== 401) {
      let summary: unknown = null;
      try {
        summary = await response.clone().json();
      } catch {
        summary = null;
      }
      await recordCronRun(name, {
        startedAt,
        ok: response.status < 400 && !error,
        status: response.status,
        summary,
        error,
      });
    }

    return response;
  };
}
