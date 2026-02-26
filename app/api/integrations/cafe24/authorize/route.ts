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

type RawQueryPair = {
  raw: string;
  key: string;
  value: string;
};

function parseRawQueryPairs(request: NextRequest): RawQueryPair[] {
  const raw = request.nextUrl.search.startsWith('?')
    ? request.nextUrl.search.slice(1)
    : request.nextUrl.search;
  const out: RawQueryPair[] = [];
  if (!raw) return out;

  for (const rawPair of raw.split('&')) {
    if (!rawPair) continue;
    const [rawKey, ...rawValueParts] = rawPair.split('=');
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
    out.push({
      raw: rawPair,
      key,
      value,
    });
  }

  return out;
}

function getRawQueryValue(pairs: RawQueryPair[], targetKey: string): string | null {
  for (const pair of pairs) {
    if (pair.key === targetKey) {
      return pair.value;
    }
  }
  return null;
}

function decodeQueryValue(rawValue: string): string | null {
  try {
    return decodeURIComponent(rawValue.replace(/\+/g, '%20'));
  } catch {
    return null;
  }
}

function extractRawHmacFromSearch(search: string): string | null {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  if (!raw) return null;

  for (const rawPair of raw.split('&')) {
    if (!rawPair) continue;
    const [rawKey, ...rawValueParts] = rawPair.split('=');
    if (!rawKey) continue;
    const key = decodeQueryValue(rawKey);
    if (key !== 'hmac') continue;
    return rawValueParts.join('=');
  }

  return null;
}

function stripHmacFromSearch(search: string): string | null {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  if (!raw) return null;

  const kept: string[] = [];
  for (const rawPair of raw.split('&')) {
    if (!rawPair) continue;
    const [rawKey] = rawPair.split('=');
    if (!rawKey) continue;
    const key = decodeQueryValue(rawKey);
    if (key === 'hmac') continue;
    kept.push(rawPair);
  }

  if (kept.length === 0) return null;
  return kept.join('&');
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

function normalizeBase64(input: string): string | null {
  const withPlus = input.trim().replace(/ /g, '+');
  if (!withPlus) return null;
  const compact = withPlus.replace(/[\r\n\t]/g, '');
  const remainder = compact.length % 4;
  const padded = remainder === 0 ? compact : `${compact}${'='.repeat(4 - remainder)}`;
  try {
    const decoded = Buffer.from(padded, 'base64');
    if (decoded.length === 0) return null;
    return decoded.toString('base64').replace(/=+$/g, '');
  } catch {
    return null;
  }
}

function safeEqualBase64(leftBase64: string, rightBase64: string): boolean {
  const left = normalizeBase64(leftBase64);
  const right = normalizeBase64(rightBase64);
  if (!left || !right) return false;
  if (left.length !== right.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
  } catch {
    return false;
  }
}

function toFormUrlEncoded(value: string): string {
  return encodeURIComponent(value).replace(/%20/g, '+');
}

function sortAscii(values: string[]): string[] {
  return values.sort((a, b) => (a === b ? 0 : a < b ? -1 : 1));
}

function verifyLaunchHmac(
  rawSearch: string,
  pairs: RawQueryPair[],
  providedHmac: string,
  clientSecret: string
): boolean {
  const filtered = pairs.filter((pair) => pair.key !== 'hmac');
  if (filtered.length === 0) return false;

  const rawMessage = stripHmacFromSearch(rawSearch);

  const asRecord = new Map<string, string>();
  for (const pair of filtered) {
    asRecord.set(pair.key, pair.value);
  }

  const sortedKeys = sortAscii(Array.from(asRecord.keys()));
  const canonicalRfc3986 = sortedKeys
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(asRecord.get(key) || '')}`)
    .join('&');
  const canonicalForm = sortedKeys
    .map((key) => `${toFormUrlEncoded(key)}=${toFormUrlEncoded(asRecord.get(key) || '')}`)
    .join('&');

  const orderedRfc3986 = filtered
    .map((pair) => `${encodeURIComponent(pair.key)}=${encodeURIComponent(pair.value)}`)
    .join('&');
  const orderedForm = filtered
    .map((pair) => `${toFormUrlEncoded(pair.key)}=${toFormUrlEncoded(pair.value)}`)
    .join('&');

  const rawSpaceNormalized = rawMessage ? rawMessage.replace(/\+/g, '%20') : null;
  const rawPlusNormalized = rawMessage ? rawMessage.replace(/%20/g, '+') : null;
  const messages = Array.from(
    new Set(
      [
        rawMessage,
        rawSpaceNormalized,
        rawPlusNormalized,
        canonicalRfc3986,
        canonicalForm,
        orderedRfc3986,
        orderedForm,
      ].filter((value): value is string => Boolean(value))
    )
  );

  for (const message of messages) {
    const computedHex = crypto.createHmac('sha256', clientSecret).update(message).digest('hex');
    if (safeEqualHex(computedHex, providedHmac.toLowerCase())) {
      return true;
    }

    const computedBase64 = crypto
      .createHmac('sha256', clientSecret)
      .update(message)
      .digest('base64');
    if (safeEqualBase64(computedBase64, providedHmac)) {
      return true;
    }
  }

  return false;
}

function buildLaunchRequestFingerprint(input: {
  mallId: string;
  timestamp: string;
  hmac: string;
}): string {
  const source = `${input.mallId}|${input.timestamp}|${input.hmac}`;
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
    const rawQueryPairs = parseRawQueryPairs(request);
    const queryMallId =
      request.nextUrl.searchParams.get('mall_id')?.trim() ||
      getRawQueryValue(rawQueryPairs, 'mall_id')?.trim();
    const timestampRaw =
      request.nextUrl.searchParams.get('timestamp') || getRawQueryValue(rawQueryPairs, 'timestamp');
    const rawHmacFromSearch = extractRawHmacFromSearch(request.nextUrl.search);
    const decodedRawHmac = rawHmacFromSearch ? decodeQueryValue(rawHmacFromSearch)?.trim() : null;
    const providedHmac =
      decodedRawHmac ||
      request.nextUrl.searchParams.get('hmac')?.trim() ||
      getRawQueryValue(rawQueryPairs, 'hmac')?.trim() ||
      null;
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
      if (
        !verifyLaunchHmac(request.nextUrl.search, rawQueryPairs, providedHmac || '', clientSecret)
      ) {
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
