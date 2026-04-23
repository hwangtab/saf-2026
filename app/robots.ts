import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          // 인증·관리자·체크아웃 영역
          '/api/',
          '/admin/',
          '/en/admin/',
          '/dashboard/',
          '/en/dashboard/',
          '/exhibitor/',
          '/en/exhibitor/',
          '/checkout/',
          '/en/checkout/',
          '/login',
          '/en/login',
          '/signup',
          '/en/signup',
          '/onboarding',
          '/en/onboarding',
          '/terms-consent',
          '/en/terms-consent',
          // 광고·추적 파라미터 (canonical URL만 인덱스)
          '/*?*utm_*',
          '/*?*fbclid=*',
          '/*?*gclid=*',
          '/*?*msclkid=*',
          // 목록 페이지 쿼리 파라미터 (sort/filter/page 등 무한 조합 방지)
          // `/path?*` 패턴: Google은 `/path?`로 시작하는 URL 매칭, 루트 `/path`는 매칭 안 됨 (의도대로)
          '/artworks?*',
          '/en/artworks?*',
          '/stories?*',
          '/en/stories?*',
          '/news?*',
          '/en/news?*',
          // 작품 상세 쿼리 파라미터 (예: `?returnTo=/special/oh-yoon`) — canonical은 `/artworks/:id` 고정이지만
          // GSC가 쿼리 동반 URL을 "표준 없는 중복"으로 보고하므로 크롤 자체 차단
          '/artworks/*?*',
          '/en/artworks/*?*',
        ],
      },
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'ClaudeBot',
          'Claude-Web',
          'anthropic-ai',
          'Google-Extended',
          'Googlebot-Extended',
          'PerplexityBot',
          'CCBot',
          'meta-externalagent',
          'Applebot-Extended',
          'cohere-ai',
          'Diffbot',
        ],
        allow: '/',
      },
      {
        userAgent: 'Yeti',
        allow: '/',
      },
      {
        userAgent: ['AdsBot-Google', 'MJ12bot', 'DotBot'],
        disallow: '/',
      },
    ],
    sitemap: `${SITE_URL.replace(/\/$/, '')}/sitemap.xml`,
  };
}
