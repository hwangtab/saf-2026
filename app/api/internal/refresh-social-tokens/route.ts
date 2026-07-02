import { NextRequest, NextResponse } from 'next/server';

import { validateInternalCronRequest } from '@/lib/security/internal-cron-auth';
import { withCronRun } from '@/lib/monitoring/cron-run';
import { getStoredToken, refreshAccessToken, saveToken } from '@/lib/social/token-store';
import { SOCIAL_PLATFORMS, type Platform } from '@/lib/social/types';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { notifyEmail } from '@/lib/notify';
import { SOCIAL_TOKEN_WARN_DAYS, daysUntilExpiry } from '@/lib/social/token-expiry';

export const runtime = 'nodejs';

/**
 * 소셜 미디어 장기 토큰 주기 갱신(주 1회 Vercel cron).
 *
 * 동작: 플랫폼별로 현재 토큰(DB 우선, 없으면 env)을 읽어 또 60일짜리 새 토큰을 발급받아 DB에 upsert.
 * Instagram/Threads 토큰은 60일 만료 → 매주 갱신하면 영구히 유효. 토큰 미설정 플랫폼은 skip.
 * 한 플랫폼 실패가 다른 플랫폼을 막지 않도록 플랫폼별로 격리.
 */
export const GET = withCronRun('refresh-social-tokens', cronHandler);

async function cronHandler(request: NextRequest) {
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

  // 갱신 시도 후에도 7일 내 만료 예정 토큰이 있으면 관리자 이메일 경보(자동 갱신 실패 조기 인지).
  // 알림벨(fetchSystemHealth)은 이미 D-7 danger를 띄우지만, 접속 전에 이메일로도 전달.
  try {
    const db = createSupabaseAdminClient();
    const soonIso = new Date(Date.now() + SOCIAL_TOKEN_WARN_DAYS * 86_400_000).toISOString();
    const { data: expiring } = await db
      .from('social_tokens')
      .select('platform, expires_at')
      .not('expires_at', 'is', null)
      .lt('expires_at', soonIso);
    if (expiring && expiring.length > 0) {
      await notifyEmail('warning', `SNS 토큰 만료 임박 (${expiring.length}건)`, {
        상세: expiring
          .map((t) => {
            const exp = t.expires_at as string;
            const days = daysUntilExpiry(exp);
            return `${t.platform}: ${exp.slice(0, 10)} (${days < 0 ? '만료됨' : `D-${days}`})`;
          })
          .join('\n'),
        안내: '자동 갱신이 실패했을 수 있습니다. /admin/social에서 토큰 상태를 확인하고 필요 시 재인증하세요.',
      });
    }
  } catch (err) {
    console.error('[refresh-social-tokens] 만료 점검 실패:', err);
  }

  return NextResponse.json({ results });
}
