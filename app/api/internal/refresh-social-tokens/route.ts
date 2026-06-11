import { NextRequest, NextResponse } from 'next/server';

import { validateInternalCronRequest } from '@/lib/security/internal-cron-auth';
import { getStoredToken, refreshAccessToken, saveToken } from '@/lib/social/token-store';
import { SOCIAL_PLATFORMS, type Platform } from '@/lib/social/types';

export const runtime = 'nodejs';

/**
 * 소셜 미디어 장기 토큰 주기 갱신(주 1회 Vercel cron).
 *
 * 동작: 플랫폼별로 현재 토큰(DB 우선, 없으면 env)을 읽어 또 60일짜리 새 토큰을 발급받아 DB에 upsert.
 * Instagram/Threads 토큰은 60일 만료 → 매주 갱신하면 영구히 유효. 토큰 미설정 플랫폼은 skip.
 * 한 플랫폼 실패가 다른 플랫폼을 막지 않도록 플랫폼별로 격리.
 */
export async function GET(request: NextRequest) {
  const authError = validateInternalCronRequest(request);
  if (authError) return authError;

  const envFallback: Record<Platform, string | undefined> = {
    instagram: process.env.INSTAGRAM_ACCESS_TOKEN,
    threads: process.env.THREADS_ACCESS_TOKEN,
  };

  const results: Record<string, unknown> = {};

  for (const platform of SOCIAL_PLATFORMS) {
    const current = (await getStoredToken(platform))?.accessToken ?? envFallback[platform] ?? null;
    if (!current) {
      results[platform] = { skipped: '토큰 미설정' };
      continue;
    }

    try {
      const refreshed = await refreshAccessToken(platform, current);
      const expiresAt = await saveToken(platform, refreshed);
      results[platform] = { ok: true, expiresAt };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results[platform] = { ok: false, error: message };
      console.error(`[refresh-social-tokens] ${platform} 갱신 실패:`, err);
    }
  }

  return NextResponse.json({ results });
}
