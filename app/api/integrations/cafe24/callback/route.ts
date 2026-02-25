import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { hasActiveAdminSession } from '@/lib/integrations/cafe24/admin-session';
import { persistCafe24Token, type Cafe24TokenResponse } from '@/lib/integrations/cafe24/client';

export const runtime = 'nodejs';

const STATE_COOKIE_NAME = 'cafe24_oauth_state';
const RETURN_TO_COOKIE_NAME = 'cafe24_oauth_return_to';
const ACCESS_TOKEN_COOKIE_NAME = 'cafe24_access_token';
const REFRESH_TOKEN_COOKIE_NAME = 'cafe24_refresh_token';

type LaunchContext = {
  state: string;
  mallId: string;
  launchMode: 'cafe24' | 'internal';
  returnTo: string;
  issuedAtIso: string;
  expiresAtIso: string;
  consumedAtIso: string | null;
};

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
  let decoded: string;
  try {
    decoded = decodeURIComponent(encoded);
  } catch {
    return '/admin/artworks';
  }
  if (!decoded.startsWith('/') || decoded.startsWith('//')) return '/admin/artworks';
  return decoded;
}

function getRawQueryParam(request: NextRequest, key: string): string | null {
  const query = request.nextUrl.search.startsWith('?')
    ? request.nextUrl.search.slice(1)
    : request.nextUrl.search;
  if (!query) return null;

  for (const pair of query.split('&')) {
    if (!pair) continue;
    const [rawKey, ...rawValueParts] = pair.split('=');
    if (rawKey !== key) continue;
    const rawValue = rawValueParts.join('=');
    try {
      return decodeURIComponent(rawValue.replace(/\+/g, '%2B'));
    } catch {
      return null;
    }
  }

  return null;
}

function withResultParam(
  basePath: string,
  status: 'connected' | 'error',
  message?: string,
  traceId?: string,
  stage?: 'authorize' | 'token' | 'callback' | 'state'
): URL {
  const resultUrl = new URL(basePath, 'https://dummy.local');
  resultUrl.searchParams.set('cafe24', status);
  if (message) resultUrl.searchParams.set('reason', message);
  if (traceId) resultUrl.searchParams.set('trace_id', traceId);
  if (stage) resultUrl.searchParams.set('stage', stage);
  return resultUrl;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildLaunchCompletionResponse(
  status: 'connected' | 'error',
  message?: string,
  statusCode?: number
): NextResponse {
  const title = status === 'connected' ? 'Cafe24 앱 연결 완료' : 'Cafe24 앱 연결 실패';
  const bodyMessage =
    status === 'connected'
      ? 'OAuth 인증이 완료되었습니다. 이 창을 닫고 카페24 관리자 화면으로 돌아가세요.'
      : `OAuth 인증에 실패했습니다.${message ? ` (${message})` : ''}`;

  return new NextResponse(
    `<!doctype html><html lang="ko"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>${escapeHtml(title)}</title></head><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px;line-height:1.6;"><h1 style="font-size:20px;margin:0 0 12px;">${escapeHtml(title)}</h1><p style="margin:0;">${escapeHtml(bodyMessage)}</p></body></html>`,
    {
      status: statusCode ?? (status === 'connected' ? 200 : 400),
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    }
  );
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

async function loadOAuthContextByState(state: string): Promise<LaunchContext | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('cafe24_oauth_contexts')
    .select('state, mall_id, mode, return_to, issued_at, expires_at, consumed_at')
    .eq('state', state)
    .maybeSingle();

  if (error) {
    throw new Error(`oauth_context_lookup_failed:${error.message}`);
  }
  if (!data) return null;

  const issuedAtIso = typeof data.issued_at === 'string' ? data.issued_at : '';
  const expiresAtIso = typeof data.expires_at === 'string' ? data.expires_at : '';
  const consumedAtIso = typeof data.consumed_at === 'string' ? data.consumed_at : null;

  return {
    state: String(data.state || state),
    mallId: String(data.mall_id || ''),
    launchMode: data.mode === 'cafe24' ? 'cafe24' : 'internal',
    returnTo:
      typeof data.return_to === 'string' &&
      data.return_to.startsWith('/') &&
      !data.return_to.startsWith('//')
        ? data.return_to
        : '/admin/artworks',
    issuedAtIso,
    expiresAtIso,
    consumedAtIso,
  };
}

async function consumeOAuthContext(state: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from('cafe24_oauth_contexts')
    .update({ consumed_at: new Date().toISOString() })
    .eq('state', state)
    .is('consumed_at', null)
    .select('state')
    .maybeSingle();

  if (error) {
    throw new Error(`oauth_context_consume_failed:${error.message}`);
  }
  return Boolean(data && data.state === state);
}

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get('state');
  let launchContext: LaunchContext | null = null;
  try {
    if (state) {
      launchContext = await loadOAuthContextByState(state);
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'oauth_context_lookup_failed' },
      { status: 500 }
    );
  }

  const isCafe24Launch = launchContext?.launchMode === 'cafe24';

  if (!launchContext) {
    if (!state) {
      const response = buildLaunchCompletionResponse('error', 'invalid_state', 400);
      clearOAuthCookies(response, getCookieDomain(request));
      return response;
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', '/admin/dashboard');
    return NextResponse.redirect(loginUrl);
  }

  if (!isCafe24Launch) {
    const isAdmin = await hasActiveAdminSession();
    if (!isAdmin) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', '/admin/dashboard');
      return NextResponse.redirect(loginUrl);
    }
  }

  const returnTo = launchContext.returnTo || getSafeReturnTo(request);
  const cookieDomain = getCookieDomain(request);

  const oauthError = request.nextUrl.searchParams.get('error');
  const oauthTraceId = request.nextUrl.searchParams.get('trace_id');
  if (oauthError) {
    await consumeOAuthContext(launchContext.state).catch(() => false);

    if (isCafe24Launch) {
      const response = buildLaunchCompletionResponse('error', oauthError, 400);
      clearOAuthCookies(response, cookieDomain);
      return response;
    }

    const redirectUrl = new URL(
      withResultParam(
        returnTo,
        'error',
        oauthError,
        oauthTraceId ?? undefined,
        'authorize'
      ).pathname,
      request.url
    );
    redirectUrl.search = withResultParam(
      returnTo,
      'error',
      oauthError,
      oauthTraceId ?? undefined,
      'authorize'
    ).search;
    const response = NextResponse.redirect(redirectUrl);
    clearOAuthCookies(response, cookieDomain);
    return response;
  }

  const code = getRawQueryParam(request, 'code') ?? request.nextUrl.searchParams.get('code');
  const stateCookie = request.cookies.get(STATE_COOKIE_NAME)?.value;

  const contextExpiresMs = Date.parse(launchContext.expiresAtIso);
  if (!Number.isFinite(contextExpiresMs) || contextExpiresMs < Date.now()) {
    if (isCafe24Launch) {
      const response = buildLaunchCompletionResponse('error', 'expired_oauth_context', 400);
      clearOAuthCookies(response, cookieDomain);
      return response;
    }

    const redirectUrl = new URL(
      withResultParam(returnTo, 'error', 'expired_oauth_context', undefined, 'state').pathname,
      request.url
    );
    redirectUrl.search = withResultParam(
      returnTo,
      'error',
      'expired_oauth_context',
      undefined,
      'state'
    ).search;
    const response = NextResponse.redirect(redirectUrl);
    clearOAuthCookies(response, cookieDomain);
    return response;
  }

  if (launchContext.consumedAtIso) {
    if (isCafe24Launch) {
      const response = buildLaunchCompletionResponse('error', 'oauth_context_reused', 409);
      clearOAuthCookies(response, cookieDomain);
      return response;
    }

    const redirectUrl = new URL(
      withResultParam(returnTo, 'error', 'oauth_context_reused', undefined, 'state').pathname,
      request.url
    );
    redirectUrl.search = withResultParam(
      returnTo,
      'error',
      'oauth_context_reused',
      undefined,
      'state'
    ).search;
    const response = NextResponse.redirect(redirectUrl);
    clearOAuthCookies(response, cookieDomain);
    return response;
  }

  const isInternalStateMismatch = !isCafe24Launch && (!stateCookie || state !== stateCookie);
  if (!code || !state || isInternalStateMismatch) {
    if (isCafe24Launch) {
      const response = buildLaunchCompletionResponse('error', 'invalid_state', 403);
      clearOAuthCookies(response, cookieDomain);
      return response;
    }

    const redirectUrl = new URL(
      withResultParam(returnTo, 'error', 'invalid_state').pathname,
      request.url
    );
    redirectUrl.search = withResultParam(
      returnTo,
      'error',
      'invalid_state',
      undefined,
      'state'
    ).search;
    const response = NextResponse.redirect(redirectUrl);
    clearOAuthCookies(response, cookieDomain);
    return response;
  }

  try {
    const mallId = launchContext.mallId || getRequiredEnv('CAFE24_MALL_ID');
    const clientId = getRequiredEnv('CAFE24_CLIENT_ID');
    const clientSecret = getRequiredEnv('CAFE24_CLIENT_SECRET');
    const redirectUri = getRequiredEnv('CAFE24_REDIRECT_URI');
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenEndpoint = `https://${mallId}.cafe24api.com/api/v2/oauth/token`;
    const payload = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    const tokenRes = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
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

      if (isCafe24Launch) {
        const response = buildLaunchCompletionResponse('error', reason, 400);
        clearOAuthCookies(response, cookieDomain);
        return response;
      }

      const redirectUrl = new URL(
        withResultParam(returnTo, 'error', reason, traceId, 'token').pathname,
        request.url
      );
      redirectUrl.search = withResultParam(returnTo, 'error', reason, traceId, 'token').search;
      const response = NextResponse.redirect(redirectUrl);
      clearOAuthCookies(response, cookieDomain);
      return response;
    }

    const consumed = await consumeOAuthContext(launchContext.state);
    if (!consumed) {
      if (isCafe24Launch) {
        const response = buildLaunchCompletionResponse('error', 'oauth_context_reused', 409);
        clearOAuthCookies(response, cookieDomain);
        return response;
      }

      const redirectUrl = new URL(
        withResultParam(returnTo, 'error', 'oauth_context_reused', undefined, 'state').pathname,
        request.url
      );
      redirectUrl.search = withResultParam(
        returnTo,
        'error',
        'oauth_context_reused',
        undefined,
        'state'
      ).search;
      const response = NextResponse.redirect(redirectUrl);
      clearOAuthCookies(response, cookieDomain);
      return response;
    }

    const response = isCafe24Launch
      ? buildLaunchCompletionResponse('connected', undefined, 200)
      : (() => {
          const redirectUrl = new URL(withResultParam(returnTo, 'connected').pathname, request.url);
          redirectUrl.search = withResultParam(returnTo, 'connected').search;
          return NextResponse.redirect(redirectUrl);
        })();

    const accessTtl = Number.isFinite(tokenJson.expires_in)
      ? Math.max(60, Number(tokenJson.expires_in))
      : 60 * 30;

    await persistCafe24Token(
      {
        ...(tokenJson as Record<string, unknown>),
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_in: Number.isFinite(tokenJson.expires_in)
          ? Number(tokenJson.expires_in)
          : undefined,
        expires_at: tokenJson.expires_at,
        token_type: tokenJson.token_type,
        scope: tokenJson.scope,
      } as Cafe24TokenResponse,
      {
        mallId,
      }
    );

    const sameSite = isCafe24Launch ? 'none' : 'lax';

    response.cookies.set({
      name: ACCESS_TOKEN_COOKIE_NAME,
      value: accessToken,
      httpOnly: true,
      secure: true,
      sameSite,
      path: '/',
      maxAge: accessTtl,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    });
    response.cookies.set({
      name: REFRESH_TOKEN_COOKIE_NAME,
      value: refreshToken,
      httpOnly: true,
      secure: true,
      sameSite,
      path: '/',
      maxAge: 60 * 60 * 24 * 14,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    });
    clearOAuthCookies(response, cookieDomain);

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'callback_failed';

    if (isCafe24Launch) {
      const response = buildLaunchCompletionResponse('error', message, 500);
      clearOAuthCookies(response, cookieDomain);
      return response;
    }

    const redirectUrl = new URL(
      withResultParam(returnTo, 'error', message, undefined, 'callback').pathname,
      request.url
    );
    redirectUrl.search = withResultParam(returnTo, 'error', message, undefined, 'callback').search;
    const response = NextResponse.redirect(redirectUrl);
    clearOAuthCookies(response, cookieDomain);
    return response;
  }
}
