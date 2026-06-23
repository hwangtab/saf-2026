# SAF 2026 운영 안정성 중심 리팩토링 설계

작성일: 2026-06-23
상태: 설계 초안

## 배경

SAF 2026은 공개 캠페인 사이트에서 출발했지만 현재는 커머스, 작품 관리, 관리자 운영, 이벤트 결제, 알림, 콘텐츠 CMS, 소셜 자동화까지 포함한 운영 플랫폼에 가깝다. 코드 규모가 커진 것 자체보다 더 큰 문제는 결제/주문/작품/알림/캐시 무효화의 운영 불변조건이 여러 Server Action과 Route Handler에 흩어져 있다는 점이다.

이 리팩토링은 파일 수를 줄이는 작업이 아니라, 운영자가 한 달 뒤에도 같은 상태 전이와 실패 처리를 예측할 수 있게 만드는 구조 정리다.

## 목표

- 결제 완료, 환불, 취소, reconcile, webhook 처리에서 같은 상태 전이 규칙을 사용한다.
- `payments`, `orders`, `order_items`, `artworks`, `artwork_sales` 사이의 진실 공급원을 명확히 한다.
- 알림, 감사 로그, public cache invalidation 같은 후속 작업을 누락 없이 실행하되, 주요 응답 흐름을 불필요하게 막지 않는다.
- 관리자 작품/주문/분석 액션을 기능별로 나누어 변경 범위를 좁힌다.
- 기존 테스트와 운영 검증 흐름을 유지하면서 단계적으로 이전한다.

## 비목표

- Next.js App Router 구조를 전면 교체하지 않는다.
- Supabase 스키마를 대규모로 다시 설계하지 않는다.
- 관리자 UI를 한 번에 새 디자인 시스템으로 갈아엎지 않는다.
- 특별전/거장 페이지의 개별 미감을 템플릿으로 강제 통일하지 않는다.
- 결제 provider 자체를 바꾸거나 신규 인프라를 도입하지 않는다.

## 설계 원칙

1. 운영 의도 우선: 기술적으로 가능한 shortcut보다 운영자가 기대하는 최종 상태를 기준으로 설계한다.
2. Route Handler와 Server Action은 adapter로 제한한다: 인증, request parsing, response mapping만 담당한다.
3. 도메인 서비스가 불변조건을 가진다: 상태 전이, idempotency, zero-row update, reservation release, sales 기록은 중앙 도메인 함수가 결정한다.
4. 후속 작업은 event 단위로 묶는다: 알림, 로그, 캐시 갱신은 `afterAllSettled` 계열 패턴으로 실행하고 실패를 관측 가능하게 남긴다.
5. 단계별 이전: 한 번에 큰 파일을 이동하지 않고, 검증 가능한 단위로 adapter를 얇게 만든다.

## 목표 아키텍처

```txt
app/
  actions/
    checkout.ts                 # 얇은 adapter: form/input -> commerce service
    admin-orders.ts             # 얇은 adapter: admin auth -> order operation
    admin-artworks.ts           # 얇은 adapter: admin auth -> artwork operation
  api/
    payments/toss/confirm/      # 얇은 adapter: request 검증 -> payment lifecycle
    webhooks/toss/              # 얇은 adapter: webhook 검증 -> payment lifecycle
    internal/reconcile-payments/ # 얇은 adapter: cron auth -> reconcile service

lib/
  commerce/
    checkout/
      create-order.ts
      checkout-session.ts
      bank-transfer.ts
      availability.ts
    payment-lifecycle/
      mark-order-paid.ts
      handle-toss-confirm.ts
      handle-toss-webhook.ts
      reconcile-paid-order.ts
    refund-cancel/
      refund-paid-order.ts
      cancel-awaiting-order.ts
      cancel-buyer-order.ts
    order-state.ts
    order-metadata.ts
  artworks/
    mutations/
      create-artwork.ts
      update-artwork.ts
      delete-artwork.ts
      update-images.ts
      update-tags.ts
    status.ts
    cache-events.ts
  operations/
    side-effects.ts
    audit.ts
    notifications.ts
  admin/
    queries/
    serializers/
```

## 핵심 도메인 경계

### Commerce checkout

책임:

- 주문 입력 정규화
- checkout token 생성/검증
- 결제 가능성 판정
- 무통장 metadata와 입금 안내 표시 모델 생성
- 주문 생성 직후 필요한 reservation 준비

이 영역은 `app/actions/checkout.ts`에 섞여 있는 token, cookie, metadata, bank-transfer 표시 로직을 `lib/commerce/checkout`으로 이동한다. `app/actions/checkout.ts`는 사용자의 입력을 받아 service를 호출하고, UI가 기대하는 result shape로 매핑한다.

### Payment lifecycle

책임:

- Toss confirm 성공 처리
- Toss webhook `DONE` / 입금 callback 처리
- reconcile cron에서 확인된 결제 완료 주문 복구
- `payments` row 보장
- `orders.status`를 `paid` 또는 `awaiting_deposit`으로 전이
- `order_items` 기반 `artwork_sales` 기록
- 작품 상태 재계산
- public artwork surface 갱신 event 발행

핵심 API 예시:

```ts
type MarkOrderPaidInput = {
  source: 'confirm' | 'webhook' | 'reconcile';
  orderId: string;
  tossPayment: TossConfirmResponse;
  idempotencyKey: string;
  allowedSourceStatuses: Array<'pending_payment' | 'awaiting_deposit'>;
};

type MarkOrderPaidResult =
  | { ok: true; orderId: string; paymentId: string | null; sideEffects: OperationSideEffect[] }
  | { ok: false; code: string; operatorMessage: string; recoverable: boolean };
```

`confirm`, `webhook`, `reconcile`는 이 함수를 호출하고, HTTP status와 response body만 각자 결정한다.

### Refund and cancel

책임:

- 관리자 환불
- 구매자 셀프 취소
- 입금대기 주문 취소
- Toss cancel 호출과 내부 DB sync 실패 분리
- reservation release
- 환불/취소 알림과 감사 로그

관리자와 구매자 경로는 권한과 rate limit은 다르지만, 결제 취소 이후 내부 상태 동기화 불변조건은 같다. 따라서 shared service가 `Toss cancel success`와 `orders/payments sync success`를 별도 결과로 반환해야 한다.

### Artwork operations

책임:

- 작품 생성/수정/삭제
- 이미지 업데이트와 storage cleanup
- 판매 기록 수동 입력/수정/void
- 태그 생성/수정/부착/해제
- 작품 상태 파생 및 public surface cache event

`admin-artworks.ts`는 adapter로 축소하고, 기능별 mutation 모듈을 둔다. public cache invalidation은 각 mutation 내부에서 직접 `revalidatePath`를 호출하기보다 `ArtworkChanged` event를 발행한다.

### Operations side effects

책임:

- notification task 실행
- audit/system/buyer log 실행
- cache revalidation 실행
- side effect 실패 관측

기존 `runAllSettled` / `afterAllSettled` 패턴을 유지하되, 호출자가 매번 `notifyEmail`, `logAdminAction`, `revalidatePublicArtworkSurfaces` 조합을 직접 조립하지 않도록 한다.

예시:

```ts
type OperationSideEffect =
  | {
      type: 'notify-admin';
      severity: 'info' | 'warning' | 'error';
      title: string;
      fields: Record<string, string>;
    }
  | { type: 'notify-buyer'; channel: 'email' | 'sms'; template: string; payload: unknown }
  | {
      type: 'audit';
      actor: 'admin' | 'buyer' | 'system';
      action: string;
      target: string;
      payload: unknown;
    }
  | { type: 'revalidate-artworks'; artworkIds?: string[]; artistNames?: string[] };
```

## 이전 단계

### Phase 1: 중복 util 추출

- checkout token 생성/해시/검증/cookie name을 `lib/commerce/checkout/checkout-session.ts`로 이동한다.
- order metadata parsing을 `lib/commerce/order-metadata.ts`로 이동한다.
- bank transfer 표시 모델을 `lib/commerce/checkout/bank-transfer.ts`로 이동한다.
- 기존 테스트를 util 단위 테스트로 옮긴다.

### Phase 2: 결제 완료 lifecycle 도입

- `markOrderPaid()`를 만들고 `app/api/internal/reconcile-payments/route.ts`의 작은 경로부터 연결한다.
- 다음으로 Toss confirm route를 연결한다.
- 마지막으로 Toss webhook route를 연결한다.
- 각 단계마다 기존 source-level 테스트를 domain contract 테스트로 바꾼다.

### Phase 3: 환불/취소 lifecycle 도입

- 관리자 `refundOrder()`와 구매자 `cancelBuyerOrder()`가 공통 cancel/refund service를 사용하게 한다.
- Toss cancel 성공과 내부 sync 실패를 명확히 분리해 operator alert를 유지한다.
- reservation release와 artwork status sync를 shared service로 고정한다.

### Phase 4: 작품 관리자 액션 분리

- `admin-artworks.ts`에서 image, sale, tag, status, CRUD mutation을 분리한다.
- adapter는 `requireAdmin()`과 result mapping만 담당한다.
- cache invalidation은 `ArtworkChanged` event로 통합한다.

### Phase 5: 관리자 UI 분해

- 큰 client component를 shell, table, filters, dialogs, batch actions로 나눈다.
- 서버 데이터 shape는 `lib/admin/serializers`에서 만든 DTO로 고정한다.
- UI 분해는 기능 변경과 섞지 않고 별도 PR/커밋 단위로 진행한다.

### Phase 6: 콘텐츠/특별전 컴포넌트 정리

- 거장/특별전 페이지는 개별 미감을 유지한다.
- 공통 schema builder, timeline section, artwork section, CTA section을 먼저 추출한다.
- 장기적으로 데이터 중심 렌더링이 가능한 페이지부터 이동한다.

## 테스트 전략

- Phase 1은 util 단위 테스트 중심으로 검증한다.
- Phase 2는 confirm/webhook/reconcile의 shared lifecycle contract 테스트를 만든다.
- Phase 3은 관리자 환불, 구매자 취소, 입금대기 취소를 같은 상태 전이 matrix로 검증한다.
- Phase 4 이후는 기존 action 테스트를 유지하되, adapter 테스트보다 domain service 테스트 비중을 높인다.
- 각 단계의 최소 검증은 관련 Jest + `npm run type-check`다.
- 결제/작품 데이터에 닿는 변경은 `npm run lint`, `npm run type-check`, 관련 Jest, 필요 시 `npm run validate-artworks`까지 실행한다.

## 위험과 완화

- 위험: 큰 파일 이동 중 import 경로와 mock이 깨질 수 있다.
  - 완화: util 추출부터 시작하고, domain 함수 시그니처를 작게 유지한다.

- 위험: cache invalidation 누락이 재발할 수 있다.
  - 완화: revalidation을 domain event의 필수 side effect로 만들고 테스트에서 event 발행을 검증한다.

- 위험: confirm/webhook/reconcile의 미세한 차이를 공통화하다가 provider별 예외를 잃을 수 있다.
  - 완화: route별 adapter는 유지하고, 공통 service 입력에 `source`와 provider 정보를 명시한다.

- 위험: 관리자 UI 분해가 기능 변경과 섞이면 회귀 원인을 찾기 어렵다.
  - 완화: UI 분해는 domain refactor 이후 별도 단계로 진행한다.

## 성공 기준

- 결제 완료 처리가 confirm/webhook/reconcile에서 같은 domain service를 사용한다.
- 환불/취소 경로가 Toss 결과와 내부 DB sync 결과를 별도로 반환한다.
- 작품 mutation이 public cache event를 누락 없이 발행한다.
- `admin-artworks.ts`, `admin-orders.ts`, `checkout.ts`, Toss route handler의 책임이 adapter 중심으로 줄어든다.
- 관련 테스트가 route/source 문자열 검증보다 domain contract 검증을 중심으로 바뀐다.
- 운영 알림 실패, 감사 로그 실패, cache 갱신 실패가 조용히 묻히지 않는다.

## 권장 첫 구현 단위

첫 구현은 Phase 1만 진행한다. checkout session과 order metadata util을 추출하면 운영 동작을 거의 바꾸지 않으면서 이후 payment lifecycle 공통화의 기반을 만들 수 있다.

첫 구현 범위:

- `lib/commerce/checkout/checkout-session.ts`
- `lib/commerce/order-metadata.ts`
- `lib/commerce/checkout/bank-transfer.ts`
- `app/actions/checkout.ts` adapter 축소
- `app/api/payments/toss/confirm/route.ts` token 검증 util 사용
- 관련 Jest 업데이트

이 범위가 통과하면 Phase 2로 넘어가 `markOrderPaid()` 설계를 코드로 옮긴다.
