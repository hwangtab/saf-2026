# SEO 및 메타데이터 코드 리뷰

**분석 일자**: 2025년 12월 26일

---

## 📊 요약

| 항목 | 현재 상태 | 상세 점수 |
|------|----------|----------|
| **기본 메타데이터** | ✅ 우수 | 8/10 |
| **페이지별 메타데이터** | ⚠️ 개선 필요 | 6/10 |
| **구조화 데이터 (JSON-LD)** | ⚠️ 부분 구현 | 5/10 |
| **AI 검색 최적화** | ✅ 우수 | 9/10 |
| **사이트맵** | ⚠️ 불완전 | 6/10 |

---

## 1. 현재 구현 분석

### 1.1 ✅ 잘 구현된 부분

#### 루트 레이아웃 (`app/layout.tsx`)
```
✓ metadataBase 설정
✓ title.template 패턴 사용
✓ canonical URL
✓ 다국어 alternates
✓ Open Graph 완전 설정
✓ Twitter Card 설정
✓ robots 설정
✓ Organization JSON-LD 스키마
✓ viewport export 분리 (Next.js 14+ 권장)
```

#### AI 크롤러 허용 (`public/robots.txt`)
```
✓ GPTBot
✓ Claude-Web
✓ Google-Extended
✓ Perplexity
✓ CCBot
✓ anthropic-ai
```

> 이는 AI 검색/추천 시스템에 대한 노출을 극대화하는 **매우 좋은 전략**입니다.

---

### 1.2 ⚠️ 개선이 필요한 부분

#### 1) 페이지별 메타데이터 일관성 부족

| 페이지 | URL | OG 설정 | Twitter | canonical | JSON-LD |
|--------|-----|---------|---------|-----------|---------|
| 홈 | `/` | ✅ | ✅ | ✅ | ✅ (Organization) |
| 우리의 현실 | `/our-reality` | ✅ | ✅ | ✅ | ❌ |
| 우리의 증명 | `/our-proof` | ⚠️ 확인 필요 | ⚠️ | ⚠️ | ❌ |
| 전시 안내 | `/exhibition` | ✅ | ✅ | ✅ | ✅ (Event) |
| **출품작** | `/artworks` | ❌ | ❌ | ❌ | ❌ |
| 출품작 상세 | `/artworks/[id]` | ✅ 기본 | ❌ | ❌ | ❌ |
| 아카이브 | `/archive` | ⚠️ 확인 필요 | ⚠️ | ⚠️ | ❌ |
| 언론 보도 | `/news` | ⚠️ 확인 필요 | ⚠️ | ⚠️ | ❌ |

**문제점**: `/artworks` 페이지의 메타데이터가 **매우 불완전**합니다.

#### 2) 사이트맵 누락 페이지

**현재 sitemap.ts**:
- ✅ `/`
- ✅ `/our-reality`
- ✅ `/our-proof`
- ✅ `/exhibition`
- ✅ `/archive`
- ✅ `/news`
- ❌ **`/artworks` 누락**
- ❌ **`/artworks/[id]` 동적 페이지 누락 (100+ 작품)**

#### 3) JSON-LD 구조화 데이터 부족

| 스키마 유형 | 현재 | 권장 적용 페이지 |
|------------|------|-----------------|
| Organization | ✅ layout.tsx | - |
| Event | ✅ exhibition | - |
| Article/NewsArticle | ❌ | `/news`, `/our-reality` |
| Product/Offer | ❌ | `/artworks/[id]` |
| WebSite | ❌ | `layout.tsx` |
| BreadcrumbList | ❌ | 모든 하위 페이지 |
| FAQPage | ❌ | `/our-reality` (Q&A 형식에 적합) |

---

## 2. 페이지별 메타데이터 필요성 분석

### **결론: 각 페이지는 고유한 메타데이터를 가져야 합니다**

#### 이유:

1. **SEO 기본 원칙**
   - 각 페이지는 고유한 `title`과 `description`이 있어야 검색 결과에서 차별화됨
   - Google Search Console에서 중복 메타데이터 경고 발생 가능

2. **소셜 미디어 공유**
   - 페이지별로 다른 OG 이미지/설명이 있으면 공유 시 더 매력적

3. **AI 검색 추천**
   - AI는 페이지의 메타데이터를 중요한 컨텍스트로 활용
   - 상세하고 고유한 설명이 있으면 더 정확한 추천 가능

4. **사용자 경험**
   - 브라우저 탭에 표시되는 제목이 페이지 컨텐츠를 반영해야 함

#### 현재 프로젝트의 접근 방식 평가:

**좋은 점**: `layout.tsx`의 `title.template: '%s | 씨앗페 2026'` 패턴 사용

**개선 필요**: 모든 페이지에 완전한 OG/Twitter/canonical 설정 필요

---

## 3. AI 검색 추천 최적화

### 현재 상태: 🟢 우수

1. **robots.txt AI 크롤러 허용** - 완벽 ✅
2. **구조화된 컨텐츠** - 제목 계층 구조 양호

### 개선 권장사항:

#### 3.1 WebSite 스키마 추가 (layout.tsx)
검색 엔진이 사이트 구조를 더 잘 이해할 수 있도록 WebSite 스키마 추가 권장

#### 3.2 Product 스키마 (`/artworks/[id]`)
작품 상세 페이지에 Product 스키마를 추가하여 작품 정보 구조화

#### 3.3 AI 특화 메타데이터 고려
- AI 요약에 적합한 150-300자의 상세 설명
- 키워드는 AI가 컨텍스트 파악에 활용

---

## 4. 우선순위별 개선 권장사항

### 🔴 높음 (즉시 수정)

| 항목 | 예상 시간 |
|------|----------|
| `/artworks` 페이지 OG/Twitter/canonical 추가 | 10분 |
| 사이트맵에 `/artworks` 추가 | 5분 |
| 사이트맵에 동적 `/artworks/[id]` 추가 | 30분 |

### 🟡 중간 (1주 내)

| 항목 | 예상 시간 |
|------|----------|
| `/artworks/[id]` Product JSON-LD 추가 | 1시간 |
| `/our-reality` Article JSON-LD 추가 | 30분 |
| WebSite 스키마 layout.tsx에 추가 | 15분 |
| BreadcrumbList 스키마 공통 컴포넌트 생성 | 1시간 |

### 🟢 낮음 (2주 내)

| 항목 | 예상 시간 |
|------|----------|
| 메타데이터 생성 유틸리티 함수 리팩토링 | 2시간 |
| FAQPage 스키마 추가 | 1시간 |
| 성능 모니터링 (Core Web Vitals) | 지속 |

---

## 5. 결론

### 강점 👍
- 루트 레이아웃의 메타데이터 설정이 우수함
- AI 크롤러 명시적 허용으로 AI 검색 노출 극대화
- Event 스키마 구현으로 전시 정보 구조화

### 개선 필요 👎
- `/artworks` 페이지 메타데이터 불완전
- 사이트맵에 동적 페이지 미포함
- 전반적인 JSON-LD 스키마 부족

### 답변: 각 페이지별 메타데이터가 필요한가?
**예, 반드시 필요합니다.** 
- 검색 엔진과 AI 시스템 모두 페이지별 고유한 메타데이터를 참조합니다
- 현재 구조(`title.template`)는 훌륭하며, OG/Twitter/canonical만 보완하면 됩니다
- 동적 페이지(`/artworks/[id]`)의 `generateMetadata` 패턴을 다른 페이지에도 참조할 수 있습니다
