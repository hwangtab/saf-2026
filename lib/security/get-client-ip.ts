import type { ReadonlyHeaders } from 'next/dist/server/web/spec-extension/adapters/headers';

/**
 * Vercel 환경에서 클라이언트가 위조 불가능한 IP를 추출.
 *
 * 보안 배경:
 *   외부 공격자가 `X-Forwarded-For: <fake-ip>` 헤더를 직접 박을 수 있다.
 *   Vercel Edge는 클라이언트가 보낸 X-Forwarded-For 끝에 자체 검출 IP를 append한다 →
 *   `<client-supplied>, <vercel-detected>`. 따라서 `split(',')[0]`은 위조된 값을 가져옴.
 *
 *   Rate limit이 IP 기반인데 첫 IP를 신뢰하면 매 요청 다른 가짜 IP를 보내 무력화 가능 →
 *   청원 카운터 inflation, order-lookup brute force, checkout flooding 등.
 *
 * 우선순위:
 *   1. x-vercel-forwarded-for : Vercel 전용 헤더, 클라이언트 위조 불가능
 *   2. x-real-ip               : Vercel이 박는 단일 client IP
 *   3. x-forwarded-for의 마지막 값 : Vercel이 append한 검증값 (proxy chain의 최종 segment)
 *   4. 'unknown'              : 위 모두 부재 시
 *
 * @see https://vercel.com/docs/edge-network/headers#x-vercel-forwarded-for
 */

// X-Forwarded-For 계열 헤더는 proxy chain 끝(마지막)이 가장 신뢰 가능한 detected IP.
// x-vercel-forwarded-for는 보통 single IP이지만 multi-edge proxy 시나리오에서 multi-segment
// 가능성이 있어 x-forwarded-for와 동일하게 마지막 segment를 취해 일관성 확보.
function lastSegment(value: string): string | undefined {
  const segments = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return segments[segments.length - 1];
}

export function getClientIp(headerList: ReadonlyHeaders | Headers): string {
  const vercelForwarded = headerList.get('x-vercel-forwarded-for');
  if (vercelForwarded) {
    const ip = lastSegment(vercelForwarded);
    if (ip) return ip;
  }

  const realIp = headerList.get('x-real-ip');
  if (realIp?.trim()) return realIp.trim();

  const forwarded = headerList.get('x-forwarded-for');
  if (forwarded) {
    // 마지막 segment = Vercel이 append한 검증된 IP. 첫 segment는 클라이언트 위조 가능.
    const last = lastSegment(forwarded);
    if (last) return last;
  }

  return 'unknown';
}
