import { NextResponse } from 'next/server';
import {
  createOAuthStateNonce,
  getOAuthStateCookieOptions,
  OAUTH_STATE_COOKIE_NAME,
} from '@/lib/auth/oauth-state';

export const runtime = 'nodejs';

export async function POST(_request: Request) {
  const state = createOAuthStateNonce();
  const response = NextResponse.json({ state });
  response.cookies.set(OAUTH_STATE_COOKIE_NAME, state, getOAuthStateCookieOptions());
  return response;
}
