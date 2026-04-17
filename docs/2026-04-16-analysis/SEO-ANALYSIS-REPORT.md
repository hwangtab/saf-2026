# SAF 2026 웹사이트 SEO 분석 보고서

## 1. 실행 요약

SAF 2026 웹사이트는 Next.js 14+ (App Router)와 TypeScript를 기반으로 한 사회적 캠페인 플랫폼으로, 전반적으로 양호한 SEO 기반을 갖추고 있습니다. 기존 SEO 문서 및 구현 분석 결과, 다음과 같은 사항을 확인할 수 있습니다.

- **현재 SEO 성숙도 수준:** 중상급 (Upper Intermediate)
- **강점:**
  - 견고한 메타데이터 및 OG 태그 구현
  - Canonical URL 적절히 설정
  - 부분적 JSON-LD 구현 (Event, CollectionPage, NewsArticle)
  - 동적 사이트맵 및 robots.txt 구현
  - 다국어 지원 (ko/en) 및 hreflang alternates
  - 이미지 최적화 (Next.js Image, WebP)
  - 성능 최적화 (LCP <2.5s 목표)
- **약점:**
  - README.md 내 "씨앗:페" 명명 불일치 (코드에서는 통일 완료)
  - OG 이미지 크기 미달 (현재 800x450, 권장 1200x630)
  - PWA 아이콘 미완비 (PNG 형식 및 maskable 아이콘 필요)
  - 일부 구조화된 데이터 스키마 미구현 (FAQPage, Individual NewsArticle 등 - 부분적으로 구현됨)
  - 법적 페이지의 얇은 콘텐츠 문제 (noindex 대상과의 hreflang 충돌 방지 조치 완료)

- **예상 개선 효과:** 권장 사항 적용 시 유기 트래픽 20-30% 증가 (6-8주 기준), 검색 결과 노출 품질 향상, AI 크롤러 접근성 개선

## 2. 현재 SEO 구현 분석

### 2.1 메타데이터 및 타이틀 전략

- **상태:** ✅ 양호
- 모든 페이지가 고유한 title과 meta description을 보유
- Open Graph 및 Twitter Card 메타데이터 적절히 구성
- 타이틀 패턴: `{페이지 제목} | 씨앗페 온라인 갤러리` (layout.tsx 템플릿)
- 메타데이터 파일 위치:
  - 루트 설정: `app/layout.tsx` (Lines 68-128)
  - 페이지별 설정: 각 페이지의 `generateMetadata()` 함수
  - 공유 이미지: `lib/constants.ts` (OG_IMAGE)

### 2.2 구조화된 데이터 (JSON-LD)

- **상태:** ✅ 부분 구현 (우수)
- **구현된 스키마:**
  - ✅ Organization Schema (`app/layout.tsx` via `generateOrganizationSchema`)
  - ✅ Website Schema (`app/layout.tsx` via `generateWebsiteSchema`)
  - ✅ LocalBusiness Schema (`app/layout.tsx` via `generateLocalBusinessSchema`)
  - ✅ Event Schema (`app/exhibition/page.tsx` 또는 동적 생성)
  - ✅ CollectionPage Schema (`app/archive/page.tsx`)
  - ✅ CollectionPage + ItemList Schema (`app/news/page.tsx`)
  - ✅ NewsArticle Schema (개별 뉴스: `app/[locale]/news/[id]/page.tsx`)
  - ✅ BreadcrumbList Schema (다수 페이지에서 `createBreadcrumbSchema` 사용)
  - ✅ FAQPage Schema (홈페이지 및 우리 증명 페이지에서 `generateFAQSchema` 사용)
  - ✅ ClaimReview Schema (우리의 현실 페이지에서 `generateSAFClaimReviews` 사용)
  - ✅ QAPage Schema (우리의 증명 페이지에서 `generateSAFCoreQA` 사용)
  - ✅ HowTo Schema (구매 가이드, 멤버십 가이드 등)
  - ✅ Speakable Specification (음성 검색 최적화)
  - ✅ Dataset Schema (통계 데이터 페이지에서 사용)

- **누락된 스키마:** 현재까지 구현되지 않은 주요 스키마 없음 (SEO-REVIEW.md 권장 사항 대부분 구현됨)

### 2.3 Canonical URL

- **상태:** ✅ 우수
- 모든 페이지가 올바른 Canonical URL을 설정하여 중복 콘텐츠 문제 방지
- 예시:
  - `/` → `https://www.saf2026.com/`
  - `/our-reality` → `https://www.saf2026.com/our-reality`
  - `/exhibition` → `https://www.saf2026.com/exhibition`
  - `/archive` → `https://www.saf2026.com/archive`
  - `/news` → `https://www.saf2026.com/news`

### 2.4 로봇 메타 태그

- **상태:** ✅ 적절
- `app/layout.tsx`에서 robots 설정:
  ```typescript
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    }
  }
  ```
- 추가로 `app/robots.ts`에서 크롤러별 세부 규칙 설정

### 2.5 이미지 최적화

- **상태:** ✅ 양호
- Next.js `<Image>` 컴포넌트 및 `next-image-export-optimizer` 사용
- WebP 형식 지원 (`next.config.js`에 설정)
- 1200x630 OG 이미지 권장 크기 (파일 교체 필요)
- 모든 이미지에 alt 속성 제공 (SafeImage 컴포넌트를 통한 강제)

### 2.6 성능 메트릭

- **상태:** ✅ 양호 (SEO-REVIEW.md 기준)
- LCP (Largest Contentful Paint): <2.5s (목표값)
- 이미지 최적화: Next.js 자동 처리
- 동적 임포트: 무거운 컴포넌트 lazy loading 적용
- 번들 크기 최적화: 번들 분석기 사용 가능

### 2.7 국제화 (i18n) 및 hreflang

- **상태:** ✅ 우수
- next-intl을 사용한 다국어 지원 (ko/en)
- localePrefix: 'as-needed' (기본 로케일인 한국어에서는 프리픽스 없음)
- hreflang alternates 생성:
  - sitemap.ts에서 로케일별 URL 생성 및 alternates 제공
  - lib/locale-alternates.ts의 `createLocaleAlternates` 함수
  - 한국어 전용 콘텐츠는 영어 alternate 생략 (noindex 대상과의 hreflang 충돌 방지)
- sitemap.xml에 hreflang alternates 포함
- 언어 전환기 구현 (Header 컴포넌트)

### 2.8 URL 구조 및 라우팅

- **상태:** ✅ 양호
- Next.js 14 App Router 사용
- 정적 경로: `/`, `/our-reality`, `/our-proof`, `/archive`, `/news`, `/stories` 등
- 동적 경로:
  - `/artworks/[id]` (작품 상세)
  - `/artworks/artist/[artist]` (작가 페이지)
  - `/artworks/category/[category]` (카테고리 랜딩)
  - `/news/[id]` (뉴스 개별)
  - `/stories/[slug]` (스토리 상세)
  - `/stories/category/[category]` (스토리 카테고리)
  - `/archive/2023/videos/[youtubeId]` (아카이브 비디오)
- www → non-www 301 리다이렉트 구현 (`next.config.js`의 `async redirects()`)
- 불필요한 파라미터 차단 (utm\__, fbclid=_ 등) - robots.txt에서 disallow

### 2.9 사이트맵 및 robots.txt

- **상태:** ✅ 구현 완료
- **Sitemap (`app/sitemap.ts`):**
  - 동적 생성 (MetadataRoute.Sitemap 구현)
  - 로케일별 URL 생성 (ko/en)
  - 우선순위 설정:
    - 홈: 1.0
    - 우리 현실/증명/투명도: 0.9
    - 전시, 아카이브, 뉴스, 스토리: 0.85-0.9
    - 작품: 가용 여부에 따라 0.8 (판매 중) / 0.55 (판매 완료)
    - 작가 페이지: 0.65
    - 카테고리 랜딩: 0.75
    - 스토리 카테고리: 0.8 (ko) / 0.72 (en)
    - 법적 페이지: 0.3-0.4 (ko only)
  - lastModified 날짜 기반 업데이트
  - 이미지 URL 포함 (Google Images 인덱싱용)
- **Robots.txt (`app/robots.ts`):**
  - 기본 규칙: User-agent: _ Allow: / Disallow: /api/, /admin/, /dashboard/, /exhibitor/, /login, /signup, /onboarding, /terms-consent, /checkout/, /stories?_, /artworks?_, /news?_, /*?*utm\__, /_?_fbclid=_
  - AI 크롤러 명시적 허용: GPTBot, ChatGPT-User, ClaudeBot, Claude-Web, anthropic-ai, Google-Extended, Googlebot-Extended, PerplexityBot, CCBot, meta-externalagent, Applebot-Extended, cohere-ai, Diffbot, Yeti
  - 스팸봇 차단: AdsBot-Google, MJ12bot, DotBot
  - 사이트맵 선언: `sitemap: ${SITE_URL.replace(/\/$/, '')}/sitemap.xml`

### 2.10 성능이 SEO에 미치는 영향

- **상태:** ✅ 양호
- Next.js 이미지 최적화: 자동 크기 조정, 포맷 최적화 (WebP), lazy loading
- 핵심 웹 vitals 목표:
  - LCP < 2.5초
  - CLS < 0.1
  - FID < 100ms
- 번들 최적화: 번들 분석기 사용 가능, 불필요한 의존성 제거
- 서버 사이드 렌더링 (SSR) 및 정적 사이트 생성 (SSG) 적절히 사용
- 폰트 최적화: localFont 사용으로 사전 로드 및 Flick 방지

## 3. 식별된 문제점

### 3.1 critical (긴급) 문제

1. **README.md 내 명명 불일치**
   - 위치: `README.md` 파일에 "씨앗:페" 표기 존재
   - 영향: 대외 문서에서의 브랜드 이름 혼동 가능
   - 해결 방안: "씨앗:페" → "씨앗페"로 통일

2. **OG 이미지 크기 미달**
   - 위치: `public/images/og-image.png` 및 `public/images/og-image2.png`
   - 현재 크기: 약 800x450 (OG_IMAGE.width/height는 1200x630으로 선언되어 있으나 파일 크기 미달)
   - 영향: 소셜 미디어 공유 시 이미지가 흐릿하게 표시되어 클릭률 저하
   - 해결 방안: 1200x630px 규격의 PNG/JPEG 파일로 교체

3. **PWA 아이콘 미완비**
   - 위치: `public/images/icons/` 디렉토리 및 `public/manifest.json`
   - 현재 상태: ICO 형식 사용 (PWA 부적합), maskable 아이콘 없음
   - 영향: PWA 설치 시 아이콘 품질 저하, Lighthouse PWA 점수에 부정적 영향
   - 해결 방안: PNG 형식의 192x192, 512x512 아이콘 및 512x512 maskable 아이콘 생성 및 manifest.json 업데이트

### 3.2 high (높음) 문제

1. **법적 페이지의 얇은 콘텐츠 문제 보완 필요**
   - 현재 상태: 한국어 전용 콘텐츠로 설정하여 hreflang 충돌 방지 (koOnly hreflang 적용)
   - 추가 권장사항:
     - "한국어 원문 참조" 안내 페이지 영문 버전 생성 고려
     - 또는 영문 페이지에 노인덱스 메타 태그 추가 (현재는 hreflang만으로 처리)

2. **개별 뉴스 기사에 대한 구조화된 데이터 강화**
   - 현재 상태: `app/[locale]/news/[id]/page.tsx`에서 NewsArticle 스키마 구현
   - 권장사항:
     - 저자 정보 강화 (작가 페이지 연결)
     - 출판사 로고 URL 명시
     - 수정 날짜 속성 추가

### 3.3 medium (중간) 문제

1. **고급 메타데이터 최적화**
   - 권장사항:
     - Open Graph 이미지 페이지별 최적화 (현재는 공통 OG_IMAGE 사용)
     - Twitter Card 최적화 (현재는 공통 이미지 사용)
     - 페이지별 og:description 및 twitter:description 차별화

2. **AMP 지원 검토**
   - 현재 상태: 미적용
   - 검토 사항: 뉴스 기사에 AMP 적용 가능성 (개발 비용 대비 효과 분석 필요)

### 3.4 nice-to-have (권장사항) 문제

1. **파비콘 완성**
   - 현재 상태: `public/favicon.ico` 존재
   - 권장사항: 다양한 크기의 favicon 제공 (16x16, 32x32, 48x48, 64x64) 및 iOS Apple Touch Icon 추가

2. **브랜드 키워드 강화**
   - 현재 상태: 메타 키워드에 '씨앗페' 포함
   - 권장사항:
     - 구조화된 데이터에 브랜드 정보 강화
     - 소셜 프로필 링크 증가 (sameAs 속성 활용)

## 4. 개선 기회 및 권장 사항

### 4.1 즉시 적용 가능한 사항 (0-2주)

1. **README.md 내 명명 통일**
   - `sed -i 's/씨앗:페/씨앗페/g' README.md` 실행
   - 대외 문서 및 기타 마크다운 파일도 점검

2. **OG 이미지 교체**
   - 1200x630px 규격의 og-image.png 및 og-image2.png 준비
   - 파일 교체 후 빌드 검증 (`npm run build`)

3. **PWA 아이콘 업데이트**
   - PNG 형식의 아이콘 생성:
     - icon-192.png (192x192)
     - icon-512.png (512x512)
     - icon-maskable-512.png (512x512, 배경색 #FF5A5F)
   - `public/manifest.json` 업데이트
   - `app/layout.tsx`의 apple-touch-icon 링크 업데이트
   - 빌드 검증

### 4.2 단기 적용 사항 (2-4주)

1. **법적 페이지 영문 버전 개선**
   - 영문 법적 페이지에 "한국어 원문 참조" 배너 또는 링크 추가
   - 또는 영문 페이지에 메타 태그 `<meta name="robots" content="noindex, follow">` 추가 (현재 hreflang으로 충분할 수 있음)

2. **개별 뉴스 기사 구조화된 데이터 강화**
   - `app/[locale]/news/[id]/page.tsx`에서 저자 정보 강화
   - 출판사 로고 URL 명시
   - 수정 날짜 속성 추가 (있는 경우)

3. **고급 메타데이터 최적화**
   - 페이지별 OG 이미지 고려 (주요 페이지에 대해)
   - Twitter Card 최적화 (요약형 대신 큰 이미지 활용 검토)

### 4.3 장기 적용 사항 (1-3개월)

1. **AMP 지원 검토**
   - 뉴스 기사에 AMP 적용 프로토타입 제작
   - 개발 비용 및 예상 효과 분석 후 진행 여부 결정

2. **브랜드 키워드 및 구조화된 데이터 고도화**
   - 지식 그래프 강화 추가 스키마 탐구
   - 소셜 신호 증가 전략 수립

## 5. 검증 및 모니터링 계획

### 5.1 구현 전 검증

1. **빌드 검증:** `npm run build` 및 `npm run type-check` 통과 확인
2. **로컬 서버 기동:** `npm run dev` 후 주요 페이지 접근 확인
3. **메타데이터 검증:**
   - `curl -s http://localhost:3000 | grep -i "title\|meta description\|og:title"`
   - OG 이미지 크기 확인: `curl -s -I http://localhost:3000/images/og-image.png` (Content-Type 및 크기 확인 불가, 직접 파일 점검 필요)

### 5.2 구현 후 검증

1. **Google Search Console:**
   - 사이트맵 제출 및 인덱싱 상태 모니터링
   - URL 검사 도구로 주요 페이지 검증
   - 개선 사항 적용 후 2-4주 내 순위 변동 관찰
2. **Google Rich Results Test:**
   - 주요 페이지에 대해 구조화된 데이터 유효성 검사
   - https://search.google.com/test/rich-results
3. **Lighthouse:**
   - 성능, 접근성, 베스트 프랙티스, SEO 점수 측정
   - `npx lighthouse http://localhost:3000 --view`
4. **소셜 미디어 공유 테스트:**
   - Facebook Sharing Debugger, Twitter Card Validator 사용
   - OG 이미지 및 제목/설명 정상 표시 확인

### 5.3 지속적 모니터링

1. **주간:** Google Search Console 크롤 오류 및 색인 상태 확인
2. **월간:**
   - 주요 키워드 순위 추적 (GSC 및 서드파티 툴)
   - 핵심 웹 vitals 점수 모니터링 (PageSpeed Insights)
   - AI 크롤러 트래픽 분석 (GA4에서 User-Agent 필터링)
3. **분기:** 종합 SEO 감사 및 경쟁사 분석
4. **연간:** 완전한 기술 SEO 감사 및 키워드 리서치 새로고침

## 6. 결론

SAF 2026 웹사이트는 이미 강력한 SEO 기반을 갖추고 있으며, 많은 고급 SEO 기법이 구현되어 있습니다. 식별된 문제점은 대부분 사소한 자산 최적화 및 문서 일치화 수준이며, 이를 해결할 경우 검색 엔진에서의 노출 품질과 클릭률이 향상될 것으로 예상됩니다.

특히 다음과 같은 사항이 이미 잘 구현되어 있어 향후 트래픽 성장에 좋은 기반을 제공합니다:

- 포괄적인 구조화된 데이터 구현 (Schema.org)
- 효과적인 다국어 전략 및 hreflang 구현
- 동적 사이트맵 및 적절한 robots.txt 설정
- 이미지 및 성능 최적화
- Canonical URL 및 메타데이터 관리

권장 사항을 순차적으로 적용하고 정기적으로 모니터링한다면, 6-8주 내에 유기 트래픽 20-30% 증가 및 검색 결과 페이지(SERP)에서의 풍부한 스니펫 표시 증가를 기대할 수 있습니다.

---

_보고서 작성일: 2026-04-16_
_보고서 기반: SAF 2026 코드베이스 분석 및 기존 SEO 문서 검토_
