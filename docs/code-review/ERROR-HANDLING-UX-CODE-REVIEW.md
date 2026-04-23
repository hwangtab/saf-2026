# SAF 2026 에러 처리 및 UX 코드 리뷰 보고서

**작성일**: 2026-04-22  
**리뷰 범위**: 전체 코드베이스 (에러 바운더리, 리트라이 로직, 로딩 상태, UX 패턴, 피드백 메커니즘)  
**등급**: 외부 유출 금지

---

## 목차

1. [Executive 요약](#1-executive-요약)
2. [에러 바운더리](#2-에러-바운더리)
3. [리트라이 로직](#3-리트라이-로직)
4. [로딩 상태](#4-로딩-상태)
5. [UX 패턴 및 피드백](#5-ux-패턴-및-피드백)
6. [종합 개선 사항 우선순위](#6종합-개선-사항-우선순위)

---

## 1. Executive 요약

SAF 2026 웹사이트는 **에러 처리 및 UX 측면에서 높은 수준**을 유지하고 있습니다. 에러 바운더리, 리트라이 로직, 로딩 상태, UX 피드백 메커니즘이 적절히 구현되어 있습니다.

특히 **강점**:

- Next.js App Router 에러 바운더리 (`error.tsx`, `global-error.tsx`)
- 재시도 로직 (retry.ts, useRetry.ts, useFetchWithRetry.ts)
- Suspense fallback (`loading.tsx`)
- 차트 error boundary, 3D error boundary

---

## 2. 에러 바운더리

### 2.1 Next.js App Router 에러 바운더리

**파일**: `app/error.tsx`, `app/global-error.tsx`

**평가**: 적절히 구현됨.

| 항목                   | 구현 상태 | 비고                      |
| ---------------------- | --------- | ------------------------- |
| `app/error.tsx`        | ✅        | 페이지 레벨 에러 바운더리 |
| `app/global-error.tsx` | ✅        | 루트 레벨 에러 바운더리   |
| 에러 로깅              | ✅        | 콘솔/외부 서비스 로깅     |
| 사용자 피드백          | ✅        | 에러 메시지 표시          |

**강점**:

- 페이지 레벨 + 루트 레벨 에러 바운더리 이중화
- 에러 로깅 — 디버깅 용이

### 2.2 차트 Error Boundary

**파일**: `components/features/charts/ChartErrorBoundary.tsx`

**평가**: 적절히 구현됨.

| 항목                     | 구현 상태 | 비고                               |
| ------------------------ | --------- | ---------------------------------- |
| 차트 개별 error boundary | ✅        | 차트 실패 시 전체 페이지 영향 없음 |
| 에러 메시지 표시         | ✅        | "차트 로딩 실패" 메시지            |
| 재시도 버튼              | ✅        | 수동 재시도                        |

### 2.3 3D Error Boundary

**파일**: `components/features/virtual-gallery/VirtualGalleryPortal.tsx`

**평가**: 적절히 구현됨.

| 항목                     | 구현 상태 | 비고                         |
| ------------------------ | --------- | ---------------------------- |
| WebGL detection          | ✅        | WebGL 미지원 시 대체 콘텐츠  |
| 3D render error boundary | ✅        | 3D 실패 시 이미지 대체       |
| 에러 메시지              | ✅        | "3D 갤러리 로딩 실패" 메시지 |

---

## 3. 리트라이 로직

### 3.1 파일 인벤토리

| 파일                         | 역할                   | 평가     |
| ---------------------------- | ---------------------- | -------- |
| `lib/retry.ts`               | 기본 리트라이 유틸리티 | **우수** |
| `hooks/useRetry.ts`          | React hook 리트라이    | **우수** |
| `hooks/useFetchWithRetry.ts` | Fetch 리트라이 hook    | **우수** |

### 3.2 구현 세부 사항

**`lib/retry.ts`**:

- 지수 백오프 (exponential backoff)
- 최대 재시도 횟수 설정
- 에러 타입별 재시도 여부 결정

**`hooks/useRetry.ts`**:

- React state와 연동된 리트라이
- 수동/자동 재시도 지원

**`hooks/useFetchWithRetry.ts`**:

- 네트워크 실패 시 자동 재시도
- AbortController 연동

**강점**:

- 지수 백오프 — 서버 부하 방지
- 최대 재시도 횟수 — 무한 루프 방지
- 에러 타입별 재시도 — 네트워크 실패만 재시도, 4xx는 재시도 안 함

---

## 4. 로딩 상태

### 4.1 Next.js Suspense

**파일**: `app/loading.tsx`

**평가**: 적절히 구현됨.

| 항목               | 구현 상태 | 비고                     |
| ------------------ | --------- | ------------------------ |
| Suspense fallback  | ✅        | 페이지 로딩 시 로딩 화면 |
| Skeleton UI        | ✅        | 콘텐츠 구조 유지         |
| Progress indicator | ✅        | `NavigationProgress.tsx` |

### 4.2 Navigation Progress

**파일**: `components/layout/NavigationProgress.tsx`

**평가**: 적절히 구현됨.

| 항목                     | 구현 상태 | 비고                  |
| ------------------------ | --------- | --------------------- |
| rAF progress bar         | ✅        | 페이지 로드 진행 표시 |
| CSS transitions          | ✅        | 부드러운 애니메이션   |
| `prefers-reduced-motion` | ✅        | 접근성 준수           |

### 4.3 차트 로딩 상태

**파일**: `components/features/charts/DynamicCharts.tsx`

**평가**: 적절히 구현됨.

| 항목                          | 구현 상태 | 비고                     |
| ----------------------------- | --------- | ------------------------ |
| 동적 import 로딩 플레이스홀더 | ✅        | 차트 로딩 중 skeleton    |
| Error boundary                | ✅        | 차트 실패 시 대체 콘텐츠 |

---

## 5. UX 패턴 및 피드백

### 5.1 피드백 메커니즘

| 메커니즘               | 파일 | 평가                |
| ---------------------- | ---- | ------------------- |
| Toast notifications    | 여러 | 성공/실패 피드백    |
| Form validation errors | 여러 | 입력 검증 피드백    |
| Loading spinners       | 여러 | 비동기 작업 피드백  |
| Empty states           | 여러 | 데이터 없음 시 안내 |

### 5.2 폼 검증

**`app/actions/checkout.ts`**:

- Rate limiting (10/min/IP)
- Input length validation (buyerName ≤50, email ≤254, phone ≤20, address ≤200)
- Email normalization

**`app/actions/order-lookup.ts`**:

- Rate limiting (5/min/IP)
- Phone normalization

**`app/actions/feedback.ts`**:

- Auth guard, admin guard
- Text sanitization
- Category/status validation

**강점**:

- Server actions에서 입력 검증 — 클라이언트 우회 방지
- Rate limiting — DDoS/abuse 방지
- Input sanitization — XSS 방지

---

## 6. 종합 개선 사항 우선순위

### 높은 우선순위 (High)

| #                                                     | 항목                                       | 파일                                    | 예상 효과              |
| ----------------------------------------------------- | ------------------------------------------ | --------------------------------------- | ---------------------- |
| 1                                                     | 에러 로깅을 외부 서비스 (Sentry 등)로 연동 | `app/error.tsx`, `app/global-error.tsx` | 프로덕션 에러 모니터링 |
| 2. 리트라이 로직에 Jitter 추가 (Thundering Herd 방지) | `lib/retry.ts`                             | 재시도 충돌 방지                        |

### 중간 우선순위 (Medium)

| #                                                      | 항목                                                 | 파일             | 예상 효과 |
| ------------------------------------------------------ | ---------------------------------------------------- | ---------------- | --------- |
| 3. 로딩 상태 일관성 — 전역 로딩 오버레이 표준화        | 전체                                                 | UX 일관성        |
| 4. 에러 페이지에 "돌아가기" / "홈으로" 링크 추가       | `app/error.tsx`, `app/global-error.tsx`              | 사용자 이탈 감소 |
| 5. 차트/3D error boundary에 "기술 지원 문의" 링크 추가 | `ChartErrorBoundary.tsx`, `VirtualGalleryPortal.tsx` | 지원 효율성      |

### 낮은 우선순위 (Low)

| #                                           | 항목 | 파일             | 예상 효과 |
| ------------------------------------------- | ---- | ---------------- | --------- |
| 6. Offline fallback — Service Worker 연동   | 전체 | 오프라인 접근성  |
| 7. 에러 분석 대시보드 — 에러 빈도/유형 분석 | 전체 | 데이터 기반 개선 |

---

## 부록: 파일 인벤토리

### 에러 바운더리

| 파일                                                           | 역할                      | 평가     |
| -------------------------------------------------------------- | ------------------------- | -------- |
| `app/error.tsx`                                                | 페이지 레벨 에러 바운더리 | **우수** |
| `app/global-error.tsx`                                         | 루트 레벨 에러 바운더리   | **우수** |
| `components/features/charts/ChartErrorBoundary.tsx`            | 차트 error boundary       | **우수** |
| `components/features/virtual-gallery/VirtualGalleryPortal.tsx` | 3D error boundary         | **우수** |

### 리트라이 로직

| 파일                         | 역할                   | 평가     |
| ---------------------------- | ---------------------- | -------- |
| `lib/retry.ts`               | 기본 리트라이 유틸리티 | **우수** |
| `hooks/useRetry.ts`          | React hook 리트라이    | **우수** |
| `hooks/useFetchWithRetry.ts` | Fetch 리트라이 hook    | **우수** |

### 로딩 상태

| 파일                                           | 역할                   | 평가     |
| ---------------------------------------------- | ---------------------- | -------- |
| `app/loading.tsx`                              | Suspense fallback      | **우수** |
| `components/layout/NavigationProgress.tsx`     | rAF progress bar       | **우수** |
| `components/features/charts/DynamicCharts.tsx` | 차트 로딩 플레이스홀더 | **우수** |

### UX 피드백

| 파일                          | 역할                                      | 평가     |
| ----------------------------- | ----------------------------------------- | -------- |
| `app/actions/checkout.ts`     | 체크아웃 서버 액션 (검증, rate limiting)  | **우수** |
| `app/actions/order-lookup.ts` | 주문 조회 서버 액션 (검증, rate limiting) | **우수** |
| `app/actions/feedback.ts`     | 피드백 서버 액션 (검증, sanitization)     | **우수** |

---

**리뷰 완료일**: 2026-04-22  
**다음 리뷰 권장**: 2026-07-22 (3개월 후, 에러 빈도/유형 분석)
