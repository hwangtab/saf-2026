# SAF 2026 보안 코드 리뷰 보고서

**작성일**: 2026-04-22  
**리뷰 범위**: 전체 코드베이스 (인증, 인가, API, 데이터베이스, 환경 변수, 입력 검증, CSRF/XSS, 세션 관리)  
**등급**: 외부 유출 금지

---

## 목차

1. [ executive 요약](#1-executive-요약)
2. [인증 및 인가 시스템](#2-인증-및-인가-시스템)
3. [Supabase 클라이언트 구성 및 RLS](#3-supabase-클라이언트-구성-및-rls)
4. [API 라우트 보안](#4-api-라우트-보안)
5. [환경 변수 처리](#5-환경-변수-처리)
6. [입력 검증 / sanitization](#6-입력-검증--sanitization)
7. [CSRF / XSS 방지](#7-csrf--xss-방지)
8. [세션 관리](#8-세션-관리)
9. [종합 개선 사항 우선순위](#9-종합-개선-사항-우선순위)

---

## 1. Executive 요약

SAF 2026 웹사이트는 전반적으로 **높은 보안 수준**을 유지하고 있습니다. 결제 검증, 웹훅 시그니처 검증, CSP 헤더, 입력 sanitization 등 핵심 보안 메커니즘이 적절히 구현되어 있습니다.

다만 **4개의 치명적/중등도 취약점**이 확인되었습니다:

| 심각도       | 항목                                                | 파일                                           | 영향                                           |
| ------------ | --------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| **CRITICAL** | Admin 클라이언트가 RLS 우회 — 인가 체크 없음        | `lib/auth/server.ts`                           | 전체 데이터베이스 무제한 접근                  |
| **HIGH**     | `requireAdmin()`이 `status === 'active'` 체크 안 함 | `lib/auth/guards.ts`                           | 정지된 관리자 계정으로도 관리자 기능 접근 가능 |
| **HIGH**     | 결제 확인 응답 raw 저장 (sanitization 누락)         | `app/api/internal/reconcile-payments/route.ts` | 카드 번호 등 PII 노출 가능성                   |
| **HIGH**     | 환경 변수 누락 시 상세 오류 메시지 (정보 노출)      | `lib/auth/server.ts`                           | 공격자가 어떤 시크릿 키가 없는지 파악 가능     |

---

## 2. 인증 및 인가 시스템

### 2.1 `lib/auth/server.ts` — [CRITICAL]

**문제**: `createSupabaseAdminClient()` 함수는 `SUPABASE_SECRET_KEY` 또는 `SUPABASE_SERVICE_ROLE_KEY`를 사용하여 Supabase 클라이언트를 생성합니다. 이 클라이언트는 **모든 RLS (Row Level Security) 정책을 우회**합니다.

```typescript
// 현재 코드 (문제)
export function createSupabaseAdminClient() {
  const url = getEnvVar('SUPABASE_URL');
  const key = getEnvVar('SUPABASE_SECRET_KEY') || getEnvVar('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}
```

**영향**: 이 함수를 호출하는 15개 이상의 서버 액션 및 API 라우트에서 명시적인 관리자 권한 체크 없이 호출될 경우, **누구나 전체 데이터베이스에 읽기/쓰기 권한**을 갖게 됩니다.

**해결 방안**:

- `createSupabaseAdminClient()` 호출 전에 반드시 `requireAdmin()` 또는 동등한 인가 체크를 수행해야 함
- 또는 함수 내부에서 호출 스택을 확인하여 관리자 컨텍스트에서만 반환하도록 수정

### 2.2 `lib/auth/guards.ts` — [HIGH]

**문제 1**: `requireAdmin()`이 `profile.role === 'admin'`만 확인하고 `profile.status === 'active'`는 확인하지 않습니다.

```typescript
// 현재 코드 (문제)
export async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (profile.role !== 'admin') {
    throw new AuthorizationError('Admin access required');
  }
  // status 체크 누락!
}
```

**해결 방안**:

```typescript
export async function requireAdmin() {
  const profile = await getCurrentProfile();
  if (profile.role !== 'admin' || profile.status !== 'active') {
    throw new AuthorizationError('Admin access required');
  }
  return profile;
}
```

**문제 2**: `requireArtistActive()` 및 `requireExhibitor()`은 매칭되지 않는 사용자를 `/`로 리디렉션합니다. 이는 **정보 누설**입니다 — 공격자가 특정 이메일의 사용자 존재 여부를 확인할 수 있습니다.

**해결 방안**: 존재 여부와 무관하게 동일한 오류 페이지/메시지를 반환.

### 2.3 `lib/auth/middleware.ts` — [MEDIUM]

**문제**: 세션 쿠키가 `Secure`, `HttpOnly`, `SameSite='strict'` 플래그를 명시적으로 설정하지 않습니다. Supabase 기본값에 의존합니다.

**해결 방안**: 명시적 쿠키 플래그 설정을 middleware에 추가.

### 2.4 `app/(auth)/auth/callback/route.ts` — [MEDIUM]

**문제**: OAuth 코드 교환 시 `state` 파라미터 (CSRF 보호)를 검증하지 않습니다.

**해결 방안**: OAuth 플로우에서 `state` 파라미터 검증 추가.

---

## 3. Supabase 클라이언트 구성 및 RLS

### 3.1 `lib/supabase.ts` — [LOW]

**문제**: 모듈 레벨 싱글톤 — 환경 변수가 모듈 로드 시점에 읽힙니다. 핫 리로드 중 환경 변수가 변경되면 클라이언트가 stale해질 수 있습니다.

**영향**: 개발 환경에서 핫 리로드 시 일시적인 연결 오류 가능성. 프로덕션에서는 영향 미미.

### 3.2 `supabase/migrations/20260421060319_fix_profiles_privilege_escalation.sql` — [GOOD]

**평가**: 최근 privilege escalation 취약점 수정 — column-level GRANT + BEFORE UPDATE trigger로 self-escalation 방지. 적절히 구현됨.

### 3.3 `supabase/migrations/20260206010000_optimize_profiles_rls.sql` — [MEDIUM]

**문제**: RLS 정책이 `auth.uid() = id` OR `get_my_role() = 'admin'`을 허용합니다. `get_my_role()` 함수가 매 SELECT마다 호출되며, 이 함수가 compromised될 경우 RLS 우회 가능.

**해결 방안**: 함수에 `SECURITY DEFINER` 대신 `SECURITY INVOKER` 사용 확인, 또는 함수 자체에 RLS 적용.

---

## 4. API 라우트 보안

### 4.1 `app/api/internal/purge-trash/route.ts` — [MEDIUM]

**문제**: Cron 보호가 `timingSafeEqual`로 구현되었지만 **IP allowlist가 없습니다**. `CRON_SECRET`을 아는 누구나 이 엔드포인트를 호출할 수 있습니다.

**해결 방안**: Vercel 내부 요청만 허용하는 IP/헤더 검증 추가.

### 4.2 `app/api/internal/expire-stale-orders/route.ts` — [MEDIUM]

**문제**: 동일한 패턴 — cron 시크릿 인증 없이 IP 제한 없음.

### 4.3 `app/api/internal/reconcile-payments/route.ts` — [HIGH]

**문제**: `payments` 레코드를 생성할 때 `confirm_response: tossPayment as Record<string, unknown>`으로 **sanitization 없이 raw Toss 데이터를 저장**합니다. `/api/payments/toss/confirm/route.ts`는 `sanitizeConfirmResponse()`를 호출하지만, 이 라우트는 호출하지 않습니다.

**영향**: 카드 번호, 승인 번호, 모바일 전화번호 등 PII가 데이터베이스에 raw로 저장될 수 있습니다.

**해결 방안**: 기존 `sanitizeConfirmResponse()` 함수를 재사용.

```typescript
// 현재 코드 (문제)
await supabase.from('payments').insert({
  confirm_response: tossPayment as Record<string, unknown>, // PII 노출!
});

// 해결 방안
await supabase.from('payments').insert({
  confirm_response: sanitizeConfirmResponse(tossPayment),
});
```

### 4.4 `app/api/payments/toss/confirm/route.ts` — [GOOD]

**평가**: 금액 검증 (SEC-01), optimistic locking, 레이스 컨디션 처리, idempotency key, PII sanitization — 견고하게 구현됨.

### 4.5 `app/api/webhooks/toss/route.ts` — [GOOD]

**평가**: 웹훅 시크릿 검증, per-payment secret, Toss API double-verify, idempotency guards — 적절히 구현됨.

### 4.6 `app/api/webhooks/vercel-drain/route.ts` — [GOOD]

**평가**: HMAC-SHA1 signature verification, schema validation, portal path filtering — 적절.

---

## 5. 환경 변수 처리

### 5.1 `.env.local.example` — [MEDIUM]

**문제**: `TOSS_PAYMENTS_SECRET_KEY`, `TOSS_PAYMENTS_WEBHOOK_SECRET`, `RESEND_API_KEY`의 placeholder 값이 포함되어 있습니다. 이러한 파일이 git에 커밋될 경우 시크릿 키 패턴이 노출됩니다.

**해결 방안**: `.gitignore`에 명시적 포함 또는 비기능적 placeholder만 사용.

### 5.2 `lib/auth/server.ts` — [HIGH]

**문제**: 환경 변수 누락 시 **어떤 변수가 없는지 상세히 알려주는 오류 메시지**를 반환합니다. 이는 공격자에게 어떤 시크릿 키가 필요한지 알려줍니다.

```typescript
// 현재 코드 (문제)
function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
    // ^ 공격자에게 어떤 변수가 있는지 알려줌
  }
  return value;
}
```

**해결 방안**:

```typescript
function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error('Configuration error'); // 일반화된 메시지
  }
  return value;
}
```

---

## 6. 입력 검증 / Sanitization

### 6.1 `lib/utils/text-sanitizer.ts` — [GOOD]

**평가**: control chars (U+0000-U+0008, U+000B, U+000C, U+000E-U+001F, U+007F), script breakers (U+2028/U+2029), `</script>` 패턴 제거 — 적절.

### 6.2 `lib/integrations/toss/sanitize.ts` — [GOOD]

**평가**: `card.number`, `card.approveNo`, `mobilePhone.customerMobilePhone` 제거 — 적절.

### 6.3 `lib/auth/terms-consent.ts` — [GOOD]

**평가**: `sanitizeInternalPath()`이 open redirect 방지 — `//`, `/terms-consent`, `?`, `#`, backslashes, control chars 차단.

### 6.4 `app/actions/checkout.ts` — [GOOD]

**평가**: rate limiting (10/min/IP), input length validation (buyerName ≤50, email ≤254, phone ≤20, address ≤200) — 적절.

---

## 7. CSRF / XSS 방지

### 7.1 `next.config.js` — [GOOD]

**설정된 보안 헤더**:

| 헤더                        | 값                                                            | 평가 |
| --------------------------- | ------------------------------------------------------------- | ---- |
| `Content-Security-Policy`   | `default-src 'self'`, `base-uri 'self'`, `form-action 'self'` | 적절 |
| `X-Frame-Options`           | `DENY`                                                        | 적절 |
| `X-Content-Type-Options`    | `nosniff`                                                     | 적절 |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains`                         | 적절 |
| `Permissions-Policy`        | `camera=(), microphone=(), geolocation=()`                    | 적절 |

**주의사항**:

- `script-src`에 `'unsafe-eval'` 포함 (Kakao Map SDK 필요) — 트레이드오프 명시적 문서화 권장
- `script-src`에 `'unsafe-inline'` 포함 — XSS 보호 약화

**CSRF 토큰**: Server Actions는 Next.js의 built-in origin checking으로 CSRF 보호되지만, 커스텀 API 라우트 (`internal/*`)는 CSRF 토큰이 없습니다.

---

## 8. 세션 관리

### 8.1 `supabase/config.toml` — [MEDIUM]

| 설정                    | 현재 값        | 권장 값      | 평가     |
| ----------------------- | -------------- | ------------ | -------- |
| JWT expiry              | 3600초 (1시간) | 3600초       | 적절     |
| Refresh token rotation  | enabled        | enabled      | 적절     |
| MFA                     | disabled       | enabled 권장 | **약점** |
| Minimum password length | 6              | 8+ 권장      | **약점** |
| Anonymous sign-ins      | disabled       | disabled     | 적절     |
| Allowed CIDRs           | `0.0.0.0/0`    | 제한 권장    | **약점** |

**해결 방안**:

- MFA (TOTP, WebAuthn) 활성화
- Minimum password length 8+으로 증가
- `allowed_cidrs`를 Vercel IP 범위로 제한

---

## 9. 종합 개선 사항 우선순위

### 즉시 조치 (Immediate)

| #                                                     | 항목                                                      | 파일                                           | 예상 영향                    |
| ----------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------- | ---------------------------- |
| 1                                                     | Admin 클라이언트에 인가 체크 추가                         | `lib/auth/server.ts`                           | CRITICAL — 전체 DB 접근 방지 |
| 2                                                     | `reconcile-payments`에서 `sanitizeConfirmResponse()` 호출 | `app/api/internal/reconcile-payments/route.ts` | HIGH — PII 노출 방지         |
| 3. `requireAdmin()`에 `status === 'active'` 체크 추가 | `lib/auth/guards.ts`                                      | HIGH — 정지 계정 접근 방지                     |
| 4. 환경 변수 오류 메시지 일반화                       | `lib/auth/server.ts`                                      | HIGH — 정보 노출 방지                          |

### 높은 우선순위 (High)

| #                                                                    | 항목                             | 파일                                |
| -------------------------------------------------------------------- | -------------------------------- | ----------------------------------- |
| 5                                                                    | OAuth `state` 파라미터 검증 추가 | `app/(auth)/auth/callback/route.ts` |
| 6. 세션 쿠키에 `Secure`, `HttpOnly`, `SameSite='strict'` 명시적 설정 | `lib/auth/middleware.ts`         |
| 7. `/api/internal/*` 엔드포인트에 IP allowlist 추가                  | 여러 internal 라우트             |
| 8. `minimum_password_length` 8+으로 증가                             | `supabase/config.toml`           |

### 중간 우선순위 (Medium)

| #                                                                           | 항목                                                           | 파일 |
| --------------------------------------------------------------------------- | -------------------------------------------------------------- | ---- |
| 9. MFA 활성화 (TOTP, WebAuthn)                                              | `supabase/config.toml`                                         |
| 10. `allowed_cidrs`를 Vercel IP로 제한                                      | `supabase/config.toml`                                         |
| 11. `.env.local.example`에서 시크릿 placeholder 제거 또는 `.gitignore` 명시 | `.env.local.example`                                           |
| 12. `get_my_role()` 함수에 SECURITY INVOKER 확인                            | `supabase/migrations/20260206010000_optimize_profiles_rls.sql` |

### 낮은 우선순위 (Low)

| #                                                                            | 항목                 | 파일 |
| ---------------------------------------------------------------------------- | -------------------- | ---- |
| 13. 모듈 레벨 싱글톤 클라이언트 대신 요청별 클라이언트 생성 (핫 리로드 대응) | `lib/supabase.ts`    |
| 14. `CSP unsafe-eval` 트레이드오프 문서화                                    | `next.config.js`     |
| 15. 정보 누설 리디렉션 동일 메시지 반환                                      | `lib/auth/guards.ts` |

---

## 부록: 파일 인벤토리

| 파일                                            | 역할                                               | 심각도       |
| ----------------------------------------------- | -------------------------------------------------- | ------------ |
| `middleware.ts`                                 | 메인 Next.js middleware: 세션 갱신, i18n, 리디렉션 | MEDIUM       |
| `lib/auth/middleware.ts`                        | Supabase SSR 세션 업데이트                         | MEDIUM       |
| `lib/auth/server.ts`                            | Admin 클라이언트 생성                              | **CRITICAL** |
| `lib/auth/client.ts`                            | 브라우저 클라이언트                                | LOW          |
| `lib/auth/guards.ts`                            | 인증/인가 가드                                     | **HIGH**     |
| `lib/auth/dashboard-context.ts`                 | 대시보드 컨텍스트 (stale data 위험)                | LOW          |
| `lib/auth/terms-consent.ts`                     | 약관 동의 관리                                     | GOOD         |
| `lib/supabase.ts`                               | 모듈 레벨 싱글톤 클라이언트                        | LOW          |
| `lib/rate-limit.ts`                             | 인메모리 rate limiter                              | MEDIUM       |
| `lib/utils/text-sanitizer.ts`                   | 텍스트 sanitization                                | GOOD         |
| `lib/integrations/toss/sanitize.ts`             | 결제 데이터 sanitization                           | GOOD         |
| `lib/integrations/toss/webhook.ts`              | Toss 웹훅 처리                                     | GOOD         |
| `app/(auth)/auth/callback/route.ts`             | OAuth 콜백                                         | MEDIUM       |
| `app/api/payments/toss/confirm/route.ts`        | 결제 확인                                          | GOOD         |
| `app/api/webhooks/toss/route.ts`                | Toss 웹훅                                          | GOOD         |
| `app/api/internal/purge-trash/route.ts`         | 휴지통 삭제 (cron)                                 | MEDIUM       |
| `app/api/internal/expire-stale-orders/route.ts` | 만료 주문 (cron)                                   | MEDIUM       |
| `app/api/internal/reconcile-payments/route.ts`  | 결제 정산                                          | **HIGH**     |
| `app/api/webhooks/vercel-drain/route.ts`        | Vercel Drain 웹훅                                  | GOOD         |
| `app/api/artworks/route.ts`                     | 공개 작품 API                                      | LOW          |
| `app/api/search/route.ts`                       | 공개 검색 API                                      | LOW          |
| `app/actions/checkout.ts`                       | 체크아웃 서버 액션                                 | GOOD         |
| `app/actions/order-lookup.ts`                   | 주문 조회 서버 액션                                | GOOD         |
| `app/actions/feedback.ts`                       | 피드백 서버 액션                                   | GOOD         |
| `supabase/config.toml`                          | Supabase 설정                                      | MEDIUM       |
| `next.config.js`                                | Next.js 설정 (CSP 등)                              | GOOD         |

---

**리뷰 완료일**: 2026-04-22  
**다음 리뷰 권장**: 2026-07-22 (3개월 후)
