/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // 뉴스 사이트 썸네일 도메인 (content/news.ts에서 사용)
      { protocol: 'https', hostname: 'mmagimg.speedgabia.com' }, // 믹싱
      { protocol: 'https', hostname: 'cdn.ndnnews.co.kr' }, // 공직신문
      { protocol: 'https', hostname: 'cdn.ebn.co.kr' }, // EBN
      { protocol: 'https', hostname: 'cphoto.asiae.co.kr' }, // 아시아경제
      { protocol: 'https', hostname: 'www.news-art.co.kr' }, // 뉴스아트
      { protocol: 'https', hostname: 'flexible.img.hani.co.kr' }, // 한겨레
      { protocol: 'https', hostname: 'cdn.ggoverallnews.co.kr' }, // 경기종합뉴스
      { protocol: 'https', hostname: 'cdn.socialimpactnews.net' }, // 소셜임팩트뉴스
      { protocol: 'https', hostname: 'cdn.abcn.kr' }, // ABC뉴스
      { protocol: 'https', hostname: 'cdn.eroun.net' }, // 이로운넷
    ],
  },
  reactStrictMode: true,
};

module.exports = nextConfig;
