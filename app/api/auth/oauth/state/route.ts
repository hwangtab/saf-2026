import { NextResponse } from 'next/server';
import {
  createOAuthStateNonce,
  getOAuthRoleCookieOptions,
  getOAuthStateCookieOptions,
  isValidIntendedRole,
  OAUTH_ROLE_COOKIE_NAME,
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_QUERY_PARAM,
} from '@/lib/auth/oauth-state';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { role?: unknown };
  const state = createOAuthStateNonce();
  const redirectTo = new URL('/auth/callback', request.url);
  redirectTo.searchParams.set(OAUTH_STATE_QUERY_PARAM, state);

  const response = NextResponse.json({ redirectTo: redirectTo.toString() });
  response.cookies.set(OAUTH_STATE_COOKIE_NAME, state, getOAuthStateCookieOptions());

  if (isValidIntendedRole(body.role)) {
    response.cookies.set(OAUTH_ROLE_COOKIE_NAME, body.role, getOAuthRoleCookieOptions());
  }

  return response;
}
