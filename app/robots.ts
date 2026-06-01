import { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/constants';

export const dynamic = 'force-static';

// 모든 정식 크롤러(구글·빙 기본 그룹 `*`, 명시 환영 봇 Yeti·AI 봇)에 공통 적용되는 차단 경로.
//
// ⚠️ robots.txt 표준: 크롤러는 자신에게 매칭되는 user-agent 그룹 "하나만" 따른다.
// Yeti(네이버)·AI 봇을 별도 그룹으로 두면서 `Allow: /`만 주면, 이 그룹들은 `User-agent: *`의
// Disallow를 통째로 무시한다. 그 결과 네이버 Yeti가 `/artworks?page=2`·`?sort=`·`?returnTo=` 등
// 쿼리 변형을 전부 크롤 → 동일 title/description 페이지가 수백 개 색인되어 네이버 사이트 진단
// "동일 제목 웹문서 다수 / 동일 설명문" 경고가 폭증했다(2026-06 실측: 쿼리 변형이 전부 200 +
// 동일 title 반환 확인). 따라서 명시 봇 그룹에도 동일 Disallow를 복제 적용한다.
const COMMON_DISALLOW = [
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
  // GSC/네이버가 쿼리 동반 URL을 "표준 없는 중복"으로 보고하므로 크롤 자체 차단
  '/artworks/*?*',
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
