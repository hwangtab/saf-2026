import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const EMERGENCY_BYPASS_MAX_WINDOW_MS = 24 * 60 * 60 * 1000;

function isTimingSafeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function canBypassMissingVercelCronHeader() {
  const bypassUntilRaw = process.env.INTERNAL_CRON_EMERGENCY_BYPASS_UNTIL;
  if (!bypassUntilRaw) return false;

  const bypassReason = process.env.INTERNAL_CRON_EMERGENCY_BYPASS_REASON?.trim();
  if (!bypassReason) {
    console.error('[internal-cron-auth] CRON_GUARD_BYPASS_REJECTED_MISSING_REASON');
    return false;
  }

  const bypassUntil = Date.parse(bypassUntilRaw);
  if (Number.isNaN(bypassUntil)) {
    console.error('[internal-cron-auth] CRON_GUARD_BYPASS_REJECTED_INVALID_UNTIL');
    return false;
  }

  const now = Date.now();
  if (bypassUntil <= now) {
    return false;
  }

  if (bypassUntil - now > EMERGENCY_BYPASS_MAX_WINDOW_MS) {
    console.error('[internal-cron-auth] CRON_GUARD_BYPASS_REJECTED_WINDOW_EXCEEDED');
    return false;
  }

  console.error(
    `[internal-cron-auth] CRON_GUARD_BYPASS_ACTIVE until=${new Date(
      bypassUntil
    ).toISOString()} reason=${bypassReason}`
  );
  return true;
}

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

  if (process.env.NODE_ENV === 'production') {
    const vercelCronHeader = request.headers.get('x-vercel-cron');
    if (!vercelCronHeader && !canBypassMissingVercelCronHeader()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return null;
}
