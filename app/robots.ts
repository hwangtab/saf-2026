import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants';

export const dynamic = 'force-static';

// 모든 정식 크롤러(구글·빙 기본 그룹 `*`, 명시 환영 봇 Yeti·AI 봇)에 공통 적용되는 차단 경로.
//
// ⚠️ robots.txt 표준: 크롤러는 자신에게 매칭되는 user-agent 그룹 "하나만" 따른다.
// Yeti(네이버)·AI 봇을 별도 그룹으로 두면서 `Allow: /`만 주면, 이 그룹들은 `User-agent: *`의
// Disallow를 통째로 무시한다. 따라서 명시 봇 그룹에도 동일 Disallow를 복제 적용한다.
// 공개 콘텐츠 쿼리 변형(`/artworks?sort=`, `/stories?category=`, `/news?utm_`, `/artworks/:id?returnTo=`)
// 과 공개 페이지 tracking query는 proxy.ts에서 308 정규화해 크롤러가 canonical URL로 합류하도록 한다.
const COMMON_DISALLOW = [
  // ⚠️ '/_next/static/'·'/_next/image'를 여기서 차단하지 말 것 (2026-06-12 감사에서 제거).
  // Googlebot·Yeti의 렌더링 엔진은 서브리소스 fetch에도 robots.txt를 적용하므로 CSS/JS와
  // 페이지 내 모든 작품 이미지(/_next/image?url=...)가 렌더 단계에서 차단되어 "렌더링 차단 =
  // 랭킹 직접 악영향" 패턴이었음.
  // - /_next/static의 ?dpl=... 쿼리 변형 GSC 노이즈는 next.config.js의
  //   X-Robots-Tag: noindex(/_next/static/:path*)가 처리 (색인만 막고 렌더 fetch는 허용).
  // - /_next/image는 noindex 헤더를 붙일 수 없지만(Vercel optimizer 엔드포인트에는 custom
  //   headers 미적용) 의도적으로 크롤 허용 — 페이지 img src의 이미지 색인(구글 이미지 검색)
  //   에 필요하며, 이미지 URL은 웹문서로 색인되지 않으므로 GSC 웹 색인 노이즈와 무관.
  // 영문 artworks/news 하위 URL은 next.config.js의 X-Robots-Tag: noindex, follow로 색인 제외.
  // robots.txt에서 막으면 Google이 noindex 헤더를 확인하지 못하므로 여기서는 차단하지 않는다.
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
  // ⚠️ '/checkout/'·'/login'·'/signup'·'/onboarding'·'/terms-consent'는 차단하지 않는다
  // (2026-06-12 감사). 이 라우트들은 페이지 자체에 noindex 메타가 있는데 robots로 크롤을
  // 막으면 크롤러가 noindex를 영영 못 읽어 "차단됐지만 색인됨"(URL-only) 패턴이 성립하고
  // (/checkout은 전 작품 상세가 내부 링크), '/checkout/'은 '/en/checkout/'을 매칭하지 못해
  // locale별 비대칭도 있었다. /mypage·/orders·/wishlist와 동일한 '크롤 허용 + noindex 메타'
  // 단일 패턴으로 통일.
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: COMMON_DISALLOW,
      },
      {
        // AI 학습·검색 봇 — 공개 콘텐츠 크롤은 환영하되, 비공개/중복 영역은 `*`와 동일 차단.
        // (allow: '/' 단독이면 /admin·/checkout·쿼리 변형까지 노출되는 버그였음)
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
        disallow: COMMON_DISALLOW,
      },
      {
        // 네이버 Yeti — 크롤 환영하되 `*`와 동일 차단을 명시 복제(표준상 그룹 단위 독립 적용).
        userAgent: 'Yeti',
        allow: '/',
        disallow: COMMON_DISALLOW,
      },
      {
        userAgent: ['AdsBot-Google', 'MJ12bot', 'DotBot'],
        disallow: '/',
      },
    ],
    sitemap: `${SITE_URL.replace(/\/$/, '')}/sitemap.xml`,
  };
}
