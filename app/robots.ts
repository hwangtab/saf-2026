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
          // 영문 사이트 전체 차단 — /en/* 페이지는 layout 차원에서 noindex 처리되며
          // 운영하지 않는 자동 번역 수준이라 thin/duplicate content. 크롤 예산 절약 +
          // GSC "크롤링됨 - 색인 생성 안 됨" 버킷 정리 (2026-05 GSC: 1992 → 감소 예상).
          '/en/',
          // 인증·관리자·체크아웃 영역 (/en/* 차단으로 자동 커버되지만 명시 유지)
          '/api/',
          '/admin/',
          '/dashboard/',
          '/exhibitor/',
          '/checkout/',
          '/login',
          '/signup',
          '/onboarding',
          '/terms-consent',
          // 광고·추적 파라미터 (canonical URL만 인덱스)
          '/*?*utm_*',
          '/*?*fbclid=*',
          '/*?*gclid=*',
          '/*?*msclkid=*',
          // 목록 페이지 쿼리 파라미터 (sort/filter/page 등 무한 조합 방지)
          // `/path?*` 패턴: Google은 `/path?`로 시작하는 URL 매칭, 루트 `/path`는 매칭 안 됨 (의도대로)
          '/artworks?*',
          '/stories?*',
          '/news?*',
          // 작품 상세 쿼리 파라미터 (예: `?returnTo=/special/oh-yoon`) — canonical은 `/artworks/:id` 고정이지만
          // GSC가 쿼리 동반 URL을 "표준 없는 중복"으로 보고하므로 크롤 자체 차단
          '/artworks/*?*',
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
