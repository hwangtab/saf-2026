import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/auth/server';

export const runtime = 'nodejs';

function verifySignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = crypto.createHmac('sha1', secret).update(body).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
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

/**
 * Vercel Log Drain 등록 시 엔드포인트 검증용 GET 핸들러.
 * Vercel이 `x-vercel-verify` 헤더를 포함한 GET 요청을 보내고,
 * 응답 본문에 동일한 값을 반환해야 검증이 완료됩니다.
 */
export async function GET() {
  const verifyToken = process.env.VERCEL_DRAIN_VERIFY;
  if (verifyToken) {
    return new Response(verifyToken, {
      status: 200,
      headers: { 'x-vercel-verify': verifyToken },
    });
  }
  return NextResponse.json({ status: 'ok' });
}

export async function POST(request: NextRequest) {
  const raw = await request.text();

  // HMAC-SHA1 서명 검증
  const secret = process.env.VERCEL_DRAIN_SECRET;
  if (secret) {
    const signature = request.headers.get('x-vercel-signature');
    const expected = crypto.createHmac('sha1', secret).update(raw).digest('hex');
    console.log('[vercel-drain] signature received:', signature);
    console.log('[vercel-drain] signature expected:', expected);
    console.log('[vercel-drain] secret length:', secret.length);
    console.log('[vercel-drain] body length:', raw.length);
    if (!verifySignature(raw, signature, secret)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  } else {
    console.log('[vercel-drain] No VERCEL_DRAIN_SECRET set, skipping verification');
  }

  let events: VercelDrainEvent[];
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
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Vercel Analytics 이벤트만 필터
  const analyticsEvents = events.filter((e) => e.schema === 'vercel.analytics.v1');

  if (analyticsEvents.length === 0) {
    return NextResponse.json({ inserted: 0, filtered: events.length });
  }

  const rows = analyticsEvents.map((e) => ({
    event_type: e.eventType || 'pageview',
    path: e.path || '/',
    referrer: e.referrer || null,
    country: e.country || null,
    region: e.region || null,
    city: e.city || null,
    os_name: e.osName || null,
    client_name: e.clientName || null,
    device_type: e.deviceType || null,
    session_id: e.sessionId != null ? String(e.sessionId) : null,
    device_id: e.deviceId != null ? String(e.deviceId) : null,
    event_name: e.eventName || null,
    event_timestamp: new Date(e.timestamp).toISOString(),
  }));

  const supabase = createSupabaseAdminClient();
  let totalInserted = 0;

  // 배치 단위로 insert
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('page_views').insert(chunk);
    if (error) {
      console.error('[vercel-drain] Insert error:', error.message);
      return NextResponse.json(
        { error: 'Database insert failed', inserted: totalInserted },
        { status: 500 }
      );
    }
    totalInserted += chunk.length;
  }

  return NextResponse.json({ inserted: totalInserted });
}
