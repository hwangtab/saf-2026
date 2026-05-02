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
    // 480 추가 — 모바일 작품 카드(220px DPR 2 = 440px 소스 필요)에서 기존
    // 640 변형 대신 480 변형 매칭. PSI "이미지 적정 크기" 230KiB 절감 항목 직결.
    deviceSizes: [480, 640, 750, 828, 1080, 1200, 1920],
    // 작품 카드용 quality=70 / 일반 75 / hero 등 고화질 85 화이트리스트.
    // Next.js 16+에서 quality prop 사용 시 명시적 등록 필요.
    qualities: [70, 75, 85],
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
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'saf2026.com' }],
        destination: 'https://www.saf2026.com/:path*',
        permanent: true,
      },
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
