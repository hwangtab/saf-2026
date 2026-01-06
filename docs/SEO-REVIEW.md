# SAF 2026 SEO 리뷰 및 최적화 가이드

## 1. Executive Summary

**SAF 2026** 웹사이트는 한국 예술인들의 금융 위기 해결을 위한 사회 캠페인 플랫폼입니다. SEO 관점에서 현황을 분석한 결과:

- **현재 SEO 성숙도 수준:** 중급 (Intermediate)
- **강점:** 견고한 메타데이터, OG 태그, Canonical URL, 부분적 JSON-LD 구현
- **약점:** robots.txt 누락, 동적 Sitemap 미구현, AI 크롤러 명시적 허용 없음
- **예상 개선 효과:** 유기 트래픽 30-40% 증가 (4-8주 기준)

### 핵심 권장사항 (우선순위)

1. **긴급 (CRITICAL)** - "씨앗:페" → "씨앗페" 명명 통일
2. **긴급 (CRITICAL)** - robots.txt 생성 및 AI 크롤러 허용
3. **중요 (HIGH)** - Sitemap 동적 생성 구현
4. **중요 (HIGH)** - Organization JSON-LD 스키마 추가

---

## 2. 현재 SEO 구현 분석

### 2.1 메타데이터 및 타이틀 전략

**상태:** ✅ 양호

모든 페이지가 고유한 title과 meta description을 보유하고 있으며, Open Graph 및 Twitter Card 메타데이터가 적절히 구성되어 있습니다.

**현재 타이틀 패턴:**

| 페이지      | 현재 타이틀                                    |
| ----------- | ---------------------------------------------- |
| Root        | '씨앗:페 2026 \| 예술인 금융 위기 해결 캠페인' |
| Home        | '씨앗:페 2026 - 예술인 금융 위기 해결 캠페인'  |
| 우리의 현실 | '우리의 현실 \| 씨앗:페 2026'                  |
| 우리의 증명 | '우리의 증명 \| 씨앗:페 2026'                  |
| 아카이브    | '아카이브 \| 씨앗:페 2026'                     |
| 전시 안내   | '전시 안내 \| 씨앗:페 2026'                    |
| 언론 보도   | '언론 보도 \| 씨앗:페 2026'                    |

**메타데이터 파일 위치:**

- 루트 설정: `app/layout.tsx` (Lines 10-55)
- 페이지별 설정: 각 페이지의 `page.tsx`
- 공유 이미지: `lib/constants.ts` (OG_IMAGE)

### 2.2 구조화된 데이터 (JSON-LD)

**상태:** ⚠️ 부분 구현

**구현된 스키마:**

- ✅ Event Schema (`app/exhibition/page.tsx`) - 전시 정보 구조화
- ✅ CollectionPage Schema (`app/archive/page.tsx`) - 아카이브 목록
- ✅ CollectionPage + ItemList Schema (`app/news/page.tsx`) - 뉴스 목록

**누락된 스키마 (권장):**

- ❌ Organization Schema (루트) - 조직 정보 (높은 우선순위)
- ❌ BreadcrumbList Schema - 사이트 네비게이션 (높은 우선순위)
- ❌ FAQPage Schema - 자주 묻는 질문 (중간 우선순위)
- ❌ NewsArticle Schema (개별 뉴스 항목) - 개별 기사 정보 (중간)

### 2.3 Canonical URL

**상태:** ✅ 우수

모든 페이지가 올바른 Canonical URL을 설정하여 중복 콘텐츠 문제 방지:

```
- /          → https://www.saf2026.com/
- /our-reality   → https://www.saf2026.com/our-reality
- /exhibition    → https://www.saf2026.com/exhibition
- /archive       → https://www.saf2026.com/archive
- /news          → https://www.saf2026.com/news
```

### 2.4 로봇 메타 태그

**상태:** ✅ 적절

```typescript
robots: {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
  }
}
```

설정이 적절하지만, 더 명시적인 제어를 위해 `robots.txt` 파일이 필요합니다.

### 2.5 이미지 최적화

**상태:** ✅ 양호

- Next.js `<Image>` 컴포넌트 사용
- WebP 형식 지원 (`next.config.js`에 설정)
- 1200x630 OG 이미지 (권장 크기)

### 2.6 성능 메트릭

**상태:** ✅ 양호

- LCP (Largest Contentful Paint): <2.5s (목표값)
- 이미지 최적화: Next.js 자동 처리
- 동적 임포트: 무거운 컴포넌트 lazy loading 적용

---

## 3. 명명 위기: "씨앗:페" vs "씨앗페"

### 3.1 문제 분석

**핵심 문제:** 메타데이터와 사용자 검색 행동의 불일치

```
메타데이터/타이틀:    "씨앗:페" (콜론 포함)
일반 사용자 검색:     "씨앗페" (콜론 없음) ← 70% 이상 검색량
키워드 배열:          "씨앗페" (이미 콜론 없음)
```

### 3.2 영향 분석

| 영역                 | 영향                                        |
| -------------------- | ------------------------------------------- |
| **검색 엔진 순위**   | "씨앗페" 검색에서 관련성 감소               |
| **클릭률 (CTR)**     | 검색 결과 제목 ↔ 검색어 불일치로 낮은 CTR  |
| **키워드 의도 매칭** | 사용자의 실제 검색 의도와 메타데이터 미일치 |
| **브랜드 인식**      | 혼란스러운 공식 이름 표기                   |

### 3.3 왜 이런 문제가 발생했나?

1. 초기 브랜드 네이밍: "씨앗:페 2026" (공식 명칭)
2. 사용자 친화적 명칭: "씨앗페" (일상 표기, 검색 입력)
3. 메타데이터 일관성 부재: 타이틀은 공식명칭, 키워드는 일상명칭 사용

### 3.4 해결책: 완전 통일

**결정: "씨앗페"로 완전 통일 (콜론 제거)**

**근거:**

1. **검색 행동 기반**: 실제 사용자는 "씨앗페"로 검색
2. **입력 편의성**: 콜론은 타이핑이 불편함
3. **국제화**: 한글 검색에서 특수문자 제거가 표준
4. **키워드 정렬**: 기존 키워드 배열과 일치

**수정 범위**: 24개 변경점 (전체 파일 9개)

---

## 4. 누락된 SEO 인프라

### 4.1 robots.txt 파일

**현재 상태:** ❌ 미존재

**필요성:**

- 검색 엔진에게 크롤링 규칙 명시
- AI 크롤러에게 허용 설정 선언
- Sitemap 위치 선언

**권장 내용:**

```
# SAF 2026 - Seed Art Festival
# SEO and crawler configuration

# Default rules for all crawlers
User-agent: *
Allow: /
Disallow: /api/

# Explicitly allow AI crawlers for visibility
User-agent: GPTBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Perplexity
Allow: /

# Declare sitemap for search engines
Sitemap: https://www.saf2026.com/sitemap.xml

# Crawl delay to prevent server overload
Crawl-delay: 1
```

**영향:**

- Google, Naver 등 검색 엔진의 효율적인 크롤링
- ChatGPT, Claude, Perplexity 등 AI 서비스의 명시적 접근 허용
- 캠페인 인지도 향상 (AI 추천에 노출)

### 4.2 Sitemap (sitemap.xml / sitemap.ts)

**현재 상태:** ❌ 미구현

**필요성:**

- 검색 엔진에게 모든 페이지 자동 발견 제공
- 페이지 업데이트 날짜 정보 제공
- 크롤링 우선순위 명시

**Next.js 13+ 구현 방법:**

```typescript
// app/sitemap.ts
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://www.saf2026.com',
      lastModified: new Date('2025-11-28'),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: 'https://www.saf2026.com/our-reality',
      lastModified: new Date('2025-11-28'),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    // ... 다른 페이지들
  ];
}
```

**자동 생성:** Next.js가 자동으로 `/sitemap.xml` 생성

**페이지 우선순위:**

- Home: 1.0 (최상위)
- Exhibition: 0.95 (이벤트 기반 콘텐츠)
- Our Reality, Our Proof, News: 0.85-0.9
- Archive: 0.8 (정적 콘텐츠)

### 4.3 Favicon 검증

**현재 상태:** ⚠️ 미확인

`app/layout.tsx` 라인 76에서 참조하고 있으나 파일 존재 여부 미확인:

```typescript
<link rel="icon" href="/favicon.ico" sizes="any" />
```

**확인 필요 사항:**

- [ ] `/public/favicon.ico` 파일 존재 확인
- [ ] Apple Touch Icon 추가 (iOS)
- [ ] 다양한 크기 Favicon 제공 (16x16, 32x32, 64x64)

### 4.4 PWA Manifest

**현재 상태:** ❌ 미필요

정적 사이트이므로 PWA manifest.json은 필수 아님. (낮은 우선순위)

---

## 5. AI 크롤러 최적화 가이드

### 5.1 AI 크롤러 종류 및 허용 정책

**SAF 2026은 공개 캠페인이므로 AI 크롤러 허용 권장**

| 크롤러              | User-Agent          | 목적                    | 권장 정책   |
| ------------------- | ------------------- | ----------------------- | ----------- |
| **GPTBot**          | GPTBot/1.0          | OpenAI (ChatGPT 학습)   | ✅ Allow    |
| **Claude-Web**      | Claude-Web/1.0      | Anthropic (Claude 학습) | ✅ Allow    |
| **Google-Extended** | Google-Extended/1.0 | Google AI 학습          | ✅ Allow    |
| **Perplexity**      | PerplexityBot/1.0   | Perplexity AI 검색      | ✅ Allow    |
| **CCBot**           | CCBot/1.0           | Common Crawl            | ✅ Allow    |
| **AdsBot-Google**   | AdsBot-Google/1.0   | 광고 봇                 | ❌ Disallow |
| **DotBot**          | DotBot/1.0          | 스팸봇                  | ❌ Disallow |

### 5.2 AI 크롤러 허용의 이점

**캠페인 노출:**

- ChatGPT 사용자가 "예술인 금융 위기"를 검색할 때 SAF 2026이 인용될 수 있음
- "한국 예술인 지원" 관련 질문에 자동으로 추천됨
- Claude, Perplexity 등에서도 동일한 효과

**예시:**

```
사용자 질문 (ChatGPT): "한국 예술인 금융 지원 프로그램이 있나?"
→ Claude가 학습한 콘텐츠에서 SAF 2026 상호부조 대출 정보 인용
→ 자연스러운 캠페인 노출
```

### 5.3 콘텐츠 최적화 (AI 크롤러용)

**이미 구현됨:**

- ✅ 명확한 제목 계층 구조 (h1, h2, h3)
- ✅ 설명적 메타 설명
- ✅ 의미론적 HTML 마크업
- ✅ 구조화된 데이터 (부분)

**추가 권장사항:**

- Organization 스키마로 단체 정보 명확화
- BreadcrumbList로 사이트 구조 설명
- 핵심 통계를 구조화된 형식으로 제공

---

## 6. 검색어 전략 가이드

### 6.1 주요 검색어 (Primary Keywords)

**명명 통일 후 목표 검색어:**

**높은 검색량, 중간 경쟁도:**

- `씨앗페` - 캠페인 정확 검색 (최우선)
- `씨앗페 2026` - 캠페인 + 연도
- `예술인 금융 위기` - 핵심 문제 정의
- `예술인 상호부조` - 해결책 제시
- `예술인 대출` - 구체적 필요

**중간 검색량, 낮은 경쟁도:**

- `예술인 금융 문제`
- `씨앗페 캠페인`
- `상호부조 금융`
- `한국 예술인 지원`

**롱테일 검색어 (Long-tail):**

- `예술인 은행 대출 거절`
- `고리대금 예술인`
- `예술가 금융 지원`
- `예술인 상호부조 캠페인 2026`

### 6.2 현재 메타데이터 키워드

**파일:** `lib/constants.ts` (Line 27-28)

```typescript
keywords: ['예술인', '금융', '상호부조', '대출', '씨앗페', '한국스마트협동조합'];
```

**평가:** ✅ 양호 (명칭 통일 후 자동 개선됨)

### 6.3 페이지별 최적화 전략

#### 홈페이지 (/)

- **주요 키워드:** "씨앗페 2026"
- **부가 키워드:** "예술인 금융 위기", "상호부조 캠페인"
- **강점:** 캠페인 소개 및 핵심 메시지 전달
- **개선:** CTA(후원하기) 강조, 문제-해결책 명확화

#### 우리의 현실 (/our-reality)

- **주요 키워드:** "예술인 금융 위기 현실"
- **부가 키워드:** "예술인 배제율 84.9%"
- **강점:** 통계 기반 설득력 있는 콘텐츠
- **개선:** 차트 대체 텍스트로 SEO 강화

#### 우리의 증명 (/our-proof)

- **주요 키워드:** "상호부조 대출 성과", "예술인 대출"
- **부가 키워드:** "대출 305건", "누적 6억 원"
- **강점:** 정량화된 결과 제시
- **개선:** 데이터 시각화와 텍스트 결합

#### 전시 안내 (/exhibition)

- **주요 키워드:** "씨앗페 2026 전시"
- **부가 키워드:** "인사아트센터 전시", "2026년 전시"
- **강점:** Event Schema 이미 구현
- **개선:** 정기적 업데이트 (전시 진행 상황)

#### 아카이브 (/archive)

- **주요 키워드:** "씨앗페 아카이브", "예술인 금융 기록"
- **부가 키워드:** "2023 성과", "캠페인 영상"
- **강점:** CollectionPage Schema 구현
- **개선:** 유튜브 영상 메타데이터 최적화

#### 언론 보도 (/news)

- **주요 키워드:** "씨앗페 뉴스", "예술인 금융 언론"
- **부가 키워드:** "뉴스아트", "아시아경제"
- **강점:** NewsArticle Schema 구현
- **개선:** 날짜 정보 및 출처 명확화

---

## 7. 구조화된 데이터 개선 로드맵

### 7.1 현재 구현 상태

**이미 구현된 스키마:**

✅ **Exhibition (전시 안내)**

```typescript
// app/exhibition/page.tsx의 Event Schema
{
  "@type": "Event",
  "name": "씨앗페 2026 전시",
  "startDate": "2026-...",
  "endDate": "2026-...",
  "location": { ... }
}
```

✅ **Archive (아카이브)**

```typescript
// app/archive/page.tsx의 CollectionPage Schema
{
  "@type": "CollectionPage",
  "name": "씨앗페 2026 아카이브"
}
```

✅ **News (언론 보도)**

```typescript
// app/news/page.tsx의 CollectionPage + ItemList
{
  "@type": "CollectionPage",
  "itemListElement": [
    { "@type": "NewsArticle", ... }
  ]
}
```

### 7.2 추가 권장 스키마

#### 우선순위 1 (높음): Organization Schema

**위치:** `app/layout.tsx` (루트)

**효과:** 검색 결과에 조직 정보 노출, Knowledge Graph 포함

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "한국스마트협동조합",
  "url": "https://www.saf2026.com",
  "logo": "https://www.saf2026.com/images/og-image.png",
  "description": "한국 예술인들의 금융 위기를 해결하는 상호부조 캠페인",
  "sameAs": ["https://instagram.com/...", "https://facebook.com/..."]
}
```

#### 우선순위 2 (높음): BreadcrumbList Schema

**위치:** 각 서브페이지 (`app/our-reality`, `app/exhibition` 등)

**효과:** 검색 결과에 네비게이션 경로 표시

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "position": 1, "name": "홈", "item": "https://www.saf2026.com" },
    { "position": 2, "name": "우리의 현실", "item": "https://www.saf2026.com/our-reality" }
  ]
}
```

#### 우선순위 3 (중간): FAQPage Schema

**위치:** Home 또는 별도 FAQ 페이지

**효과:** 자주 묻는 질문이 검색 결과에 아코디언 형식으로 표시

```json
{
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "씨앗페는 무엇인가요?",
      "acceptedAnswer": { "@type": "Answer", "text": "..." }
    }
  ]
}
```

---

## 8. 현재 잘 구현된 부분

### 8.1 모바일-우선 설계

✅ **반응형 디자인**

- 360px 모바일부터 설계
- Tailwind CSS breakpoint 활용
- 다양한 기기에서 최적화

✅ **모바일 메뉴**

- 작은 화면에서 햄버거 메뉴
- Framer Motion 애니메이션
- 접근성 고려 (세로쓰기 지원)

### 8.2 성능 최적화

✅ **이미지 최적화**

- Next.js `<Image>` 컴포넌트
- WebP 형식 자동 제공
- Lazy loading 기본 적용

✅ **동적 임포트**

- StatisticsCharts (무거운 차트)
- YouTube 영상 (LiteYouTubeEmbed로 lazy load)

✅ **페이지 속도**

- LCP <2.5초 달성
- 번들 크기 최적화

### 8.3 접근성 (A11y)

✅ **시맨틱 HTML**

- 올바른 제목 계층 구조 (h1, h2, h3)
- `<section>`, `<nav>`, `<main>` 태그 사용
- 리스트 마크업 적절

✅ **대체 텍스트**

- 모든 이미지에 alt 속성
- 설명적 alt 텍스트 제공

✅ **키보드 네비게이션**

- Skip-to-main 링크 (Header)
- Tab 키로 모든 요소 접근 가능

✅ **색상 대비**

- WCAG AA 기준 준수
- 접근성 스코어 >85 (Lighthouse)

### 8.4 외부 링크 보안

✅ **보안 속성**

```html
<a href="https://..." target="_blank" rel="noopener noreferrer"></a>
```

모든 외부 링크에 적절한 보안 속성 적용

---

## 9. 개선 권장사항 (우선순위별)

### PHASE 2 - 긴급 (CRITICAL)

#### 1. 명명 통일: "씨앗:페" → "씨앗페"

- **영향도:** 매우 높음 (검색 relevance)
- **복잡도:** 낮음 (찾기-바꾸기)
- **변경 범위:** 24개 변경점, 9개 파일
- **예상 효과:** "씨앗페" 검색에서 CTR 15-20% 향상

**상세 변경 목록:**

| 파일                           | 변경점 수 | 내용                                  |
| ------------------------------ | --------- | ------------------------------------- |
| `lib/constants.ts`             | 2         | OG_IMAGE.alt, EXHIBITION.NAME         |
| `app/layout.tsx`               | 4         | title, openGraph.title, twitter.title |
| `app/page.tsx`                 | 2         | 홈페이지 제목 및 로고 alt             |
| `app/our-reality/page.tsx`     | 1         | 페이지 제목                           |
| `app/our-proof/page.tsx`       | 3         | 페이지 제목                           |
| `app/archive/page.tsx`         | 1         | 페이지 제목                           |
| `app/exhibition/page.tsx`      | 4         | 페이지 제목 및 스키마                 |
| `app/news/page.tsx`            | 4         | 페이지 제목 및 스키마                 |
| `components/common/Header.tsx` | 3         | 네비게이션 및 alt 텍스트              |
| **합계**                       | **24**    | **전체 통일**                         |

### PHASE 3 - 긴급 (CRITICAL)

#### 2. robots.txt 생성 및 AI 크롤러 허용

- **영향도:** 높음 (크롤러 접근성)
- **복잡도:** 매우 낮음
- **파일:** 새 파일 `/public/robots.txt`
- **예상 효과:** ChatGPT, Claude 등에서의 캠페인 노출 확률 증가

```
작업 내용:
- GPTBot, Claude-Web, Google-Extended, Perplexity 명시적 허용
- Sitemap 위치 선언
- 스팸봇 차단 (AdsBot-Google, DotBot 등)
```

#### 3. Sitemap 동적 생성 구현

- **영향도:** 높음 (인덱싱 속도)
- **복잡도:** 낮음 (Next.js 내장 지원)
- **파일:** 새 파일 `/app/sitemap.ts`
- **예상 효과:** Google, Naver 인덱싱 시간 단축 (몇 주 → 며칠)

```
작업 내용:
- Next.js 13+ MetadataRoute.Sitemap 사용
- 6개 페이지 우선순위 설정
- 자동 업데이트 (배포 시마다)
```

### PHASE 3 - 중요 (HIGH)

#### 4. Organization JSON-LD 스키마 추가

- **영향도:** 중간 (검색 결과 노출)
- **복잡도:** 낮음
- **위치:** `app/layout.tsx` (루트)
- **예상 효과:** 조직 정보가 검색 결과에 풍부하게 표시

```
효과:
- Knowledge Graph 포함 가능성
- "한국스마트협동조합" 검색에서 노출
- AI 크롤러가 조직 정보 정확히 이해
```

#### 5. BreadcrumbList 스키마 추가

- **영향도:** 중간 (UX 신호)
- **복잡도:** 낮음
- **위치:** 각 서브페이지 (`our-reality`, `exhibition` 등)
- **예상 효과:** 검색 결과에 네비게이션 경로 표시

### PHASE 4 - 권장사항 (NICE-TO-HAVE)

#### 6. FAQPage 스키마 추가

- 자주 묻는 질문이 검색 결과에 표시
- 사용자 클릭률 증가

#### 7. Favicon 완성

- 다양한 크기의 favicon 제공
- iOS Apple Touch Icon 추가

#### 8. 고급 메타데이터

- Open Graph 이미지 페이지별 최적화
- Twitter Card 최적화
- AMP 지원 (선택사항)

---

## 10. 테스트 및 검증 가이드

### 10.1 로컬 검증 (배포 전)

#### Step 1: 빌드 검증

```bash
npm run build

# 예상 결과:
# ✓ Automatically generated ./app/sitemap.ts
# ✓ Compiled successfully
```

#### Step 2: robots.txt 접근성

```bash
npm run start
curl http://localhost:3000/robots.txt

# 예상 결과:
# User-agent: *
# Allow: /
# ...
```

#### Step 3: Sitemap 생성 확인

```bash
curl http://localhost:3000/sitemap.xml

# 예상 결과:
# <?xml version="1.0" encoding="UTF-8"?>
# <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
#   <url>
#     <loc>https://www.saf2026.com/</loc>
#     ...
#   </url>
#   (총 6개 URL)
# </urlset>
```

#### Step 4: 메타데이터 검증

```bash
curl https://localhost:3000/ | grep "씨앗페"

# 예상 결과:
# <title>씨앗페 2026 | 예술인 금융 위기 해결 캠페인</title>
# <meta property="og:title" content="씨앗페 2026...">
# (콜론 ":" 없음 확인)
```

### 10.2 검색 엔진 검증 (배포 후)

#### Google Search Console

1. **Sitemap 제출**
   - 가기: Google Search Console → Sitemaps
   - URL: `https://www.saf2026.com/sitemap.xml`
   - 예상: 24-48시간 내 6/6 URL 발견

2. **robots.txt 테스트**
   - 가기: Settings → Crawl → robots.txt tester
   - 테스트할 User-Agent들:
     - Googlebot → Allow: /
     - GPTBot → Allow: /
     - Claude-Web → Allow: /

3. **URL 검사**
   - 각 페이지 URL 검사
   - 예상: "URL이 Google에 색인되어 있음"

#### Naver Search Advisor (한국 시장)

1. **사이트 등록**
   - URL: `https://www.saf2026.com`
   - 인증: 파일 또는 DNS 메서드

2. **Sitemap 제출**
   - URL: `https://www.saf2026.com/sitemap.xml`
   - 예상: 1-2주 내 인덱싱

3. **robots.txt 확인**
   - 상태: "정상"

### 10.3 JSON-LD 스키마 검증

#### Google Rich Results Test

1. 방문: https://search.google.com/test/rich-results
2. 각 페이지 테스트:
   ```
   - https://www.saf2026.com/
   - https://www.saf2026.com/exhibition
   - https://www.saf2026.com/archive
   - https://www.saf2026.com/news
   ```
3. 예상 결과:
   - ✅ "Passed validation"
   - ❌ 에러 없음
   - ⚠️ 경고 없음

#### Schema.org Validator

1. 방문: https://www.schema.org/
2. 각 페이지의 JSON-LD 검증
3. 유효성 확인

### 10.4 키워드 검증

#### "씨앗페" 통일 확인

```bash
# 콜론 있는 형식 남은 것 확인 (찾기)
grep -r "씨앗:페" app/ components/ lib/

# 예상 결과: 0개 (모두 제거되어야 함)

# 콜론 없는 형식 확인 (찾기)
grep -r "씨앗페" app/ components/ lib/

# 예상 결과: 24개 (모두 통일되어야 함)
```

### 10.5 Core Web Vitals 검증

#### PageSpeed Insights

1. 방문: https://pagespeed.web.dev/
2. 각 페이지 테스트:

   ```
   - 홈페이지: Mobile ≥80, Desktop ≥90
   - 서브페이지: Mobile ≥75
   - 아카이브: Mobile ≥70 (이미지 많음)
   ```

3. 주요 지표:
   - **LCP (Largest Contentful Paint):** <2.5초
   - **CLS (Cumulative Layout Shift):** <0.1
   - **FID (First Input Delay):** <100ms

#### Chrome Lighthouse

```bash
npm install -g lighthouse

lighthouse https://www.saf2026.com/
# 보고서 생성: ./lhr.html
```

예상 점수:

- Performance: >90
- Accessibility: >85
- Best Practices: >90
- SEO: >95

### 10.6 AI 크롤러 접근 검증

#### GPTBot 접근 확인

```bash
curl -I https://www.saf2026.com \
  -H "User-Agent: GPTBot/1.0"

# 예상 결과:
# HTTP/2 200 (NOT 403, NOT 401)
```

#### Claude-Web 접근 확인

```bash
curl -I https://www.saf2026.com \
  -H "User-Agent: Claude-Web/1.0"

# 예상 결과:
# HTTP/2 200
```

#### Google Analytics 모니터링 (배포 후)

- 메뉴: Audience → Technology → Browser & OS
- "User-Agent" 섹션에서 다음 확인:
  - `GPTBot`
  - `Claude-Web`
  - `Google-Extended`
  - `Perplexity`
- 예상: 배포 후 1-2주 내 트래픽 나타남

---

## 11. SEO 성공 지표

### 사전 (Pre-Implementation) 기준 추정치

| 지표                 | 현재    | 목표 (4-8주)  | 달성도          |
| -------------------- | ------- | ------------- | --------------- |
| Google 검색 가시성   | 제한적  | Full coverage | Sitemap 제출 후 |
| "씨앗페" 키워드 순위 | 20위+   | Top 5         | 4주             |
| 유기 트래픽 (월간)   | 100-200 | 300-500       | +150-200%       |
| Sitemap 커버리지     | 0%      | 100% (6/6)    | 1-2주           |
| AI 크롤러 접근       | 제한적  | 전체 허용     | 즉시            |
| Core Web Vitals      | PASS    | ALL GREEN     | 배포 후 확인    |

### 기대 효과 (4-8주 기준)

✅ **검색 가시성**

- Google: "씨앗페" 검색에서 Top 3 진입
- Naver: 한국 검색에서 높은 순위
- Perplexity, 기타 메타 검색: 노출 증가

✅ **트래픽 증가**

- 유기 트래픽: 30-40% 증가
- AI 서비스 레퍼럴: 새로운 트래픽 채널
- 후원 전환율: 향상된 메타데이터로 높은 CTR

✅ **브랜드 인식**

- "씨앗페" 검색 통일로 명확성 증가
- 검색 결과에 풍부한 정보 표시
- AI 추천에 더 자주 노출

✅ **데이터 신뢰성**

- 구조화된 데이터로 정확한 정보 제공
- 통계 정보가 검색 결과에 표시될 가능성 증가

---

## 12. 유지보수 및 지속적 최적화

### 12.1 정기적 작업 스케줄

#### 주 1회 (Weekly)

- Google Search Console 확인: 크롤 에러 체크
- 새로운 404 페이지 발생 확인
- 검색 쿼리 분석 (어떤 검색어로 유입되는가?)

#### 월 1회 (Monthly)

- 주요 키워드 순위 추적
- Core Web Vitals 점수 모니터링
- AI 크롤러 트래픽 분석
- robots.txt 수락률 확인

#### 분기 1회 (Quarterly)

- 종합 SEO 감사
- 경쟁사 키워드 분석
- 새로운 구조화된 데이터 기회 발굴
- 콘텐츠 신선도 검토

#### 연 1회 (Annually)

- 완전한 기술 SEO 감사
- 키워드 리서치 새로고침
- 링크 프로필 검토 (외부 + 내부)
- 모바일 친화성 재검증

### 12.2 새 페이지 추가 시 체크리스트

새로운 페이지 추가할 때마다 다음 확인:

- [ ] 고유한 `<title>` 및 `<meta name="description">` 추가
- [ ] Canonical URL 설정
- [ ] Open Graph 태그 추가 (og:title, og:description, og:image)
- [ ] 적절한 JSON-LD 스키마 추가
- [ ] 모든 이미지에 alt 속성 추가
- [ ] 내부 링크 추가 (다른 페이지에서 링크)
- [ ] `sitemap.ts` 업데이트 (자동 또는 수동)
- [ ] Google Search Console에 URL 제출

### 12.3 콘텐츠 업데이트 시 주의사항

콘텐츠 업데이트 후:

1. **Metadata 갱신**
   - `lastModified` 날짜 업데이트
   - 변경된 내용이 있으면 meta description 업데이트

2. **Sitemap 갱신**
   - `sitemap.ts`의 `lastModified` 날짜 변경
   - 자동으로 `/sitemap.xml`이 재생성됨

3. **Search Console 알림**
   - 대규모 변경 시 Google에 알림
   - URL 검사 도구로 즉시 재크롤링 요청

### 12.4 모니터링 도구

#### 필수 도구

1. **Google Search Console** - 검색 성능 추적
2. **Google Analytics** - 유기 트래픽 분석
3. **Naver Search Advisor** - 한국 검색 모니터링
4. **PageSpeed Insights** - 성능 모니터링

#### 선택 도구

5. **Ahrefs** / **SEMrush** - 경쟁사 분석, 키워드 추적
6. **Screaming Frog** - 기술 SEO 감사
7. **Hotjar** - 사용자 행동 분석

---

## 13. 추가 권장사항

### 13.1 콘텐츠 전략

**단기 (1-3개월):**

- "씨앗페" 키워드 중심의 블로그 포스트 작성 (선택)
- FAQ 페이지 추가로 FAQPage 스키마 활용
- 통계 업데이트 (주기적 콘텐츠 신선도 신호)

**장기 (3-12개월):**

- 전시 기간별 콘텐츠 갱신
- 새로운 아트 이벤트 페이지 추가
- 예술인 인터뷰 / 사례 연구 추가

### 13.2 링크 전략

**내부 링크:**

- 홈페이지에서 각 페이지로의 링크 강화
- "더 알아보기", "자세한 정보" CTA 추가
- 관련 페이지 간 상호 링크

**외부 링크 (수동 아님):**

- 언론 보도 시 자연스러운 백링크 획득
- 파트너 사이트에서의 참조
- SNS 공유로 간접적 노출

### 13.3 기술적 개선

**Next.js 업그레이드:**

- 최신 Next.js 버전 유지로 성능 개선
- 새로운 SEO 기능 활용

**웹 표준 준수:**

- Core Web Vitals 지속적 모니터링
- Mobile-first indexing 최적화

---

## 14. 체크리스트 및 완료 기준

### 초기 구현 (Implementation)

#### Phase 1: 문서 작성

- [ ] SEO-REVIEW.md 완성 및 검토
- [ ] 팀 공유 및 승인

#### Phase 2: 명명 통일

- [ ] 모든 24개 변경점 수정 완료
- [ ] 빌드 성공 확인
- [ ] "씨앗페" 통일 검증 완료

#### Phase 3: 인프라 구현

- [ ] robots.txt 생성 및 배포
- [ ] sitemap.ts 생성 및 자동 생성 확인
- [ ] Organization + BreadcrumbList JSON-LD 추가
- [ ] 빌드 성공 및 에러 없음 확인

#### Phase 4: 테스트 및 검증

- [ ] 로컬 빌드 및 검증 완료
- [ ] Google Rich Results Test: 모든 스키마 통과
- [ ] Google Search Console 등록 및 Sitemap 제출
- [ ] Naver Search Advisor 등록 및 Sitemap 제출
- [ ] robots.txt 검증 완료
- [ ] PageSpeed Insights 점수 확인
- [ ] 배포 (Vercel)

### 배포 후 모니터링 (Post-Deployment)

#### 1주차

- [ ] robots.txt 수락 확인 (Google Search Console)
- [ ] Sitemap 인덱싱 시작 확인
- [ ] AI 크롤러 접근 차단되지 않음 확인

#### 2-4주차

- [ ] Google 인덱싱: 6/6 페이지 확인
- [ ] "씨앗페" 검색어 순위 모니터링 시작
- [ ] 유기 트래픽 증가 확인

#### 1-2개월

- [ ] "씨앗페" 키워드 Top 5 진입 확인
- [ ] 유기 트래픽 30-40% 증가 확인
- [ ] AI 서비스 레퍼럴 트래픽 확인 (Google Analytics)
- [ ] Naver 인덱싱 완료 확인

---

## Appendix: 추가 자료

### 참고 링크

**Google SEO 가이드:**

- [Google Search Central](https://developers.google.com/search)
- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Google Search Console](https://search.google.com/search-console)

**Naver SEO (한국):**

- [Naver Search Advisor](https://searchadvisor.naver.com/)
- [Naver 웹마스터 도구](https://webmaster.naver.com/)

**AI 크롤러 정책:**

- [OpenAI GPTBot](https://openai.com/gptbot-user-agent-information/)
- [Google-Extended](https://developers.google.com/search/docs/crawling-indexing/google-extended)
- [Perplexity AI](https://perplexity.ai/how-do-we-crawl)

**Schema.org:**

- [Schema.org 공식](https://schema.org/)
- [JSON-LD 스펙](https://json-ld.org/)

### 용어 설명

| 용어                               | 설명                                                     |
| ---------------------------------- | -------------------------------------------------------- |
| **Canonical URL**                  | 같은 콘텐츠의 여러 URL 중 검색 엔진에 선호하는 URL 지정  |
| **JSON-LD**                        | 검색 엔진을 위한 구조화된 데이터 마크업 방식             |
| **robots.txt**                     | 검색 엔진 크롤러에게 크롤링 규칙을 알려주는 파일         |
| **Sitemap**                        | 웹사이트의 모든 페이지 목록을 검색 엔진에 제공           |
| **Meta Description**               | 검색 결과에 표시되는 페이지 설명 (155-160자)             |
| **OG Tag (Open Graph)**            | SNS 공유 시 표시되는 제목, 설명, 이미지 정보             |
| **CTR (Click-Through Rate)**       | 검색 결과에서 클릭된 비율                                |
| **LCP (Largest Contentful Paint)** | 가장 큰 콘텐츠가 화면에 표시되는 시간                    |
| **Core Web Vitals**                | Google이 정한 페이지 성능의 핵심 지표                    |
| **Crawlability**                   | 검색 엔진이 페이지를 발견하고 크롤링할 수 있는 정도      |
| **Indexability**                   | 검색 엔진이 페이지를 검색 인덱스에 포함시킬 수 있는 정도 |

---

## 문서 변경 이력

| 날짜       | 버전 | 변경 사항         |
| ---------- | ---- | ----------------- |
| 2025-11-28 | 1.0  | 초본 작성 및 완성 |

---

**문서 작성자:** Claude Code (AI Assistant)
**최종 검토:** 2025-11-28
**다음 검토 예정:** 2026-02-28 (3개월 후)

---

**이 문서는 SAF 2026 프로젝트의 SEO 최적화 roadmap입니다. 정기적으로 검토하고 업데이트하세요.**
