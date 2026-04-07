# PRD: SAF 2026 이커머스 시스템 — 토스페이먼츠 직접 연동 + 확장 기능

**작성일**: 2026-04-06  
**수정일**: 2026-04-06  
**작성자**: PM  
**상태**: Draft v2  
**프로젝트**: SAF 2026 (씨앗페 온라인)

---

## 목차

**Part A: 토스페이먼츠 v2 직접 연동 (기본)**

1. [배경 및 목적](#1-배경-및-목적)
2. [연동 방식](#2-연동-방식-api-개별-연동-vs-결제위젯-연동)
3. [사용자 페르소나](#3-사용자-페르소나)
4. [기능 요구사항 — 핵심 결제](#4-기능-요구사항--핵심-결제)
5. [기술 설계](#5-기술-설계)
6. [개발/배포 전략](#6-개발배포-전략-git-브랜치-분리)
7. [UX 흐름](#7-ux-흐름)
8. [보안 요구사항](#8-보안-요구사항)

**Part B: 확장 기능**

9. [장바구니](#9-장바구니-shopping-cart)
10. [포인트/적립금 · 쿠폰/할인](#10-포인트적립금--쿠폰할인)
11. [이메일/문자 자동 알림](#11-이메일문자-자동-알림)
12. [정기결제/구독](#12-정기결제구독)
13. [해외 결제](#13-해외-결제)

**Part C: 종합**

14. [DB 스키마 총괄](#14-db-스키마-총괄)
15. [전체 구현 로드맵](#15-전체-구현-로드맵)
16. [환경변수 총괄](#16-환경변수-총괄)
17. [성공 지표](#17-성공-지표)
18. [범위 외](#18-범위-외-out-of-scope)
19. [참조 링크](#19-참조-링크)
20. [부록: i18n 메시지 키](#부록-i18n-메시지-키-추가-필요)

---

# Part A: 토스페이먼츠 v2 직접 연동

---

## 1. 배경 및 목적

### 1.1 현황

SAF 2026 사이트는 현재 **Cafe24**를 외부 결제 플랫폼으로 사용하고 있다.

**현재 구매 흐름:**

1. 구매자가 작품 상세 페이지에서 "온라인 구매" 버튼 클릭
2. Cafe24 상품 페이지(`koreasmartcoop.cafe24.com`)로 **외부 리디렉션**
3. Cafe24 사이트에서 결제 완료
4. 5분 주기 크론잡이 Cafe24 주문을 SAF DB(`artwork_sales`)로 동기화

**현재 시스템의 한계:**

- 구매자가 사이트를 벗어나야 하여 **이탈률 증가** 및 UX 단절
- 판매 데이터가 최대 5분 지연되어 **실시간 재고 관리 불가**
- 한정판(limited edition) 초과 판매 리스크: 동기화 지연 중 중복 구매 가능
- Cafe24 플랫폼 수수료 및 기술적 의존
- 주문/결제 상세 데이터를 직접 관리할 수 없음

### 1.2 목표

토스페이먼츠 v2 SDK(**API 개별 연동 키**)를 연동하여 **SAF 사이트 내에서 직접 결제**할 수 있는 시스템을 구축하고, 장바구니·포인트/쿠폰·알림·구독·해외결제까지 순차 확장한다.

**핵심 목표:**

- 사이트 이탈 없는 원스톱 구매 경험
- 실시간 판매/재고 추적
- 주문·결제 데이터 직접 관리
- 회원/비회원 모두 결제 가능
- 장바구니 → 포인트/쿠폰 → 알림 → 구독 → 해외결제 순차 확장

### 1.3 비즈니스 맥락

- 토스페이먼츠와 계약 완료, **API 개별 연동 키** 발급 완료 (테스트 키)
- 결제위젯 연동 키는 미신청 상태 → **Payment Window(결제창) 방식**으로 연동
- 별도 Git 브랜치(`feat/toss-payments`)에서 개발·테스트 후 main에 머지
- SAF 2026 사이트의 작품 판매 수익은 예술인 상호부조 기금으로 사용됨 — 결제 안정성이 매우 중요

### 1.4 확장 기능 우선순위

|  순위  | 기능                      | 의존성           | 비즈니스 영향         |
| :----: | ------------------------- | ---------------- | --------------------- |
| **P0** | 토스페이먼츠 기본 결제    | -                | 전체 전제 조건        |
| **P0** | 이메일/문자 자동 알림     | 토스 결제 완료   | 구매 신뢰도 직결      |
| **P1** | 장바구니                  | 토스 결제 완료   | 다중 작품 구매 전환율 |
| **P1** | 포인트/적립금 · 쿠폰/할인 | 주문 시스템 완성 | 재구매율 · 프로모션   |
| **P2** | 해외 결제                 | 토스 결제 완료   | 해외 구매자 확보      |
| **P3** | 정기결제/구독             | 전체 결제 안정화 | 신규 수익 모델        |

---

## 2. 연동 방식: 결제위젯 연동 (채택)

### 2.1 왜 결제위젯인가

|                  | API 개별 연동           | **결제위젯 연동 (채택)**                       |
| ---------------- | ----------------------- | ---------------------------------------------- |
| 키 접두사        | `test_ck_` / `test_sk_` | **`test_gck_` / `test_gsk_`**                  |
| UI               | 결제창 팝업 — 직접 구현 | **페이지 내 인라인 임베드 — 위젯 자동 렌더링** |
| 결제수단 선택 UI | 버튼 직접 만들어야 함   | **`renderPaymentMethods()` 자동 생성**         |
| method 파라미터  | 수동 분기 필요          | **불필요**                                     |
| 팝업 차단 위험   | 있음                    | **없음**                                       |
| UX               | 사이트 이탈감           | **체크아웃 페이지 내 완결**                    |
| 이용 신청        | -                       | **발급 완료**                                  |

### 2.2 결제위젯 흐름

```
[클라이언트]                                [서버]                  [토스페이먼츠]
    │                                          │                        │
    │ 1. loadTossPayments(clientKey)            │                        │
    │ 2. widgets = tossPayments.widgets({ customerKey })                │
    │ 3. widgets.setAmount({ currency: 'KRW', value })                  │
    │ 4. widgets.renderPaymentMethods({ selector: '#payment-method' }) │
    │    widgets.renderAgreement({ selector: '#agreement' })            │
    │    → 결제수단 선택 UI가 페이지 내 렌더링됨                         │
    │                                          │                        │
    │ 5. widgets.requestPayment({              │                        │
    │      orderId, orderName,                 │                        │
    │      successUrl, failUrl                 │                        │
    │    })                                    │                        │
    │                                          │                        │
    │ ←── 성공 리디렉트 ──────────────────────│                        │
    │   ?paymentKey=...&orderId=...            │                        │
    │   &amount=...&paymentType=...            │                        │
    │                                          │                        │
    │ 6. POST /api/payments/toss/confirm       │                        │
    │    { paymentKey, orderId, amount }        │                        │
    │                                          │ 7. POST /v1/payments/confirm
    │                                          │    Authorization: Basic │
    │                                          │    base64(secretKey+':')│
    │                                          │ ──────────────────────→ │
    │                                          │ ←── 승인 응답 ───────── │
    │ ←── 결과 응답 ─────────────────────────  │                        │
```

### 2.3 SDK 설치 및 초기화

```bash
npm install @tosspayments/tosspayments-sdk
```

```typescript
// 클라이언트 (React) — CheckoutClient.tsx
import { loadTossPayments, ANONYMOUS } from '@tosspayments/tosspayments-sdk';

const tossPayments = await loadTossPayments(process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY!);

// 비회원 결제
const widgets = tossPayments.widgets({ customerKey: ANONYMOUS });

// 회원 결제 (Supabase userId)
const widgets = tossPayments.widgets({ customerKey: userId });

// 금액 설정
await widgets.setAmount({ currency: 'KRW', value: totalAmount });

// 결제수단 UI + 약관 UI 렌더링 (직접 구현 불필요)
await widgets.renderPaymentMethods({ selector: '#payment-method', variantKey: 'DEFAULT' });
await widgets.renderAgreement({ selector: '#agreement', variantKey: 'AGREEMENT' });

// 결제 요청 (method 파라미터 없음 — 위젯이 선택된 수단 처리)
await widgets.requestPayment({
  orderId: 'SAF-20260407-A3K9',
  orderName: '김작가, 무제 (2026)',
  successUrl: `${origin}/checkout/${artworkId}/success`,
  failUrl: `${origin}/checkout/${artworkId}/fail`,
  customerEmail: 'buyer@example.com',
  customerName: '홍길동',
});
```

```typescript
// 서버 (Next.js API Route) — 승인 로직은 동일
const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY!;
const encryptedKey = 'Basic ' + Buffer.from(secretKey + ':').toString('base64');

const response = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
  method: 'POST',
  headers: {
    Authorization: encryptedKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ paymentKey, orderId, amount }),
});
```

### 2.4 체크아웃 페이지 HTML 구조

```tsx
// CheckoutClient.tsx — 위젯이 렌더링될 div만 배치
<div id="payment-method" />   {/* 결제수단 선택 UI (토스가 자동 렌더링) */}
<div id="agreement" />        {/* 약관 동의 UI (토스가 자동 렌더링) */}
<button onClick={handlePayment}>결제하기</button>
```

---

## 3. 사용자 페르소나

### P1: 일반 구매자 (비회원)

- **특성**: 사이트를 처음 방문한 일반인, SNS/뉴스를 통해 유입
- **니즈**: 회원가입 없이 빠르게 작품을 구매하고 싶음
- **Pain Point**: 외부 사이트로 이동하면 신뢰도 저하, 구매 포기
- **기대 행동**: 작품 상세 → "구매하기" → 정보 입력 → 결제 완료 (사이트 내)

### P2: 기존 회원 (작가/관리자/전시자)

- **특성**: 이미 Supabase Auth로 로그인한 사용자
- **니즈**: 로그인 상태에서 구매 시 정보 자동 입력
- **기대 행동**: 로그인 상태에서 구매 시 이름/연락처 자동 채움

### P3: 관리자

- **특성**: SAF 운영팀, 한국스마트협동조합 관계자
- **니즈**: 주문 상태 실시간 확인, 환불 처리, 매출 분석
- **기대 행동**: SAF 관리자 포털에서 모든 주문/결제/환불을 일원화 관리

### P4: 해외 구매자

- **특성**: 영문 사이트(`/en/*`) 방문, USD 결제 선호
- **니즈**: 영어 UI + 해외 카드 결제
- **기대 행동**: 영문 체크아웃 → USD 또는 KRW 카드 결제

### P5: 구독자

- **특성**: SAF의 예술 큐레이션/멤버십에 관심
- **니즈**: 정기적으로 작품/혜택을 받고 싶음
- **기대 행동**: 구독 플랜 선택 → 카드 등록 → 자동 정기결제

---

## 4. 기능 요구사항 — 핵심 결제

### 4.1 체크아웃 플로우 (P0 — Must Have)

#### FR-01: 체크아웃 페이지

| 항목        | 내용                                                 |
| ----------- | ---------------------------------------------------- |
| URL         | `/[locale]/checkout/[artworkId]`                     |
| 렌더링      | SSR (`force-dynamic`) — SSG 불가                     |
| 진입 조건   | 작품이 `available` 상태 + `hasActionablePrice`       |
| 구매자 정보 | 이름(필수), 연락처(필수), 이메일(필수), 배송지(필수) |
| 결제 방식   | 토스페이먼츠 v2 **Payment Window** (결제창 팝업)     |
| 결제수단    | 카드/간편결제, 계좌이체, 가상계좌                    |
| i18n        | 한국어/영어 지원                                     |

**상세 요구사항:**

- 작품 정보(이미지, 제목, 작가, 가격) 요약 표시
- 배송비 자동 계산: 20만원 미만 ₩4,000 / 20만원 이상 무료
- 결제수단 선택 UI를 직접 구현 (카드, 계좌이체, 가상계좌 버튼)
- 선택한 결제수단에 따라 `payment.requestPayment({ method: "CARD" | "TRANSFER" | "VIRTUAL_ACCOUNT" })` 호출
- 비회원: `customerKey: ANONYMOUS`
- 회원(로그인 상태): `customerKey: supabaseUserId`

#### FR-02: 결제 성공 페이지

| 항목 | 내용                                                                     |
| ---- | ------------------------------------------------------------------------ |
| URL  | `/[locale]/checkout/[artworkId]/success`                                 |
| 진입 | 토스 리디렉트 (`?paymentKey=...&orderId=...&amount=...&paymentType=...`) |
| 처리 | 서버에서 금액 검증 → 토스 승인 API 호출 → 주문 확정 → 판매 기록          |

**상세 요구사항:**

- URL의 `amount`와 DB에 저장된 `orders.total_amount` 대조 (금액 위변조 방지)
- `POST https://api.tosspayments.com/v1/payments/confirm` 호출
  - `Authorization: Basic base64(secretKey + ':')`
- 성공 시: `orders.status = 'paid'`, `artwork_sales` 레코드 삽입 (`source = 'toss'`)
- 기존 DB 트리거 `update_artwork_status_on_sale`가 한정판 자동 sold 처리
- 주문 완료 화면: 주문번호, 작품명, 결제 금액, 배송 안내

#### FR-03: 결제 실패 페이지

| 항목 | 내용                                                |
| ---- | --------------------------------------------------- |
| URL  | `/[locale]/checkout/[artworkId]/fail`               |
| 진입 | 토스 리디렉트 (`?code=...&message=...&orderId=...`) |
| 처리 | 에러 메시지 표시, 재시도 버튼                       |

#### FR-04: 결제 승인 API

| 항목 | 내용                                                    |
| ---- | ------------------------------------------------------- |
| URL  | `POST /api/payments/toss/confirm`                       |
| 인증 | 내부 전용 (success 페이지에서 호출)                     |
| 보안 | 서버사이드 `secretKey` Basic Auth, 금액 검증, 멱등성 키 |

#### FR-05: 웹훅 핸들러

| 항목   | 내용                                         |
| ------ | -------------------------------------------- |
| URL    | `POST /api/webhooks/toss`                    |
| 이벤트 | `PAYMENT_STATUS_CHANGED`, `DEPOSIT_CALLBACK` |

**`PAYMENT_STATUS_CHANGED` 웹훅 페이로드:**

```json
{
  "eventType": "PAYMENT_STATUS_CHANGED",
  "createdAt": "2022-01-01T00:00:00.000000",
  "data": {
    "paymentKey": "...",
    "orderId": "...",
    "status": "DONE",
    "approvedAt": "..."
  }
}
```

**`DEPOSIT_CALLBACK` 웹훅 (가상계좌 전용):**

```json
{
  "eventType": "DEPOSIT_CALLBACK",
  "secret": "<webhook_secret>",
  "data": {
    "orderId": "...",
    "paymentStatus": "DONE",
    "virtualAccountInfo": {
      "accountNumber": "1234567890",
      "bankCode": "088",
      "dueDate": "2022-01-02T23:59:59+09:00"
    }
  }
}
```

**웹훅 검증**: `data.secret` 값과 `TOSS_PAYMENTS_WEBHOOK_SECRET` 환경변수 대조

### 4.2 CTA 전환 (P0 — Must Have)

#### FR-06: ArtworkPurchaseCTA 컴포넌트 업데이트

현재 `components/features/ArtworkPurchaseCTA.tsx`의 A분기(118행)가 Cafe24 외부 링크로 이동. 이를 결제 모드에 따라 분기.

**결제 모드 (`NEXT_PUBLIC_PAYMENT_MODE`):**

| 모드     | 동작                                                                                |
| -------- | ----------------------------------------------------------------------------------- |
| `cafe24` | 현재 동작 유지 (Cafe24 외부 링크) — **main 브랜치**                                 |
| `toss`   | "구매하기" 버튼 → `/checkout/[artworkId]` 내부 이동 — **feat/toss-payments 브랜치** |

#### FR-07: PurchaseGuide 컴포넌트 업데이트

현재 `components/features/PurchaseGuide.tsx` 204~209행에 "카페24 보안결제(SSL)" 텍스트가 하드코딩됨.

**변경:** `toss` 모드에서 "토스페이먼츠 보안결제 시스템"으로 변경

### 4.3 주문 관리 (P1 — Should Have)

#### FR-08: 주문 번호 체계

- 형식: `SAF-YYYYMMDD-XXXX` (예: `SAF-20260406-A3K9`)
- 4자리 suffix: 알파벳+숫자 충돌 방지 랜덤
- `orders.order_no` UNIQUE 제약

#### FR-09: 주문 상태 머신

```
pending_payment → paid → preparing → shipped → delivered → completed
                    ↘ cancelled
paid → refund_requested → refunded
pending_payment → cancelled (30분 타임아웃)
```

#### FR-10: 관리자 주문 관리 페이지

| 페이지    | URL                  | 기능                            |
| --------- | -------------------- | ------------------------------- |
| 주문 목록 | `/admin/orders`      | 상태별 필터, 검색, 페이지네이션 |
| 주문 상세 | `/admin/orders/[id]` | 주문/결제 조회, 상태 변경, 환불 |

#### FR-11: 환불 처리

- 토스 취소 API: `POST /v1/payments/{paymentKey}/cancel`
- `artwork_sales.voided_at` + `void_reason` 기록
- 한정판 환불 시 재고 자동 복원 (기존 DB 트리거가 voided_at 제외)

### 4.4 매출 분석 연동 (P1 — Should Have)

#### FR-12: 매출 분석 확장

- `RevenueSource`: `'manual' | 'cafe24'` → `'manual' | 'cafe24' | 'toss'`
- `app/actions/admin-revenue.ts` `normalizeRevenueSource()` (250행): `'toss'` 추가
- `mapSourceToChannel()` (254행): `'toss'` → `'online'`

### 4.5 재고/에디션 관리 (P0 — Must Have)

#### FR-13: 구매 시 재고 검증

- **unique** (1점): pending 주문 포함 1개 이상이면 차단
- **limited** (한정판): `판매 수량 + pending 수 >= edition_limit`이면 차단
- **open**: 제한 없음
- `SELECT ... FOR UPDATE` (Supabase RPC) 동시 주문 락

#### FR-14: 자동 만료

- `pending_payment` 30분 경과 시 자동 `cancelled`
- Vercel Cron (10분 주기) 또는 체크아웃 진입 시 lazy 검사

---

## 5. 기술 설계

### 5.1 DB 스키마 (Supabase CLI 마이그레이션)

마이그레이션 생성 및 적용:

```bash
supabase migration new add_toss_payments
supabase db reset    # 로컬
supabase db push     # 프로덕션
```

#### 신규 테이블: `orders`

```sql
CREATE TABLE public.orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_no text NOT NULL UNIQUE,
  artwork_id uuid NOT NULL REFERENCES public.artworks(id),
  quantity integer NOT NULL DEFAULT 1,
  -- 구매자
  buyer_name text NOT NULL,
  buyer_email text NOT NULL,
  buyer_phone text NOT NULL,
  buyer_user_id uuid REFERENCES auth.users(id),
  -- 배송지
  shipping_name text NOT NULL,
  shipping_phone text NOT NULL,
  shipping_address text NOT NULL,
  shipping_address_detail text,
  shipping_postal_code text NOT NULL,
  shipping_memo text,
  -- 금액 (KRW, 서버 권한)
  item_amount integer NOT NULL,
  shipping_amount integer NOT NULL DEFAULT 0,
  total_amount integer NOT NULL,
  -- 상태
  status text NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN (
      'pending_payment', 'paid', 'preparing', 'shipped',
      'delivered', 'completed', 'cancelled', 'refund_requested', 'refunded'
    )),
  paid_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  note text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

#### 신규 테이블: `payments`

```sql
CREATE TABLE public.payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id),
  payment_key text NOT NULL UNIQUE,
  toss_order_id text NOT NULL,
  method text,          -- CARD, TRANSFER, VIRTUAL_ACCOUNT, MOBILE_PHONE
  method_detail jsonb,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'KRW',
  status text NOT NULL DEFAULT 'READY'
    CHECK (status IN (
      'READY', 'IN_PROGRESS', 'WAITING_FOR_DEPOSIT',
      'DONE', 'CANCELED', 'PARTIAL_CANCELED', 'ABORTED', 'EXPIRED'
    )),
  approved_at timestamptz,
  cancelled_at timestamptz,
  confirm_response jsonb,
  webhook_responses jsonb[] DEFAULT ARRAY[]::jsonb[],
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

#### 기존 테이블 변경: `artwork_sales`

```sql
ALTER TABLE public.artwork_sales DROP CONSTRAINT IF EXISTS artwork_sales_source_check;
ALTER TABLE public.artwork_sales ADD CONSTRAINT artwork_sales_source_check
  CHECK (source IN ('manual', 'cafe24', 'toss'));

ALTER TABLE public.artwork_sales DROP CONSTRAINT IF EXISTS artwork_sales_source_detail_check;
ALTER TABLE public.artwork_sales ADD CONSTRAINT artwork_sales_source_detail_check
  CHECK (source_detail IN ('manual', 'manual_csv', 'cafe24_api', 'legacy_csv', 'toss_api') OR source_detail IS NULL);

ALTER TABLE public.artwork_sales ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id);
```

### 5.2 환경변수

#### 토스페이먼츠 개발자센터

- **로그인**: https://developers.tosspayments.com
- **API 키 확인**: 로그인 → 내 개발정보 → API 개별 연동 키
- **웹훅 설정**: 로그인 → 내 개발정보 → 웹훅 → URL 등록
- **테스트 결제 시뮬레이션**: 로그인 → 개발정보 → 테스트 결제

#### 키 값 (`.env.local` 업데이트 완료)

```env
# 테스트 키 (결제위젯 연동)
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_gck_LlDJaYngroeE5LgoDpnn3ezGdRpX
TOSS_PAYMENTS_SECRET_KEY=test_gsk_kYG57Eba3G2wJpNM6X5Q8pWDOxmA
# 라이브 키 (프로덕션 전환 시)
# NEXT_PUBLIC_TOSS_CLIENT_KEY=live_gck_XZYkKL4MrjqzxePJ524EV0zJwlEW
# TOSS_PAYMENTS_SECRET_KEY=live_gsk_jExPeJWYVQb5Ka5966Nnr49R5gvN
TOSS_PAYMENTS_WEBHOOK_SECRET=3cc35eb3da2670fcfe15f65898503e8a7443a5abbb160e46c6c9314cebac1a36
TOSS_PAYMENTS_API_VERSION=2022-11-16
NEXT_PUBLIC_PAYMENT_MODE=cafe24  # main: cafe24 / feat/toss-payments 브랜치: toss
```

#### Vercel 환경변수 업데이트

```bash
# 기존 API 개별 연동 키 → 결제위젯 키로 교체
vercel env rm NEXT_PUBLIC_TOSS_CLIENT_KEY production --yes
echo "test_gck_LlDJaYngroeE5LgoDpnn3ezGdRpX" | vercel env add NEXT_PUBLIC_TOSS_CLIENT_KEY production --yes

vercel env rm TOSS_PAYMENTS_SECRET_KEY production --yes
echo "test_gsk_kYG57Eba3G2wJpNM6X5Q8pWDOxmA" | vercel env add TOSS_PAYMENTS_SECRET_KEY production --yes

# Preview 환경 추가 (feat/toss-payments 브랜치용)
vercel env add NEXT_PUBLIC_PAYMENT_MODE preview feat/toss-payments --yes <<< "toss"
```

#### 프로덕션 라이브 키 전환 시

```bash
vercel env rm NEXT_PUBLIC_TOSS_CLIENT_KEY production --yes
echo "live_gck_XZYkKL4MrjqzxePJ524EV0zJwlEW" | vercel env add NEXT_PUBLIC_TOSS_CLIENT_KEY production --yes

vercel env rm TOSS_PAYMENTS_SECRET_KEY production --yes
echo "live_gsk_jExPeJWYVQb5Ka5966Nnr49R5gvN" | vercel env add TOSS_PAYMENTS_SECRET_KEY production --yes
```

### 5.3 CSP 헤더 업데이트

`next.config.js` — 토스페이먼츠 SDK 도메인 허용:

- `script-src`: `https://js.tosspayments.com`
- `connect-src`: `https://api.tosspayments.com`
- `frame-src`: `https://js.tosspayments.com`

### 5.4 신규 모듈 구조

```
lib/integrations/toss/
├── config.ts         # 환경변수 해석, Auth 헤더 생성, API URL
├── confirm.ts        # 결제 승인 (POST /v1/payments/confirm)
├── webhook.ts        # 웹훅 secret 검증 + 이벤트 파싱
├── types.ts          # TossPayments API 응답/요청 타입
└── order-number.ts   # SAF-YYYYMMDD-XXXX 생성 로직
```

### 5.5 신규 페이지/라우트

```
app/[locale]/checkout/[artworkId]/
├── page.tsx               # 체크아웃 서버 컴포넌트
├── CheckoutClient.tsx     # 토스 결제창 클라이언트 컴포넌트
├── BuyerInfoForm.tsx      # 구매자 정보 + 배송지 폼
├── success/page.tsx       # 결제 성공
└── fail/page.tsx          # 결제 실패

app/api/payments/toss/
└── confirm/route.ts       # 결제 승인 API

app/api/webhooks/toss/
└── route.ts               # 웹훅 핸들러

app/(portal)/admin/orders/
├── page.tsx               # 주문 목록
└── [id]/page.tsx          # 주문 상세

app/actions/
└── checkout.ts            # 체크아웃 서버 액션
```

### 5.6 수정 대상 기존 파일

| 파일                                         | 변경 내용                            |
| -------------------------------------------- | ------------------------------------ |
| `components/features/ArtworkPurchaseCTA.tsx` | `paymentMode` 분기 (FR-06)           |
| `components/features/PurchaseGuide.tsx`      | 결제 안내 텍스트 (FR-07)             |
| `types/index.ts`                             | `ArtworkSale.source`에 `'toss'` 추가 |
| `app/actions/admin-revenue.ts`               | `RevenueSource` 확장 (FR-12)         |
| `app/actions/admin-artworks.ts`              | `updateArtworkSale()` toss 소스 보호 |
| `next.config.js`                             | CSP 헤더                             |
| `lib/constants.ts`                           | `ORDER_STATUS` URL 조건부            |
| `messages/ko.json`                           | `checkout.*` 번역 키                 |
| `messages/en.json`                           | `checkout.*` 번역 키                 |
| `.env.local.example`                         | 토스 환경변수 문서화                 |

---

## 6. 개발/배포 전략: Git 브랜치 분리

### 6.1 브랜치 전략

```
main (현재: Cafe24 결제)
  └── feat/toss-payments (토스페이먼츠 개발)
        ├── PAYMENT_MODE=toss
        ├── Vercel Preview 배포로 테스트
        └── 안정화 후 main에 머지
```

### 6.2 브랜치별 환경변수

| 변수                          | main (Production) | feat/toss-payments (Preview) |
| ----------------------------- | :---------------: | :--------------------------: |
| `NEXT_PUBLIC_PAYMENT_MODE`    |     `cafe24`      |            `toss`            |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` |      (동일)       |            (동일)            |
| `TOSS_PAYMENTS_SECRET_KEY`    |      (동일)       |            (동일)            |

### 6.3 테스트 순서

1. `feat/toss-payments` 브랜치에서 전체 기능 개발
2. Vercel Preview URL에서 테스트 키로 결제 테스트
3. 토스페이먼츠 테스트 모드: 카드번호 앞 6자리만 유효하면 결제 시뮬레이션 가능
4. 웹훅 테스트: `ngrok http 3000`으로 로컬 노출 후 개발자센터에 등록
5. 안정화 확인 후 main에 PR 머지
6. Production에서 `NEXT_PUBLIC_PAYMENT_MODE=toss`로 전환
7. 라이브 키로 교체

### 6.4 main 머지 시 Cafe24 처리

- `NEXT_PUBLIC_PAYMENT_MODE=toss`로 전환 → CTA가 토스 체크아웃으로 연결
- Cafe24 크론잡(`vercel.json`)은 즉시 제거하지 않고 일정 기간 유지 (기존 미완료 주문 동기화)
- `getCafe24Config()` → null이면 sync 자동 스킵 (기존 안전장치)
- 안정화 후 Cafe24 환경변수 제거, 크론잡 제거

---

## 7. UX 흐름

### 7.1 비회원 구매 흐름

```
작품 상세 페이지
  → "구매하기" 버튼 클릭
  → /checkout/[artworkId]
    ├─ 작품 요약 (이미지, 제목, 작가, 가격)
    ├─ 구매자 정보 (이름, 연락처, 이메일)
    ├─ 배송지 (주소, 상세주소, 우편번호, 메모)
    ├─ 배송비 (20만원 기준 자동 계산)
    ├─ 결제수단 선택 (카드/계좌이체/가상계좌)
    └─ "결제하기" 버튼 → 토스 결제창 팝업
  → 결제 완료 → /checkout/[artworkId]/success
    ├─ "결제가 완료되었습니다"
    ├─ 주문번호, 작품명, 결제금액
    └─ "작품 더 둘러보기" 버튼
```

### 7.2 회원 구매 흐름

```
(로그인 상태) → /checkout/[artworkId]
  ├─ 구매자 정보: 프로필에서 자동 채움 (수정 가능)
  └─ 나머지 동일
```

### 7.3 가상계좌 흐름

```
체크아웃 → 가상계좌 선택 → 결제 요청
  → /checkout/[artworkId]/success
    ├─ "입금 대기 중입니다"
    ├─ 은행명, 계좌번호, 입금기한
    └─ "입금 확인 시 이메일로 안내"
  → 구매자가 입금
  → 토스 웹훅: DEPOSIT_CALLBACK (paymentStatus: "DONE")
    ├─ orders.status = 'paid'
    └─ artwork_sales 레코드 삽입
```

---

## 8. 보안 요구사항

| ID     | 위협        | 대응                                                         |
| ------ | ----------- | ------------------------------------------------------------ |
| SEC-01 | 금액 위변조 | `orders.total_amount`과 URL `amount` 대조 후 승인            |
| SEC-02 | 중복 결제   | `payments.payment_key` UNIQUE + `Idempotency-Key` 헤더       |
| SEC-03 | 재고 경쟁   | `SELECT FOR UPDATE` Supabase RPC, pending 포함 검증          |
| SEC-04 | 웹훅 위조   | `secret` 필드 검증 + 토스 API 재조회 이중 확인               |
| SEC-05 | CSP 차단    | `next.config.js`에 토스 도메인 사전 등록                     |
| SEC-06 | 키 노출     | `TOSS_PAYMENTS_SECRET_KEY`는 서버 전용, 클라이언트 노출 금지 |
| SEC-07 | 빌링키 유출 | DB에 암호화 저장, 서버 전용 복호화 (정기결제)                |
| SEC-08 | 쿠폰 어뷰징 | 1인당 사용 제한 + 서버사이드 검증 (포인트/쿠폰)              |

---

# Part B: 확장 기능

---

## 9. 장바구니 (Shopping Cart)

### 9.1 목표

현재 1점씩 개별 결제 → **복수 작품을 장바구니에 담아 한 번에 결제** 가능하도록 확장.

### 9.2 설계 원칙

- 비회원: `localStorage` 기반 임시 장바구니 (로그인 시 DB로 병합)
- 회원: Supabase `cart_items` 테이블 (기기 간 동기화)
- 작품 특성상 수량은 1로 고정 (원화 중심, 에디션별 제한)

### 9.3 DB 스키마

```sql
-- 회원 장바구니
CREATE TABLE public.cart_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  artwork_id uuid NOT NULL REFERENCES public.artworks(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, artwork_id)
);

-- RLS: 본인 장바구니만 접근
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own cart"
  ON public.cart_items FOR ALL
  USING (auth.uid() = user_id);
```

### 9.4 주요 기능 요구사항

#### FR-CART-01: 장바구니 담기

| 항목      | 내용                                                  |
| --------- | ----------------------------------------------------- |
| 진입점    | 작품 상세 페이지, 갤러리 카드                         |
| 제한 조건 | `sold` 작품 / `hidden` 작품 불가, 동일 작품 중복 불가 |
| 최대 수량 | 장바구니 최대 10점                                    |
| 피드백    | 토스트 알림 + 헤더 장바구니 뱃지 카운트 업데이트      |

#### FR-CART-02: 장바구니 페이지

| 항목        | 내용                                          |
| ----------- | --------------------------------------------- |
| URL         | `/[locale]/cart`                              |
| 기능        | 작품 목록, 개별 삭제, 전체 비우기             |
| 가격 표시   | 작품별 단가 + 소계 + 배송비 + 총액            |
| 배송비 계산 | 합산 금액 20만원 미만: ₩4,000 / 이상: 무료    |
| CTA         | "전체 결제하기" → 체크아웃 페이지 (복수 작품) |

#### FR-CART-03: 체크아웃 확장

기존 체크아웃(`/checkout/[artworkId]`)을 **복수 작품 체크아웃**으로 확장:

| 항목           | 내용                                           |
| -------------- | ---------------------------------------------- |
| URL (단일)     | `/[locale]/checkout/[artworkId]` — 기존 유지   |
| URL (장바구니) | `/[locale]/checkout/cart` — 장바구니 전체 결제 |
| 주문 구조      | `orders` 1건 + `order_items` N건               |
| 결제           | `orderName`: 대표 작품명 외 N건                |

### 9.5 신규 DB 테이블: `order_items`

```sql
CREATE TABLE public.order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  artwork_id uuid NOT NULL REFERENCES public.artworks(id),
  item_amount integer NOT NULL, -- 작품 단가 (KRW)
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

> 기존 `orders.artwork_id` 단일 필드 → `order_items` 다대일 관계로 변경.

### 9.6 비회원 장바구니 흐름

```
비회원: localStorage에 artworkId 배열 저장
  → 로그인 시: localStorage 데이터 → cart_items로 merge (중복 제거)
  → localStorage 초기화
```

### 9.7 UI 컴포넌트

| 컴포넌트          | 위치           | 역할                                    |
| ----------------- | -------------- | --------------------------------------- |
| `CartButton`      | Header         | 장바구니 아이콘 + 뱃지 카운트           |
| `AddToCartButton` | 작품 상세/카드 | "장바구니 담기" 버튼                    |
| `CartPage`        | `/cart`        | 장바구니 페이지 전체                    |
| `CartItemRow`     | CartPage 내부  | 개별 작품 행 (이미지, 제목, 가격, 삭제) |
| `CartSummary`     | CartPage 하단  | 소계 + 배송비 + 총액 + CTA              |

### 9.8 신규 파일 구조

```
app/[locale]/cart/page.tsx                  # 장바구니 페이지
app/[locale]/checkout/cart/page.tsx         # 장바구니 체크아웃
components/features/cart/
├── CartButton.tsx                          # 헤더 장바구니 버튼
├── AddToCartButton.tsx                     # 담기 버튼
├── CartItemRow.tsx                         # 장바구니 행
└── CartSummary.tsx                         # 요약/결제 CTA
lib/hooks/useCart.ts                        # 장바구니 상태 훅
app/actions/cart.ts                         # 서버 액션 (add/remove/merge)
```

---

## 10. 포인트/적립금 · 쿠폰/할인

### 10.1 목표

구매 시 포인트 적립 → 다음 구매에 사용. 관리자가 쿠폰을 발행하여 프로모션 진행.

### 10.2 포인트 시스템

#### 적립 규칙

| 항목      | 규칙                                        |
| --------- | ------------------------------------------- |
| 적립율    | 결제 금액의 **1%** (기본, 관리자 조정 가능) |
| 적립 시점 | 주문 상태 `completed` 전환 시               |
| 사용 조건 | 최소 1,000P 이상 보유 시 사용 가능          |
| 유효기간  | 적립일로부터 **1년**                        |
| 사용 단위 | 100P 단위 (최대: 결제 금액의 10%)           |
| 환불 시   | 사용 포인트 복원 + 적립 포인트 차감         |

#### DB 스키마

```sql
-- profiles 테이블 확장
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS points_balance integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phone text;

-- 포인트 이력 (원장)
CREATE TABLE public.point_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  order_id uuid REFERENCES public.orders(id),
  type text NOT NULL CHECK (type IN ('earn', 'spend', 'expire', 'refund_earn', 'refund_spend', 'admin_adjust')),
  amount integer NOT NULL, -- 양수: 적립/복원, 음수: 사용/차감
  balance_after integer NOT NULL, -- 트랜잭션 후 잔액
  description text,
  expires_at timestamptz, -- earn만 해당
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_point_transactions_user ON public.point_transactions(user_id, created_at DESC);
CREATE INDEX idx_point_transactions_expires ON public.point_transactions(expires_at)
  WHERE type = 'earn' AND expires_at IS NOT NULL;
```

### 10.3 쿠폰 시스템

#### 쿠폰 유형

| 유형        | 예시                   | 설명             |
| ----------- | ---------------------- | ---------------- |
| 정액 할인   | ₩10,000 할인           | 고정 금액 차감   |
| 정률 할인   | 5% 할인 (최대 ₩50,000) | 비율 할인 + 상한 |
| 배송비 무료 | 배송비 ₩4,000 면제     | 배송비만 면제    |

#### DB 스키마

```sql
CREATE TABLE public.coupons (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('fixed', 'percentage', 'free_shipping')),
  discount_value integer NOT NULL,
  max_discount integer,
  min_order_amount integer DEFAULT 0,
  usage_limit integer,
  usage_count integer NOT NULL DEFAULT 0,
  per_user_limit integer DEFAULT 1,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_coupons (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id),
  order_id uuid REFERENCES public.orders(id),
  status text NOT NULL DEFAULT 'available'
    CHECK (status IN ('available', 'used', 'expired')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz,
  UNIQUE(user_id, coupon_id, order_id)
);
```

### 10.4 체크아웃 적용 흐름

```
체크아웃 페이지
  ├─ 상품 금액: ₩500,000
  ├─ 쿠폰 적용: -₩10,000 (WELCOME2026)
  ├─ 포인트 사용: -₩5,000 (5,000P)
  ├─ 배송비: 무료 (20만원 이상)
  └─ 최종 결제 금액: ₩485,000 → 토스 결제
```

`orders` 테이블 확장:

```sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupons(id),
  ADD COLUMN IF NOT EXISTS coupon_discount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points_used integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS points_earned integer NOT NULL DEFAULT 0;
```

### 10.5 관리자 기능

| 페이지      | URL                   | 기능                              |
| ----------- | --------------------- | --------------------------------- |
| 쿠폰 관리   | `/admin/coupons`      | 쿠폰 CRUD, 사용 현황, 활성/비활성 |
| 쿠폰 상세   | `/admin/coupons/[id]` | 사용 이력, 통계                   |
| 포인트 관리 | `/admin/points`       | 사용자별 포인트 조회, 수동 조정   |

### 10.6 신규 파일 구조

```
app/[locale]/checkout/[artworkId]/
├── CouponInput.tsx             # 쿠폰 코드 입력/적용
└── PointsSelector.tsx          # 포인트 사용 슬라이더/입력

app/(portal)/admin/coupons/
├── page.tsx                    # 쿠폰 목록
├── new/page.tsx                # 쿠폰 생성
└── [id]/page.tsx               # 쿠폰 상세/수정

app/(portal)/admin/points/
└── page.tsx                    # 포인트 관리

app/actions/
├── coupons.ts                  # 쿠폰 서버 액션
└── points.ts                   # 포인트 서버 액션

lib/integrations/rewards/
├── points.ts                   # 포인트 계산/적립/사용 로직
├── coupons.ts                  # 쿠폰 검증/적용 로직
└── expiry-job.ts               # 포인트/쿠폰 만료 크론
```

---

## 11. 이메일/문자 자동 알림

### 11.1 목표

주문 생애주기 전체에서 구매자에게 **이메일 + 문자(선택)** 자동 알림 발송.

### 11.2 알림 이벤트

| 이벤트             | 이메일 | 문자(SMS) | 트리거                       |
| ------------------ | :----: | :-------: | ---------------------------- |
| 주문 확인          |   O    |     O     | `orders.status → paid`       |
| 가상계좌 발급      |   O    |     O     | 결제 요청 (가상계좌 선택 시) |
| 가상계좌 입금 확인 |   O    |     O     | 토스 웹훅 `DEPOSIT_CALLBACK` |
| 배송 시작          |   O    |     O     | `orders.status → shipped`    |
| 배송 완료          |   O    |     -     | `orders.status → delivered`  |
| 환불 완료          |   O    |     -     | `orders.status → refunded`   |
| 포인트 적립        |   O    |     -     | `orders.status → completed`  |
| 쿠폰 발급          |   O    |     -     | 관리자가 쿠폰 발급 시        |
| 주문 자동 취소     |   O    |     -     | pending 30분 만료            |

### 11.3 기술 선택

#### 이메일: Resend

| 항목        | 내용                                                     |
| ----------- | -------------------------------------------------------- |
| 서비스      | Resend                                                   |
| 이유        | Next.js 최적화, React Email 템플릿, 무료 티어 3,000건/월 |
| SDK         | `resend` npm 패키지                                      |
| 발신 도메인 | `noreply@saf2026.com` (도메인 DNS 인증 필요)             |

#### SMS: NHN Cloud Notification

| 항목     | 내용                                                         |
| -------- | ------------------------------------------------------------ |
| 서비스   | NHN Cloud SMS                                                |
| 이유     | 한국 발신번호 등록 가능, 건당 ~₩10, 알림톡(카카오) 연동 가능 |
| SDK      | REST API 직접 호출                                           |
| 발신번호 | `02-764-3114` (사전 등록 필요)                               |

### 11.4 이메일 템플릿 구조

```
lib/integrations/notifications/
├── email/
│   ├── client.ts                  # Resend 클라이언트 초기화
│   ├── send.ts                    # 이메일 발송 유틸 (retry 포함)
│   └── templates/
│       ├── OrderConfirmation.tsx   # 주문 확인
│       ├── ShippingNotice.tsx      # 배송 시작
│       ├── RefundComplete.tsx      # 환불 완료
│       ├── VirtualAccountIssued.tsx # 가상계좌 발급
│       ├── DepositConfirmed.tsx    # 입금 확인
│       └── PointsEarned.tsx        # 포인트 적립
├── sms/
│   ├── client.ts                  # NHN Cloud SMS 클라이언트
│   ├── send.ts                    # SMS 발송 유틸
│   └── templates.ts               # SMS 메시지 템플릿 (짧은 텍스트)
└── dispatcher.ts                  # 이벤트별 이메일+SMS 통합 디스패처
```

### 11.5 디스패처 패턴

```typescript
// lib/integrations/notifications/dispatcher.ts
export async function dispatchOrderNotification(
  event: 'paid' | 'shipped' | 'delivered' | 'refunded' | 'cancelled',
  order: Order,
  payment?: Payment
) {
  // 이메일은 항상 발송
  await sendEmail(order.buyer_email, getEmailTemplate(event, order, payment));

  // SMS는 주요 이벤트만 (paid, shipped, virtual_account)
  if (['paid', 'shipped'].includes(event) && order.buyer_phone) {
    await sendSms(order.buyer_phone, getSmsTemplate(event, order));
  }
}
```

### 11.6 트리거 통합

| 트리거 위치                                  | 방식                                                  |
| -------------------------------------------- | ----------------------------------------------------- |
| 결제 승인 API (`/api/payments/toss/confirm`) | 승인 성공 후 `dispatchOrderNotification('paid', ...)` |
| 토스 웹훅 (`/api/webhooks/toss`)             | `DEPOSIT_CALLBACK` 시 알림                            |
| 관리자 주문 상태 변경                        | 서버 액션에서 상태 전환 시 알림                       |
| 포인트/쿠폰 크론                             | 만료 예정 알림 (선택)                                 |

### 11.7 DNS 설정 (Resend 도메인 인증)

`saf2026.com` DNS에 아래 레코드 추가 필요:

```
TXT   _resend.saf2026.com         → Resend 제공 값
DKIM  resend._domainkey.saf2026.com → Resend 제공 값
```

---

## 12. 정기결제/구독

### 12.1 목표

**서비스 구독** 모델로 월/분기 정기결제 도입.

### 12.2 구독 모델

| 모델          | 설명                              | 금액         | 혜택                               |
| ------------- | --------------------------------- | ------------ | ---------------------------------- |
| 작품 큐레이션 | 분기별 소형 아트프린트 배송       | ₩30,000/분기 | 분기별 작품 1점 + 전시 초대권      |
| 아트 멤버십   | 월간 온라인 전시 해설 + 할인 혜택 | ₩15,000/월   | 신작 우선 구매권 + 포인트 2배 적립 |

### 12.3 토스페이먼츠 빌링키 연동

정기결제는 **빌링키(Billing Key)** 방식 사용:

```
[1회] 카드 등록: payment.requestBillingAuth()
  → successUrl로 리디렉트 (authKey 포함)
  → 서버: POST /v1/billing/authorizations/issue (authKey → billingKey 발급)
  → billingKey를 DB에 암호화 저장

[매월] 자동 결제: POST /v1/billing/{billingKey}
  → 서버 크론잡으로 월 1회 실행
  → 실패 시 3회 재시도 (1일, 3일, 7일)
  → 3회 실패 시 구독 일시정지 + 이메일 알림
```

### 12.4 DB 스키마

```sql
CREATE TABLE public.subscription_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  name_en text,
  description text,
  description_en text,
  price integer NOT NULL, -- KRW
  interval text NOT NULL CHECK (interval IN ('monthly', 'quarterly', 'yearly')),
  benefits jsonb DEFAULT '[]',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  billing_key text NOT NULL, -- 토스 빌링키 (암호화 저장)
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'cancelled', 'expired', 'past_due')),
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  cancelled_at timestamptz,
  cancel_reason text,
  retry_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.subscription_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id),
  payment_key text UNIQUE,
  amount integer NOT NULL,
  status text NOT NULL CHECK (status IN ('paid', 'failed', 'refunded')),
  paid_at timestamptz,
  failed_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### 12.5 페이지 구조

```
app/[locale]/subscribe/
├── page.tsx                    # 구독 플랜 목록 + 비교
├── [planId]/page.tsx           # 구독 신청 (카드 등록)
├── success/page.tsx            # 등록 완료
└── manage/page.tsx             # 내 구독 관리 (해지/변경)

app/api/subscriptions/
├── billing-auth/route.ts       # 빌링키 발급 API
├── charge/route.ts             # 정기 결제 실행 (크론 호출)
└── cancel/route.ts             # 구독 해지

app/(portal)/admin/subscriptions/
├── page.tsx                    # 구독 현황 대시보드
└── [id]/page.tsx               # 구독 상세
```

### 12.6 크론잡

```json
// vercel.json 추가
{
  "crons": [
    {
      "path": "/api/subscriptions/charge",
      "schedule": "0 9 * * *"
    }
  ]
}
```

매일 오전 9시(KST) 실행:

1. `current_period_end <= now()` AND `status = 'active'` 구독 조회
2. 빌링키로 자동 결제 (`POST /v1/billing/{billingKey}`)
3. 성공: `current_period_start/end` 갱신, `subscription_payments` 기록
4. 실패: `retry_count++`, 3회 초과 시 `status = 'past_due'`, 알림 발송

---

## 13. 해외 결제

### 13.1 목표

영문 사이트(`/en/*`) 사용자가 **USD 기준으로 결제**할 수 있도록 다중 통화 지원.

### 13.2 지원 통화

| 통화 | 결제수단                 | 비고           |
| ---- | ------------------------ | -------------- |
| KRW  | 카드, 계좌이체, 가상계좌 | 기본 (현재)    |
| USD  | 카드                     | 해외 카드 결제 |

> 토스페이먼츠 해외카드 결제는 **별도 심사 필요** (토스 영업팀 문의).

### 13.3 환율 처리

| 방식      | 설명                                              |
| --------- | ------------------------------------------------- |
| 고정 환율 | 관리자가 수동 설정 (예: 1 USD = ₩1,350)           |
| 갱신 주기 | 주 1회 또는 관리자 수동 갱신                      |
| 표시 가격 | USD 기준 표시, 결제는 KRW로 변환하여 처리         |
| 대안      | 작품별 USD 가격 직접 입력 (환율 변동 리스크 제거) |

**Phase 1에서는 "작품별 USD 가격 직접 입력" 방식 채택** (환율 API 불필요).

### 13.4 DB 스키마 변경

```sql
ALTER TABLE public.artworks
  ADD COLUMN IF NOT EXISTS price_usd text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'KRW',
  ADD COLUMN IF NOT EXISTS exchange_rate numeric(10,2);

CREATE TABLE public.exchange_rates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  from_currency text NOT NULL DEFAULT 'USD',
  to_currency text NOT NULL DEFAULT 'KRW',
  rate numeric(10,2) NOT NULL,
  set_by uuid REFERENCES auth.users(id),
  effective_from timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### 13.5 가격 표시 로직

```typescript
// lib/utils/currency.ts
export function formatPrice(amount: number, currency: 'KRW' | 'USD'): string {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  }
  return `₩${amount.toLocaleString('ko-KR')}`;
}
```

영문 페이지에서 `price_usd`가 있으면 USD 표시, 없으면 KRW 표시.

### 13.6 체크아웃 분기

```
한국어 (/checkout/[id])       → KRW 결제 (카드/이체/가상계좌)
영어  (/en/checkout/[id])     → USD 가격이 있으면 USD 카드 결제
                                없으면 KRW 카드 결제 (해외카드)
```

### 13.7 해외 배송

| 항목    | 내용                                         |
| ------- | -------------------------------------------- |
| Phase 1 | 국내 배송만 (해외 구매자 → 국내 수령지 필수) |
| Phase 2 | EMS/DHL 해외 배송 (배송비 별도 산정)         |

### 13.8 수정 대상 파일

| 파일                                  | 변경 내용                                      |
| ------------------------------------- | ---------------------------------------------- |
| `lib/utils/index.ts`                  | `formatPriceForDisplay()` → 통화 파라미터 추가 |
| `lib/parsePrice.ts`                   | USD 가격 파싱 지원 (`$400` 형식)               |
| `lib/schemas/artwork.ts`              | `priceCurrency` 동적 처리                      |
| `lib/constants.ts`                    | `MERCHANT_POLICIES.SHIPPING` 다중 통화         |
| `components/features/ArtworkCard.tsx` | 통화별 가격 표시                               |
| `app/[locale]/artworks/[id]/page.tsx` | 영문: USD 가격 우선 표시                       |

### 13.9 신규 파일 구조

```
lib/utils/currency.ts                       # 다중 통화 포맷팅
app/(portal)/admin/settings/
└── exchange-rates/page.tsx                 # 환율 관리
app/actions/exchange-rates.ts               # 환율 서버 액션
```

---

# Part C: 종합

---

## 14. DB 스키마 총괄

### 14.1 신규 테이블 (기본 결제)

| 테이블     | 기능                                         |
| ---------- | -------------------------------------------- |
| `orders`   | 주문 (구매자, 배송지, 금액, 상태)            |
| `payments` | 토스 결제 정보 (paymentKey, 상태, 승인 응답) |

### 14.2 신규 테이블 (확장 기능)

| 테이블                  | 기능                  | Phase |
| ----------------------- | --------------------- | :---: |
| `cart_items`            | 회원 장바구니         |   5   |
| `order_items`           | 주문-작품 다대일      |   5   |
| `point_transactions`    | 포인트 원장           |   6   |
| `coupons`               | 쿠폰 정의             |   6   |
| `user_coupons`          | 사용자 쿠폰 보유/사용 |   6   |
| `subscription_plans`    | 구독 플랜 정의        |   8   |
| `subscriptions`         | 사용자 구독           |   8   |
| `subscription_payments` | 구독 결제 이력        |   8   |
| `exchange_rates`        | 환율 설정             |   7   |

### 14.3 기존 테이블 변경

| 테이블          | 변경                                                                                              | Phase |
| --------------- | ------------------------------------------------------------------------------------------------- | :---: |
| `artwork_sales` | `source` 제약에 `'toss'` 추가, `+order_id`                                                        |   0   |
| `profiles`      | `+points_balance`, `+phone`                                                                       |   6   |
| `orders`        | `+coupon_id`, `+coupon_discount`, `+points_used`, `+points_earned`, `+currency`, `+exchange_rate` |  6-7  |
| `artworks`      | `+price_usd`                                                                                      |   7   |

### 14.4 마이그레이션 전략

```bash
supabase migration new add_toss_payments           # Phase 0
supabase migration new add_cart_items              # Phase 5
supabase migration new add_order_items             # Phase 5
supabase migration new add_points_coupons          # Phase 6
supabase migration new add_international_payments  # Phase 7
supabase migration new add_subscriptions           # Phase 8
```

---

## 15. 전체 구현 로드맵

### Phase 0: 기반 (1주차)

- [ ] `feat/toss-payments` 브랜치 생성
- [ ] DB 마이그레이션 (`orders`, `payments`, `artwork_sales` 확장)
- [ ] `npm install @tosspayments/tosspayments-sdk`
- [ ] CSP 헤더 업데이트
- [ ] `lib/integrations/toss/` 모듈 (config, types, confirm, webhook, order-number)
- [ ] `types/index.ts` 타입 확장

### Phase 1: 핵심 결제 (2~3주차)

- [ ] 체크아웃 페이지 + CheckoutClient 컴포넌트
- [ ] 결제 승인 API 라우트
- [ ] 결제 성공/실패 페이지
- [ ] 웹훅 핸들러
- [ ] 체크아웃 서버 액션 (주문 생성, 재고 검증, 결제 확인)
- [ ] `artwork_sales` 연동 (source='toss')

### Phase 2: CTA + UI (4주차)

- [ ] `ArtworkPurchaseCTA` paymentMode 분기
- [ ] `PurchaseGuide` 텍스트 업데이트
- [ ] i18n 메시지 (ko/en)
- [ ] Vercel Preview 배포 테스트

### Phase 3: 관리자 + 분석 (5주차)

- [ ] 관리자 주문 목록/상세 페이지
- [ ] 환불 처리
- [ ] 매출 분석 RevenueSource 확장
- [ ] `admin-artworks.ts` toss 소스 보호 가드

### Phase 4: main 머지 + 라이브 전환

- [ ] PR 생성 → 코드 리뷰
- [ ] main 머지
- [ ] `NEXT_PUBLIC_PAYMENT_MODE=toss`로 전환 (Vercel production)
- [ ] 라이브 키 교체
- [ ] 웹훅 URL을 프로덕션 도메인으로 변경
- [ ] Cafe24 크론잡 정리

### Phase 5: 이메일/문자 알림 + 장바구니 (Phase 4 완료 후 2주)

| 주  | 작업                                                          |
| :-: | ------------------------------------------------------------- |
| 1주 | Resend 연동 + DNS 인증 + 이메일 템플릿 (주문확인, 배송, 환불) |
| 1주 | NHN Cloud SMS 연동 + SMS 템플릿                               |
| 1주 | 알림 디스패처 + 기존 결제/웹훅 핸들러에 트리거 통합           |
| 2주 | `cart_items`, `order_items` 마이그레이션                      |
| 2주 | 장바구니 UI (CartButton, AddToCartButton, CartPage)           |
| 2주 | 체크아웃 확장 (복수 작품, 장바구니 결제)                      |

### Phase 6: 포인트/적립금 · 쿠폰/할인 (Phase 5 완료 후 2주)

| 주  | 작업                                                         |
| :-: | ------------------------------------------------------------ |
| 1주 | `point_transactions`, `coupons`, `user_coupons` 마이그레이션 |
| 1주 | 포인트 적립/사용/환불 로직 + 체크아웃 UI 통합                |
| 2주 | 쿠폰 CRUD 관리자 페이지 + 체크아웃 쿠폰 입력                 |
| 2주 | 포인트/쿠폰 만료 크론잡                                      |

### Phase 7: 해외 결제 (Phase 6 완료 후 2주)

| 주  | 작업                                                     |
| :-: | -------------------------------------------------------- |
| 1주 | 토스페이먼츠 해외카드 결제 심사 신청                     |
| 1주 | `price_usd`, 환율 테이블 마이그레이션 + 관리자 환율 설정 |
| 2주 | 다중 통화 포맷팅 + 영문 체크아웃 USD 분기                |
| 2주 | SEO 스키마 다중 통화 대응 + 테스트                       |

### Phase 8: 정기결제/구독 (Phase 7 완료 후 3주)

| 주  | 작업                                         |
| :-: | -------------------------------------------- |
| 1주 | 구독 관련 DB 마이그레이션 + 토스 빌링키 연동 |
| 2주 | 구독 신청 페이지 + 카드 등록 + 성공/실패     |
| 2주 | 정기 결제 크론잡 + 재시도 로직               |
| 3주 | 구독 관리 (해지/변경) + 관리자 대시보드      |

### 전체 타임라인 요약

```
Phase 0-4: 토스페이먼츠 기본 연동          ──── 5주
Phase 5:   이메일/문자 알림 + 장바구니      ──── 2주
Phase 6:   포인트/적립금 · 쿠폰/할인        ──── 2주
Phase 7:   해외 결제                        ──── 2주
Phase 8:   정기결제/구독                    ──── 3주
                                    총합: ~14주
```

---

## 16. 환경변수 총괄

```env
# ── Phase 0: 토스페이먼츠 결제위젯 연동 (업데이트 완료) ──
# 테스트 키
NEXT_PUBLIC_TOSS_CLIENT_KEY=test_gck_LlDJaYngroeE5LgoDpnn3ezGdRpX
TOSS_PAYMENTS_SECRET_KEY=test_gsk_kYG57Eba3G2wJpNM6X5Q8pWDOxmA
# 라이브 키 (프로덕션 전환 시 주석 해제)
# NEXT_PUBLIC_TOSS_CLIENT_KEY=live_gck_XZYkKL4MrjqzxePJ524EV0zJwlEW
# TOSS_PAYMENTS_SECRET_KEY=live_gsk_jExPeJWYVQb5Ka5966Nnr49R5gvN
TOSS_PAYMENTS_WEBHOOK_SECRET=3cc35eb3da2670fcfe15f65898503e8a7443a5abbb160e46c6c9314cebac1a36
TOSS_PAYMENTS_API_VERSION=2022-11-16
NEXT_PUBLIC_PAYMENT_MODE=cafe24  # main: cafe24 / feat/toss-payments: toss

# ── Phase 5: 이메일 (Resend) ──
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=noreply@saf2026.com

# ── Phase 5: SMS (NHN Cloud) ──
NHN_CLOUD_APP_KEY=xxxxxxxxxxxx
NHN_CLOUD_SECRET_KEY=xxxxxxxxxxxx
NHN_CLOUD_SENDER_NUMBER=02-764-3114

# ── Phase 7: 해외 결제 ──
# 별도 환경변수 불필요 (토스 동일 키 사용, 심사 후 해외카드 활성화)

# ── Phase 8: 정기결제 ──
# 별도 환경변수 불필요 (토스 동일 키로 빌링키 발급)
```

---

## 17. 성공 지표

| 지표            | 측정 방법                           | 목표             |
| --------------- | ----------------------------------- | ---------------- |
| 구매 전환율     | 결제 완료 / 체크아웃 진입 × 100     | Cafe24 대비 +20% |
| 결제 완료 시간  | 체크아웃 ~ 성공 평균                | 3분 이내         |
| 결제 실패율     | 실패 / 전체 시도                    | 5% 이하          |
| 한정판 초과판매 | 에디션 초과 건수                    | 0건              |
| 장바구니 전환율 | 장바구니 결제 / 장바구니 담기 × 100 | 30% 이상         |
| 이메일 도달율   | Resend 대시보드                     | 95% 이상         |
| 쿠폰 사용율     | 사용 쿠폰 / 발급 쿠폰 × 100         | 15% 이상         |
| 구독 유지율     | 3개월 유지 구독자 / 가입자          | 60% 이상         |
| 해외 주문 비율  | USD 결제 / 전체 결제                | 5% 이상          |

---

## 18. 범위 외 (Out of Scope)

- 자동 배송 추적 (택배사 API 연동)
- 결제위젯 연동 (추후 위젯 키 발급 시 마이그레이션 가능)
- 해외 배송 Phase 2 (EMS/DHL — 별도 PRD 필요)
- 카카오톡 알림톡 (NHN Cloud SMS Phase 2)
- 다국어 추가 (일본어/중국어)
- 실시간 환율 API 연동 (관리자 수동 환율만)

---

## 19. 참조 링크

| 항목                 | URL                                                                |
| -------------------- | ------------------------------------------------------------------ |
| 환경 설정 가이드     | https://docs.tosspayments.com/guides/v2/get-started/environment    |
| API 개별 연동 가이드 | https://docs.tosspayments.com/guides/v2/payment-window/integration |
| 결제 승인 API        | https://docs.tosspayments.com/reference#결제-승인                  |
| 웹훅 가이드          | https://docs.tosspayments.com/guides/v2/webhook                    |
| SDK 레퍼런스         | https://docs.tosspayments.com/sdk/v2/js                            |
| 개발자센터 (키 확인) | https://developers.tosspayments.com                                |
| 에러 코드 목록       | https://docs.tosspayments.com/reference/error-codes                |
| 테스트 카드번호      | https://docs.tosspayments.com/reference/test-card                  |
| 빌링키 가이드        | https://docs.tosspayments.com/guides/v2/billing                    |
| Resend 문서          | https://resend.com/docs                                            |
| NHN Cloud SMS        | https://docs.nhncloud.com/ko/Notification/SMS/                     |

---

## 부록: i18n 메시지 키 (추가 필요)

```json
// messages/ko.json 추가 키
{
  "cart": {
    "title": "장바구니",
    "empty": "장바구니가 비어있습니다",
    "addToCart": "장바구니 담기",
    "added": "장바구니에 담았습니다",
    "alreadyInCart": "이미 장바구니에 있는 작품입니다",
    "maxItems": "장바구니는 최대 10점까지 담을 수 있습니다",
    "subtotal": "상품 금액",
    "shipping": "배송비",
    "total": "결제 예정 금액",
    "checkout": "전체 결제하기",
    "remove": "삭제",
    "clearAll": "전체 비우기"
  },
  "coupon": {
    "title": "쿠폰",
    "placeholder": "쿠폰 코드 입력",
    "apply": "적용",
    "applied": "적용됨",
    "invalid": "유효하지 않은 쿠폰입니다",
    "expired": "만료된 쿠폰입니다",
    "minOrder": "최소 주문 금액 {amount}원 이상 시 사용 가능합니다"
  },
  "points": {
    "title": "포인트",
    "balance": "보유 포인트",
    "use": "사용",
    "earned": "{amount}P 적립 예정",
    "min": "1,000P 이상 보유 시 사용 가능"
  },
  "subscription": {
    "title": "구독",
    "plans": "구독 플랜",
    "subscribe": "구독하기",
    "manage": "구독 관리",
    "cancel": "구독 해지",
    "cancelConfirm": "정말 구독을 해지하시겠습니까?"
  },
  "notifications": {
    "orderConfirmed": "주문이 확인되었습니다",
    "shipped": "배송이 시작되었습니다",
    "delivered": "배송이 완료되었습니다"
  }
}
```
