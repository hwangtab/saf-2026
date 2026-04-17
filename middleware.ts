import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { updateSession } from '@/lib/auth/middleware';
import { belongsToSurface } from '@/lib/path-rules';

const intlMiddleware = createMiddleware(routing);

// 인증·포털 영역. `belongsToSurface`가 슬래시 경계를 강제해 `/admin-foo` 같은 형제 경로 차단.
const PORTAL_AUTH_ROOTS = [
  '/admin',
  '/dashboard',
  '/exhibitor',
  '/onboarding',
  '/auth',
  '/login',
  '/signup',
  '/terms-consent',
] as const;

// i18n·인증 미들웨어를 건너뛸 정적·API 루트.
const STATIC_SKIP_ROOTS = ['/api', '/_next', '/images', '/fonts'] as const;

const STATIC_SKIP_PATHS = new Set([
  '/favicon.ico',
  '/manifest.json',
  '/robots.txt',
  '/sitemap.xml',
]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin redirect
  if (pathname === '/admin') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  // Portal and auth routes: skip i18n, only refresh Supabase session
  if (PORTAL_AUTH_ROOTS.some((root) => belongsToSurface(pathname, root))) {
    return await updateSession(request);
  }

  // API and static assets: skip entirely
  if (
    STATIC_SKIP_ROOTS.some((root) => belongsToSurface(pathname, root)) ||
    STATIC_SKIP_PATHS.has(pathname)
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
