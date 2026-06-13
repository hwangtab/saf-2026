import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '@/i18n/routing';
import { updateSession } from '@/lib/auth/middleware';
import { belongsToSurface, stripLocale } from '@/lib/path-rules';
import { resolveLegacyArtworkId } from '@/lib/artwork-legacy-map';

// Legacy 숫자 작품 ID → UUID. page.tsx permanentRedirect가 error.tsx에 가로막힘.
// proxy(=구 middleware)에서 렌더 전에 처리.
// Legacy ID (/artworks/151, /en/artworks/151, /ko/artworks/151) → UUID 308 redirect.
// /ko/ prefix는 next-intl 기본 locale이라 사용자가 직접 입력해야만 도달하지만,
// fallthrough 시 404로 색인 누락되는 사고를 막기 위해 매칭 대상에 포함.
const LEGACY_ARTWORK_PATH = /^\/(?:(ko|en)\/)?artworks\/(\d+)\/?$/;

// /stories?category=foo → /stories/category/foo 308 redirect.
// stories 정적화 후 server-side query 필터 제거. 외부 백링크나 직접 입력으로 들어온 query URL이
// 색인되면 /stories(전체 매거진)와 중복 색인 위험. 정적 카테고리 라우트로 흡수해 단일 정규 URL 보장.
const STORIES_LIST_PATH = /^\/(en\/)?stories\/?$/;
const VALID_STORY_CATEGORIES = new Set(['artist-story', 'buying-guide', 'art-knowledge']);

// 작품 상세의 비추적 query(returnTo 등)만 정규 detail URL로 308 정규화한다.
// ⚠️ 목록 페이지(/artworks 등)의 query는 더 이상 제거하지 않는다 (2026-06-12 감사):
// page/q/category/price 등은 Pagination·useArtworkFilter·GlobalSearchDialog가 생성하는
// 기능적 URL 상태라, 일괄 308이 페이지네이션 크롤·필터 공유·북마크·새로고침을 전부
// 무필터 1페이지로 초기화하는 회귀였다. 중복 색인은 각 페이지의 self-canonical이 해소.
const ARTWORK_DETAIL_PATH = /^\/(?:(ko|en)\/)?artworks\/[^/?]+\/?$/;
const TRACKING_QUERY_PARAMS = new Set(['fbclid', 'gclid', 'msclkid']);

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
  '/forgot-password',
  '/reset-password',
] as const;

// i18n·인증 미들웨어를 건너뛸 정적·API 루트.
// /.well-known은 IETF 표준 경로 (security.txt, Apple Pay merchant validation, WebAuthn 등) —
// 향후 추가 시 intlProxy가 페이지 라우트로 처리해 /feed.xml 같은 500 회귀 방지.
const STATIC_SKIP_ROOTS = [
  '/api',
  '/_next',
  '/images',
  '/fonts',
  '/reports',
  '/.well-known',
] as const;

const STATIC_SKIP_PATHS = new Set([
  '/favicon.ico',
  '/manifest.json',
  '/manifest.webmanifest',
  '/robots.txt',
  '/sitemap.xml',
  '/feed.xml',
  '/llms.txt',
  '/llms-full.txt',
  '/en/llms.txt',
  '/en/llms-full.txt',
]);

function canonicalizeSearchlessUrl(pathname: string, requestUrl: string): URL {
  const url = new URL(pathname, requestUrl);
  url.search = '';
  url.hash = '';
  return url;
}

// ⚠️ 추적 파라미터(utm_*, fbclid, gclid, msclkid)는 어떤 경우에도 redirect로 제거하지
// 않는다 (2026-06-12 감사). GA4·Vercel Analytics는 클라이언트에서 landing URL을 읽어
// 캠페인을 귀속시키는데, 서버 308이 먼저 제거하면 소셜 캠페인(인스타그램/스레드/카카오)
// 유입 측정과 admin UTM 대시보드가 구조적으로 무력화된다. Google은 utm 변형의 중복
// 색인을 rel=canonical로 처리하라고 권장하며 모든 공개 페이지가 self-canonical 발행 중.
function isTrackingParam(key: string): boolean {
  return key.startsWith('utm_') || TRACKING_QUERY_PARAMS.has(key);
}

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // /stories?category=foo → /stories/category/foo 308. 정적화 후 query URL은 중복 색인 위험이라
  // 정규 정적 라우트로 흡수. invalid category는 query 제거만 하고 /stories로 흘려보냄.
  if (STORIES_LIST_PATH.test(pathname) && searchParams.has('category')) {
    const enPrefix =
      pathname.startsWith('/en/') || pathname === '/en' || pathname === '/en/' ? 'en/' : '';
    const category = searchParams.get('category') || '';
    if (VALID_STORY_CATEGORIES.has(category)) {
      return NextResponse.redirect(
        new URL(`/${enPrefix}stories/category/${category}`, request.url),
        308
      );
    }
    return NextResponse.redirect(new URL(`/${enPrefix}stories`, request.url), 308);
  }

  // Legacy artwork ID (e.g. /artworks/151) → UUID 308 리다이렉트
  // page.tsx의 permanentRedirect이 error boundary에 가로막히므로 proxy에서 처리
  const legacyMatch = pathname.match(LEGACY_ARTWORK_PATH);
  if (legacyMatch) {
    const [, localePrefix, legacyId] = legacyMatch;
    const uuid = resolveLegacyArtworkId(legacyId);
    if (uuid) {
      // localePrefix는 'ko' | 'en' | undefined. /ko/는 default locale이라 prefix 제거.
      const localeSegment = localePrefix === 'en' ? 'en/' : '';
      const newPath = `/${localeSegment}artworks/${uuid}`;
      return NextResponse.redirect(new URL(newPath, request.url), 308);
    }
    // 매핑 못 찾은 numeric ID는 404로 차단.
    // page.tsx로 흘려보내면 fallback 정적 데이터로 렌더되어 UUID 본 페이지와 중복 색인됨
    // (GSC "크롤링됨-색인 미생성" 1,705 페이지의 큰 비중을 차지).
    return new NextResponse(null, { status: 404 });
  }

  // 작품 상세의 알 수 없는 query만 정규 detail URL로 흡수한다. 보존 대상:
  // - 추적 파라미터(utm_* 등): 어트리뷰션 (isTrackingParam 주석 참조)
  // - returnTo: ArtworkDetailNav가 소비하는 기능 파라미터 ("특별전/컬렉션으로 돌아가기"
  //   복원). 과거 일괄 308이 이 기능을 죽이고 있었다 (2026-06-12 감사). 중복 색인은
  //   self-canonical이 해소.
  // legacy 숫자 ID는 위 UUID redirect가 우선되어야 하므로 이 블록은 legacy 처리 뒤에 둔다.
  if (searchParams.size > 0 && ARTWORK_DETAIL_PATH.test(pathname)) {
    const isPreservedParam = (key: string) => isTrackingParam(key) || key === 'returnTo';
    const hasFunctionalParam = Array.from(searchParams.keys()).some(
      (key) => !isPreservedParam(key)
    );
    if (hasFunctionalParam) {
      // redirect 목적지에서 기본 locale prefix(/ko)도 함께 제거 — 유지하면 아래
      // /ko 정규화 블록이 한 번 더 308을 보내 2-hop 체인이 된다 (2026-06-12 리뷰)
      const canonicalPath = pathname.replace(/^\/ko(?=\/)/, '');
      const url = canonicalizeSearchlessUrl(canonicalPath, request.url);
      searchParams.forEach((value, key) => {
        if (isPreservedParam(key)) url.searchParams.append(key, value);
      });
      return NextResponse.redirect(url, 308);
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

  // locale-prefixed /ko/mypage, /en/mypage: updateSession으로 세션 갱신
  // bare /mypage는 제외 (intlProxy가 /ko/mypage로 리다이렉트해야 하므로)
  const normalizedPath = stripLocale(pathname);
  if (pathname !== normalizedPath && belongsToSurface(normalizedPath, '/mypage')) {
    return await updateSession(request);
  }

  // 공개 페이지의 광고·추적 query를 308로 제거하던 블록은 삭제됨 (2026-06-12 감사) —
  // isTrackingParam 주석 참조. 중복 색인은 self-canonical이 처리한다.

  // 기본 locale prefix 정규화를 next-intl(307 임시 redirect)보다 먼저 308(영구)로 처리한다
  // (2026-06-12 감사) — 기본 locale의 prefix 제거는 영구 정책이므로 크롤러에 영구 신호.
  // 포털/정적 경로는 위 분기들이 이미 처리했으므로 여기 도달하는 것은 공개 페이지뿐.
  // prefix는 routing.defaultLocale에서 파생 — 'ko' 하드코딩 시 locale 정책 변경과 어긋나면
  // 308(브라우저/CDN에 영구 캐시)이 잘못된 redirect를 오래 남긴다 (2026-06-12 리뷰).
  const defaultLocalePrefix = `/${routing.defaultLocale}`;
  if (pathname === defaultLocalePrefix || pathname.startsWith(`${defaultLocalePrefix}/`)) {
    const strippedPath =
      pathname === defaultLocalePrefix ? '/' : pathname.slice(defaultLocalePrefix.length) || '/';
    const url = new URL(strippedPath, request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url, 308);
  }

  // Public pages: handle i18n locale routing
  return intlProxy(request);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|images/|fonts/|reports/|\\.well-known/|favicon.ico|manifest\\.json|manifest\\.webmanifest|robots.txt|sitemap.xml|feed.xml|llms.txt|llms-full.txt|en/llms\\.txt|en/llms-full\\.txt).*)',
  ],
};
