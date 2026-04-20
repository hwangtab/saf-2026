import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { updateSession } from '@/lib/auth/middleware';
import { belongsToSurface } from '@/lib/path-rules';
import { resolveLegacyArtworkId } from '@/lib/artwork-legacy-map';

// Legacy 숫자 작품 ID → UUID. page.tsx permanentRedirect가 error.tsx에 가로막힘.
// middleware에서 렌더 전에 처리.
const LEGACY_ARTWORK_PATH = /^\/(en\/)?artworks\/(\d+)\/?$/;

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

  // Legacy artwork ID (e.g. /artworks/151) → UUID 308 리다이렉트
  // page.tsx의 permanentRedirect이 error boundary에 가로막히므로 middleware에서 처리
  const legacyMatch = pathname.match(LEGACY_ARTWORK_PATH);
  if (legacyMatch) {
    const [, enPrefix, legacyId] = legacyMatch;
    const uuid = resolveLegacyArtworkId(legacyId);
    if (uuid) {
      const newPath = `/${enPrefix ?? ''}artworks/${uuid}`;
      return NextResponse.redirect(new URL(newPath, request.url), 308);
    }
  }

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
