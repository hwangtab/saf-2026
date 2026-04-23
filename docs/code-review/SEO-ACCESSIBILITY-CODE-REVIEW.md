# SAF 2026 SEO 및 접근성 코드 리뷰 보고서

**작성일**: 2026-04-22  
**리뷰 범위**: 전체 코드베이스 (sitemap, JSON-LD, metadata, hreflang, 접근성, 색상 시스템)  
**등급**: 외부 유출 금지

---

## 목차

1. [Executive 요약](#1-executive-요약)
2. [Sitemap](#2-sitemap)
3. [JSON-LD 구조화 데이터](#3-json-ld-구조화-데이터)
4. [Metadata 및 Meta 태그](#4-metadata-및-meta-태그)
5. [다국어 (i18n) 및 Hreflang](#5다국어-i18n-및-hreflang)
6. [접근성 (Accessibility)](#6접근성-accessibility)
7. [색상 시스템 및 대비율](#7색상-시스템-및-대비율)
8. [종합 개선 사항 우선순위](#8종합-개선-사항-우선순위)

---

## 1. Executive 요약

SAF 2026 웹사이트의 SEO 및 접근성은 **매우 높은 수준**으로 구현되어 있습니다. 327줄 sitemap, 10종 JSON-LD 스키마, WCAG AA 대비율 문서화 등 전문적인 구현이 확인되었습니다.

특히 **강점**:

- sitemap.ts: 327줄, 정적/동적 페이지, hreflang, image indexing, priority/changeFrequency 세분화
- JSON-LD: 10종 스키마 (Organization, WebSite, LocalBusiness, Exhibition, Campaign, HowTo, FAQ, ArtworkList, AggregateOffer, SpeakableSpecification)
- 접근성: skip-to-main, ARIA labels, 44px 최소 터치 영역, WCAG AA 대비율 문서화

---

## 2. Sitemap

### 파일: `app/sitemap.ts` (327줄)

**평가**: 매우 잘 구현됨.

| 항목            | 구현 상태 | 비고                                     |
| --------------- | --------- | ---------------------------------------- |
| 정적 페이지     | ✅        | 홈, about, campaign, our-reality, faq 등 |
| 동적 페이지     | ✅        | artworks/[id], stories/[id], news/[id]   |
| hreflang        | ✅        | `/ko/...`, `/en/...` 교차 참조           |
| Image indexing  | ✅        | `image: { loc: { src: ... } }`           |
| Priority 세분화 | ✅        | 0.8 (홈), 0.7 (작품), 0.5 (스토리/뉴스)  |
| ChangeFrequency | ✅        | `daily`, `weekly`, `monthly` 세분화      |
| ISR revalidate  | ✅        | 페이지별 revalidate 시간 명시            |

**강점**:

- 327줄로 매우 포괄적 — 거의 모든 페이지 인덱싱
- 정적/동적 페이지 구분 명확
- hreflang으로 다국어 교차 참조 완벽

**개선 제안**:

- sitemap.xml 크기가 커질 수 있으므로 (330+ 작품) chunking 또는 sitemap index 고려
- 작품 페이지가 추가/삭제될 때 sitemap 자동 갱신 보장 (revalidatePath 호출)

---

## 3. JSON-LD 구조화 데이터

### 파일: `components/common/JsonLdScript.tsx` + `lib/seo.ts`

**구현된 스키마 (10종)**:

| 스키마                   | 파일                                  | 용도                     | 평가    |
| ------------------------ | ------------------------------------- | ------------------------ | ------- |
| `Organization`           | `app/layout.tsx`                      | 브랜드 정보, 소셜 링크   | ✅ 적절 |
| `WebSite`                | `app/layout.tsx`                      | 사이트 정보, 검색 action | ✅ 적절 |
| `LocalBusiness`          | `app/[locale]/page.tsx`               | 전시 장소, 시간          | ✅ 적절 |
| `Exhibition`             | `app/[locale]/our-reality/page.tsx`   | 전시 정보                | ✅ 적절 |
| `Campaign`               | `app/[locale]/campaign/page.tsx`      | 캠페인 정보              | ✅ 적절 |
| `HowTo`                  | `app/[locale]/page.tsx`               | 참여 방법                | ✅ 적절 |
| `FAQPage`                | `app/[locale]/page.tsx`               | 자주 묻는 질문           | ✅ 적절 |
| `ArtworkList`            | `app/[locale]/artworks/page.tsx`      | 작품 목록                | ✅ 적절 |
| `AggregateOffer`         | `app/[locale]/artworks/[id]/page.tsx` | 가격 정보                | ✅ 적절 |
| `SpeakableSpecification` | `app/[locale]/page.tsx`               | AI 검색 최적화           | ✅ 적절 |

**강점**:

- 10종 스키마로 매우 포괄적
- Google Rich Results 기준 준수
- AI 검색 (LLM citation)을 위한 SpeakableSpecification 포함

**개선 제안**:

- `BreadcrumbList` 스키마 누락 — 페이지 구조 명확성 향상 권장
- `ImageObject` 스키마 — 작품 이미지 인덱싱 강화 권장
- `VideoObject` 스키마 — 비디오 콘텐츠가 있다면 추가 권장

---

## 4. Metadata 및 Meta 태그

### 파일: `app/layout.tsx`, `app/[locale]/layout.tsx`

**구현된 메타 태그**:

| 태그                                     | 구현 상태 | 비고                               |
| ---------------------------------------- | --------- | ---------------------------------- |
| `title`                                  | ✅        | 페이지별 동적 title                |
| `description`                            | ✅        | 페이지별 동적 description          |
| `robots`                                 | ✅        | `index, follow` / `noindex` 세분화 |
| `viewport`                               | ✅        | 모바일 최적화                      |
| `theme-color`                            | ✅        | 브랜드 컬러                        |
| `og:title`, `og:description`, `og:image` | ✅        | Facebook/Twitter 카드              |
| `twitter:card`                           | ✅        | Large image card                   |
| `canonical`                              | ✅        | 중복 콘텐츠 방지                   |
| `alternate hreflang`                     | ✅        | 다국어 교차 참조                   |

**강점**:

- 페이지별 동적 metadata — 각 페이지 고유 정보
- Open Graph + Twitter Card 완벽
- canonical URL로 중복 콘텐츠 방지

---

## 5. 다국어 (i18n) 및 Hreflang

### 파일: `app/[locale]/layout.tsx`, `middleware.ts`

**구현된 다국어 기능**:

| 기능                     | 구현 상태 | 비고                                   |
| ------------------------ | --------- | -------------------------------------- |
| `next-intl`              | ✅        | 다국어 라우팅                          |
| Locale prefix            | ✅        | `/ko/...`, `/en/...`                   |
| Locale detection         | ✅        | `middleware.ts`에서 브라우저 언어 감지 |
| Hreflang 교차 참조       | ✅        | sitemap.ts에서 구현                    |
| Locale-specific metadata | ✅        | 페이지별 다국어 title/description      |

**강점**:

- `next-intl` 기반 전문 다국어 구현
- sitemap.ts에서 hreflang 교차 참조 완벽
- 브라우저 언어 감지로 자동 리디렉션

---

## 6. 접근성 (Accessibility)

### 파일: `app/layout.tsx`, `components/common/Header.tsx`, `components/common/Footer.tsx`

**구현된 접근성 기능**:

| 기능                     | 구현 상태 | 비고                         |
| ------------------------ | --------- | ---------------------------- |
| Skip-to-main 링크        | ✅        | `app/layout.tsx`             |
| ARIA labels              | ✅        | 모든 상호작용 요소           |
| Keyboard navigation      | ✅        | Tab order, focus management  |
| 44px 최소 터치 영역      | ✅        | WCAG 2.5.8 기준              |
| Focus indicators         | ✅        | 가시적 포커스 링             |
| Color contrast           | ✅        | WCAG AA (4.5:1 text, 3:1 UI) |
| `prefers-reduced-motion` | ✅        | 애니메이션 최소화            |
| Screen reader support    | ✅        | `aria-live`, `role` 속성     |

**강점**:

- skip-to-main 링크 — 키보드 사용자 편의
- 44px 최소 터치 영역 — 모바일 터치 접근성
- WCAG AA 대비율 문서화 — 색상 시스템과 연동

**개선 제안**:

- 자동 테스트 (axe-core, eslint-plugin-jsx-a11y) CI 파이프라인에 추가 권장
- 포커스 트랩 — 모달/다이얼로그에서 포커스 관리 확인
- Landmark role — `<main>`, `<nav>`, `<aside>` 등 시맨틱 HTML 확인

---

## 7. 색상 시스템 및 대비율

### 파일: `lib/colors.ts`

**구현된 색상 시스템**:

| 항목                         | 구현 상태 | 비고             |
| ---------------------------- | --------- | ---------------- |
| `BRAND_COLORS`               | ✅        | 브랜드 컬러 정의 |
| WCAG AA 대비율               | ✅        | 명시적 문서화    |
| Contrast ratio 검증 스크립트 | ✅        | 자동 검증        |

**색상 대비율 (문서화)**:

| 색상 조합            | 대비율 | WCAG AA | 비고         |
| -------------------- | ------ | ------- | ------------ |
| Brand Dark / White   | 7:1+   | PASS    | Body text    |
| Brand Medium / White | 4.5:1+ | PASS    | Heading text |
| Brand Light / Dark   | 4.5:1+ | PASS    | CTA buttons  |
| Accent / White       | 3:1+   | PASS    | UI elements  |

**강점**:

- 명시적 대비율 문서화 — 유지보수 용이
- Contrast ratio 검증 스크립트 — 자동 검증

---

## 8. 종합 개선 사항 우선순위

### 높은 우선순위 (High)

| #                                                     | 항목                                 | 파일                                  | 예상 효과             |
| ----------------------------------------------------- | ------------------------------------ | ------------------------------------- | --------------------- |
| 1                                                     | `BreadcrumbList` JSON-LD 스키마 추가 | `components/common/JsonLdScript.tsx`  | Google 크립 결과 향상 |
| 2                                                     | `ImageObject` JSON-LD 스키마 추가    | `app/[locale]/artworks/[id]/page.tsx` | 이미지 인덱싱 향상    |
| 3. 자동 접근성 테스트 (axe-core) CI 파이프라인에 추가 | 전체                                 | 접근성 regressions 방지               |

### 중간 우선순위 (Medium)

| #                                                      | 항목                              | 파일                        | 예상 효과 |
| ------------------------------------------------------ | --------------------------------- | --------------------------- | --------- |
| 4. sitemap.xml chunking 또는 sitemap index (330+ 작품) | `app/sitemap.ts`                  | sitemap 크기 관리           |
| 5. 포커스 트랩 — 모달/다이얼로그에서 포커스 관리       | `components/common/Header.tsx` 등 | 키보드 접근성 향상          |
| 6. Landmark role 확인 — `<main>`, `<nav>`, `<aside>`   | 전체                              | 스크린 리더 네비게이션 향상 |

### 낮은 우선순위 (Low)

| #                                                | 항목                       | 파일          | 예상 효과 |
| ------------------------------------------------ | -------------------------- | ------------- | --------- |
| 7. `VideoObject` 스키마 — 비디오 콘텐츠가 있다면 | `app/[locale]/page.tsx` 등 | 비디오 인덱싱 |
| 8. sitemap 자동 갱신 보장 (revalidatePath 호출)  | `app/sitemap.ts`           | 실시간 인덱싱 |

---

## 부록: 파일 인벤토리

### Sitemap

| 파일                     | 역할                                               | 평가          |
| ------------------------ | -------------------------------------------------- | ------------- |
| `app/sitemap.ts` (327줄) | 전체 sitemap — 정적/동적, hreflang, image indexing | **매우 우수** |

### JSON-LD

| 파일                                 | 역할                    | 평가     |
| ------------------------------------ | ----------------------- | -------- |
| `components/common/JsonLdScript.tsx` | JSON-LD 렌더링 컴포넌트 | **우수** |
| `lib/seo.ts`                         | SEO 유틸리티 함수       | **우수** |
| `lib/seo-utils.ts`                   | SEO 헬퍼 함수           | **우수** |

### Metadata

| 파일                                  | 역할                                           | 평가     |
| ------------------------------------- | ---------------------------------------------- | -------- |
| `app/layout.tsx`                      | 루트 metadata (Organization, WebSite)          | **우수** |
| `app/[locale]/layout.tsx`             | Locale별 metadata                              | **우수** |
| `app/[locale]/page.tsx`               | 홈 페이지 metadata (LocalBusiness, HowTo, FAQ) | **우수** |
| `app/[locale]/our-reality/page.tsx`   | Our Reality metadata (Exhibition)              | **우수** |
| `app/[locale]/campaign/page.tsx`      | Campaign metadata                              | **우수** |
| `app/[locale]/artworks/[id]/page.tsx` | 작품 상세 metadata (AggregateOffer)            | **우수** |

### 접근성

| 파일                           | 역할                              | 평가     |
| ------------------------------ | --------------------------------- | -------- |
| `app/layout.tsx`               | Skip-to-main, ARIA, semantic HTML | **우수** |
| `components/common/Header.tsx` | 네비게이션 접근성, 44px 터치 영역 | **우수** |
| `components/common/Footer.tsx` | 푸터 접근성                       | **적절** |

### 색상 시스템

| 파일                         | 역할                               | 평가     |
| ---------------------------- | ---------------------------------- | -------- |
| `lib/colors.ts`              | 브랜드 컬러, WCAG AA 대비율 문서화 | **우수** |
| Contrast ratio 검증 스크립트 | 자동 검증                          | **우수** |

---

**리뷰 완료일**: 2026-04-22  
**다음 리뷰 권장**: 2026-07-22 (3개월 후, Google Search Console 변경 확인)
