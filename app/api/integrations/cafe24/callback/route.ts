import { NextRequest, NextResponse } from 'next/server';
import { hasActiveAdminSession } from '@/lib/integrations/cafe24/admin-session';
import { persistCafe24Token, type Cafe24TokenResponse } from '@/lib/integrations/cafe24/client';

export const runtime = 'nodejs';

const STATE_COOKIE_NAME = 'cafe24_oauth_state';
const RETURN_TO_COOKIE_NAME = 'cafe24_oauth_return_to';
const ACCESS_TOKEN_COOKIE_NAME = 'cafe24_access_token';
const REFRESH_TOKEN_COOKIE_NAME = 'cafe24_refresh_token';

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function getSafeReturnTo(request: NextRequest): string {
  const encoded = request.cookies.get(RETURN_TO_COOKIE_NAME)?.value;
  if (!encoded) return '/admin/artworks';
  const decoded = decodeURIComponent(encoded);
  if (!decoded.startsWith('/') || decoded.startsWith('//')) return '/admin/artworks';
  return decoded;
}

function withResultParam(
  basePath: string,
  status: 'connected' | 'error',
  message?: string,
  traceId?: string
): URL {
  const resultUrl = new URL(basePath, 'https://dummy.local');
  resultUrl.searchParams.set('cafe24', status);
  if (message) resultUrl.searchParams.set('reason', message);
  if (traceId) resultUrl.searchParams.set('trace_id', traceId);
  return resultUrl;
}

function getCookieDomain(request: NextRequest): string | undefined {
  const host = request.nextUrl.hostname.toLowerCase();
  if (host === 'saf2026.com' || host === 'www.saf2026.com') {
    return 'saf2026.com';
  }
  return undefined;
}

function clearOAuthCookies(response: NextResponse, cookieDomain?: string) {
  response.cookies.set({
    name: STATE_COOKIE_NAME,
    value: '',
    path: '/',
    maxAge: 0,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });
  response.cookies.set({
    name: RETURN_TO_COOKIE_NAME,
    value: '',
    path: '/',
    maxAge: 0,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  });
}

export async function GET(request: NextRequest) {
  const isAdmin = await hasActiveAdminSession();
  if (!isAdmin) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', '/admin/dashboard');
    return NextResponse.redirect(loginUrl);
  }

  const returnTo = getSafeReturnTo(request);
  const cookieDomain = getCookieDomain(request);

  const oauthError = request.nextUrl.searchParams.get('error');
  const oauthTraceId = request.nextUrl.searchParams.get('trace_id');
  if (oauthError) {
    const redirectUrl = new URL(
      withResultParam(returnTo, 'error', oauthError, oauthTraceId ?? undefined).pathname,
      request.url
    );
    redirectUrl.search = withResultParam(
      returnTo,
      'error',
      oauthError,
      oauthTraceId ?? undefined
    ).search;
    const response = NextResponse.redirect(redirectUrl);
    clearOAuthCookies(response, cookieDomain);
    return response;
  }

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const stateCookie = request.cookies.get(STATE_COOKIE_NAME)?.value;

  if (!code || !state || !stateCookie || state !== stateCookie) {
    const redirectUrl = new URL(
      withResultParam(returnTo, 'error', 'invalid_state').pathname,
      request.url
    );
    redirectUrl.search = withResultParam(returnTo, 'error', 'invalid_state').search;
    const response = NextResponse.redirect(redirectUrl);
    clearOAuthCookies(response, cookieDomain);
    return response;
  }

  try {
    const mallId = getRequiredEnv('CAFE24_MALL_ID');
    const clientId = getRequiredEnv('CAFE24_CLIENT_ID');
    const clientSecret = getRequiredEnv('CAFE24_CLIENT_SECRET');
    const redirectUri = getRequiredEnv('CAFE24_REDIRECT_URI');

    const tokenEndpoint = `https://${mallId}.cafe24api.com/api/v2/oauth/token`;
    const payload = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const tokenRes = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload.toString(),
      cache: 'no-store',
    });

    const tokenJson = (await tokenRes.json()) as Partial<Cafe24TokenResponse> & {
      error?: string;
      error_description?: string;
      trace_id?: string;
    };
    const accessToken = tokenJson.access_token?.trim();
    const refreshToken = tokenJson.refresh_token?.trim();

    if (!tokenRes.ok || !accessToken || !refreshToken) {
      const reason =
        tokenJson.error ||
        tokenJson.error_description ||
        `token_exchange_failed_${tokenRes.status}`;
      const traceId = tokenJson.trace_id?.trim() || undefined;
      const redirectUrl = new URL(
        withResultParam(returnTo, 'error', reason, traceId).pathname,
        request.url
      );
      redirectUrl.search = withResultParam(returnTo, 'error', reason, traceId).search;
      const response = NextResponse.redirect(redirectUrl);
      clearOAuthCookies(response, cookieDomain);
      return response;
    }

    const redirectUrl = new URL(withResultParam(returnTo, 'connected').pathname, request.url);
    redirectUrl.search = withResultParam(returnTo, 'connected').search;
    const response = NextResponse.redirect(redirectUrl);

    const accessTtl = Number.isFinite(tokenJson.expires_in)
      ? Math.max(60, Number(tokenJson.expires_in))
      : 60 * 30;

    await persistCafe24Token({
      ...(tokenJson as Record<string, unknown>),
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: Number.isFinite(tokenJson.expires_in) ? Number(tokenJson.expires_in) : undefined,
      expires_at: tokenJson.expires_at,
      token_type: tokenJson.token_type,
      scope: tokenJson.scope,
    } as Cafe24TokenResponse);

    response.cookies.set({
      name: ACCESS_TOKEN_COOKIE_NAME,
      value: accessToken,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: accessTtl,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    });
    response.cookies.set({
      name: REFRESH_TOKEN_COOKIE_NAME,
      value: refreshToken,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 14,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    });
    clearOAuthCookies(response, cookieDomain);

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'callback_failed';
    const redirectUrl = new URL(withResultParam(returnTo, 'error', message).pathname, request.url);
    redirectUrl.search = withResultParam(returnTo, 'error', message).search;
    const response = NextResponse.redirect(redirectUrl);
    clearOAuthCookies(response, cookieDomain);
    return response;
  }
}
