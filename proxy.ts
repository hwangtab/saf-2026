import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { updateSession } from '@/lib/auth/middleware';
import { belongsToSurface } from '@/lib/path-rules';
import { resolveLegacyArtworkId } from '@/lib/artwork-legacy-map';

// Legacy 숫자 작품 ID → UUID. page.tsx permanentRedirect가 error.tsx에 가로막힘.
// proxy(=구 middleware)에서 렌더 전에 처리.
const LEGACY_ARTWORK_PATH = /^\/(en\/)?artworks\/(\d+)\/?$/;

const intlProxy = createMiddleware(routing);

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
const STATIC_SKIP_ROOTS = ['/api', '/_next', '/images', '/fonts', '/reports'] as const;

const STATIC_SKIP_PATHS = new Set([
  '/favicon.ico',
  '/manifest.json',
  '/manifest.webmanifest',
  '/robots.txt',
  '/sitemap.xml',
  '/llms.txt',
  '/llms-full.txt',
]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Legacy artwork ID (e.g. /artworks/151) → UUID 308 리다이렉트
  // page.tsx의 permanentRedirect이 error boundary에 가로막히므로 proxy에서 처리
  const legacyMatch = pathname.match(LEGACY_ARTWORK_PATH);
  if (legacyMatch) {
    const [, enPrefix, legacyId] = legacyMatch;
    const uuid = resolveLegacyArtworkId(legacyId);
    if (uuid) {
      const newPath = `/${enPrefix ?? ''}artworks/${uuid}`;
      return NextResponse.redirect(new URL(newPath, request.url), 308);
    }
    // 매핑 못 찾은 numeric ID는 404로 차단.
    // page.tsx로 흘려보내면 fallback 정적 데이터로 렌더되어 UUID 본 페이지와 중복 색인됨
    // (GSC "크롤링됨-색인 미생성" 1,705 페이지의 큰 비중을 차지).
    return new NextResponse(null, { status: 404 });
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
  const response = intlProxy(request);
  applyPublicPageCacheControl(response);
  return response;
}

/**
 * 공개 페이지 응답에서 `no-store`를 제거해 bfcache(브라우저 뒤로가기 즉시 복원)를 허용.
 *
 * 배경: 공개 라우트가 next-intl `getLocale()` 등 동적 API 사용으로 SSG 자격을 잃어
 * Vercel/Next.js 기본값으로 `cache-control: private, no-cache, no-store, max-age=0,
 * must-revalidate`가 박힘. `no-store`는 bfcache 차단의 결정적 토큰 (Lighthouse:
 * "Page prevented back/forward cache restoration", score 0).
 *
 * `no-cache`는 매 요청마다 revalidation을 강제할 뿐 bfcache는 막지 않음 (Chrome/Safari).
 * 따라서 응답 헤더에서 `no-store`만 제거하면 보안·신선도 동작은 그대로 유지하면서
 * 사용자가 뒤로가기 시 페이지가 즉시 복원된다.
 *
 * 인증 영역(`updateSession`)은 personalised 응답이라 캐시 금지가 정확한 동작이므로 손대지 않음.
 */
function applyPublicPageCacheControl(response: NextResponse): void {
  const current = response.headers.get('cache-control');
  if (!current || !current.includes('no-store')) return;
  const next = current
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token && token.toLowerCase() !== 'no-store')
    .join(', ');
  response.headers.set('cache-control', next || 'private, no-cache, max-age=0, must-revalidate');
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|images/|fonts/|reports/|favicon.ico|manifest\\.json|manifest\\.webmanifest|robots.txt|sitemap.xml|llms.txt|llms-full.txt).*)',
  ],
};
