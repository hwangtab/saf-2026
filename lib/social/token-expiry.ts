/**
 * 소셜 토큰 만료 판정 단일 출처. 상태 패널(getSocialTokenStatuses)·알림벨(fetchSystemHealth)·
 * 주간 갱신 크론(refresh-social-tokens)이 임계값과 day-math를 공유해 서로 어긋나지 않게 한다.
 */
export const SOCIAL_TOKEN_WARN_DAYS = 7;

/** 만료까지 남은 일수(음수면 이미 만료). */
export function daysUntilExpiry(expiresAt: string, now: number = Date.now()): number {
  return Math.floor((new Date(expiresAt).getTime() - now) / 86_400_000);
}

export type TokenExpiryState = 'healthy' | 'expiring' | 'expired';

/** 만료일이 있는 토큰의 남은 일수 + 상태(만료/임박/정상). */
export function classifyTokenExpiry(
  expiresAt: string,
  now: number = Date.now()
): { daysRemaining: number; state: TokenExpiryState } {
  const daysRemaining = daysUntilExpiry(expiresAt, now);
  const state =
    daysRemaining < 0 ? 'expired' : daysRemaining <= SOCIAL_TOKEN_WARN_DAYS ? 'expiring' : 'healthy';
  return { daysRemaining, state };
}
