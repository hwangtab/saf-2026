import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/auth/middleware';

function isCafe24InstallLaunch(request: NextRequest): boolean {
  if (request.nextUrl.pathname !== '/') return false;

  const { searchParams } = request.nextUrl;
  return searchParams.has('mall_id') && searchParams.has('timestamp') && searchParams.has('hmac');
}

export async function proxy(request: NextRequest) {
  if (isCafe24InstallLaunch(request)) {
    const authorizeUrl = new URL('/api/integrations/cafe24/authorize', request.url);
    authorizeUrl.search = request.nextUrl.search;
    return NextResponse.redirect(authorizeUrl);
  }

  if (request.nextUrl.pathname === '/admin') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    '/',
    '/admin/:path*',
    '/dashboard/:path*',
    '/exhibitor/:path*',
    '/onboarding/:path*',
    '/auth/:path*',
  ],
};
