# 장바구니(Shopping Cart) 기능 설계

- 작성일: 2026-06-14
- 상태: 승인됨 (설계 합의 완료, 구현 계획 대기)

## 배경

현재 SAF 2026의 구매 동선은 **단건 결제만 지원**한다. 작품 상세의 "구매" 버튼이
`/checkout/{artworkId}`로 직행하고, 한 번에 1작품만(`quantity=1` 고정) 결제한다.
장바구니 관련 코드·DB·타입은 전무하며, 클라이언트 상태관리 라이브러리(Zustand 등)도
없이 `localStorage`/`sessionStorage` 래핑 유틸([lib/storage.ts](../../../lib/storage.ts))만 사용한다.

작품 구매는 충동구매보다 **숙고형·비교형**이라 "여러 점 담아두고 결정"하는 장바구니의
가치가 크다. 본 설계는 기존 단건 동선을 유지하면서 다품목 장바구니·다품목 결제를 추가한다.

## 확정된 정책 결정

1. **단건 동선 유지**: "바로 구매" + "장바구니 담기" 병행. 바로구매는 내부적으로
   1-item 주문으로 처리해 결제 코드 경로를 하나로 통일한다.
2. **저장 방식**: 로그인 유저 = DB(`cart_items`), 게스트 = localStorage.
   로그인 전환 시 게스트 local 카트를 DB로 병합한다.
3. **배송료**: 다품목이라도 단일 배송으로 합산 처리(수량별 누적 아님).
4. **품절 처리**: 결제 직전 재확인에서 일부 품절 시 **부분 차단** — 품절 항목만
   하이라이트하고 사용자가 제거 후 나머지 결제 진행.
5. **UI**: 헤더 카트 아이콘(수량 배지) + 우측 슬라이드 패널(drawer), 별도 `/cart` 전체 페이지.

## 1. 상태관리 아키텍처

장바구니는 헤더 배지·슬라이드 패널·갤러리 "담기" 버튼·`/cart` 페이지가 같은 상태를
공유·반응해야 한다. 기존 `components/providers/` 패턴(AnimationProvider, ToastProvider)에
맞춰 **`CartProvider` (React Context)** 로 통일한다. Zustand 신규 도입은 하지 않는다.

```
lib/cart/
├── types.ts          # CartItem { artworkId, quantity, addedAt }
├── local-store.ts    # 게스트: localStorage 백엔드 (lib/storage.ts 재사용)
└── merge.ts          # 게스트 local → DB 병합 규칙

components/providers/CartProvider.tsx   # useCart() 노출, 저장 백엔드 추상화
app/actions/cart.ts                     # DB 백엔드 서버액션 (로그인 유저)
```

- `useCart()` 노출 API: `items`, `addItem`, `removeItem`, `updateQuantity`, `clear`,
  `itemCount`, `subtotal`.
- **저장 백엔드 분기는 Provider 내부에 캡슐화** — 소비 컴포넌트는 게스트/로그인을 모름.
  - 게스트 → localStorage 읽기·쓰기
  - 로그인 → `app/actions/cart.ts` 서버액션으로 DB 동기화
  - 로그인 전환 감지 시 → local 카트를 DB로 병합(같은 artwork면 quantity 합산,
    unique는 1 유지) 후 local 비움

## 2. 데이터 모델

### `cart_items` (신규, 로그인 유저용)

| 컬럼                        | 타입/비고                         |
| --------------------------- | --------------------------------- |
| `id`                        | uuid pk                           |
| `user_id`                   | fk auth.users — RLS로 본인만 접근 |
| `artwork_id`                | fk artworks                       |
| `quantity`                  | int — unique 작품은 항상 1        |
| `created_at` / `updated_at` | timestamptz                       |

- `UNIQUE(user_id, artwork_id)` — 작품당 1행. 담기 중복 시 행 갱신(quantity 증가).
- RLS: 본인 행만 select/insert/update/delete.

**저장은 참조만(가격 스냅샷 안 함).** 카트에는 `artwork_id` + `quantity`만 보관하고,
가격·재고·품절 여부는 항상 live 조회한다. 가격 변동·품절을 최신으로 반영하고 결제 직전
재확인과 일관성을 유지하기 위함이다.

### `order_items` (신규 — 주문 다품목화)

기존 `orders.artwork_id`(단수)를 다품목으로 확장한다.

| 컬럼         | 타입/비고                                   |
| ------------ | ------------------------------------------- |
| `id`         | uuid pk                                     |
| `order_id`   | fk orders                                   |
| `artwork_id` | fk artworks                                 |
| `quantity`   | int                                         |
| `unit_price` | int — 주문 시점 가격 스냅샷(정산·환불 근거) |

- `orders`는 헤더로서 합계(`item_amount`/`shipping_amount`/`total_amount`)만 유지,
  품목 상세는 `order_items`로 정규화.
- 바로구매 = `order_items` 1행짜리 주문 → 단건/다건이 동일 스키마를 공유.

## 3. 결제 흐름 (다품목 + 결제 직전 재확인)

`createOrder`를 단일 `artworkId`에서 `items: [{ artworkId, quantity }]` 수용형으로 리팩터한다.

1. **1차 재확인 (주문 생성 시점)**: 각 item을 `check_artwork_availability` RPC로 검증.
   - 하나라도 품절 → 결제 진입하지 않고 품절 목록을 클라이언트에 반환 →
     품절 항목만 하이라이트, 사용자가 제거 후 재시도(정책 4).
   - 전부 가능 → `status='pending_payment'` 주문 + `order_items` INSERT.
     **이 pending 주문이 곧 재고 예약 역할** — RPC가 pending 주문을 재고에서
     차감하므로 결제 진행 중 타인이 같은 unique 작품을 가져가지 못한다(경합 창 차단).
2. **배송료**: 단일 배송이므로 `calculateShippingFee(subtotal)`를 한 번 적용
   (수량별 누적 아님, 정책 3).
3. **2차 재확인 (Toss confirm)**: [app/api/payments/toss/confirm/route.ts](../../../app/api/payments/toss/confirm/route.ts)에서
   결제 승인 직전 전 품목 availability 재검증 → `payments` 1행 + `artwork_sales`
   품목별 N행 + 각 artwork status 갱신을 **트랜잭션(RPC)으로 원자 처리**(부분 성공 방지).

## 4. 라우트 & UI

- **헤더**: 카트 아이콘 + 수량 배지 → 클릭 시 우측 슬라이드 패널(drawer).
  갤러리 화이트큐브 무채색 chrome([docs/DESIGN.md](../../DESIGN.md)),
  표준 컴포넌트 재사용(인라인 제작 금지).
- **`/app/[locale]/cart/page.tsx`** (신규): 전체 장바구니 — 수량조정/삭제/비우기,
  "결제하기" → `/checkout`.
- **`/app/[locale]/checkout/`** (신규, id 없음): 카트 기반 다품목 체크아웃.
  `CheckoutClient`를 items 배열 수용형으로 일반화.
- **`/checkout/{artworkId}`** (기존 유지): 바로구매 — 내부적으로 1-item으로 같은
  `createOrder` 호출. URL 불변.
- **success/fail**: 기존 `/checkout/[artworkId]/success|fail` 유지, 카트용
  `/checkout/success|fail` 추가. `SuccessClient`/`FailClient` **로직은 공유**,
  라우트 셸만 분리.
  - ⚠️ 결제 랜딩은 반드시 `window.location.search`로 파라미터를 읽는다.
    server `searchParams` 사용 금지(2026-05-22~05-30 카드결제 전면 중단 회귀 재발 방지 —
    Next.js 16 미들웨어 rewrite가 default-locale query를 떨굼).
- **"장바구니 담기" 버튼**: [components/features/ArtworkPurchaseCTA.tsx](../../../components/features/ArtworkPurchaseCTA.tsx)에
  바로구매와 나란히 추가. 갤러리 카드에도 선택적 추가.

## 5. i18n · 비즈니스 규칙 · 테스트

- **i18n**: `/cart`·`/checkout`은 공개 라우트 → `messages/ko.json`·`messages/en.json`
  키 필수, 한국어 리터럴 금지. force-static에서 `getTranslations({ locale })` 명시 전달.
- **unique 강제**: 담기·수량조정·DB 모두 unique 작품은 quantity=1 고정(UI 스테퍼 비활성).
- **테스트**:
  - CartProvider 단위 테스트
  - 게스트 local → DB 병합 로직 테스트
  - `createOrder` 부분 품절 검증 테스트
  - unique quantity=1 강제 테스트
  - 신규 `/cart` 페이지 `e2e/a11y/` spec 추가(CLAUDE.md — 신규 공개 페이지 a11y 필수,
    미작성 시 머지 차단).
- **Supabase 마이그레이션**: `supabase/migrations/`에 작성 + MCP `apply_migration`
  단건 적용(사용자 컨펌 필수).

## 비범위 (YAGNI)

- 기기 간 카트 동기화는 로그인 유저 한정(DB)으로만 제공. 게스트는 동일 브라우저 한정.
- 위시리스트·저장 목록 등 카트 외 컬렉션 기능은 본 범위 제외.
- 카트 항목 가격 변동 알림/쿠폰/프로모션 코드는 제외.

## 영향 받는 주요 파일

| 구분 | 경로                                                                            |
| ---- | ------------------------------------------------------------------------------- |
| 신규 | `lib/cart/{types,local-store,merge}.ts`                                         |
| 신규 | `components/providers/CartProvider.tsx`                                         |
| 신규 | `app/actions/cart.ts`                                                           |
| 신규 | `app/[locale]/cart/page.tsx`, `app/[locale]/checkout/page.tsx` (+ success/fail) |
| 신규 | `supabase/migrations/*_cart_items.sql`, `*_order_items.sql`                     |
| 수정 | `app/actions/checkout.ts` (items 배열 수용)                                     |
| 수정 | `app/api/payments/toss/confirm/route.ts` (다품목 트랜잭션)                      |
| 수정 | `components/features/ArtworkPurchaseCTA.tsx` (담기 버튼)                        |
| 수정 | 헤더 컴포넌트 (카트 아이콘+패널), `types/index.ts`, `messages/{ko,en}.json`     |
