import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { hasActiveAdminSession } from '@/lib/integrations/cafe24/admin-session';
import { getCafe24Config } from '@/lib/integrations/cafe24/client';

export const runtime = 'nodejs';

const STATE_COOKIE_NAME = 'cafe24_oauth_state';
const RETURN_TO_COOKIE_NAME = 'cafe24_oauth_return_to';

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

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await hasActiveAdminSession();
    if (!isAdmin) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', '/admin/dashboard');
      return NextResponse.redirect(loginUrl);
    }

    const mallId = getRequiredEnv('CAFE24_MALL_ID');
    const clientId = getRequiredEnv('CAFE24_CLIENT_ID');
    const redirectUri = getRequiredEnv('CAFE24_REDIRECT_URI');
    const scope = process.env.CAFE24_SCOPE?.trim() || 'mall.read_product,mall.write_product';
    const debug = request.nextUrl.searchParams.get('debug') === '1';
    const state = crypto.randomBytes(24).toString('hex');
    const returnTo = normalizeReturnTo(request.nextUrl.searchParams.get('return_to'));
    const cookieDomain = getCookieDomain(request);

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
    response.cookies.set({
      name: STATE_COOKIE_NAME,
      value: state,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    });
    response.cookies.set({
      name: RETURN_TO_COOKIE_NAME,
      value: encodeURIComponent(returnTo),
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
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
