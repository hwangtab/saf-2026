import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { hasActiveAdminSession } from '@/lib/integrations/cafe24/admin-session';
import { getCafe24Config } from '@/lib/integrations/cafe24/client';

export const runtime = 'nodejs';

const STATE_COOKIE_NAME = 'cafe24_oauth_state';
const RETURN_TO_COOKIE_NAME = 'cafe24_oauth_return_to';
const REPLAY_WINDOW_SECONDS = 60 * 60 * 2;

type LaunchContext = {
  state: string;
  mallId: string;
  launchMode: 'cafe24' | 'internal';
  returnTo: string;
  issuedAt: number;
  expiresAt: string;
  launchRequestFingerprint: string | null;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function normalizeReturnTo(input: string | null): string {
  if (!input) return '/admin/artworks';
  if (!input.startsWith('/')) return '/admin/artworks';
  if (input.startsWith('//')) return '/admin/artworks';
  return input;
}

function getCookieDomain(request: NextRequest): string | undefined {
  const host = request.nextUrl.hostname.toLowerCase();
  if (host === 'saf2026.com' || host === 'www.saf2026.com') {
    return 'saf2026.com';
  }
  return undefined;
}

function parseRawQueryParams(request: NextRequest): Record<string, string> {
  const raw = request.nextUrl.search.startsWith('?')
    ? request.nextUrl.search.slice(1)
    : request.nextUrl.search;
  const out: Record<string, string> = {};
  if (!raw) return out;

  for (const pair of raw.split('&')) {
    if (!pair) continue;
    const [rawKey, ...rawValueParts] = pair.split('=');
    if (!rawKey) continue;
    const rawValue = rawValueParts.join('=');

    let key = rawKey;
    let value = rawValue;
    try {
      key = decodeURIComponent(rawKey.replace(/\+/g, '%20'));
      value = decodeURIComponent(rawValue.replace(/\+/g, '%20'));
    } catch {
      continue;
    }

    if (!key) continue;
    out[key] = value;
  }

  return out;
}

function normalizeTimestampSeconds(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return null;
  if (parsed > 1_000_000_000_000) {
    return Math.floor(parsed / 1000);
  }
  return parsed;
}

function isTimestampWithinReplayWindow(timestampSeconds: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.abs(now - timestampSeconds);
  return diff <= REPLAY_WINDOW_SECONDS;
}

function isValidMallId(value: string | null | undefined): value is string {
  if (!value) return false;
  return /^[a-z0-9][a-z0-9-]{1,62}$/i.test(value);
}

function safeEqualHex(leftHex: string, rightHex: string): boolean {
  if (!leftHex || !rightHex) return false;
  if (leftHex.length !== rightHex.length) return false;
  try {
    const left = Buffer.from(leftHex, 'hex');
    const right = Buffer.from(rightHex, 'hex');
    if (left.length !== right.length || left.length === 0) return false;
    return crypto.timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function verifyLaunchHmac(
  params: Record<string, string>,
  providedHmac: string,
  clientSecret: string
): boolean {
  const keys = Object.keys(params)
    .filter((key) => key !== 'hmac')
    .sort((a, b) => a.localeCompare(b));
  const message = keys.map((key) => `${key}=${encodeURIComponent(params[key] || '')}`).join('&');
  const computed = crypto.createHmac('sha256', clientSecret).update(message).digest('hex');
  return safeEqualHex(computed, providedHmac.toLowerCase());
}

function buildLaunchRequestFingerprint(input: {
  mallId: string;
  timestamp: string;
  hmac: string;
}): string {
  const source = `${input.mallId}|${input.timestamp}|${input.hmac.toLowerCase()}`;
  return crypto.createHash('sha256').update(source).digest('hex');
}

async function persistOAuthContext(context: LaunchContext): Promise<'ok' | 'replay'> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from('cafe24_oauth_contexts').insert({
    state: context.state,
    mall_id: context.mallId,
    mode: context.launchMode,
    return_to: context.returnTo,
    launch_request_fingerprint: context.launchRequestFingerprint,
    issued_at: new Date(context.issuedAt * 1000).toISOString(),
    expires_at: context.expiresAt,
  });

  if (error?.code === '23505' && context.launchRequestFingerprint) {
    return 'replay';
  }

  if (error) {
    throw new Error(`oauth_context_store_failed:${error.message}`);
  }

  return 'ok';
}

export async function GET(request: NextRequest) {
  try {
    const rawQuery = parseRawQueryParams(request);
    const queryMallId =
      request.nextUrl.searchParams.get('mall_id')?.trim() || rawQuery.mall_id?.trim();
    const timestampRaw = request.nextUrl.searchParams.get('timestamp') || rawQuery.timestamp;
    const providedHmac =
      request.nextUrl.searchParams.get('hmac')?.trim() || rawQuery.hmac?.trim() || null;
    const isCafe24Launch = Boolean(queryMallId && timestampRaw && providedHmac);

    if (!isCafe24Launch) {
      const isAdmin = await hasActiveAdminSession();
      if (!isAdmin) {
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('next', '/admin/dashboard');
        return NextResponse.redirect(loginUrl);
      }
    }

    const mallId = isCafe24Launch ? queryMallId : getRequiredEnv('CAFE24_MALL_ID');
    const clientId = getRequiredEnv('CAFE24_CLIENT_ID');
    const redirectUri = getRequiredEnv('CAFE24_REDIRECT_URI');
    const scope = process.env.CAFE24_SCOPE?.trim() || 'mall.read_product,mall.write_product';
    const debug = request.nextUrl.searchParams.get('debug') === '1';
    const state = crypto.randomBytes(24).toString('hex');
    const returnTo = normalizeReturnTo(request.nextUrl.searchParams.get('return_to'));
    const cookieDomain = getCookieDomain(request);

    if (!isValidMallId(mallId)) {
      return NextResponse.json({ error: 'invalid_mall_id' }, { status: 400 });
    }

    if (isCafe24Launch) {
      const clientSecret = getRequiredEnv('CAFE24_CLIENT_SECRET');
      const timestampSeconds = normalizeTimestampSeconds(timestampRaw);
      if (!timestampSeconds || !isTimestampWithinReplayWindow(timestampSeconds)) {
        return NextResponse.json({ error: 'timestamp_expired' }, { status: 400 });
      }
      if (!verifyLaunchHmac(rawQuery, providedHmac || '', clientSecret)) {
        return NextResponse.json({ error: 'hmac_mismatch' }, { status: 403 });
      }
    }

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const launchRequestFingerprint = isCafe24Launch
      ? buildLaunchRequestFingerprint({
          mallId,
          timestamp: String(timestampRaw),
          hmac: String(providedHmac),
        })
      : null;

    const contextPersisted = await persistOAuthContext({
      state,
      mallId,
      launchMode: isCafe24Launch ? 'cafe24' : 'internal',
      returnTo,
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt,
      launchRequestFingerprint,
    });
    if (contextPersisted === 'replay') {
      return NextResponse.json({ error: 'replayed_launch_request' }, { status: 409 });
    }

    const authorizeUrl = new URL(`https://${mallId}.cafe24api.com/api/v2/oauth/authorize`);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('scope', scope);

    if (debug) {
      const resolvedConfig = getCafe24Config();
      return NextResponse.json({
        mall_id: mallId,
        client_id: clientId,
        redirect_uri: redirectUri,
        scope,
        default_category_no_raw: process.env.CAFE24_DEFAULT_CATEGORY_NO?.trim() || null,
        default_category_no_resolved: resolvedConfig?.defaultCategoryNo ?? null,
        authorize_base: `https://${mallId}.cafe24api.com/api/v2/oauth/authorize`,
      });
    }

    const response = NextResponse.redirect(authorizeUrl);
    const sameSite = isCafe24Launch ? 'none' : 'lax';
    response.cookies.set({
      name: STATE_COOKIE_NAME,
      value: state,
      httpOnly: true,
      secure: true,
      sameSite,
      path: '/',
      maxAge: 60 * 10,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    });
    response.cookies.set({
      name: RETURN_TO_COOKIE_NAME,
      value: encodeURIComponent(returnTo),
      httpOnly: true,
      secure: true,
      sameSite,
      path: '/',
      maxAge: 60 * 10,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start Cafe24 OAuth';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
