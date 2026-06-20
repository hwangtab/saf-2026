# 최근 결제·관리자 등록 회귀 개선 Implementation Plan (2026-06-20)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 모든 구현은 `superpowers:test-driven-development` 순서(실패 테스트 확인 -> 최소 구현 -> 통과 확인)를 따른다.

**Goal:** 최근 커밋 이후 남은 관리자 신규 작품 등록 멈춤 회귀와 가상계좌 결제 row 누락 보정 구멍을 제거한다.

**Architecture:** 관리자 신규 작품 등록은 action 응답에 공개면 `revalidateTag('artworks')`가 실리지 않게 하고, 등록 후 공개 캐시 갱신은 `after()`에서 별도 HTTP route를 호출해 다른 request의 revalidate로 분리한다. 결제 보정은 `payments` row가 없더라도 Toss API 검증으로 `DEPOSIT_CALLBACK DONE`과 reconcile이 동일한 증거 보존 helper를 호출하도록 한다.

**Tech Stack:** Next.js 14 App Router, Server Actions, Route Handlers, Supabase JS v2, Jest, TypeScript.

## Global Constraints

- `AGENTS.md`: 실행 전 계획은 한국어로 `implementation_plan.md`에 남기고, 승인 전에는 코드 수정하지 않는다.
- TDD: production code 수정 전에 실패 테스트를 먼저 추가하고, 실패를 확인한 뒤 최소 구현한다.
- 관리자 신규 작품 등록: 등록 성공 후 operator는 화면 멈춤 없이 목록으로 이동해야 한다.
- 공개 작품 갱신: 신규 작품 등록 후 KO/EN 목록, home, API `artworks` tag, 관련 작가 경로는 결국 갱신되어야 한다.
- 결제 불변조건: `paid` 또는 입금 완료된 가상계좌 결제는 Toss 증거가 `payments` row로 보존되어야 한다.
- 기존 사용자/다른 에이전트 변경은 되돌리지 않는다.

---

### Task 1: 관리자 신규 작품 등록의 공개 캐시 무효화 분리

**Files:**

- Modify: `app/actions/admin-artworks.ts`
- Create: `app/api/internal/revalidate-artwork-surfaces/route.ts`
- Test: `__tests__/app/admin-artwork-create-image-upload-source.test.ts`
- Test: `__tests__/app/admin-artwork-create-revalidate-contract.test.ts`

**Interfaces:**

- Produces: `createAdminArtworkRecord`는 동기/`after()` 어디에서도 직접 `revalidatePublicArtworkSurfaces()`를 호출하지 않고, `schedulePublicArtworkSurfaceRevalidation([artistName])`만 호출한다.
- Produces: internal route `POST /api/internal/revalidate-artwork-surfaces`는 `artistNames?: string[]` body를 받아 `revalidatePublicArtworkSurfaces(artistNames)`를 실행한다.
- Consumes: `CRON_SECRET` Bearer 인증 또는 같은 프로젝트 내부 호출용 shared secret.

- [x] **Step 1: Write failing source contract test**

```ts
import { readFileSync } from 'node:fs';

describe('admin artwork create revalidate contract', () => {
  it('does not attach public artwork invalidation to the create server action response', () => {
    const src = readFileSync('app/actions/admin-artworks.ts', 'utf8');
    const createBlock = src.slice(
      src.indexOf('async function createAdminArtworkRecord'),
      src.indexOf('export async function createAdminArtwork')
    );

    expect(createBlock).toContain("revalidatePath('/admin/artworks')");
    expect(createBlock).toContain('schedulePublicArtworkSurfaceRevalidation([artistName])');
    expect(createBlock).not.toContain('revalidatePublicArtworkSurfaces');
  });
});
```

- [x] **Step 2: Run RED**

Run: `npm test -- __tests__/app/admin-artwork-create-revalidate-contract.test.ts --runInBand`

Expected: FAIL because `createAdminArtworkRecord` currently contains `after(() => { revalidatePublicArtworkSurfaces([artistName]); })` and does not call `schedulePublicArtworkSurfaceRevalidation`.

- [x] **Step 3: Write failing route contract test**

Add to `__tests__/app/admin-artwork-create-revalidate-contract.test.ts`:

```ts
it('exposes a protected internal route for public artwork surface invalidation', () => {
  const src = readFileSync('app/api/internal/revalidate-artwork-surfaces/route.ts', 'utf8');

  expect(src).toContain('validateInternalCronRequest');
  expect(src).toContain('revalidatePublicArtworkSurfaces');
  expect(src).toContain('artistNames');
});

it('schedules the protected route instead of calling revalidate directly from the action', () => {
  const src = readFileSync('app/actions/admin-artworks.ts', 'utf8');

  expect(src).toContain('async function schedulePublicArtworkSurfaceRevalidation');
  expect(src).toContain('/api/internal/revalidate-artwork-surfaces');
  expect(src).toContain('CRON_SECRET');
});
```

- [x] **Step 4: Run RED**

Run: `npm test -- __tests__/app/admin-artwork-create-revalidate-contract.test.ts --runInBand`

Expected: FAIL because `app/api/internal/revalidate-artwork-surfaces/route.ts` does not exist.

- [x] **Step 5: Minimal implementation**

In `app/actions/admin-artworks.ts`:

- keep `revalidatePath('/admin/artworks')` in `createAdminArtworkRecord`
- keep artist lookup only to pass the relevant artist name to background route scheduling
- do not call `revalidatePublicArtworkSurfaces` directly inside create action
- call `schedulePublicArtworkSurfaceRevalidation([artistName])` after the admin-list revalidate
- implement `schedulePublicArtworkSurfaceRevalidation` with `after(async () => fetch(...))`; the target route performs the actual cache invalidation in a separate request so the server action response does not carry public artwork invalidation directives

Create `app/api/internal/revalidate-artwork-surfaces/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';

import { validateInternalCronRequest } from '@/lib/security/internal-cron-auth';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const authError = validateInternalCronRequest(request);
  if (authError) return authError;

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const artistNames = Array.isArray((body as { artistNames?: unknown } | null)?.artistNames)
    ? (body as { artistNames: unknown[] }).artistNames.filter(
        (name): name is string => typeof name === 'string' && name.trim().length > 0
      )
    : [];

  revalidatePublicArtworkSurfaces(artistNames);
  return NextResponse.json({ revalidated: true, artistNames });
}
```

- [x] **Step 6: Run GREEN**

Run:

```bash
npm test -- __tests__/app/admin-artwork-create-revalidate-contract.test.ts __tests__/app/admin-artwork-create-image-upload-source.test.ts --runInBand
```

Expected: PASS. If the old test expects `after(() => revalidatePublicArtworkSurfaces)`, update it to assert the new contract instead.

---

### Task 2: `DEPOSIT_CALLBACK DONE`에서 payment row 누락 복구

**Files:**

- Modify: `app/api/webhooks/toss/route.ts`
- Test: `__tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`

**Interfaces:**

- Consumes: `ensureTossPaymentRecord` from `lib/payments/toss-payment-record.ts`.
- Produces: payment row가 없더라도 `DEPOSIT_CALLBACK DONE`은 Toss API double-verify 후 order_no로 주문을 찾아 payment row를 먼저 생성한 뒤 기존 입금 완료 처리로 들어간다.

- [x] **Step 1: Write failing test**

```ts
it('repairs a missing payment row for verified DEPOSIT_CALLBACK DONE before marking the order paid', async () => {
  const supabase = createDepositCallbackMissingPaymentMock();
  mockCreateSupabaseAdminClient.mockReturnValue(supabase);
  mockFetchPayment.mockResolvedValue({
    paymentKey: 'pay-key',
    orderId: 'SAF-001',
    orderName: 'SAF artwork',
    status: 'DONE',
    method: '가상계좌',
    totalAmount: 100000,
    balanceAmount: 100000,
    currency: 'KRW',
    approvedAt: '2026-06-20T12:00:00+09:00',
    requestedAt: '2026-06-20T11:59:00+09:00',
    virtualAccount: { secret: 'deposit-secret' },
  });
  mockEnsureTossPaymentRecord.mockResolvedValue({
    ok: true,
    paymentId: 'payment-1',
    created: true,
  });

  const { POST } = await import('@/app/api/webhooks/toss/route');
  const response = await POST(makeDepositCallbackDoneRequest() as never);

  expect(response.status).toBe(200);
  expect(mockEnsureTossPaymentRecord).toHaveBeenCalledWith(
    expect.objectContaining({ orderId: 'order-1' })
  );
  expect(supabase.orderStatusUpdates).toContain('paid');
});
```

- [x] **Step 2: Run RED**

Run: `npm test -- __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts --runInBand`

Expected: FAIL because current `DEPOSIT_CALLBACK` rejects missing `payments` row before Toss API verification.

- [x] **Step 3: Minimal implementation**

In `app/api/webhooks/toss/route.ts` `isDepositCallback` branch:

- if `paymentRecord` is missing and `paymentStatus === 'DONE'`, resolve provider from `orders.order_no = payload.data.orderId`
- call `fetchPayment(paymentKey, provider)` and require `verified.status === 'DONE'`
- call `ensureTossPaymentRecord({ supabase, orderId: order.id, tossPayment: verified, idempotencyKey: \`webhook-deposit-${paymentKey}\` })`
- refetch `paymentRecord` or synthesize `{ id, order_id, webhook_responses: [], confirm_response: verified }`
- continue existing DONE flow
- keep secret verification for rows that already have `confirm_response.virtualAccount.secret`
- do not weaken verification for non-DONE deposit callbacks

- [x] **Step 4: Run GREEN**

Run:

```bash
npm test -- __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts __tests__/app/toss-webhook-status-changed-missing-payment.test.ts --runInBand
```

Expected: PASS.

---

### Task 3: Reconcile에서 `awaiting_deposit + Toss DONE + payment row 없음` 보정

**Files:**

- Modify: `app/api/internal/reconcile-payments/route.ts`
- Test: `__tests__/app/reconcile-payments-missing-payment-source.test.ts`

**Interfaces:**

- Produces: missing payment scan은 `awaiting_deposit` 주문의 Toss 상태가 `DONE`이면 payment row 생성 후 주문 paid 전환/매출 기록 경로로 넘긴다.

- [x] **Step 1: Write failing source contract test**

Update `__tests__/app/reconcile-payments-missing-payment-source.test.ts`:

```ts
it('does not skip awaiting_deposit missing-payment orders after Toss has moved to DONE', () => {
  const src = readFileSync('app/api/internal/reconcile-payments/route.ts', 'utf8');

  expect(src).toContain("order.status === 'awaiting_deposit' && tossPayment.status === 'DONE'");
  expect(src).toContain('reconcileMissingDoneOrder');
});
```

- [x] **Step 2: Run RED**

Run: `npm test -- __tests__/app/reconcile-payments-missing-payment-source.test.ts --runInBand`

Expected: FAIL because current code pushes an error and continues when `awaiting_deposit` order sees Toss `DONE`.

- [x] **Step 3: Minimal implementation**

In `app/api/internal/reconcile-payments/route.ts`:

- extract the existing pending `DONE` repair body into helper `reconcileMissingDoneOrder({ supabase, order, tossPayment, provider, now, errors })`
- for `missingPaymentOrders`, when `order.status === 'awaiting_deposit' && tossPayment.status === 'DONE'`, call the helper
- ensure helper creates/ensures payment row, updates order to `paid` from either `pending_payment` or `awaiting_deposit`, records `artwork_sales`, syncs artwork status, and revalidates public surfaces
- keep existing mismatch error for all other status mismatches

- [x] **Step 4: Run GREEN**

Run:

```bash
npm test -- __tests__/app/reconcile-payments-missing-payment-source.test.ts __tests__/app/toss-confirm-virtual-account-reservation.test.ts --runInBand
```

Expected: PASS.

---

### Task 4: Verification

**Files:**

- No production edits.

- [x] **Step 1: Run targeted regression tests**

Run:

```bash
npm test -- __tests__/app/admin-artwork-create-revalidate-contract.test.ts __tests__/app/admin-artwork-create-image-upload-source.test.ts __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts __tests__/app/toss-webhook-status-changed-missing-payment.test.ts __tests__/app/reconcile-payments-missing-payment-source.test.ts __tests__/lib/toss-payment-record.test.ts --runInBand
```

- [x] **Step 2: Run broader safety checks**

Run:

```bash
npm run type-check
npm run lint
```

- [x] **Step 3: Write walkthrough**

Create/update `walkthrough.md` with:

- changed files
- failed-test evidence before implementation
- passing-test evidence after implementation
- remaining risk: route-based public revalidation may need a production smoke call with `CRON_SECRET`
