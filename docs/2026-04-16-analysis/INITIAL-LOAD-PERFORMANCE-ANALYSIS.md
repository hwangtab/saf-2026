# 초기 페이지 로딩 성능 분석 보고서

> 작성일: 2026-02-17
> 분석 대상: SAF 2026 웹사이트 초기 로딩 병목 지점

---

## 요약

웹사이트 초기 접속 시 성능에 영향을 주는 주요 병목 지점을 분석했습니다. CRITICAL, HIGH, MEDIUM 우선순위로 분류하여 각 문제점과 해결 방안을 제시합니다.

---

## 발견된 문제점

### CRITICAL (FCP/LCP 직접 영향)

| 문제                      | 파일                       | 라인   | 예상 영향                |
| ------------------------- | -------------------------- | ------ | ------------------------ |
| 블로킹 데이터 페칭        | `app/page.tsx`             | 58     | FCP 500-1500ms 지연      |
| 폰트 preload 없음         | `app/layout.tsx`           | 115    | FOUT, LCP 200-400ms 지연 |
| Kakao SDK preconnect 없음 | `lib/hooks/useKakaoSDK.ts` | 70, 86 | DNS 조회 50-200ms 추가   |
| Analytics 동기 로드       | `app/layout.tsx`           | 4, 136 | 크리티컬 경로 차단       |

### HIGH (번들 크기/렌더링)

| 문제                             | 파일                   | 라인    | 예상 영향                     |
| -------------------------------- | ---------------------- | ------- | ----------------------------- |
| Provider 중첩                    | `app/layout.tsx`       | 117-130 | Framer Motion ~40KB 즉시 로드 |
| 로딩 상태 없는 dynamic import    | `app/page.tsx`         | 16-21   | CLS, 인지 성능 저하           |
| Hero에 Framer Motion 직접 import | `BackgroundSlider.tsx` | 5-6     | 초기 JS ~40KB 추가            |
| 3개 분리된 JSON-LD 스크립트      | `app/layout.tsx`       | 132-134 | DOM 복잡도 증가               |

### MEDIUM (추가 최적화)

| 문제                             | 파일                                             | 영향                |
| -------------------------------- | ------------------------------------------------ | ------------------- |
| SafeImage 클라이언트 복잡도      | `components/common/SafeImage.tsx`                | Hydration 오버헤드  |
| BackgroundSlider 연속 리렌더     | `components/features/BackgroundSlider.tsx`       | INP 저하            |
| Embla Carousel visibility 미체크 | `components/features/ArtworkHighlightSlider.tsx` | 불필요한 애니메이션 |
| FooterSlider API 캐시 미적용     | `components/common/FooterSlider.tsx`             | 중복 요청           |

---

## 상세 분석

### 1. 블로킹 데이터 페칭 (CRITICAL)

**위치**: `app/page.tsx:58`

```typescript
const [allArtworks, faqs] = await Promise.all([getSupabaseArtworks(), getSupabaseFAQs()]);
```

**문제점**:

- 홈페이지 렌더링 전에 두 개의 Supabase 쿼리가 완료될 때까지 대기
- First Contentful Paint (FCP)가 네트워크 지연에 직접적으로 영향받음
- Hero 섹션조차 데이터 로딩 완료 전까지 표시되지 않음

**해결 방안**:

- React Suspense 경계로 데이터 의존 섹션을 분리
- Hero 섹션은 즉시 렌더링, 데이터 섹션은 스트리밍

---

### 2. 폰트 Preload 미적용 (CRITICAL)

**위치**: `styles/globals.css:1-41`, `app/layout.tsx:115`

**현재 상태**:

```css
@font-face {
  font-family: 'GMarketSans';
  src: url('/fonts/GmarketSansLight.woff') format('woff');
  font-weight: 300;
  font-display: swap; /* FOUT 발생 */
}
```

**문제점**:

- 커스텀 폰트(GMarketSans, PartialSans, SchoolSafetyPoster)에 preload 힌트 없음
- `font-display: swap`으로 인한 Flash of Unstyled Text (FOUT) 발생
- GMarketSans는 WOFF 형식 (~1.8MB), WOFF2 미사용
- `<head>` 태그가 비어있어 리소스 힌트 누락

**폰트 파일 크기**:

- `GmarketSansBold.woff`: 630KB
- `GmarketSansLight.woff`: 560KB
- `GmarketSansMedium.woff`: 610KB
- `PartialSansKR-Regular.woff2`: 308KB
- `HakgyoansimPosterB.woff2`: 204KB

**해결 방안**:

```tsx
<head>
  <link
    rel="preload"
    href="/fonts/GmarketSansLight.woff"
    as="font"
    type="font/woff"
    crossOrigin="anonymous"
  />
  <link
    rel="preload"
    href="/fonts/PartialSansKR-Regular.woff2"
    as="font"
    type="font/woff2"
    crossOrigin="anonymous"
  />
</head>
```

---

### 3. Kakao SDK Preconnect 미적용 (CRITICAL)

**위치**: `lib/hooks/useKakaoSDK.ts:70, 86`

```typescript
script.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js';
script.async = true;
document.head.appendChild(script);
```

**문제점**:

- DNS prefetch 또는 preconnect 디렉티브 없음
- ShareButtons 컴포넌트 사용 시 추가 DNS 조회 + TLS 핸드셰이크 발생
- 50-200ms 추가 지연

**해결 방안**:

```tsx
<head>
  <link rel="preconnect" href="https://t1.kakaocdn.net" />
  <link rel="dns-prefetch" href="https://t1.kakaocdn.net" />
</head>
```

---

### 4. Vercel Analytics 동기 로드 (CRITICAL)

**위치**: `app/layout.tsx:4, 136`

```typescript
import { Analytics } from '@vercel/analytics/react';
// ...
<Analytics />
```

**문제점**:

- Analytics 컴포넌트가 크리티컬 렌더 경로에 포함
- 메인 콘텐츠와 함께 동기적으로 로드

**해결 방안**:

```typescript
import dynamic from 'next/dynamic';

const Analytics = dynamic(() => import('@vercel/analytics/react').then((mod) => mod.Analytics), {
  ssr: false,
});
```

---

### 5. Provider 중첩 (HIGH)

**위치**: `app/layout.tsx:117-130`

```tsx
<AnimationProvider>
  <ToastProvider>
    <PageTransition>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </PageTransition>
  </ToastProvider>
</AnimationProvider>
```

**문제점**:

- `AnimationProvider`: framer-motion (~40KB gzipped) 즉시 로드
- `ToastProvider`: 공개 페이지에서도 불필요하게 초기화
- `PageTransition`: Framer Motion AnimatePresence 사용

**해결 방안**:

- AnimationProvider를 동적 import로 변경
- ToastProvider를 인증 필요 라우트에만 적용

---

### 6. Dynamic Import 로딩 상태 미적용 (HIGH)

**위치**: `app/page.tsx:16-21`

```typescript
const DynamicCounter = dynamic(() => import('@/components/features/DynamicCounter'));
const ShareButtons = dynamic(() => import('@/components/common/ShareButtons'));
const FAQList = dynamic(() => import('@/components/features/FAQList'));
const ArtworkHighlightSlider = dynamic(
  () => import('@/components/features/ArtworkHighlightSlider')
);
```

**문제점**:

- 로딩 fallback 미지정으로 빈 공간 또는 layout shift 발생
- Cumulative Layout Shift (CLS) 증가

**해결 방안**:
각 컴포넌트에 스켈레톤 로딩 상태 추가:

```typescript
const ArtworkHighlightSlider = dynamic(
  () => import('@/components/features/ArtworkHighlightSlider'),
  {
    loading: () => (
      <div className="h-[300px] animate-pulse bg-gray-100 rounded-xl" />
    ),
  }
);
```

---

### 7. Hero 섹션 Framer Motion (HIGH)

**위치**: `components/features/BackgroundSlider.tsx:5-6`

```typescript
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
```

**문제점**:

- Hero 섹션(LCP 요소)에서 framer-motion 직접 import
- ~40KB gzipped 번들이 초기 로드에 포함

**해결 방안**:

- CSS 애니메이션으로 대체 (opacity, scale 전환)
- 또는 정적 이미지 먼저 표시 후 애니메이션 로직 lazy load

---

### 8. JSON-LD 스크립트 분리 (HIGH)

**위치**: `app/layout.tsx:132-134`

```tsx
<JsonLdScript data={organizationSchema} />
<JsonLdScript data={websiteSchema} />
<JsonLdScript data={localBusinessSchema} />
```

**문제점**:

- 3개의 별도 `<script>` 태그 생성
- DOM 복잡도 증가

**해결 방안**:

```tsx
const combinedSchema = {
  '@context': 'https://schema.org',
  '@graph': [organizationSchema, websiteSchema, localBusinessSchema],
};
<JsonLdScript data={combinedSchema} />;
```

---

## 예상 개선 효과

| 메트릭  | 현재 (추정) | Phase 1 적용 후 | 전체 적용 후 |
| ------- | ----------- | --------------- | ------------ |
| FCP     | 1.5-2.5s    | 1.0-1.5s        | < 1.0s       |
| LCP     | 2.5-4.0s    | 2.0-2.5s        | < 2.0s       |
| CLS     | 가변        | 개선            | < 0.1        |
| 초기 JS | ~150KB      | ~130KB          | ~100KB       |

---

## 구현 우선순위

### Phase 1: Quick Wins (즉각 적용 가능)

1. 폰트 preload 추가 (`app/layout.tsx`)
2. 외부 도메인 preconnect (`app/layout.tsx`)
3. JSON-LD 스크립트 통합 (`app/layout.tsx`)
4. Analytics lazy loading (`app/layout.tsx`)

### Phase 2: Dynamic Import 최적화

1. 로딩 스켈레톤 추가 (`app/page.tsx`)

### Phase 3: 데이터 페칭 최적화 (선택)

1. Suspense 스트리밍 적용 (`app/page.tsx`)

### Phase 4: 애니메이션 최적화 (선택)

1. AnimationProvider lazy load (`app/layout.tsx`)
2. Hero CSS 애니메이션 전환 (`BackgroundSlider.tsx`)

---

## 수정 대상 파일

| 파일                                       | 변경 내용                                              |
| ------------------------------------------ | ------------------------------------------------------ |
| `app/layout.tsx`                           | preload, preconnect, JSON-LD 통합, Analytics lazy load |
| `app/page.tsx`                             | dynamic import loading states, Suspense streaming      |
| `components/features/BackgroundSlider.tsx` | (선택) CSS 애니메이션 전환                             |

---

## 검증 방법

1. **빌드 테스트**

   ```bash
   npm run build && npm run start
   ```

2. **Lighthouse 성능 측정**
   - Chrome DevTools > Lighthouse > Performance

3. **Network 탭 확인**
   - 폰트/스크립트 로딩 순서 및 워터폴 분석

4. **코드 품질 검증**
   ```bash
   npm run type-check && npm run lint
   ```

---

## 참고 자료

- [Next.js Font Optimization](https://nextjs.org/docs/pages/building-your-application/optimizing/fonts)
- [Resource Hints - Preconnect](https://web.dev/preconnect-and-dns-prefetch/)
- [React Suspense for Data Fetching](https://react.dev/reference/react/Suspense)
- [Web Vitals](https://web.dev/vitals/)
