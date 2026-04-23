import { NextResponse } from 'next/server';
import {
  createOAuthStateNonce,
  getOAuthStateCookieOptions,
  OAUTH_STATE_COOKIE_NAME,
  OAUTH_STATE_QUERY_PARAM,
} from '@/lib/auth/oauth-state';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const state = createOAuthStateNonce();
  const redirectTo = new URL('/auth/callback', request.url);
  redirectTo.searchParams.set(OAUTH_STATE_QUERY_PARAM, state);

  const response = NextResponse.json({ redirectTo: redirectTo.toString() });
  response.cookies.set(OAUTH_STATE_COOKIE_NAME, state, getOAuthStateCookieOptions());
  return response;
}
