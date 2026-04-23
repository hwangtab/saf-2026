/**
 * DB 우선 분산 rate limiter.
 *
 * 1) Supabase RPC(check_rate_limit)로 원자적 제한 체크
 * 2) RPC 장애 시 in-memory limiter로 자동 폴백
 *
 * 폴백은 단일 인스턴스 보장이므로 완전한 분산 제한은 아니며,
 * 장애 구간의 서비스 연속성 확보를 위한 차선책이다.
 */

import { createSupabaseAdminClient } from '@/lib/auth/server';

type RateLimitResult = { success: boolean; remaining: number };

const FALLBACK_LOG_CODE = 'RATE_LIMIT_RPC_FALLBACK';
const store = new Map<string, { count: number; resetAt: number }>();

function normalizeRemaining(value: unknown) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.max(0, Math.floor(value));
}

function rateLimitInMemory(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: Math.max(0, limit - 1) };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0 };
  }

  entry.count++;
  return { success: true, remaining: Math.max(0, limit - entry.count) };
}

async function rateLimitDistributed(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): Promise<RateLimitResult> {
  const supabase = createSupabaseAdminClient() as unknown as {
    rpc: (
      fn: string,
      args: { p_key: string; p_limit: number; p_window_ms: number }
    ) => Promise<{ data: unknown; error: { message?: string } | null }>;
  };

  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_key: key,
    p_limit: limit,
    p_window_ms: windowMs,
  });

  if (error) {
    throw new Error(error.message ?? 'rate limit rpc failed');
  }

  const row = Array.isArray(data) ? data[0] : data;
  const typedRow = row as { success?: unknown; remaining?: unknown } | null;
  if (!typedRow || typeof typedRow.success !== 'boolean') {
    throw new Error('rate limit rpc invalid payload');
  }

  return { success: typedRow.success, remaining: normalizeRemaining(typedRow.remaining) };
}

export async function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): Promise<RateLimitResult> {
  try {
    return await rateLimitDistributed(key, { limit, windowMs });
  } catch {
    console.error(`[rate-limit] ${FALLBACK_LOG_CODE}`);
    return rateLimitInMemory(key, { limit, windowMs });
  }
}

// 만료된 엔트리 정리 — 폴백 메모리 누수 방지
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, 60 * 1000);
  timer.unref?.();
}
