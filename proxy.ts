import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { updateSession } from '@/lib/auth/middleware';

const intlMiddleware = createMiddleware(routing);

function isCafe24InstallLaunch(request: NextRequest): boolean {
  if (request.nextUrl.pathname !== '/') return false;
  const { searchParams } = request.nextUrl;
  return searchParams.has('mall_id') && searchParams.has('timestamp') && searchParams.has('hmac');
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cafe24 install launch redirect
  if (isCafe24InstallLaunch(request)) {
    const authorizeUrl = new URL('/api/integrations/cafe24/authorize', request.url);
    authorizeUrl.search = request.nextUrl.search;
    return NextResponse.redirect(authorizeUrl);
  }

  // Admin redirect
  if (pathname === '/admin') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  // Portal and auth routes: skip i18n, only refresh Supabase session
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/exhibitor') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/terms-consent')
  ) {
    return await updateSession(request);
  }

  // API and static assets: skip entirely
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/fonts') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.json' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return NextResponse.next();
  }

  // Public pages: handle i18n locale routing
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|images/|fonts/|favicon.ico|manifest.json|robots.txt|sitemap.xml).*)',
  ],
};
