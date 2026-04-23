# SAF 2026 성능 코드 리뷰 보고서

**작성일**: 2026-04-22  
**리뷰 범위**: 전체 코드베이스 (이미지 최적화, 서버/클라이언트 경계, 데이터 페칭, 번들 크기, Three.js/WebGL, Recharts, 중계 연산)  
**등급**: 외부 유출 금지

---

## 목차

1. [Executive 요약](#1-executive-요약)
2. [이미지 최적화](#2-이미지-최적화)
3. [서버/클라이언트 컴포넌트 경계](#3-서버클라이언트-컴포넌트-경계)
4. [데이터 페칭 패턴](#4-데이터-페칭-패턴)
5. [번들 크기 및 Dynamic Import](#5-번들-크기-및-dynamic-import)
6. [Three.js / WebGL 사용](#6-threejs--webgl-사용)
7. [Recharts 차트 사용](#7-recharts-차트-사용)
8. [중요 연산 및 차단 작업](#8중요-연산-및-차단-작업)
9. [종합 개선 사항 우선순위](#9-종합-개선-사항-우선순위)

---

## 1. Executive 요약

SAF 2026 웹사이트는 **이미지 최적화, dynamic import, caching 전략** 등에서 높은 성능 의식을 보이고 있습니다. 다만 **3개의 중등도 성능 병목**이 확인되었습니다:

| 우선순위 | 항목                                                    | 파일                                  | 예상 영향                   |
| -------- | ------------------------------------------------------- | ------------------------------------- | --------------------------- |
| **P0**   | 3D 갤러리 무거운 Three.js 번들                          | 7 virtual-gallery 파일                | 초기 로딩 1.5MB+            |
| **P0**   | 16개 Recharts 컴포넌트 동시 로드                        | 18 chart 파일                         | 차트 페이지 300KB+ JS       |
| **P1**   | 홈 페이지 4개 병렬 쿼리, 각각 3× limit                  | `app/[locale]/page.tsx`               | 240개 row fetch → 60개 사용 |
| **P1**   | 작품 상세 페이지 9개 Supabase 쿼리                      | `app/[locale]/artworks/[id]/page.tsx` | 9개 DB 호출/페이지          |
| **P1**   | 179개 클라이언트 컴포넌트 — 전체 admin shell 클라이언트 | 40+ admin 파일                        | 200KB+ 불필요 JS            |

---

## 2. 이미지 최적화

### 2.1 잘 구현된 부분

**`next.config.js`** (L14-49):

- 커스텀 이미지 로더: 8개 이미지 크기, 6개 디바이스 크기
- 13개 CDN 호스트에 대한 `remotePatterns`
- WebP 변환, blur images, 7일 캐시 TTL

**`components/common/SafeImage.tsx`**:

- 4개 작품 프리셋 (slider/card/detail/hero)에 대한 `srcSet` 생성
- 에러 폴백 체인 (Supabase → render → 1x1 PNG)

**`components/features/ArtworkImage.tsx`** (L91-104):

- `<picture>` 요소: 데스크톱 (1x + 2x Retina) 및 모바일 `mobileSrc`
- `loading="eager"` + `fetchPriority="high"` + `decoding="sync"` — LCP 이미지 최적화

**`app/[locale]/artworks/[id]/page.tsx`** (L223-232):

- `<link rel="preload">` with `imageSrcSet` 및 `imageSizes` — LCP preload

**`lib/client/image-optimization.ts`**:

- 클라이언트 측 Canvas2D WebP/JPEG 변환 (HEIF iOS 문제 대응)

### 2.2 우려 사항

| 파일                                      | 라인 | 문제                                                   | 영향                                   |
| ----------------------------------------- | ---- | ------------------------------------------------------ | -------------------------------------- |
| `components/features/HeroGalleryGrid.tsx` | L44  | `priority={index < 4}` — 홈 페이지 4개 이미지 priority | 여러 LCP 경쟁자                        |
| `components/features/ArtworkImage.tsx`    | L99  | `<img>` `loading="eager"` — 메인 스레드 차단           | LCP 이미지 매 작품 페이지에서 blocking |

**해결 방안**:

- 홈 페이지 priority 이미지를 1-2개로 제한 (LCP 이미지 1개 + hero 1개)
- `ArtworkImage.tsx`의 `loading="eager"`는 LCP 이미지에만 적용, 나머지는 `loading="lazy"`

---

## 3. 서버/클라이언트 컴포넌트 경계

### 3.1 핵심 발견: 179개 클라이언트 컴포넌트

전체 코드베이스의 상당 부분이 `'use client'`를 사용합니다. 주요 카테고리:

| 카테고리          | 파일 수 | 주요 파일                                                         |
| ----------------- | ------- | ----------------------------------------------------------------- |
| Admin 대시보드    | 40+     | analytics, revenue, orders, users, artists, artworks              |
| 차트              | 18      | Recharts 기반 모든 차트                                           |
| 3D 갤러리         | 7       | Three.js 기반 모든 컴포넌트                                       |
| Header/네비게이션 | 여러    | Header.tsx, DesktopNav, MobileNav, LanguageSwitcher, ShareButtons |
| 폼                | 여러    | artwork, artist, buyer, order, profile 폼                         |

### 3.2 우려 사항

| 파일                           | 문제                                                                                                   | 영향                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------ | --------------------- |
| `app/(portal)/layout.tsx`      | 전체 portal layout이 클라이언트 컴포넌트 — admin/artist dashboard 쉘 전체가 클라이언트에서 hydration됨 | 200KB+ 불필요 JS      |
| `components/common/Header.tsx` | 메인 사이트 헤더가 클라이언트 컴포넌트 — 모든 공개 페이지에 상호작용 오버헤드                          | 공개 페이지 불필요 JS |

**해결 방안**:

- Admin portal layout을 서버 컴포넌트로 변경, `use server` 액션으로 상호작용
- Header의 일부 (FullscreenMenu, GlobalSearchDialog)만 `ssr: false` dynamic import로 변경

---

## 4. 데이터 페칭 패턴

### 4.1 잘 구현된 부분

**`lib/supabase-data.ts`**:

- **이중 캐싱 전략**: `React.cache()` (요청 스코프) + `unstable_cache()` (edge 캐시)
- Revalidation 시간: 300s (작품), 600s (스토리), 1800s (뉴스/FAQ), 3600s (testimonial/리뷰)

**`app/[locale]/page.tsx`** (L38): `revalidate = 1800` (30분)  
**`app/[locale]/artworks/[id]/page.tsx`** (L45): `revalidate = 600` (10분)

### 4.2 우려 사항

| 파일                                  | 라인     | 문제                                                                          | 예상 영향                              |
| ------------------------------------- | -------- | ----------------------------------------------------------------------------- | -------------------------------------- |
| `lib/supabase-data.ts`                | L147-158 | `getSupabaseArtworks`가 **모든 330개 작품**을 매 cache miss마다 fetch         | 빌드 시 330 작품 × artist 데이터 fetch |
| `app/[locale]/page.tsx`               | L333-339 | 홈 페이지 4개 병렬 쿼리, 각각 `limit * 3` (60개) → 240개 row fetch, 60개 사용 | 75% 낭비                               |
| `app/[locale]/artworks/[id]/page.tsx` | L89-117  | 7개 병렬 쿼리 + 2개 조건부 쿼리 = **9개 Supabase 호출/페이지**                | 9개 DB 라운드트립                      |

**해결 방안**:

- 홈 페이지: 1개 쿼리로 category filter 후 클라이언트에서 split
- 작품 상세: 9개 쿼리를 2-3개로 통합 (artist + artwork + related를 한 쿼리로)
- `getSupabaseArtworks`에 pagination 또는 cursor 기반 fetch 추가

---

## 5. 번들 크기 및 Dynamic Import

### 5.1 잘 구현된 부분

| 파일                                                                 | 패턴                                                                 | 평가 |
| -------------------------------------------------------------------- | -------------------------------------------------------------------- | ---- |
| `components/features/charts/DynamicCharts.tsx`                       | 6개 차트 동적 import (`ssr: false`) + 로딩 플레이스홀더              | 적절 |
| `app/(portal)/admin/analytics/_components/AnalyticsCharts.tsx`       | 6개 admin 차트 동적 import (`ssr: false`)                            | 적절 |
| `components/features/ArtworkImage.tsx` (L17-24)                      | `ArtworkLightbox`, `VirtualGalleryPortal` 동적 import (`ssr: false`) | 적절 |
| `components/features/virtual-gallery/VirtualGalleryPortal.tsx` (L10) | `VirtualRoom` 동적 import (`ssr: false`)                             | 적절 |
| `app/[locale]/page.tsx` (L40-44)                                     | `DynamicCounter`, `FAQList`, `ArtworkHighlightSlider` 동적 import    | 적절 |

### 5.2 우려 사항: 무거운 의존성

| 의존성                 | 예상 크기 | 사용 파일 수        |
| ---------------------- | --------- | ------------------- |
| `three`                | ~1.5MB    | 7 (virtual-gallery) |
| `@react-three/fiber`   | ~150KB    | 7 (virtual-gallery) |
| `@react-three/drei`    | ~200KB    | 7 (virtual-gallery) |
| `recharts`             | ~300KB    | 18 (chart)          |
| `react-kakao-maps-sdk` | ~50KB     | 여러 (map)          |

**총 18개 파일**이 무거운 라이브러리를 import합니다. dynamic import로 초기 로딩은 방지되지만, 트리가거된 번들 크기는 여전히 큽니다.

---

## 6. Three.js / WebGL 사용

### 6.1 파일 인벤토리 (7개 파일)

| 파일                         | 라인 수 | 주요 작업                                  |
| ---------------------------- | ------- | ------------------------------------------ |
| `VirtualRoom.tsx`            | ~300    | Three.js Canvas, shadow maps, tone mapping |
| `VirtualGalleryPortal.tsx`   | ~100    | WebGL detection, dynamic import wrapper    |
| `ArtworkPlane.tsx`           | ~60     | TextureLoader, anisotropy                  |
| `RoomGeometry.tsx`           | ~50     | PMREMGenerator environment map             |
| `RoomFurniture.tsx`          | 1081    | 4개 룸 프리셋, 100+ mesh 객체              |
| `proceduralTextures.ts`      | ~200    | 5개 procedural texture 생성기              |
| `GalleryControls.tsx` (기타) | -       | 네비게이션 컨트롤                          |

### 6.2 성능 우려

| 파일                    | 라인     | 문제                                                               | 평가                                                                                 |
| ----------------------- | -------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `VirtualRoom.tsx`       | L61-64   | `shadow-mapSize={2048}` — 2048×2048 shadow map은 GPU 집약적        | 모바일은 `shadows={!isMobile}`으로 비활성화 — **적절**                               |
| `VirtualRoom.tsx`       | L212-219 | `dpr={isMobile ? [1, 1.5] : [1, 2]}` — 모바일 DPR 축소             | **적절**                                                                             |
| `VirtualRoom.tsx`       | L212-219 | `antialias: !isMobile` — 모바일 안티앨리어싱 비활성화              | **적절**                                                                             |
| `VirtualRoom.tsx`       | L212-219 | `powerPreference: 'high-performance'`                              | **적절**                                                                             |
| `ArtworkPlane.tsx`      | L41      | `tex.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy())` | **적절**                                                                             |
| `RoomGeometry.tsx`      | L23-31   | `PMREMGenerator` — 비싼 환경맵 생성 (전장 렌더링 → cubemap)        | 룸 마운트 시 1회 — **許容**                                                          |
| `proceduralTextures.ts` | 전체     | 5개 procedural texture (Canvas2D → THREE.CanvasTexture)            | `createPlasterTexture`: 6000 noise pixels, `createFabricTexture`: 2000 noise + weave |
| `RoomFurniture.tsx`     | 1081     | 4개 룸 프리셋, 각각 ~100+ mesh (Box, Cylinder, Sphere)             | **중요** — 각 룸 100+ 객체                                                           |

### 6.3 좋은 완화 조치

- `ssr: false` on VirtualRoom dynamic import
- WebGL detection before rendering (VirtualGalleryPortal.tsx L50-57)
- 모바일 DPR 축소 (1-1.5 vs 1-2)
- 모바일에서 shadow 비활성화
- Error boundary wrapping 3D content

---

## 7. Recharts 차트 사용

### 7.1 파일 인벤토리 (18개 파일)

| 카테고리         | 파일 수 | 주요 파일                                                                                                                                        |
| ---------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 공개 페이지 차트 | 6       | `components/features/charts/` (FirstBankAccess, RejectionReasons, HighInterestProduct, InterestRateDistribution, DebtCollection, CreativeImpact) |
| Admin 차트       | 8       | `app/(portal)/admin/` (AnalyticsCharts, HourlyHeatmap, DailyViews, DevicePie, TopPages, BrowserOs, RevenueCharts, MonthlyRevenue)                |
| 차트 유틸리티    | 2       | `ChartErrorBoundary`, `useChartDimensions`                                                                                                       |
| 기타             | 2       | `StatusDonutChart`, `RevenueTrendChart`                                                                                                          |

### 7.2 성능 우려

| 파일                                    | 문제                                                        | 영향                              |
| --------------------------------------- | ----------------------------------------------------------- | --------------------------------- |
| `app/[locale]/our-reality/page.tsx`     | 6개 차트 컴포넌트 **동시 로드**                             | 6개 Recharts 인스턴스 동시 렌더링 |
| `app/(portal)/admin/analytics/page.tsx` | 6개 차트 컴포넌트 **동시 로드**                             | 6개 Recharts 인스턴스 동시 렌더링 |
| `lib/hooks/useChartDimensions.ts`       | `ResponsiveContainer` 매 resize마다 재계산 + 200ms debounce | 차트 페이지마다 추가 오버헤드     |

### 7.3 좋은 완화 조치

- 모든 차트 동적 import (`ssr: false`)
- 모든 차트 error boundary
- 로딩 플레이스홀더 during async load

---

## 8. 중요 연산 및 차단 작업

### 8.1 스크롤/애니메이션 핸들러

| 파일                                       | 패턴                                                                 | 평가                                    |
| ------------------------------------------ | -------------------------------------------------------------------- | --------------------------------------- |
| `lib/hooks/useScrolled.ts`                 | `requestAnimationFrame` scroll handler with ticking guard            | **적절**                                |
| `components/layout/NavigationProgress.tsx` | `requestAnimationFrame` + CSS transitions (페이지 로드 progress bar) | **적절**, `prefers-reduced-motion` 준수 |
| `lib/hooks/useGlobalSearch.ts`             | 300ms debounce on search API + `AbortController`                     | **적절**                                |
| `lib/hooks/useChartDimensions.ts`          | 200ms debounce on resize                                             | **적절**                                |

### 8.2 클라이언트 측 이미지 처리

**`lib/client/image-optimization.ts`**:

- Canvas2D WebP/JPEG 변환 — 큰 이미지 메인 스레드 차단
- 최대 2560px, 80-85% quality

**해결 방안**: Web Worker로 오프스레드 처리 고려.

### 8.3 Procedural Texture Generation

**`components/features/virtual-gallery/proceduralTextures.ts`**:

- `createPlasterTexture`: 6000 noise pixels 생성
- `createFabricTexture`: 2000 noise pixels + weave pattern
- 메인 스레드에서 3D 장면 초기화 시 실행

**해결 방안**: 빌드 타임에 pre-generate.

### 8.4 데이터 처리

| 파일                                  | 라인     | 작업                                                      | 영향                        |
| ------------------------------------- | -------- | --------------------------------------------------------- | --------------------------- |
| `lib/supabase-data.ts`                | L86-93   | `pickRandomItems`: Fisher-Yates shuffle on 60개 배열      | **미미**                    |
| `app/[locale]/artworks/[id]/page.tsx` | L146-167 | `localizeDataValue`, `localizeLongText` per artwork field | **미미** — 매 렌더마다 실행 |

---

## 9. 종합 개선 사항 우선순위

### P0 — 즉시 조치

| #   | 항목                                                     | 파일                   | 예상 개선                  |
| --- | -------------------------------------------------------- | ---------------------- | -------------------------- |
| 1   | 3D 갤러리 lazy loading — "View in Room" 클릭 시에만 로드 | 7 virtual-gallery 파일 | 초기 로딩 1.5MB+ 제거      |
| 2   | 차트 페이지 lazy loading — 탭/스크롤 시에만 로드         | 18 chart 파일          | 차트 페이지 300KB+ JS 제거 |

### P1 — 높은 우선순위

| #   | 항목                                                | 파일                                  | 예상 개선                     |
| --- | --------------------------------------------------- | ------------------------------------- | ----------------------------- |
| 3   | 홈 페이지 4개 쿼리를 1개로 통합 후 클라이언트 split | `app/[locale]/page.tsx`               | 240 → 60 row fetch (75% 감소) |
| 4   | 작품 상세 페이지 9개 쿼리를 2-3개로 통합            | `app/[locale]/artworks/[id]/page.tsx` | 9 → 2-3 DB 호출               |
| 5   | Admin portal layout을 서버 컴포넌트로 변경          | `app/(portal)/layout.tsx`             | 200KB+ JS 제거                |

### P2 — 중간 우선순위

| #   | 항목                                                       | 파일                                        | 예상 개선                  |
| --- | ---------------------------------------------------------- | ------------------------------------------- | -------------------------- |
| 6   | Shadow map size 2048 → 1024 (데스크톱), 512 (모바일)       | `VirtualRoom.tsx`                           | GPU 메모리 75% 감소        |
| 7   | PMREMGenerator + procedural texture 빌드 타임 pre-generate | `RoomGeometry.tsx`, `proceduralTextures.ts` | 3D 장면 초기화 500ms+ 개선 |
| 8   | Client-side Canvas2D image conversion을 Web Worker로 이동  | `lib/client/image-optimization.ts`          | 메인 스레드 차단 제거      |

### P3 — 낮은 우선순위

| #                                                      | 항목                                     | 파일                  | 예상 개선       |
| ------------------------------------------------------ | ---------------------------------------- | --------------------- | --------------- |
| 9                                                      | 홈 페이지 priority 이미지를 1-2개로 제한 | `HeroGalleryGrid.tsx` | LCP 경쟁자 감소 |
| 10. `ANALYZE=true npm run build`로 실제 번들 크기 측정 | 전체                                     | 번들 크기 가시성 확보 |

---

## 부록: 파일 인벤토리

### 이미지 최적화

| 파일                                      | 역할                              | 평가                     |
| ----------------------------------------- | --------------------------------- | ------------------------ |
| `next.config.js`                          | 이미지 로더, remotePatterns, 캐시 | GOOD                     |
| `components/common/SafeImage.tsx`         | srcSet, 에러 폴백                 | GOOD                     |
| `components/features/ArtworkImage.tsx`    | LCP 최적화, picture element       | GOOD (priority 과다)     |
| `lib/client/image-optimization.ts`        | Canvas2D WebP/JPEG 변환           | MEDIUM (Web Worker 필요) |
| `components/features/HeroGalleryGrid.tsx` | 16개 SafeImage (4개 priority)     | MEDIUM (priority 과다)   |

### 서버/클라이언트 경계

| 파일                           | 역할                   | 평가                        |
| ------------------------------ | ---------------------- | --------------------------- |
| `app/(portal)/layout.tsx`      | Portal layout (client) | MEDIUM (server로 변경 권장) |
| `components/common/Header.tsx` | 메인 헤더 (client)     | MEDIUM (일부 ssr: false)    |
| 179개 `'use client'` 파일      | 전체 코드베이스        | MEDIUM (audit 권장)         |

### 데이터 페칭

| 파일                                  | 역할                                     | 평가                       |
| ------------------------------------- | ---------------------------------------- | -------------------------- |
| `lib/supabase-data.ts`                | 이중 캐싱 (React.cache + unstable_cache) | GOOD (전체 fetch 문제)     |
| `app/[locale]/page.tsx`               | 홈 페이지 (4개 쿼리)                     | MEDIUM (1개로 통합 권장)   |
| `app/[locale]/artworks/[id]/page.tsx` | 작품 상세 (9개 쿼리)                     | MEDIUM (2-3개로 통합 권장) |

### Three.js / WebGL

| 파일                         | 역할                      | 평가                                 |
| ---------------------------- | ------------------------- | ------------------------------------ |
| `VirtualRoom.tsx`            | 3D 캔버스, shadow maps    | GOOD (모바일 최적화)                 |
| `VirtualGalleryPortal.tsx`   | WebGL detection           | GOOD                                 |
| `ArtworkPlane.tsx`           | TextureLoader, anisotropy | GOOD                                 |
| `RoomGeometry.tsx`           | PMREMGenerator            | MEDIUM (빌드 타임 pre-generate 권장) |
| `RoomFurniture.tsx` (1081줄) | 4개 룸 프리셋, 100+ mesh  | MEDIUM (mesh 수 최적화 권장)         |
| `proceduralTextures.ts`      | 5개 procedural texture    | MEDIUM (빌드 타임 pre-generate 권장) |

### Recharts 차트

| 파일                                                | 역할                            | 평가                  |
| --------------------------------------------------- | ------------------------------- | --------------------- |
| `components/features/charts/` (6개)                 | 공개 페이지 차트                | GOOD (dynamic import) |
| `app/(portal)/admin/` (8개)                         | Admin 차트                      | GOOD (dynamic import) |
| `lib/hooks/useChartDimensions.ts`                   | Resize handler (200ms debounce) | GOOD                  |
| `components/features/charts/ChartErrorBoundary.tsx` | 차트 error boundary             | GOOD                  |

### 중계 연산

| 파일                                       | 역할                      | 평가                     |
| ------------------------------------------ | ------------------------- | ------------------------ |
| `lib/hooks/useScrolled.ts`                 | rAF scroll handler        | GOOD                     |
| `components/layout/NavigationProgress.tsx` | rAF progress bar          | GOOD                     |
| `lib/hooks/useGlobalSearch.ts`             | 300ms debounce search     | GOOD                     |
| `lib/client/image-optimization.ts`         | Canvas2D image conversion | MEDIUM (Web Worker 권장) |

---

**리뷰 완료일**: 2026-04-22  
**다음 리뷰 권장**: 2026-07-22 (3개월 후, Lighthouse 점수 변경 확인)
