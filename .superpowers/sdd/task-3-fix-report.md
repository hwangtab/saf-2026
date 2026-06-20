# Task 3 Fix Report

## Status

- 완료: 수동 계좌이체 계좌/기한 표시값을 checkout metadata, success pages, order lookup, buyer/admin notification 테스트 기준으로 일관화했다.
- `app/api/internal/reconcile-payments/route.ts` 및 관련 테스트는 건드리지 않았다.

## RED Evidence

명령:

```bash
npm test -- --runInBand __tests__/lib/bank-transfer-info.test.ts __tests__/app/actions/admin-sms.test.ts __tests__/actions/checkout.test.ts __tests__/actions/order-lookup.test.ts
```

결과:

- 실패: 2 suites, 7 tests
- 주요 실패:
  - `verifyBankTransferLanding`이 `{ ok, bankTransfer }`가 아니라 기존 boolean을 반환.
  - success clients가 `setBankTransfer`/`verification.bankTransfer` 없이 catalog 번역값과 `Date.now() + 24h` fallback을 사용.
  - `lookupOrderDetail` 결과에 `order.bankTransfer`가 없어 manual bank-transfer 표시 payload가 `undefined`.

## GREEN Evidence

명령:

```bash
npm test -- --runInBand __tests__/lib/bank-transfer-info.test.ts __tests__/app/actions/admin-sms.test.ts __tests__/actions/checkout.test.ts __tests__/actions/order-lookup.test.ts
```

결과:

- 통과: 4 suites, 100 tests

추가 검증:

```bash
npx eslint app/actions/checkout.ts app/actions/order-lookup.ts 'app/[locale]/checkout/success/SuccessClient.tsx' 'app/[locale]/checkout/[artworkId]/success/SuccessClient.tsx' 'app/[locale]/orders/OrderLookup.tsx' __tests__/actions/checkout.test.ts __tests__/app/actions/admin-sms.test.ts __tests__/actions/order-lookup.test.ts
npm run type-check
git diff --check
```

결과:

- eslint 통과. 단, 기존 Browserslist `caniuse-lite` stale 경고가 출력됨.
- type-check 통과.
- `git diff --check` 통과.

## Changed Files

- `app/actions/checkout.ts`
  - `verifyBankTransferLanding` 반환형을 `{ ok: true, bankTransfer } | { ok: false }`로 변경.
  - 기존 anti-phishing/token 판정은 유지하고, 통과 시 metadata 우선/fallback 계좌 표시 payload를 반환.
- `app/[locale]/checkout/success/SuccessClient.tsx`
  - server action 반환 `bankTransfer` 상태를 저장해 렌더링.
  - catalog 계좌값과 client-side `Date.now() + 24h` deadline fallback 제거.
- `app/[locale]/checkout/[artworkId]/success/SuccessClient.tsx`
  - cart success와 같은 표시 payload 흐름으로 변경.
  - 오래된 NH 계좌 주석 제거.
- `app/actions/order-lookup.ts`
  - `OrderPublicInfo.bankTransfer` 추가.
  - manual bank-transfer awaiting_deposit 주문은 metadata/fallback 기반 표시 payload를 반환.
  - Toss `virtualAccount`와 manual `bankTransfer`를 분리.
- `app/[locale]/orders/OrderLookup.tsx`
  - manual bank-transfer 안내를 `order.bankTransfer`로만 렌더링.
  - hardcoded catalog 계좌값과 hardcoded +24h deadline 제거.
- `__tests__/actions/checkout.test.ts`
  - `verifyBankTransferLanding` payload/invalid-token 테스트 강화.
  - `createBankTransferOrder` metadata 및 buyer/admin 알림 env override payload 테스트 추가.
  - success client source regression 테스트 추가.
- `__tests__/app/actions/admin-sms.test.ts`
  - legacy resend fallback deadline을 configured deadline/locale 기준으로 고정 검증.
- `__tests__/actions/order-lookup.test.ts`
  - manual bank-transfer metadata 우선 및 env/created_at fallback payload 테스트 추가.

## Remaining Concerns

- 전체 `npm run build`나 e2e는 이번 좁은 fix 범위에서는 실행하지 않았다.
- `lib/payments/bank-transfer-info.ts` 자체 API는 유지했다. 클라이언트는 해당 모듈을 import하지 않는다.
