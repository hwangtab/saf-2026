import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { hasActiveAdminSession } from '@/lib/integrations/cafe24/admin-session';

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
    const state = crypto.randomBytes(24).toString('hex');
    const returnTo = normalizeReturnTo(request.nextUrl.searchParams.get('return_to'));

    const authorizeUrl = new URL(`https://${mallId}.cafe24api.com/api/v2/oauth/authorize`);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('scope', scope);

    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set({
      name: STATE_COOKIE_NAME,
      value: state,
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10,
    });
    response.cookies.set({
      name: RETURN_TO_COOKIE_NAME,
      value: encodeURIComponent(returnTo),
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start Cafe24 OAuth';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
