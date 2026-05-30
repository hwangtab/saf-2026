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
          // Next.js 빌드 산출물 — 페이지 콘텐츠 아니라 JS/CSS/폰트/이미지 변형.
          // ?dpl=... deployment hash가 빌드마다 변경되어 무한 신규 URL 발생 → crawl budget 낭비.
          // GSC "감수중 2,382 / 색인되지 않음 251" 알림의 직접 원인 (2026-05-11 PDF).
          '/_next/static/',
          '/_next/image',
          // 영문 작품 detail·category·artist는 페이지 meta robots noindex 처리됨
          // (lib/schemas/artwork.ts + artworks/artist/[artist]/page.tsx 등).
          // robots.txt 추가 차단으로 crawl 자체 방지 — budget 절약 + GSC noise 감소.
          '/en/artworks/',
          // news detail도 동일 — createLocaleAlternates canonical=ko + helper 미적용.
          // 영문 본문 자동 fallback 수준이라 thin content 위험. crawl 차단으로 비용 절약.
          '/en/news/',
          // /en/stories/는 차단하지 않음 — EN_INDEXABLE_STORY_SLUGS 3편(2026-05 i18n
          // backfill에서 native quality 확보)이 indexable. 비-화이트리스트 슬러그는
          // resolveEnRobots(indexable=false) → 명시 noindex 메타로 색인 차단.
          // 인증·관리자·체크아웃 영역
          // (영문 사이트는 2026-05-11 i18n backfill 296 rows 후 정책 변경 — 핵심 13개 페이지
          //  + 매거진 3개는 indexable로 푸르고 sitemap에 hreflang ko/en 양방향 발행 중.)
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
          'OAI-SearchBot',
          'ClaudeBot',
          'Claude-Web',
          'anthropic-ai',
          'Google-Extended',
          'Googlebot-Extended',
          'PerplexityBot',
          'Perplexity-User',
          'CCBot',
          'meta-externalagent',
          'meta-externalfetcher',
          'Applebot-Extended',
          'cohere-ai',
          'Diffbot',
          'Amazonbot',
          'Bytespider',
          'Omgilibot',
          'YouBot',
          'DuckAssistBot',
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
