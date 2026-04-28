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
  images: {
    loader: 'custom',
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
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
  env: {
    nextImageExportOptimizer_imageFolderPath: 'public',
    nextImageExportOptimizer_exportFolderPath: 'out',
    nextImageExportOptimizer_quality: '75',
    nextImageExportOptimizer_storePicturesInWEBP: 'true',
    nextImageExportOptimizer_exportFolderName: 'nextImageExportOptimizer',
    nextImageExportOptimizer_generateAndUseBlurImages: 'true',
    nextImageExportOptimizer_remoteImageCacheTTL: '604800',
  },
  transpilePackages: ['next-image-export-optimizer'],
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
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
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
