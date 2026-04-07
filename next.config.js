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
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // 'unsafe-eval' is required by Kakao Map SDK which uses eval() internally.
              // Removing it breaks map rendering. Track: https://devtalk.kakao.com
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://developers.kakao.com https://dapi.kakao.com https://t1.daumcdn.net https://map.daumcdn.net https://t1.kakaocdn.net https://*.vercel-insights.com https://js.tosspayments.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' data: https://cdn.jsdelivr.net https://cdnjs.cloudflare.com",
              "connect-src 'self' https://*.kakao.com https://*.daum.net https://*.daumcdn.net https://*.vercel-insights.com https://*.supabase.co wss://*.supabase.co https://api.tosspayments.com",
              "worker-src 'self' blob:",
              "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://*.kakao.com https://js.tosspayments.com",
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
