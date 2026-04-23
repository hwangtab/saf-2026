# SAF 2026 종합 코드 리뷰 — 개선 사항 및 우선순위

**작성일**: 2026-04-22  
**리뷰 범위**: 전체 코드베이스 (보안, 성능, SEO, 접근성, 결제, 에러 처리, UX)  
**등급**: 외부 유출 금지

---

## 목차

1. [Executive 요약](#1-executive-요약)
2. [전체 코드베이스 평가](#2전체-코드베이스-평가)
3. [우선순위별 개선 사항](#3우선순위별-개선-사항)
4. [파일 인벤토리 (전체)](#4파일-인벤토리-전체)
5. [추천 로드맵](#5추천-로드맵)

---

## 1. Executive 요약

SAF 2026 웹사이트는 **전반적으로 높은 보안, 성능, SEO, 접근성 수준**을 유지하고 있습니다. 결제 시스템, 다국어 지원, 3D 가상 갤러리 등 전문적인 구현이 확인되었습니다.

### 전체 등급

| 영역             | 등급 | 주요 발견                    |
| ---------------- | ---- | ---------------------------- |
| **보안**         | B+   | 1 CRITICAL, 3 HIGH, 5 MEDIUM |
| **성능**         | A-   | 2 P0, 3 P1, 3 P2             |
| **SEO**          | A    | 0 critical, 3 high, 3 medium |
| **접근성**       | A    | 0 critical, 3 high, 3 medium |
| **에러 처리/UX** | A-   | 0 critical, 2 high, 3 medium |
| **결제 시스템**  | A-   | 1 HIGH, 2 medium             |

### 전체 우선순위 요약

| 우선순위             | 항목 수 | 예상 영향                      |
| -------------------- | ------- | ------------------------------ |
| **Immediate** (즉시) | 4       | CRITICAL/HIGH 보안 취약점 해결 |
| **High** (높음)      | 8       | 핵심 기능 개선                 |
| **Medium** (중간)    | 12      | UX/안정성 개선                 |
| **Low** (낮음)       | 8       | 장기 개선                      |

---

## 2. 전체 코드베이스 평가

### 2.1 강점

1. **결제 보안**: TossPayments 연동에서 금액 검증, optimistic locking, 레이스 컨디션 방어, idempotency, PII sanitization — 전문적 구현
2. **다국어 지원**: `next-intl` 기반 hreflang, sitemap 교차 참조 — 포괄적
3. **SEO**: 327줄 sitemap, 10종 JSON-LD 스키마 — 매우 포괄적
4. **접근성**: skip-to-main, ARIA labels, 44px 터치 영역, WCAG AA 대비율 — 전문적
5. **에러 처리**: 에러 바운더리, 리트라이 로직, 로딩 상태 — 적절
6. **이미지 최적화**: next/image, srcSet, LCP 최적화 — 잘 구현
7. **Dynamic Import**: 차트, 3D 갤러리 코드 스플리팅 — 적절

### 2.2 약점

1. **Admin 클라이언트 RLS 우회** (CRITICAL) — `lib/auth/server.ts`
2. **결제 정산 PII 노출** (HIGH) — `app/api/internal/reconcile-payments/route.ts`
3. **RequireAdmin status 체크 누락** (HIGH) — `lib/auth/guards.ts`
4. **환경 변수 정보 노출** (HIGH) — `lib/auth/server.ts`
5. **3D 갤러리 번들 크기** (P0) — 1.5MB+ Three.js
6. **차트 동시 로드** (P0) — 18개 Recharts 컴포넌트
7. **데이터 페칭 과다** (P1) — 홈 4개 쿼리, 작품 9개 쿼리

---

## 3. 우선순위별 개선 사항

### 3.1 즉시 조치 (Immediate) — 4개

| #   | 영역     | 항목                                                      | 파일                                           | 예상 영향                    |
| --- | -------- | --------------------------------------------------------- | ---------------------------------------------- | ---------------------------- |
| 1   | **보안** | Admin 클라이언트에 인가 체크 추가                         | `lib/auth/server.ts`                           | CRITICAL — 전체 DB 접근 방지 |
| 2   | **보안** | `reconcile-payments`에서 `sanitizeConfirmResponse()` 호출 | `app/api/internal/reconcile-payments/route.ts` | HIGH — PII 노출 방지         |
| 3   | **보안** | `requireAdmin()`에 `status === 'active'` 체크 추가        | `lib/auth/guards.ts`                           | HIGH — 정지 계정 접근 방지   |
| 4   | **보안** | 환경 변수 오류 메시지 일반화                              | `lib/auth/server.ts`                           | HIGH — 정보 노출 방지        |

### 3.2 높은 우선순위 (High) — 8개

| #   | 영역     | 항목                                                              | 파일                                  | 예상 영향                     |
| --- | -------- | ----------------------------------------------------------------- | ------------------------------------- | ----------------------------- |
| 5   | **보안** | OAuth `state` 파라미터 검증 추가                                  | `app/(auth)/auth/callback/route.ts`   | CSRF 방지                     |
| 6   | **보안** | 세션 쿠키에 `Secure`, `HttpOnly`, `SameSite='strict'` 명시적 설정 | `lib/auth/middleware.ts`              | 세션 보안 강화                |
| 7   | **보안** | `/api/internal/*` 엔드포인트에 IP allowlist 추가                  | 여러 internal 라우트                  | 크론\_SECRET 유출 시 보호     |
| 8   | **보안** | `minimum_password_length` 8+으로 증가                             | `supabase/config.toml`                | 계정 보안 강화                |
| 9   | **성능** | 3D 갤러리 lazy loading — "View in Room" 클릭 시에만 로드          | 7 virtual-gallery 파일                | 초기 로딩 1.5MB+ 제거         |
| 10  | **성능** | 차트 페이지 lazy loading — 탭/스크롤 시에만 로드                  | 18 chart 파일                         | 차트 페이지 300KB+ JS 제거    |
| 11  | **성능** | 홈 페이지 4개 쿼리를 1개로 통합 후 클라이언트 split               | `app/[locale]/page.tsx`               | 240 → 60 row fetch (75% 감소) |
| 12  | **성능** | 작품 상세 페이지 9개 쿼리를 2-3개로 통합                          | `app/[locale]/artworks/[id]/page.tsx` | 9 → 2-3 DB 호출               |

### 3.3 중간 우선순위 (Medium) — 12개

| #   | 영역          | 항목                                                                    | 파일                                                           | 예상 영향                  |
| --- | ------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------- |
| 13  | **보안**      | MFA 활성화 (TOTP, WebAuthn)                                             | `supabase/config.toml`                                         | 계정 보안                  |
| 14  | **보안**      | `allowed_cidrs`를 Vercel IP로 제한                                      | `supabase/config.toml`                                         | DB 접근 제한               |
| 15  | **보안**      | `.env.local.example`에서 시크릿 placeholder 제거 또는 `.gitignore` 명시 | `.env.local.example`                                           | 시크릿 노출 방지           |
| 16  | **보안**      | `get_my_role()` 함수에 SECURITY INVOKER 확인                            | `supabase/migrations/20260206010000_optimize_profiles_rls.sql` | RLS 우회 방지              |
| 17  | **성능**      | Shadow map size 2048 → 1024 (데스크톱), 512 (모바일)                    | `VirtualRoom.tsx`                                              | GPU 메모리 75% 감소        |
| 18  | **성능**      | PMREMGenerator + procedural texture 빌드 타임 pre-generate              | `RoomGeometry.tsx`, `proceduralTextures.ts`                    | 3D 장면 초기화 500ms+ 개선 |
| 19  | **성능**      | Client-side Canvas2D image conversion을 Web Worker로 이동               | `lib/client/image-optimization.ts`                             | 메인 스레드 차단 제거      |
| 20  | **성능**      | Admin portal layout을 서버 컴포넌트로 변경                              | `app/(portal)/layout.tsx`                                      | 200KB+ JS 제거             |
| 21  | **결제**      | Payment INSERT 실패 시 503 반환 + reconciliation cron으로 보정          | `app/api/payments/toss/confirm/route.ts`                       | 결제 기록 누락 방지        |
| 22  | **SEO**       | `BreadcrumbList` JSON-LD 스키마 추가                                    | `components/common/JsonLdScript.tsx`                           | Google 크립 결과 향상      |
| 23  | **접근성**    | 자동 접근성 테스트 (axe-core) CI 파이프라인에 추가                      | 전체                                                           | 접근성 regressions 방지    |
| 24  | **에러 처리** | 에러 로깅을 외부 서비스 (Sentry 등)로 연동                              | `app/error.tsx`, `app/global-error.tsx`                        | 프로덕션 에러 모니터링     |

### 3.4 낮은 우선순위 (Low) — 8개

| #   | 영역          | 항목                                                                     | 파일                                    | 예상 영향              |
| --- | ------------- | ------------------------------------------------------------------------ | --------------------------------------- | ---------------------- |
| 25  | **보안**      | 모듈 레벨 싱글톤 클라이언트 대신 요청별 클라이언트 생성 (핫 리로드 대응) | `lib/supabase.ts`                       | 개발 환경 안정성       |
| 26  | **보안**      | `CSP unsafe-eval` 트레이드오프 문서화                                    | `next.config.js`                        | 보안 트레이드오프 명시 |
| 27  | **성능**      | 홈 페이지 priority 이미지를 1-2개로 제한                                 | `HeroGalleryGrid.tsx`                   | LCP 경쟁자 감소        |
| 28  | **성능**      | `ANALYZE=true npm run build`로 실제 번들 크기 측정                       | 전체                                    | 번들 크기 가시성 확보  |
| 29  | **SEO**       | sitemap.xml chunking 또는 sitemap index (330+ 작품)                      | `app/sitemap.ts`                        | sitemap 크기 관리      |
| 30  | **접근성**    | 포커스 트랩 — 모달/다이얼로그에서 포커스 관리                            | `components/common/Header.tsx` 등       | 키보드 접근성 향상     |
| 31  | **에러 처리** | 에러 페이지에 "돌아가기" / "홈으로" 링크 추가                            | `app/error.tsx`, `app/global-error.tsx` | 사용자 이탈 감소       |
| 32  | **결제**      | 결제 로그审计 — 모든 결제 시도 로깅                                      | 전체                                    | 감사 추적              |

---

## 4. 파일 인벤토리 (전체)

### 4.1 보안 관련 파일

| 파일                                            | 역할                       | 심각도       | 개선 #    |
| ----------------------------------------------- | -------------------------- | ------------ | --------- |
| `lib/auth/server.ts`                            | Admin 클라이언트 생성      | **CRITICAL** | 1, 4      |
| `lib/auth/guards.ts`                            | 인증/인가 가드             | **HIGH**     | 3         |
| `lib/auth/middleware.ts`                        | Supabase SSR 세션 업데이트 | MEDIUM       | 6         |
| `app/(auth)/auth/callback/route.ts`             | OAuth 콜백                 | MEDIUM       | 5         |
| `app/api/internal/reconcile-payments/route.ts`  | 결제 정산 (cron)           | **HIGH**     | 2         |
| `app/api/internal/purge-trash/route.ts`         | 휴지통 삭제 (cron)         | MEDIUM       | 7         |
| `app/api/internal/expire-stale-orders/route.ts` | 만료 주문 (cron)           | MEDIUM       | 7         |
| `supabase/config.toml`                          | Supabase 설정              | MEDIUM       | 8, 13, 14 |
| `.env.local.example`                            | 환경 변수 예시             | MEDIUM       | 15        |
| `next.config.js`                                | Next.js 설정 (CSP 등)      | GOOD         | 26        |

### 4.2 성능 관련 파일

| 파일                                  | 역할                          | 우선순위 | 개선 #    |
| ------------------------------------- | ----------------------------- | -------- | --------- |
| 7 virtual-gallery 파일                | 3D 갤러리                     | P0       | 9, 17, 18 |
| 18 chart 파일                         | Recharts 차트                 | P0       | 10        |
| `app/[locale]/page.tsx`               | 홈 페이지 (4개 쿼리)          | P1       | 11, 27    |
| `app/[locale]/artworks/[id]/page.tsx` | 작품 상세 (9개 쿼리)          | P1       | 12        |
| `app/(portal)/layout.tsx`             | Portal layout (client)        | P1       | 20        |
| `lib/supabase-data.ts`                | 이중 캐싱                     | MEDIUM   | —         |
| `lib/client/image-optimization.ts`    | Canvas2D WebP/JPEG            | P2       | 19        |
| `HeroGalleryGrid.tsx`                 | 16개 SafeImage (4개 priority) | P3       | 27        |

### 4.3 SEO 관련 파일

| 파일                                 | 역할               | 등급          | 개선 # |
| ------------------------------------ | ------------------ | ------------- | ------ |
| `app/sitemap.ts` (327줄)             | 전체 sitemap       | **매우 우수** | 29     |
| `components/common/JsonLdScript.tsx` | JSON-LD 렌더링     | **우수**      | 22     |
| `lib/seo.ts`                         | SEO 유틸리티       | **우수**      | —      |
| `app/layout.tsx`                     | 루트 metadata      | **우수**      | —      |
| `app/[locale]/page.tsx`              | 홈 페이지 metadata | **우수**      | —      |

### 4.4 접근성 관련 파일

| 파일                           | 역할                              | 등급     | 개선 # |
| ------------------------------ | --------------------------------- | -------- | ------ |
| `app/layout.tsx`               | Skip-to-main, ARIA, semantic HTML | **우수** | 23, 30 |
| `components/common/Header.tsx` | 네비게이션 접근성                 | **우수** | 30     |
| `lib/colors.ts`                | 브랜드 컬러, WCAG AA 대비율       | **우수** | —      |

### 4.5 에러 처리/UX 관련 파일

| 파일                         | 역할                      | 등급     | 개선 # |
| ---------------------------- | ------------------------- | -------- | ------ |
| `app/error.tsx`              | 페이지 레벨 에러 바운더리 | **우수** | 24, 31 |
| `app/global-error.tsx`       | 루트 레벨 에러 바운더리   | **우수** | 24, 31 |
| `lib/retry.ts`               | 기본 리트라이 유틸리티    | **우수** | —      |
| `hooks/useRetry.ts`          | React hook 리트라이       | **우수** | —      |
| `hooks/useFetchWithRetry.ts` | Fetch 리트라이 hook       | **우수** | —      |
| `app/loading.tsx`            | Suspense fallback         | **우수** | —      |

### 4.6 결제 시스템 관련 파일

| 파일                                           | 역할                   | 등급          | 개선 # |
| ---------------------------------------------- | ---------------------- | ------------- | ------ |
| `app/api/payments/toss/confirm/route.ts`       | 결제 확인              | **매우 우수** | 21     |
| `app/api/webhooks/toss/route.ts`               | Toss 웹훅              | **매우 우수** | —      |
| `lib/integrations/toss/sanitize.ts`            | PII 필드 제거          | **우수**      | —      |
| `lib/integrations/toss/config.ts`              | 환경 변수 기반 설정    | **적절**      | —      |
| `lib/integrations/toss/types.ts`               | Toss 결제/웹훅/DB 타입 | **우수**      | —      |
| `app/api/internal/reconcile-payments/route.ts` | 결제 정산 (cron)       | **HIGH**      | 2      |

---

## 5. 추천 로드맵

### Phase 1 — 보안 긴급 조치 (1-2주)

| #   | 항목                                                              | 예상 작업량 |
| --- | ----------------------------------------------------------------- | ----------- |
| 1   | Admin 클라이언트에 인가 체크 추가                                 | 2시간       |
| 2   | `reconcile-payments`에서 `sanitizeConfirmResponse()` 호출         | 1시간       |
| 3   | `requireAdmin()`에 `status === 'active'` 체크 추가                | 1시간       |
| 4   | 환경 변수 오류 메시지 일반화                                      | 30분        |
| 5   | OAuth `state` 파라미터 검증 추가                                  | 2시간       |
| 6   | 세션 쿠키에 `Secure`, `HttpOnly`, `SameSite='strict'` 명시적 설정 | 1시간       |

**총 예상 작업량**: 7.5시간

### Phase 2 — 성능 최적화 (2-4주)

| #   | 항목                                       | 예상 작업량 |
| --- | ------------------------------------------ | ----------- |
| 9   | 3D 갤러리 lazy loading                     | 4시간       |
| 10  | 차트 페이지 lazy loading                   | 4시간       |
| 11  | 홈 페이지 4개 쿼리를 1개로 통합            | 3시간       |
| 12  | 작품 상세 페이지 9개 쿼리를 2-3개로 통합   | 4시간       |
| 17  | Shadow map size 최적화                     | 2시간       |
| 18  | Procedural texture 빌드 타임 pre-generate  | 4시간       |
| 20  | Admin portal layout을 서버 컴포넌트로 변경 | 4시간       |

**총 예상 작업량**: 25시간

### Phase 3 — SEO/접근성/에러 처리 개선 (2-3주)

| #   | 항목                                          | 예상 작업량 |
| --- | --------------------------------------------- | ----------- |
| 22  | `BreadcrumbList` JSON-LD 스키마 추가          | 2시간       |
| 23  | 자동 접근성 테스트 CI 파이프라인에 추가       | 4시간       |
| 24  | 에러 로깅 Sentry 연동                         | 4시간       |
| 29  | sitemap.xml chunking 또는 sitemap index       | 2시간       |
| 30  | 포커스 트랩 — 모달/다이얼로그에서 포커스 관리 | 3시간       |
| 31  | 에러 페이지에 "돌아가기" / "홈으로" 링크 추가 | 1시간       |

**총 예상 작업량**: 16시간

### Phase 4 — 장기 개선 (지속적)

| #   | 항목                                                           | 예상 작업량 |
| --- | -------------------------------------------------------------- | ----------- |
| 13  | MFA 활성화                                                     | 4시간       |
| 14  | `allowed_cidrs`를 Vercel IP로 제한                             | 2시간       |
| 15  | `.env.local.example`에서 시크릿 placeholder 제거               | 30분        |
| 19  | Client-side Canvas2D image conversion을 Web Worker로 이동      | 6시간       |
| 21  | Payment INSERT 실패 시 503 반환 + reconciliation cron으로 보정 | 3시간       |
| 25  | 모듈 레벨 싱글톤 클라이언트 대신 요청별 클라이언트 생성        | 2시간       |
| 26  | `CSP unsafe-eval` 트레이드오프 문서화                          | 1시간       |
| 27  | 홈 페이지 priority 이미지를 1-2개로 제한                       | 1시간       |
| 28  | `ANALYZE=true npm run build`로 실제 번들 크기 측정             | 1시간       |
| 32  | 결제 로그审计 — 모든 결제 시도 로깅                            | 3시간       |

**총 예상 작업량**: 23시간

---

## 전체 예상 작업량

| Phase                          | 기간      | 작업량       |
| ------------------------------ | --------- | ------------ |
| Phase 1 — 보안 긴급 조치       | 1-2주     | 7.5시간      |
| Phase 2 — 성능 최적화          | 2-4주     | 25시간       |
| Phase 3 — SEO/접근성/에러 처리 | 2-3주     | 16시간       |
| Phase 4 — 장기 개선            | 지속적    | 23시간       |
| **총계**                       | **5-9주** | **71.5시간** |

---

## 부록: 리뷰 문서 목록

| 문서                   | 파일                                    | 주요 내용                                                                                  |
| ---------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------ |
| 보안 코드 리뷰         | `docs/SECURITY-CODE-REVIEW.md`          | 인증, 인가, API, 데이터베이스, 환경 변수, 입력 검증, CSRF/XSS, 세션 관리                   |
| 성능 코드 리뷰         | `docs/PERFORMANCE-CODE-REVIEW.md`       | 이미지 최적화, 서버/클라이언트 경계, 데이터 페칭, 번들 크기, Three.js, Recharts, 중계 연산 |
| SEO/접근성 코드 리뷰   | `docs/SEO-ACCESSIBILITY-CODE-REVIEW.md` | sitemap, JSON-LD, metadata, hreflang, 접근성, 색상 시스템                                  |
| 에러 처리/UX 코드 리뷰 | `docs/ERROR-HANDLING-UX-CODE-REVIEW.md` | 에러 바운더리, 리트라이 로직, 로딩 상태, UX 패턴, 피드백 메커니즘                          |
| 결제 시스템 코드 리뷰  | `docs/PAYMENT-SYSTEM-CODE-REVIEW.md`    | TossPayments 연동 (confirm, webhook, sanitize, config, types)                              |

---

**리뷰 완료일**: 2026-04-22  
**다음 리뷰 권장**: 2026-07-22 (3개월 후)  
**다음 리뷰 범위**: 개선 사항 적용 확인, 새로운 취약점/성능 이슈 확인
