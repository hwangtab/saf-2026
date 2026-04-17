import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/auth/server';

export const runtime = 'nodejs';

function verifySignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac('sha1', secret).update(body).digest('hex');
  try {
    const sigBuf = Buffer.from(signature, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expectedBuf);
  } catch {
    return false;
  }
}

type VercelDrainEvent = {
  schema: string;
  eventType: 'pageview' | 'event';
  eventName?: string;
  timestamp: number;
  path: string;
  referrer?: string;
  country?: string;
  region?: string;
  city?: string;
  osName?: string;
  clientName?: string;
  deviceType?: string;
  sessionId?: string | number;
  deviceId?: string | number;
};

const BATCH_SIZE = 500;
const ACCEPTED_ANALYTICS_SCHEMAS = new Set(['vercel.analytics.v1', 'vercel.analytics.v2']);

const PORTAL_PATH_PREFIXES = ['/admin', '/dashboard', '/exhibitor'];

function isPortalPath(path: string): boolean {
  return PORTAL_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === 'string';
}

function isOptionalStringOrNumber(value: unknown): value is string | number | undefined {
  return value === undefined || typeof value === 'string' || typeof value === 'number';
}

function isValidTimestamp(value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return false;
  }

  return !Number.isNaN(new Date(value).getTime());
}

function isValidVercelDrainEvent(value: unknown): value is VercelDrainEvent {
  if (!isRecord(value)) {
    return false;
  }

  if (!ACCEPTED_ANALYTICS_SCHEMAS.has(String(value.schema))) {
    return false;
  }

  if (value.eventType !== 'pageview' && value.eventType !== 'event') {
    return false;
  }

  if (
    value.eventType === 'event' &&
    (typeof value.eventName !== 'string' || value.eventName.trim().length === 0)
  ) {
    return false;
  }

  if (typeof value.path !== 'string' || value.path.length === 0) {
    return false;
  }

  if (!isValidTimestamp(value.timestamp)) {
    return false;
  }

  return (
    isOptionalString(value.eventName) &&
    isOptionalString(value.referrer) &&
    isOptionalString(value.country) &&
    isOptionalString(value.region) &&
    isOptionalString(value.city) &&
    isOptionalString(value.osName) &&
    isOptionalString(value.clientName) &&
    isOptionalString(value.deviceType) &&
    isOptionalStringOrNumber(value.sessionId) &&
    isOptionalStringOrNumber(value.deviceId)
  );
}

function hasAcceptedAnalyticsSchema(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.schema === 'string' &&
    ACCEPTED_ANALYTICS_SCHEMAS.has(value.schema)
  );
}

/**
 * Vercel Log Drain 등록 시 엔드포인트 검증용 GET 핸들러.
 * Vercel이 `x-vercel-verify` 헤더를 포함한 GET 요청을 보내고,
 * 응답 본문에 동일한 값을 반환해야 검증이 완료됩니다.
 */
export async function GET(request: NextRequest) {
  const expectedVerifyToken = process.env.VERCEL_DRAIN_VERIFY;
  if (!expectedVerifyToken) {
    console.error('[vercel-drain] VERCEL_DRAIN_VERIFY is not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const requestVerifyToken = request.headers.get('x-vercel-verify');
  if (!requestVerifyToken) {
    return NextResponse.json({ error: 'Missing verification token' }, { status: 400 });
  }

  if (requestVerifyToken !== expectedVerifyToken) {
    console.warn('[vercel-drain] Verification token mismatch');
    return NextResponse.json({ error: 'Invalid verification token' }, { status: 401 });
  }

  return new Response(requestVerifyToken, {
    status: 200,
    headers: { 'x-vercel-verify': requestVerifyToken },
  });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();

  // HMAC-SHA1 서명 검증
  const secret = process.env.VERCEL_DRAIN_SECRET;
  if (!secret) {
    console.error('[vercel-drain] VERCEL_DRAIN_SECRET is not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const signature = request.headers.get('x-vercel-signature');
  if (!verifySignature(raw, signature, secret)) {
    console.warn('[vercel-drain] Invalid signature', {
      hasSignature: signature !== null,
      bodyLength: raw.length,
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let events: unknown[];
  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('x-ndjson')) {
      events = raw
        .trim()
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line));
    } else {
      const parsed = JSON.parse(raw);
      events = Array.isArray(parsed) ? parsed : [parsed];
    }
  } catch (error) {
    console.error('[vercel-drain] Request body parsing failed:', error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const invalidAnalyticsEvents = events.filter(
    (event) => hasAcceptedAnalyticsSchema(event) && !isValidVercelDrainEvent(event)
  );

  if (invalidAnalyticsEvents.length > 0) {
    console.error('[vercel-drain] Invalid analytics event payload', {
      invalidCount: invalidAnalyticsEvents.length,
      totalCount: events.length,
    });
    return NextResponse.json({ error: 'Invalid analytics event payload' }, { status: 400 });
  }

  // Vercel이 v3+ 같은 새 스키마를 릴리스해 조용히 드롭되는 상황을 감지하기 위한 경고
  const unknownSchemas = new Set<string>();
  for (const event of events) {
    if (isRecord(event) && typeof event.schema === 'string') {
      if (!ACCEPTED_ANALYTICS_SCHEMAS.has(event.schema)) {
        unknownSchemas.add(event.schema);
      }
    }
  }
  if (unknownSchemas.size > 0) {
    console.warn('[vercel-drain] Dropping events with unknown schema', {
      schemas: Array.from(unknownSchemas),
    });
  }

  const analyticsEvents = events.filter(isValidVercelDrainEvent);

  if (analyticsEvents.length === 0) {
    return NextResponse.json({ inserted: 0, filtered: events.length });
  }

  // 포털(/admin, /dashboard, /exhibitor) 이벤트는 RPC 집계에서 이미 제외되므로
  // 원본 테이블에 저장하지 않는다.
  const publicEvents = analyticsEvents.filter((e) => !isPortalPath(e.path));
  const portalFiltered = analyticsEvents.length - publicEvents.length;

  const rows = publicEvents.map((e) => ({
    event_type: e.eventType,
    path: e.path,
    referrer: e.referrer ?? null,
    country: e.country ?? null,
    region: e.region ?? null,
    city: e.city ?? null,
    os_name: e.osName ?? null,
    client_name: e.clientName ?? null,
    device_type: e.deviceType ?? null,
    session_id: e.sessionId != null ? String(e.sessionId) : null,
    device_id: e.deviceId != null ? String(e.deviceId) : null,
    event_name: e.eventName ?? null,
    event_timestamp: new Date(e.timestamp).toISOString(),
  }));

  if (rows.length === 0) {
    return NextResponse.json({ inserted: 0, portalFiltered });
  }

  const supabase = createSupabaseAdminClient();
  let totalInserted = 0;
  let skipped = 0;

  // 배치 단위로 insert — 청크 하나가 실패해도 나머지는 계속 진행해
  // 일시적 DB 에러가 전체 이벤트 손실로 이어지지 않도록 한다.
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('page_views').insert(chunk);
    if (error) {
      console.error('[vercel-drain] Insert chunk failed, skipping', {
        batchStart: i,
        chunkSize: chunk.length,
        error: error.message,
      });
      skipped += chunk.length;
      continue;
    }
    totalInserted += chunk.length;
  }

  // 모든 청크가 실패한 경우에는 Vercel이 재시도하도록 500을 돌려준다.
  if (totalInserted === 0 && skipped > 0) {
    return NextResponse.json(
      { error: 'Database insert failed', inserted: 0, skipped, portalFiltered },
      { status: 500 }
    );
  }

  return NextResponse.json({ inserted: totalInserted, skipped, portalFiltered });
}
