import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

function isTimingSafeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

/**
 * Internal cron 요청 인증.
 *
 * Vercel cron은 호출 시 `Authorization: Bearer ${CRON_SECRET}` header를 부착하지만,
 * `x-vercel-cron` 같은 magic header는 부착하지 않음(2026-05-11 확인 — 7일+ 동안 모든
 * cron이 그 header 검증으로 403). 이전 구현은 가정이 잘못되어 모든 cron 호출을 거부.
 *
 * 보안 모델: CRON_SECRET이 충분히 random하고 production env에 sealed라 Bearer
 * 검증만으로 외부 우회 불가. timing-safe compare로 timing attack 방어.
 */
export function validateInternalCronRequest(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const expectedAuthHeader = `Bearer ${cronSecret}`;
  if (!isTimingSafeEqual(authHeader, expectedAuthHeader)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}
