const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
const categorySlugMap = require('./config/artwork-category-slugs.json');

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
});

const nextConfig = {
  // output: 'export', // Disabled to support Server Actions & Middleware
  turbopack: {
    root: __dirname,
  },
  // 빌드 시 prerender 페이지당 60s timeout이 기본 — 작품 detail이 9개 Supabase 쿼리를
  // 직렬 실행하다 Cloudflare transient 지연 시 60s 초과로 retry 3회 모두 실패 → 빌드 ERROR.
  // 180s로 상향해 transient 흡수. 근본 fix(getSupabaseStoriesLight + generateStaticParams 0)는
  // 별도 적용되어 일반 빌드는 영향 없고 안전망 역할만 수행.
  staticPageGenerationTimeout: 180,
  // Vercel Image Optimization 사용 — next-image-export-optimizer + Supabase render endpoint 조합에서
  // 마이그레이션. Vercel Edge가 한국 리전에서 자체 변환·캐시·전송 (장기 immutable cache).
  // SafeImage가 호출 시 Supabase render URL을 raw object URL로 자동 정리해 Vercel에 전달.
  images: {
    formats: ['image/avif', 'image/webp'],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // 384/480 추가 — 모바일 카드(220px·326px 등)에서 DPR 1·2 매칭 정밀화.
    // DPR 1: 326 × 1 = 326 → 384 매칭 (이전 480, oversize 1.47배 → 1.18배)
    // DPR 2: 326 × 2 = 652 → 750 매칭. PSI "이미지 적정 크기" 90KiB+ 절감.
    deviceSizes: [384, 480, 640, 750, 828, 1080, 1200, 1920],
    // 60: hero·overlay(다크 그라디언트가 위에 깔려 화질 영향 거의 없는 곳)
    // 70: 작품 카드 thumbnail / 75: 일반 default / 85: 고화질 작품 디테일
    qualities: [60, 70, 75, 85],
    // PSI "정적 자원 효율적 캐시" 항목 — Vercel Image Optimization edge cache TTL.
    // 30일. 작품 이미지는 한 번 업로드되면 거의 변경되지 않으므로 길게 잡아 cache hit률 ↑.
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      // Supabase Storage — Seoul live 프로젝트만 명시. 와일드카드(*.supabase.co)는 deprecated
      // 뭄바이 프로젝트(vqejnuntjnxzpgwfndtv)를 포함한 임의 프로젝트 이미지를 Vercel optimizer가
      // fetching하는 회귀를 차단. stories.body_en의 뭄바이 URL은 migration
      // 20260529180000_backfill_stories_body_en_seoul_urls로 모두 Seoul URL로 치환 완료.
      {
        protocol: 'https',
        hostname: 'khtunrybrzntlnowlahb.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'khtunrybrzntlnowlahb.supabase.co',
        pathname: '/storage/v1/render/image/public/**',
      },
      { protocol: 'https', hostname: 'mmagimg.speedgabia.com' },
      { protocol: 'https', hostname: 'cdn.ndnnews.co.kr' },
      { protocol: 'https', hostname: 'cdn.ebn.co.kr' },
      { protocol: 'https', hostname: 'cphoto.asiae.co.kr' },
      { protocol: 'https', hostname: 'www.news-art.co.kr' },
      { protocol: 'https', hostname: 'flexible.img.hani.co.kr' },
      { protocol: 'https', hostname: 'cdn.ggoverallnews.co.kr' },
      { protocol: 'https', hostname: 'cdn.socialimpactnews.net' },
      { protocol: 'https', hostname: 'cdn.abcn.kr' },
      { protocol: 'https', hostname: 'cdn.eroun.net' },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '3mb',
    },
    // 빌드 워커 3개 × 기본 8 = 24 동시 페이지 in-flight. 페이지당 9 Supabase 쿼리면
    // ~216 동시 쿼리로 Cloudflare 522 / statement timeout 회귀 가능. 4로 낮춰 12 in-flight
    // (~108 쿼리)로 안전 margin 확보.
    staticGenerationMaxConcurrency: 4,
  },
  reactStrictMode: true,
  async redirects() {
    // 기존 한글 인코딩 카테고리 URL(ko/en) → ASCII slug 308 흡수 (색인 자산 보존).
    const categoryRedirects = Object.entries(categorySlugMap).flatMap(([ko, slug]) => {
      const enc = encodeURIComponent(ko);
      return [
        { source: `/artworks/category/${enc}`, destination: `/artworks/category/${slug}`, permanent: true },
        { source: `/en/artworks/category/${enc}`, destination: `/en/artworks/category/${slug}`, permanent: true },
      ];
    });
    return [
      ...categoryRedirects,
      // apex(saf2026.com) → www redirect 제거. 같은 redirect를 Vercel 도메인 단계에서
      // 중복으로 걸고 있어 PSI "리디렉션 방지" 950ms 누적의 원인이었음. Vercel UI에서
      // saf2026.com을 "Connect to environment: Production"으로 변경해 양쪽 도메인이
      // 동일 콘텐츠를 직접 서빙하게 한다(canonical은 이미 SITE_URL=www.saf2026.com을
      // 가리키므로 SEO 신호 통합 보장).
      // ⚠ 이 코드 변경 + Vercel UI 변경 두 가지가 모두 적용돼야 redirect 0이 됨.
      // 한쪽만 하면 다른 쪽이 그대로 redirect 받음.
      {
        source: '/apple-touch-icon.png',
        destination: '/images/icons/icon-192.png',
        permanent: true,
      },
      {
        source: '/apple-touch-icon-precomposed.png',
        destination: '/images/icons/icon-192.png',
        permanent: true,
      },
      {
        source: '/exhibition',
        destination: '/archive/2026',
        permanent: true,
      },
      {
        source: '/en/exhibition',
        destination: '/en/archive/2026',
        permanent: true,
      },
      // /en/{auth route}는 페이지가 없어 404 — 한국어 auth 페이지로 귀속 (영문 UI는 해당 페이지 내 자동 locale 분기)
      { source: '/en/login', destination: '/login', permanent: true },
      { source: '/en/signup', destination: '/signup', permanent: true },
      { source: '/en/onboarding', destination: '/onboarding', permanent: true },
      { source: '/en/terms-consent', destination: '/terms-consent', permanent: true },
      // 거장 작가 — 별도 /special/<slug> 페이지를 운영하지 않고 작가 페이지로 통일.
      // 오윤·박생광도 dispatch 통합 — /special 큐레이션을 /artworks/artist/<이름>에서 렌더,
      // /special/<slug>는 308 redirect로 SEO 허브(/artworks/artist/<이름>)에 정리.
      {
        source: '/special/min-joungki',
        destination: '/artworks/artist/%EB%AF%BC%EC%A0%95%EA%B8%B0',
        permanent: true,
      },
      {
        source: '/en/special/min-joungki',
        destination: '/en/artworks/artist/%EB%AF%BC%EC%A0%95%EA%B8%B0',
        permanent: true,
      },
      {
        source: '/special/lee-cheolsoo',
        destination: '/artworks/artist/%EC%9D%B4%EC%B2%A0%EC%88%98',
        permanent: true,
      },
      {
        source: '/en/special/lee-cheolsoo',
        destination: '/en/artworks/artist/%EC%9D%B4%EC%B2%A0%EC%88%98',
        permanent: true,
      },
      {
        source: '/special/park-buldong',
        destination: '/artworks/artist/%EB%B0%95%EB%B6%88%EB%98%A5',
        permanent: true,
      },
      {
        source: '/en/special/park-buldong',
        destination: '/en/artworks/artist/%EB%B0%95%EB%B6%88%EB%98%A5',
        permanent: true,
      },
      {
        source: '/special/oh-yoon',
        destination: '/artworks/artist/%EC%98%A4%EC%9C%A4',
        permanent: true,
      },
      {
        source: '/en/special/oh-yoon',
        destination: '/en/artworks/artist/%EC%98%A4%EC%9C%A4',
        permanent: true,
      },
      {
        source: '/special/park-saenggwang',
        destination: '/artworks/artist/%EB%B0%95%EC%83%9D%EA%B4%91',
        permanent: true,
      },
      {
        source: '/en/special/park-saenggwang',
        destination: '/en/artworks/artist/%EB%B0%95%EC%83%9D%EA%B4%91',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/fonts/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/images/:path*',
        headers: [
          // 정적 이미지 (icon, og, 가이드 자산 등) — 7일 max-age + 30일 stale-while-revalidate.
          // 작품 이미지는 Supabase에서 서빙되므로 별도 영향. PSI "효율적 캐시" 항목 개선.
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=2592000' },
        ],
      },
      // _next/static 청크는 배포마다 `?dpl=...` 쿼리로 매번 새 URL이 생성되어
      // GSC "크롤링됨-색인 미생성"에 누적 보고됨. 정적 자산은 SERP 노출 대상이 아니므로
      // 명시적 noindex 시그널로 정리. Googlebot의 페이지 렌더링용 fetch에는 영향 없음.
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
      },
      // /en/terms 및 /en/artworks/*·/en/news/* 하위 경로는 코드 레벨 robots:{index:false}
      // 설정이 있으나
      // meta noindex는 HTML 렌더링 후에야 인식됨. HTTP 헤더로 동일 정책을 이중 송출해
      // Google 인덱스 해제를 가속. artworks·news 하위 경로는 robots.txt에서 막지 않아
      // 크롤러가 이 noindex 헤더를 직접 확인할 수 있게 한다.
      // 인덱서블 EN 루트 목록(/en/artworks, /en/news)은 이 패턴에 미매칭.
      {
        source: '/en/terms/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, follow' }],
      },
      {
        source: '/en/artworks/:path+',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, follow' }],
      },
      {
        source: '/en/news/:path+',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, follow' }],
      },
      // EN 특별전(오윤 40주기·박생광 드로잉전)은 영문 native 콘텐츠로 EN_INDEXABLE_PAGES에
      // 등재되고 sitemap에 bilingual hreflang으로 발행되는 색인 대상 — 바로 위
      // '/en/artworks/:path+' blanket noindex가 이 두 경로까지 덮어 "sitemap 제출 + 헤더
      // noindex" 신호 충돌로 색인이 영구 차단되던 회귀(2026-06-12 감사)를 해제한다.
      // Next.js headers는 동일 경로·동일 key 매칭 시 마지막 규칙이 우선하므로 반드시
      // blanket 규칙 "뒤"에 둘 것. 대문자/소문자 percent-encoding과 디코딩 표기를 모두
      // 매칭 (RFC 3986상 소문자 hex도 동등 — 외부 백링크/중계기가 만들 수 있음).
      // ⚠️ EN_INDEXABLE_PAGES(lib/en-indexable.ts)에 특별전 작가를 추가하면 이 규칙에도
      // 반드시 함께 추가할 것 — 빠지면 sitemap 제출 + noindex 헤더 충돌이 재발한다.
      {
        source:
          '/en/artworks/artist/:name(%EC%98%A4%EC%9C%A4|%EB%B0%95%EC%83%9D%EA%B4%91|%ec%98%a4%ec%9c%a4|%eb%b0%95%ec%83%9d%ea%b4%91|오윤|박생광)',
        headers: [{ key: 'X-Robots-Tag', value: 'index, follow' }],
      },
      // 공개 페이지의 Cache-Control에서 `no-store` 제거해 bfcache(뒤로가기 즉시 복원) 허용.
      // 동적 라우트(getLocale 등) 기본값 `private, no-cache, no-store, max-age=0, must-revalidate`은
      // bfcache를 차단(Lighthouse: "Page prevented back/forward cache restoration", score 0).
      // `no-cache`만 남기면 매 요청 revalidation은 그대로 강제하면서 bfcache는 허용된다.
      // portal/auth/api/static 영역은 매칭 제외해서 personalised 응답 보호 유지.
      //
      // ⚠ `llms.txt`, `llms-full.txt`, `robots.txt`, `sitemap.xml`은 LLM 봇·검색 크롤러용
      // plain text/xml 자산이며 자체 라우트(`app/llms.txt/route.ts` 등)에서 명시적으로
      // `Cache-Control: public, max-age=3600, s-maxage=3600`을 설정한다. 여기 default
      // 규칙이 `private, no-cache`로 덮어쓰면 Vercel Edge가 prerender 캐시(PRERENDER hit)는
      // 활용하지만 **클라이언트/봇은 매 요청 origin re-validate**라 LLM 봇 부하·TTFB·
      // s-maxage 모두 무효화됨. 4개 경로는 negative lookahead로 명시 제외.
      //
      // ⚠ `fonts|images|favicon.ico|manifest.webmanifest`도 반드시 제외 — 빠뜨리면 이
      // catch-all이 위 폰트(1년 immutable)·이미지(7일 SWR) 캐시 규칙을 no-cache로 덮어써
      // 92개 폰트 서브셋과 모든 로컬 이미지가 재방문마다 재검증되고, Vercel optimizer가
      // upstream no-cache를 /_next/image 변환본에까지 전파한다 (2026-06-12 감사 회귀).
      {
        source:
          '/((?!admin|dashboard|exhibitor|onboarding|login|signup|auth|terms-consent|forgot-password|reset-password|api|_next|fonts|images|favicon\\.ico|manifest\\.webmanifest|llms\\.txt|llms-full\\.txt|robots\\.txt|sitemap\\.xml|feed\\.xml|en/llms\\.txt|en/llms-full\\.txt).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, max-age=0, must-revalidate',
          },
        ],
      },
      // ─── CSP 분리: portal vs public ───────────────────────────────────────
      // portal/auth(/admin·/dashboard·/exhibitor·/onboarding·/login·/signup·
      // /terms-consent·/auth)는 GlobalAnalyticsGate에서 GA4·Vercel Analytics·
      // WebVitals이 모두 OFF이고, Kakao Share/Map SDK·Toss SDK 어느 것도 로드되지
      // 않음 — 외부 SDK 의존성이 0이므로 strict CSP 적용 가능.
      // 공개 페이지는 Kakao Share SDK가 동적 코드 평가(Function 생성자 3회 — 실측)에
      // 의존하고 거의 모든 페이지에 박혀 있어 'unsafe-eval' 유지 불가피.
      // ⚠ 다중 CSP 헤더는 브라우저에서 가장 엄격한 정책으로 intersect되므로
      // strict와 public CSP는 mutually exclusive 라우트 매칭이 필수.
      // 보안 가치: portal에서 XSS 발생해도 동적 코드 실행 차단 + 외부 도메인 호출
      // 차단으로 관리자·결제 진입·회원가입 영역 공격 표면 축소.
      {
        source: '/:portal(admin|dashboard|exhibitor|onboarding|login|signup|terms-consent|auth|forgot-password|reset-password)/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // 'unsafe-eval' 제거 — portal에서는 Kakao SDK 미로드 (실측 확인).
              // 'unsafe-inline'은 Next.js __NEXT_DATA__ 인라인 스크립트 때문에 유지
              // (nonce 기반으로 전환하려면 별도 작업).
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              // Supabase 외 모든 외부 도메인 제거 — portal에서 호출하는 외부 서비스 0.
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
              "worker-src 'self' blob:",
              "frame-src 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
      // portal exact paths (`/login`, `/signup`, `/terms-consent`, `/onboarding` 등)
      // 위 `:path*` 패턴이 nested만 매칭하는 경우 대비 — Next.js path-to-regexp 동작상
      // 둘 다 매칭되어도 같은 값이라 browser intersect 결과 동일.
      {
        source: '/:portal(admin|dashboard|exhibitor|onboarding|login|signup|terms-consent|auth|forgot-password|reset-password)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
              "worker-src 'self' blob:",
              "frame-src 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
      // /ko/mypage, /en/mypage: locale-prefixed 마이페이지 — portal strict CSP 적용
      // (위 portal 블록은 locale prefix 없는 경로 전용이라 locale 포함 경로에 별도 패턴 필요)
      {
        source: '/:locale(ko|en)/mypage/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
              "worker-src 'self' blob:",
              "frame-src 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
      {
        source: '/:locale(ko|en)/mypage',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
              "worker-src 'self' blob:",
              "frame-src 'self'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
      // 공개 페이지용 CSP — portal/api/_next/mypage locale 경로 제외. Kakao Share/Map + 분석 SDK 허용.
      {
        source:
          '/((?!admin|dashboard|exhibitor|onboarding|login|signup|terms-consent|auth|forgot-password|reset-password|api|_next|ko/mypage|en/mypage).*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // 'unsafe-eval' 필수 — Kakao Share SDK 동적 코드 평가 의존 (kakao.min.js v2.7.2 실측).
              // 거의 모든 공개 페이지에 ShareButtons가 박혀 있어 제거 시 광범위 회귀.
              // Kakao Map(/archive/2026)도 동일 요구.
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://developers.kakao.com https://dapi.kakao.com https://t1.daumcdn.net https://map.daumcdn.net https://t1.kakaocdn.net https://*.vercel-insights.com https://*.tosspayments.com https://*.toss.im https://toss.im https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
              "connect-src 'self' https://*.kakao.com https://*.daum.net https://*.daumcdn.net https://*.vercel-insights.com https://*.supabase.co wss://*.supabase.co https://*.tosspayments.com https://*.toss.im https://toss.im https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
              "worker-src 'self' blob:",
              "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://*.kakao.com http://*.kakao.com https://*.tosspayments.com https://*.toss.im https://toss.im https://t1.daumcdn.net https://postcode.map.daum.net",
              "base-uri 'self'",
              // Kakao Share SDK v2의 sendDefault()는 hidden form을 sharer.kakao.com/picker/link로
              // POST submit하는 방식으로 picker를 띄움. 이 도메인 없으면 CSP 차단 → 빈창 회귀.
              "form-action 'self' https://sharer.kakao.com",
            ].join('; '),
          },
        ],
      },
      // 공통 보안 헤더 — 모든 라우트에 동일 적용 (CSP 외 키들은 conflict 없음)
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
};

module.exports = withNextIntl(withBundleAnalyzer(nextConfig));
