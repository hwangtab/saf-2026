import { createSupabaseAdminClient } from '@/lib/auth/server';

import { metaGet } from './meta-graph';
import { SocialPublishError, type Platform } from './types';

// 플랫폼별 장기 토큰 갱신 엔드포인트. 현재 토큰을 넘기면 또 60일짜리 새 토큰을 반환.
// (앱 시크릿 불필요 — 유효한 현재 토큰만 있으면 됨. 단 토큰이 24h 이상 경과·미만료여야 함.)
const REFRESH_URL: Record<Platform, (token: string) => string> = {
  instagram: (t) =>
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(t)}`,
  threads: (t) =>
    `https://graph.threads.net/refresh_access_token?grant_type=th_refresh_token&access_token=${encodeURIComponent(t)}`,
};

export interface StoredToken {
  accessToken: string;
  expiresAt: string | null;
}

/** DB에 저장된 유효한(미만료) 토큰. 없거나 만료면 null. 실패 시에도 null(graceful). */
export async function getStoredToken(platform: Platform): Promise<StoredToken | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('social_tokens')
      .select('access_token, expires_at')
      .eq('platform', platform)
      .maybeSingle();

    if (error || !data?.access_token) return null;
    if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) return null;
    return { accessToken: data.access_token, expiresAt: data.expires_at };
  } catch {
    return null;
  }
}

/** publish에 사용할 토큰: DB(유효) 우선, 없으면 env fallback. */
export async function resolveAccessToken(
  platform: Platform,
  envFallback: string | null
): Promise<string | null> {
  const stored = await getStoredToken(platform);
  return stored?.accessToken ?? envFallback ?? null;
}

export interface RefreshResult {
  accessToken: string;
  tokenType: string | null;
  expiresIn: number | null;
}

/** 현재 토큰으로 새 장기 토큰을 발급받음. 실패 시 SocialPublishError throw. */
export async function refreshAccessToken(
  platform: Platform,
  currentToken: string
): Promise<RefreshResult> {
  const json = await metaGet(REFRESH_URL[platform](currentToken));
  const accessToken = typeof json.access_token === 'string' ? json.access_token : null;
  if (!accessToken) {
    throw new SocialPublishError(`${platform} 토큰 갱신 응답에 access_token이 없습니다.`, json);
  }
  return {
    accessToken,
    tokenType: typeof json.token_type === 'string' ? json.token_type : null,
    expiresIn: typeof json.expires_in === 'number' ? json.expires_in : null,
  };
}

/** 갱신 결과를 social_tokens에 upsert. 새 만료 시각(ISO)을 반환. */
export async function saveToken(platform: Platform, result: RefreshResult): Promise<string | null> {
  const supabase = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();
  const expiresAt = result.expiresIn
    ? new Date(Date.now() + result.expiresIn * 1000).toISOString()
    : null;

  const { error } = await supabase.from('social_tokens').upsert(
    {
      platform,
      access_token: result.accessToken,
      token_type: result.tokenType,
      expires_at: expiresAt,
      refreshed_at: nowIso,
      updated_at: nowIso,
    },
    { onConflict: 'platform' }
  );

  if (error) {
    throw new SocialPublishError(`${platform} 토큰 저장 실패: ${error.message}`, error);
  }
  return expiresAt;
}
