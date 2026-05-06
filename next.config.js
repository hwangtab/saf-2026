const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
});

const nextConfig = {
  // output: 'export', // Disabled to support Server Actions & Middleware
  turbopack: {
    root: __dirname,
  },
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
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
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
  experimental: {},
  reactStrictMode: true,
  async redirects() {
    return [
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
      // 공개 페이지의 Cache-Control에서 `no-store` 제거해 bfcache(뒤로가기 즉시 복원) 허용.
      // 동적 라우트(getLocale 등) 기본값 `private, no-cache, no-store, max-age=0, must-revalidate`은
      // bfcache를 차단(Lighthouse: "Page prevented back/forward cache restoration", score 0).
      // `no-cache`만 남기면 매 요청 revalidation은 그대로 강제하면서 bfcache는 허용된다.
      // portal/auth/api/static 영역은 매칭 제외해서 personalised 응답 보호 유지.
      {
        source:
          '/((?!admin|dashboard|exhibitor|onboarding|login|signup|auth|terms-consent|api|_next).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // 'unsafe-eval' is required by Kakao Map SDK which uses eval() internally.
              // Removing it breaks map rendering. Track: https://devtalk.kakao.com
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://developers.kakao.com https://dapi.kakao.com https://t1.daumcdn.net https://map.daumcdn.net https://t1.kakaocdn.net https://*.vercel-insights.com https://*.tosspayments.com https://*.toss.im https://toss.im https://www.googletagmanager.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
              "connect-src 'self' https://*.kakao.com https://*.daum.net https://*.daumcdn.net https://*.vercel-insights.com https://*.supabase.co wss://*.supabase.co https://*.tosspayments.com https://*.toss.im https://toss.im https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
              "worker-src 'self' blob:",
              "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://*.kakao.com http://*.kakao.com https://*.tosspayments.com https://*.toss.im https://toss.im https://t1.daumcdn.net https://postcode.map.daum.net",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
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
