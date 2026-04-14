/**
 * IP 기반 in-memory sliding window rate limiter.
 *
 * 서버 액션에서 공격자의 brute-force 및 자동화 남용을 방지하기 위해 사용한다.
 * 단일 Vercel 함수 인스턴스 내에서만 동작하므로 멀티 리전 환경에서는
 * 정확한 제한이 보장되지 않지만, 동일 인스턴스 내 반복 요청은 차단된다.
 */

const store = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): { success: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0 };
  }

  entry.count++;
  return { success: true, remaining: limit - entry.count };
}

// 만료된 엔트리 정리 — 메모리 누수 방지
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key);
    }
  }, 60 * 1000);
}
