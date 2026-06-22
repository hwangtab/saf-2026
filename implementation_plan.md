# 결제/환불 상태 불일치 차단 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task after user approval. Steps use checkbox (`- [ ]`) syntax for tracking. 현재 상태는 **승인 전 계획 단계**이며, 아래 코드 변경은 사용자가 승인한 뒤에만 수행한다.

**Goal:** Toss 결제/환불의 외부 상태와 SAF 내부 주문/등록 상태가 갈라진 채 성공 응답, 성공 알림, 매출/캐시 후속 처리가 진행되는 일을 막는다.

**Architecture:** 결제 승인 경로는 내부 주문 상태 전이가 확인된 뒤에만 알림, analytics, 매출 기록, 공개 캐시 갱신으로 진행한다. 환불 경로는 Toss 취소가 성공한 뒤 내부 DB 반영이 실패할 수 있다는 현실을 인정하고, 그 경우 결제 외부 상태를 숨기지 않고 운영자 알림/감사 로그를 남겨 수동 복구가 가능하게 만든다. 결제 CTA는 "키가 하나라도 있음"이 아니라 "해당 checkout 화면에서 실제로 제공할 결제수단이 있음"을 기준으로 노출한다.

**Tech Stack:** Next.js App Router Route Handler, Server Actions, Supabase JS v2, TossPayments API, Jest, TypeScript.

## Global Constraints

- `AGENTS.md`: 계획은 한국어로 작성하고, 승인 전에는 운영 코드를 수정하지 않는다.
- `AGENTS.md`: 복잡한 작업은 `implementation_plan.md`와 `task.md`로 추적하고, 완료 후 `walkthrough.md`에 결과를 남긴다.
- 운영 의도: 기술적 우회가 아니라 운영자가 한 달 뒤 결제/환불 상태를 덜 헷갈리게 만드는 구조를 우선한다.
- 결제 불변조건: Toss 승인 증거가 있어도 내부 주문 상태 전이가 실패하면 구매자/운영자에게 결제 완료로 말하지 않는다.
- 환불 불변조건: Toss 취소가 성공했는데 내부 주문/결제/매출 상태 반영이 실패하면 조용히 실패하지 않고 운영자에게 복구 가능한 증거를 남긴다.
- 기존 dirty files `content/changelog.json`, `lib/site-stats.ts`는 이번 작업 범위가 아니며 되돌리거나 섞지 않는다.
- `npm run build`는 `generate-changelog`, `sync-site-stats`를 포함하므로, 기존 dirty generated files가 있는 동안에는 명시 승인 없이 실행하지 않는다.

---

### Task 1: Toss confirm 주문 전이 실패 시 성공 후속 처리 차단

**Files:**

- Modify: `app/api/payments/toss/confirm/route.ts`
- Modify Test: `__tests__/app/toss-confirm-payment-record-failure.test.ts`

**Interfaces:**

- Produces: `orders` update가 실제로 1행 이상 성공한 경우에만 `payment_confirmed` buyer/admin 알림, `recordOrderArtworkSales`, `deriveAndSyncArtworkStatus`, `revalidatePublicArtworkSurfaces`, 성공 analytics를 실행한다.
- Produces: update error 또는 target 상태가 아닌 0행 update는 `ORDER_STATUS_SYNC_FAILED` 응답과 `notifyEmail('error', ...)` + `logSystemAction('payment_failed', ...)`로 중단한다.
- Produces: 0행 update라도 재조회한 주문이 이미 목표 상태(`paid` 또는 `awaiting_deposit`)이면 idempotent 성공으로 응답하되, 중복 알림/중복 매출 기록은 실행하지 않는다.

- [ ] **Step 1: confirm route 테스트 mock을 주문 update 결과 주입 가능하게 확장**

Update `createConfirmMock` in `__tests__/app/toss-confirm-payment-record-failure.test.ts` to accept options:

```ts
function createConfirmMock(
  options: {
    orderUpdateRows?: unknown[];
    orderUpdateError?: { message: string } | null;
    latestOrderStatus?: string;
  } = {}
) {
  const {
    orderUpdateRows = [{ id: 'order-1' }],
    orderUpdateError = null,
    latestOrderStatus = 'pending_payment',
  } = options;

  // Keep the existing order object and builder shape.
  // In the builder.then branch for table === 'orders' && builder.patch,
  // resolve with { data: orderUpdateRows, error: orderUpdateError }.
  // In the status re-read single() branch, return { data: { ...order, status: latestOrderStatus }, error: null }.
}
```

- [ ] **Step 2: order update error RED 테스트 추가**

Add this test to `__tests__/app/toss-confirm-payment-record-failure.test.ts`:

```ts
it('does not send success notifications when Toss DONE but order status update errors', async () => {
  const supabase = createConfirmMock({
    orderUpdateError: { message: 'orders update failed' },
  });
  mockCreateSupabaseAdminClient.mockReturnValue(supabase.client);
  mockEnsureTossPaymentRecord.mockResolvedValue({ ok: true, paymentId: 'pay-1', created: true });

  const { POST } = await import('@/app/api/payments/toss/confirm/route');
  const response = await POST(makeConfirmRequest() as never);

  expect(response.status).toBeGreaterThanOrEqual(500);
  expect(mockRecordOrderArtworkSales).not.toHaveBeenCalled();
  expect(
    mockNotifyEmail.mock.calls.some(
      ([type, subject]) => type === 'payment' && subject === '결제 승인 완료'
    )
  ).toBe(false);
});
```

Run:

```bash
npm test -- --runInBand __tests__/app/toss-confirm-payment-record-failure.test.ts
```

Expected: FAIL because the current route continues to success handling after `orderUpdateError`.

- [ ] **Step 3: 0행 update RED 테스트 추가**

Add:

```ts
it('does not treat a raced zero-row order update as payment success unless the order is already promoted', async () => {
  const supabase = createConfirmMock({
    orderUpdateRows: [],
    latestOrderStatus: 'cancelled',
  });
  mockCreateSupabaseAdminClient.mockReturnValue(supabase.client);
  mockEnsureTossPaymentRecord.mockResolvedValue({ ok: true, paymentId: 'pay-1', created: true });

  const { POST } = await import('@/app/api/payments/toss/confirm/route');
  const response = await POST(makeConfirmRequest() as never);
  const body = await response.json();

  expect(response.status).toBe(409);
  expect(body.error).toBeTruthy();
  expect(mockRecordOrderArtworkSales).not.toHaveBeenCalled();
});
```

Run the same targeted test command. Expected: FAIL because current code does not reject 0행 update.

- [ ] **Step 4: route handler 최소 구현**

Modify `app/api/payments/toss/confirm/route.ts` immediately after the `orders.update(...).select('id')` block:

```ts
const orderPromoted = Array.isArray(updatedOrders) && updatedOrders.length > 0;

if (orderUpdateError || !orderPromoted) {
  const { data: latestOrder } = await supabase
    .from('orders')
    .select('id,status')
    .eq('id', order.id)
    .single();

  const alreadyPromoted = latestOrder?.status === newOrderStatus;
  if (alreadyPromoted) {
    const paidNotifyInfo = await getOrderNotificationInfo(supabase, { id: order.id });
    return NextResponse.json({
      success: true,
      alreadyPromoted: true,
      status: tossResponse.status,
      virtualAccount: isVirtualAccount ? (tossResponse.virtualAccount ?? null) : null,
      analyticsItem: isDone
        ? buildAnalyticsItem(order, paidNotifyInfo, tossResponse.totalAmount)
        : null,
      analyticsPurchase: isDone
        ? buildAnalyticsPurchase(order, lineItems, paidNotifyInfo, tossResponse.totalAmount)
        : null,
    });
  }

  const updateErrMsg = orderUpdateError?.message ?? 'orders update affected 0 rows';
  console.error('[confirm] order UPDATE failed after Toss approval:', updateErrMsg);
  after(() =>
    runAllSettled('tossConfirm.orderStatusSyncFailed.notifications', [
      () =>
        notifyEmail('error', '결제 후 주문 상태 업데이트 실패', {
          주문번호: orderId,
          목표상태: newOrderStatus,
          현재상태: latestOrder?.status ?? '확인 실패',
          에러: updateErrMsg,
          참고: 'Toss 승인은 확인됐지만 내부 주문 상태 전이에 실패해 성공 알림과 매출 기록을 중단했습니다.',
        }),
      () =>
        logSystemAction('payment_failed', 'order', order.id, {
          stage: '결제 후 주문 상태 업데이트 실패',
          order_no: orderId,
          target_status: newOrderStatus,
          latest_status: latestOrder?.status ?? null,
          error: updateErrMsg,
        }),
    ])
  );
  return NextResponse.json(
    {
      error: apiError('payment_confirmation_failed', buyerLocale),
      code: 'ORDER_STATUS_SYNC_FAILED',
    },
    { status: orderUpdateError ? 500 : 409 }
  );
}
```

- [ ] **Step 5: targeted GREEN 확인**

Run:

```bash
npm test -- --runInBand __tests__/app/toss-confirm-payment-record-failure.test.ts
```

Expected: PASS.

---

### Task 2: 관리자/구매자 환불 경로의 Toss 취소 후 DB 불일치 관찰성 보강

**Files:**

- Modify: `app/actions/admin-orders.ts`
- Modify: `app/actions/order-lookup.ts`
- Modify Test: `__tests__/actions/admin-orders.test.ts`
- Modify Test: `__tests__/actions/order-lookup.test.ts`

**Interfaces:**

- Produces: Toss `cancelPayment` success 이후 `orders` update error/0행이 발생하면 `notifyEmail('error', ...)`와 감사 로그를 남긴다.
- Produces: 구매자 self-cancel은 Toss 취소 성공 후 `payments.status='CANCELED'` 반영을 먼저 시도하고, 주문 update 실패 시에도 외부 결제 취소 증거(`payment_key`, `order_no`, reason)를 운영자 알림에 포함한다.
- Consumes: existing `logAdminAction`, `logBuyerAction`, `notifyEmail`, `runAllSettled`.

- [ ] **Step 1: 구매자 self-cancel DB 불일치 RED 테스트 추가**

Append to `describe('cancelBuyerOrder')` in `__tests__/actions/order-lookup.test.ts`:

```ts
it('Toss 취소 성공 후 주문 refunded 전환이 실패하면 운영 알림을 남긴다', async () => {
  mockOrdersSingleResult = {
    data: {
      id: 'ord-1',
      order_no: 'SAF-001',
      status: 'paid',
      total_amount: 5000000,
      artwork_id: 'art-1',
      buyer_email: 'buyer@test.com',
      buyer_name: '홍길동',
    },
    error: null,
  };
  mockPaymentResult = {
    data: { id: 'pay-1', payment_key: 'pk_test', method: '카드' },
    error: null,
  };
  mockCancelResult = { success: true };
  mockOrderUpdateSelectRows = { data: [], error: null };

  const { notifyEmail } = jest.requireMock('@/lib/notify') as { notifyEmail: jest.Mock };
  const result = await cancelBuyerOrder('SAF-001', 'buyer@test.com', '단순변심');

  expect(result.success).toBe(false);
  if (!result.success) expect(result.error).toBe('ORDER_CANCEL_FAILED');
  expect(notifyEmail).toHaveBeenCalledWith(
    'error',
    expect.stringContaining('Toss 취소 후 주문 상태 반영 실패'),
    expect.objectContaining({ 주문번호: 'SAF-001', paymentKey: 'pk_test' })
  );
});
```

Run:

```bash
npm test -- --runInBand __tests__/actions/order-lookup.test.ts
```

Expected: FAIL because the current path returns `ORDER_CANCEL_FAILED` without operator notification.

- [ ] **Step 2: 구매자 self-cancel 구현**

Modify `app/actions/order-lookup.ts` after `cancelResult.success`:

```ts
const paymentCancelledAt = new Date().toISOString();
const { error: paymentCancelError } = await adminClient
  .from('payments')
  .update({ status: 'CANCELED', cancelled_at: paymentCancelledAt })
  .eq('id', payment.id);

if (paymentCancelError) {
  console.error('[cancelBuyerOrder] payment update failed after Toss cancel:', paymentCancelError);
}
```

When `orderCancelError` or `cancelledRows.length === 0`, schedule:

```ts
after(() =>
  runAllSettled('cancelBuyerOrder.orderSyncFailed.notifications', [
    () =>
      notifyEmail('error', 'Toss 취소 후 주문 상태 반영 실패', {
        주문번호: order.order_no,
        주문ID: order.id,
        paymentKey: payment.payment_key,
        구매자: order.buyer_name ?? '',
        구매자이메일: trimmedEmail,
        취소사유: trimmedReason,
        에러: orderCancelError?.message ?? 'orders update affected 0 rows',
        참고: 'Toss 결제 취소는 성공했지만 내부 주문 상태가 refunded로 바뀌지 않았습니다.',
      }),
    () =>
      logBuyerAction('order_cancel_sync_failed', 'order', order.id, trimmedEmail, {
        order_no: order.order_no,
        payment_key: payment.payment_key,
        reason: trimmedReason,
        error: orderCancelError?.message ?? 'orders update affected 0 rows',
      }),
  ])
);
```

- [ ] **Step 3: 관리자 환불 DB 불일치 RED 테스트 추가**

Extend `__tests__/actions/admin-orders.test.ts` to import `refundOrder`, add a paid order fixture with `payments`, set `mockOrderUpdateRows = []`, and assert:

```ts
it('관리자 환불에서 Toss 취소 성공 후 주문 refunded 전환이 실패하면 운영 알림을 남긴다', async () => {
  mockOrderRow = {
    id: 'ord-1',
    order_no: 'SAF-001',
    status: 'paid',
    artwork_id: 'art-1',
    total_amount: 5000000,
    buyer_name: '홍길동',
    buyer_phone: '010-0000-0000',
    buyer_email: 'buyer@example.com',
    metadata: { locale: 'ko' },
    payments: [{ id: 'pay-1', payment_key: 'pk_test', status: 'DONE', method: '카드' }],
    order_items: [{ artwork_id: 'art-1', quantity: 1, unit_price: 5000000 }],
  };
  mockOrderUpdateRows = [];

  const { cancelPayment } = jest.requireMock('@/lib/integrations/toss/cancel') as {
    cancelPayment: jest.Mock;
  };
  cancelPayment.mockResolvedValue({ success: true });
  const { notifyEmail } = jest.requireMock('@/lib/notify') as { notifyEmail: jest.Mock };

  await expect(
    refundOrder({ orderId: 'ord-1', reason: '관리자 환불', refundReceiveAccount: null })
  ).resolves.toEqual({ success: false, error: 'ORDER_REFUND_SYNC_FAILED' });

  expect(notifyEmail).toHaveBeenCalledWith(
    'error',
    expect.stringContaining('Toss 취소 후 주문 상태 반영 실패'),
    expect.objectContaining({ 주문번호: 'SAF-001', paymentKey: 'pk_test' })
  );
});
```

Run:

```bash
npm test -- --runInBand __tests__/actions/admin-orders.test.ts
```

Expected: FAIL before implementation.

- [ ] **Step 4: 관리자 환불 구현**

Modify `app/actions/admin-orders.ts` around the `orderUpdateError` and 0행 branch:

```ts
const refundSyncError = orderUpdateError?.message ?? 'orders update affected 0 rows';
if (orderUpdateError || !updatedRows || updatedRows.length === 0) {
  after(() =>
    runAllSettled('adminOrders.refundOrder.orderSyncFailed.notifications', [
      () =>
        notifyEmail('error', 'Toss 취소 후 주문 상태 반영 실패', {
          주문번호: order.order_no,
          주문ID: order.id,
          paymentKey: payment?.payment_key ?? '',
          환불사유: cancelReason.trim(),
          에러: refundSyncError,
          참고: 'Toss 취소는 성공했지만 내부 주문 상태가 refunded로 바뀌지 않았습니다.',
        }),
      () =>
        logAdminAction('order_refund_sync_failed', 'order', order.id, {
          order_no: order.order_no,
          payment_key: payment?.payment_key ?? null,
          reason: cancelReason.trim(),
          error: refundSyncError,
        }),
    ])
  );
  return { success: false, error: 'ORDER_REFUND_SYNC_FAILED' };
}
```

- [ ] **Step 5: targeted GREEN 확인**

Run:

```bash
npm test -- --runInBand __tests__/actions/order-lookup.test.ts __tests__/actions/admin-orders.test.ts
```

Expected: PASS.

---

### Task 3: 이벤트 reconcile 환불 후 상태 갱신 실패 처리 정정

**Files:**

- Modify: `app/api/internal/reconcile-event-registrations/route.ts`
- Modify Test: `__tests__/app/api/internal/reconcile-event-registrations/route.test.ts`

**Interfaces:**

- Produces: 환불 성공 후 `event_registrations.status='cancelled'` update가 실패하면 `reconciled++` 하지 않는다.
- Produces: 상태 갱신 실패 시 `bumpAttempt` 또는 동등한 attempts 증가와 `notifyEmail('error', ...)`를 실행한다.
- Produces: 고객 환불 알림은 내부 상태 갱신 성공 후 1회만 발송한다.

- [ ] **Step 1: update error mock 주입 추가**

In `__tests__/app/api/internal/reconcile-event-registrations/route.test.ts`, add:

```ts
let updateResult: { error: { message: string } | null } = { error: null };
```

Change `builder.then`:

```ts
builder.then = (resolve: (v: unknown) => void) =>
  resolve(builder._isUpdate ? updateResult : selectResult);
```

Reset `updateResult = { error: null }` in `beforeEach`.

- [ ] **Step 2: RED 테스트 추가**

Add:

```ts
it('환불 성공 후 cancelled 상태 갱신이 실패하면 reconciled로 세지 않고 고객 환불 알림을 보내지 않는다', async () => {
  selectResult = { data: [{ ...REG, status: 'expired', reconcile_attempts: 0 }], error: null };
  updateResult = { error: { message: 'update failed' } };

  const res = await run();
  const body = await res.json();

  expect(mockCancelPayment).toHaveBeenCalled();
  expect(body.reconciled).toBe(0);
  expect(mockSendSms).not.toHaveBeenCalledWith(
    expect.anything(),
    'refunded',
    expect.anything(),
    expect.anything()
  );
  expect(mockNotifyEmail).toHaveBeenCalledWith(
    'error',
    expect.stringContaining('환불 후 상태 갱신 실패'),
    expect.objectContaining({ 주문번호: REG.order_no })
  );
});
```

Run:

```bash
npm test -- --runInBand __tests__/app/api/internal/reconcile-event-registrations/route.test.ts
```

Expected: FAIL because current code still notifies customer and increments `reconciled`.

- [ ] **Step 3: route 구현**

Modify the `if (refund.success)` branch in `app/api/internal/reconcile-event-registrations/route.ts`:

```ts
if (updateError) {
  errors.push(`${reg.order_no}: 환불 후 상태 갱신 실패: ${updateError.message}`);
  await bumpAttempt(supabase, reg);
  await notifyEmail('error', '추도식 회비 환불 후 상태 갱신 실패', {
    주문번호: reg.order_no,
    등록ID: reg.id,
    에러: updateError.message,
    참고: 'Toss 환불은 성공했지만 event_registrations 상태를 cancelled로 기록하지 못했습니다.',
  });
  continue;
}
await notifyCustomer(reg, 'refunded');
reconciled++;
```

- [ ] **Step 4: targeted GREEN 확인**

Run:

```bash
npm test -- --runInBand __tests__/app/api/internal/reconcile-event-registrations/route.test.ts
```

Expected: PASS.

---

### Task 4: 결제 CTA/checkout 가능 조건을 실제 provider 요구사항과 일치

**Files:**

- Modify: `lib/integrations/toss/config.ts`
- Modify Test: `__tests__/lib/integrations/toss/config.test.ts`
- Modify: `app/[locale]/artworks/[id]/page.tsx`
- Modify: `app/[locale]/checkout/[artworkId]/page.tsx`
- Modify: `app/[locale]/checkout/page.tsx`

**Interfaces:**

- Produces: `getCheckoutAvailability(): { enabled: boolean; domestic: boolean; overseas: boolean; reason?: string }`
- Produces: KO checkout is available only when domestic client+secret are configured and `NEXT_PUBLIC_PAYMENT_MODE !== 'disabled'`.
- Produces: EN checkout is available when at least one EN-visible method is available. If only overseas PayPal is configured, route must not 404 but UI must not render domestic card/easyPay methods.
- Produces: artwork CTA uses checkout availability, not provider-agnostic `getPaymentMode()`.

- [ ] **Step 1: config helper RED 테스트 추가**

Add to `__tests__/lib/integrations/toss/config.test.ts`:

```ts
it('checkout availability is disabled when only legacy api_v1 keys exist', () => {
  process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'legacy_client';
  process.env.TOSS_PAYMENTS_SECRET_KEY = 'legacy_secret';
  expect(getCheckoutAvailability()).toEqual({
    enabled: false,
    domestic: false,
    overseas: false,
    reason: 'no_checkout_provider',
  });
});

it('checkout availability exposes domestic and overseas separately', () => {
  process.env.NEXT_PUBLIC_TOSS_DOMESTIC_CLIENT_KEY = 'dom_client';
  process.env.TOSS_PAYMENTS_DOMESTIC_SECRET_KEY = 'dom_secret';
  process.env.NEXT_PUBLIC_TOSS_OVERSEAS_CLIENT_KEY = 'over_client';
  process.env.TOSS_PAYMENTS_OVERSEAS_SECRET_KEY = 'over_secret';
  expect(getCheckoutAvailability()).toEqual({
    enabled: true,
    domestic: true,
    overseas: true,
  });
});

it('payment disabled kill switch disables checkout availability even when keys exist', () => {
  process.env.NEXT_PUBLIC_PAYMENT_MODE = 'disabled';
  process.env.NEXT_PUBLIC_TOSS_DOMESTIC_CLIENT_KEY = 'dom_client';
  process.env.TOSS_PAYMENTS_DOMESTIC_SECRET_KEY = 'dom_secret';
  expect(getCheckoutAvailability()).toEqual({
    enabled: false,
    domestic: false,
    overseas: false,
    reason: 'payment_mode_disabled',
  });
});
```

Run:

```bash
npm test -- --runInBand __tests__/lib/integrations/toss/config.test.ts
```

Expected: FAIL because `getCheckoutAvailability` does not exist.

- [ ] **Step 2: config helper 구현**

Add to `lib/integrations/toss/config.ts`:

```ts
export type CheckoutAvailability =
  | { enabled: true; domestic: boolean; overseas: boolean }
  | {
      enabled: false;
      domestic: false;
      overseas: false;
      reason: 'payment_mode_disabled' | 'no_checkout_provider';
    };

export function getCheckoutAvailability(): CheckoutAvailability {
  if (process.env.NEXT_PUBLIC_PAYMENT_MODE === 'disabled') {
    return { enabled: false, domestic: false, overseas: false, reason: 'payment_mode_disabled' };
  }

  const domestic = getTossConfig('domestic') !== null;
  const overseas = getTossConfig('overseas') !== null;

  if (!domestic && !overseas) {
    return { enabled: false, domestic: false, overseas: false, reason: 'no_checkout_provider' };
  }

  return { enabled: true, domestic, overseas };
}
```

- [ ] **Step 3: route gating 구현**

In `app/[locale]/artworks/[id]/page.tsx`, replace `getPaymentMode() === 'toss'` with:

```ts
const checkoutAvailability = getCheckoutAvailability();
const isTossEnabled = checkoutAvailability.enabled;
```

In `app/[locale]/checkout/[artworkId]/page.tsx` and `app/[locale]/checkout/page.tsx`, replace the provider-agnostic guard:

```ts
const checkoutAvailability = getCheckoutAvailability();
if (!checkoutAvailability.enabled) notFound();
```

For KO pages, keep `getTossDomesticClientKey()` required. For EN artwork checkout, pass availability flags to `OverseasCheckoutClient` and hide domestic card/easyPay choices when `domestic === false`, hide PayPal when `overseas === false`.

- [ ] **Step 4: source contract 테스트 추가**

Create or extend a lightweight source test `__tests__/app/checkout-payment-availability-source.test.ts`:

```ts
import { readFileSync } from 'fs';

const read = (path: string) => readFileSync(path, 'utf8');

it('artwork detail and checkout pages use checkout availability instead of provider-agnostic payment mode', () => {
  expect(read('app/[locale]/artworks/[id]/page.tsx')).toContain('getCheckoutAvailability');
  expect(read('app/[locale]/checkout/[artworkId]/page.tsx')).toContain('getCheckoutAvailability');
  expect(read('app/[locale]/checkout/page.tsx')).toContain('getCheckoutAvailability');
});
```

Run:

```bash
npm test -- --runInBand __tests__/lib/integrations/toss/config.test.ts __tests__/app/checkout-payment-availability-source.test.ts
```

Expected: PASS.

---

### Task 5: 작업 체크리스트, 검증, 완료 보고

**Files:**

- Modify: `task.md`
- Modify: `walkthrough.md`
- Do not modify: `content/changelog.json`
- Do not modify: `lib/site-stats.ts`

**Interfaces:**

- Produces: `task.md` top section with this work's checklist and checked verification commands.
- Produces: `walkthrough.md` summary with changed files, tests, skipped build reason, remaining data warnings.

- [ ] **Step 1: `task.md`에 이번 작업 체크리스트 추가**

Add a top section:

```md
# 결제/환불 상태 불일치 차단 체크리스트

- [ ] confirm route 주문 상태 전이 실패 RED 테스트 추가
- [ ] confirm route hard-stop 구현
- [ ] 환불 경로 Toss 취소 후 DB 불일치 알림 테스트 추가
- [ ] 관리자/구매자 환불 경로 운영 알림 구현
- [ ] 이벤트 reconcile 환불 후 상태 갱신 실패 테스트/구현
- [ ] checkout availability helper 및 CTA/route gating 정리
- [ ] targeted tests 통과
- [ ] lint/type/full Jest/validate-artworks 실행
- [ ] walkthrough.md 업데이트
- [ ] 기존 dirty generated files와 이번 변경 분리 확인
```

- [ ] **Step 2: targeted 검증 실행**

Run:

```bash
npm test -- --runInBand __tests__/app/toss-confirm-payment-record-failure.test.ts
npm test -- --runInBand __tests__/actions/order-lookup.test.ts __tests__/actions/admin-orders.test.ts
npm test -- --runInBand __tests__/app/api/internal/reconcile-event-registrations/route.test.ts
npm test -- --runInBand __tests__/lib/integrations/toss/config.test.ts __tests__/app/checkout-payment-availability-source.test.ts
```

Expected: all PASS.

- [ ] **Step 3: 전체 검증 실행**

Run:

```bash
npm run lint
npm run type-check
npm test -- --runInBand
npm run validate-artworks
```

Expected: lint/type/Jest PASS. `validate-artworks` may still report existing data warnings but should exit 0.

- [ ] **Step 4: build 실행 여부 확인**

Read `package.json` before running build. If `npm run build` still mutates `content/changelog.json` and `lib/site-stats.ts`, do not run it without separate approval while those files are already dirty.

- [ ] **Step 5: 완료 보고 작성**

Update `walkthrough.md` with:

```md
## 결제/환불 상태 불일치 차단

- Toss 결제 승인 후 내부 주문 상태 전이가 실패하면 성공 알림/매출/캐시 후속 처리를 중단하도록 정리했다.
- Toss 취소 성공 후 내부 환불 상태 반영이 실패하면 운영자 알림과 감사 로그를 남기도록 보강했다.
- 이벤트 reconcile 환불 성공 후 등록 상태 갱신 실패를 reconciled로 세지 않도록 수정했다.
- 결제 CTA/checkout route gating을 실제 checkout provider 가능 조건과 맞췄다.
- 검증: targeted Jest, `npm run lint`, `npm run type-check`, `npm test -- --runInBand`, `npm run validate-artworks`.
- 미실행: `npm run build`는 generated dirty files를 덮을 수 있어 별도 승인 전에는 실행하지 않았다.
```

- [ ] **Step 6: final status 확인**

Run:

```bash
git status --short --branch
```

Expected: 이번 작업 파일과 기존 dirty files가 분리되어 보인다. 최종 보고에는 기존 `content/changelog.json`, `lib/site-stats.ts`를 되돌리지 않았다고 명시한다.

---

# SAF 최근 회귀 리스크 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 구현은 승인 후에만 진행하고, 각 task는 실패 테스트 확인 -> 최소 구현 -> 통과 확인 순서로 수행한다.

**Goal:** 최근 점검에서 남은 운영 리스크 3개를 코드 불변조건과 운영 관찰성으로 닫는다.

**Architecture:** 공개 작품 캐시 갱신은 관리자 등록 응답과 분리된 internal route 방식을 유지하되, 설정 누락과 route 실패를 관리자 알림/로그로 승격한다. 결제 보정은 기존 5~28분 cron 창은 그대로 두고, 오래된 `paid`/`awaiting_deposit` 주문의 `payments` row 누락만 별도 backfill 모드로 안전하게 점검·복구한다. 계좌이체 안내 정보는 checkout과 SMS 재발송이 같은 helper를 읽게 해 운영 계좌 변경 시 한 곳만 바꾸게 한다.

**Tech Stack:** Next.js App Router, Server Actions, Route Handlers, Supabase JS v2, TossPayments API, Jest, TypeScript, Vercel Cron.

## Global Constraints

- `AGENTS.md`: 계획은 한국어로 작성하고, 승인 전에는 코드 수정하지 않는다.
- `AGENTS.md`: 보고/확인 모드와 달리 이 문서는 실행 계획이며, 실제 구현은 별도 승인 후 진행한다.
- 운영 의도: 기술적 우회가 아니라 운영자가 한 달 뒤 덜 헷갈리는 구조를 만든다.
- 공개 작품 갱신: 관리자 신규 작품 등록 후 KO/EN home, 작품 목록, 작가 페이지, `artworks` cache tag가 결국 갱신되어야 한다.
- 결제 불변조건: Toss에서 결제 증거가 확인된 `paid`/`awaiting_deposit` 주문은 `payments` row가 있어야 한다.
- SMS/계좌 안내: 구매자에게 나가는 계좌 정보는 checkout 신규 발송과 관리자 재발송이 같은 출처를 사용해야 한다.
- 기존 사용자/다른 에이전트 변경은 되돌리지 않는다.

---

### Task 1: 공개 작품 revalidation 실패를 운영자에게 보이게 만들기

**Files:**

- Create: `lib/admin/public-artwork-revalidation.ts`
- Modify: `app/actions/admin-artworks.ts`
- Test: `__tests__/lib/public-artwork-revalidation.test.ts`
- Test: `__tests__/app/admin-artwork-create-revalidate-contract.test.ts`

**Interfaces:**

- Produces: `resolvePublicArtworkRevalidationConfig(env?: NodeJS.ProcessEnv): { ok: true; baseUrl: string; cronSecret: string } | { ok: false; missing: string[] }`
- Produces: `normalizeRevalidationArtistNames(artistNames: Array<string | null | undefined>): string[]`
- Consumes: `schedulePublicArtworkSurfaceRevalidation(artistNames, context)` in `app/actions/admin-artworks.ts`
- Produces: missing env or HTTP failure is recorded through `notifyEmail` and `logSystemAction`, not only `console.error`.

- [x] **Step 1: Add failing helper tests**

Create `__tests__/lib/public-artwork-revalidation.test.ts`:

```ts
import {
  normalizeRevalidationArtistNames,
  resolvePublicArtworkRevalidationConfig,
} from '@/lib/admin/public-artwork-revalidation';

describe('public artwork revalidation config', () => {
  it('uses NEXT_PUBLIC_SITE_URL without trailing slash when CRON_SECRET exists', () => {
    expect(
      resolvePublicArtworkRevalidationConfig({
        NEXT_PUBLIC_SITE_URL: 'https://www.saf2026.com/',
        CRON_SECRET: 'secret-1',
      } as NodeJS.ProcessEnv)
    ).toEqual({
      ok: true,
      baseUrl: 'https://www.saf2026.com',
      cronSecret: 'secret-1',
    });
  });

  it('uses VERCEL_URL as https fallback when public site url is absent', () => {
    expect(
      resolvePublicArtworkRevalidationConfig({
        VERCEL_URL: 'saf-2026.vercel.app',
        CRON_SECRET: 'secret-1',
      } as NodeJS.ProcessEnv)
    ).toEqual({
      ok: true,
      baseUrl: 'https://saf-2026.vercel.app',
      cronSecret: 'secret-1',
    });
  });

  it('returns exact missing env names instead of silently degrading', () => {
    expect(resolvePublicArtworkRevalidationConfig({} as NodeJS.ProcessEnv)).toEqual({
      ok: false,
      missing: ['NEXT_PUBLIC_SITE_URL or VERCEL_URL', 'CRON_SECRET'],
    });
  });

  it('normalizes and deduplicates artist names', () => {
    expect(normalizeRevalidationArtistNames([' 오윤 ', null, '', '오윤', '박생광'])).toEqual([
      '오윤',
      '박생광',
    ]);
  });
});
```

- [x] **Step 2: Run RED**

Run:

```bash
npm test -- --runInBand __tests__/lib/public-artwork-revalidation.test.ts
```

Expected: FAIL with module not found for `@/lib/admin/public-artwork-revalidation`.

- [x] **Step 3: Add helper implementation**

Create `lib/admin/public-artwork-revalidation.ts`:

```ts
export type PublicArtworkRevalidationConfig =
  | { ok: true; baseUrl: string; cronSecret: string }
  | { ok: false; missing: string[] };

export function normalizeRevalidationArtistNames(
  artistNames: Array<string | null | undefined>
): string[] {
  return Array.from(
    new Set(
      artistNames
        .filter((name): name is string => typeof name === 'string')
        .map((name) => name.trim())
        .filter((name) => name.length > 0)
    )
  );
}

export function resolvePublicArtworkRevalidationConfig(
  env: NodeJS.ProcessEnv = process.env
): PublicArtworkRevalidationConfig {
  const missing: string[] = [];
  const siteUrl = env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercelUrl = env.VERCEL_URL?.trim();
  const cronSecret = env.CRON_SECRET?.trim();

  let baseUrl: string | null = null;
  if (siteUrl) {
    baseUrl = siteUrl.replace(/\/+$/, '');
  } else if (vercelUrl) {
    baseUrl = `https://${vercelUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
  } else {
    missing.push('NEXT_PUBLIC_SITE_URL or VERCEL_URL');
  }

  if (!cronSecret) missing.push('CRON_SECRET');

  if (missing.length > 0 || !baseUrl || !cronSecret) {
    return { ok: false, missing };
  }

  return { ok: true, baseUrl, cronSecret };
}
```

- [x] **Step 4: Run GREEN for helper**

Run:

```bash
npm test -- --runInBand __tests__/lib/public-artwork-revalidation.test.ts
```

Expected: PASS.

- [x] **Step 5: Add failing source contract for visible failure handling**

Update `__tests__/app/admin-artwork-create-revalidate-contract.test.ts` with:

```ts
it('reports public artwork revalidation schedule failures to operator-visible channels', () => {
  const src = readFileSync('app/actions/admin-artworks.ts', 'utf8');

  expect(src).toContain('resolvePublicArtworkRevalidationConfig');
  expect(src).toContain('logSystemAction');
  expect(src).toContain('notifyEmail');
  expect(src).toContain('public_artwork_revalidation_failed');
});
```

- [x] **Step 6: Run RED**

Run:

```bash
npm test -- --runInBand __tests__/app/admin-artwork-create-revalidate-contract.test.ts
```

Expected: FAIL because `app/actions/admin-artworks.ts` still logs missing env only with `console.error`.

- [x] **Step 7: Update scheduler implementation**

Modify `app/actions/admin-artworks.ts`:

```ts
import { notifyEmail } from '@/lib/notify';
import { logSystemAction } from './activity-log-writer';
import {
  normalizeRevalidationArtistNames,
  resolvePublicArtworkRevalidationConfig,
} from '@/lib/admin/public-artwork-revalidation';
```

Replace the body of `schedulePublicArtworkSurfaceRevalidation` with this shape:

```ts
function schedulePublicArtworkSurfaceRevalidation(
  artistNames: Array<string | null | undefined>,
  context: { artworkId?: string | null; title?: string | null } = {}
) {
  const config = resolvePublicArtworkRevalidationConfig();
  const normalizedArtistNames = normalizeRevalidationArtistNames(artistNames);

  if (!config.ok) {
    after(async () => {
      const missing = config.missing.join(', ');
      await Promise.allSettled([
        notifyEmail('error', '공개 작품 캐시 갱신 예약 실패', {
          작품ID: context.artworkId ?? '',
          작품명: context.title ?? '',
          누락설정: missing,
          참고: '작품 등록은 완료됐지만 공개 목록/작가 페이지 갱신 요청을 예약하지 못했습니다.',
        }),
        logSystemAction(
          'public_artwork_revalidation_failed',
          'artwork',
          context.artworkId ?? 'unknown',
          {
            title: context.title ?? null,
            artist_names: normalizedArtistNames,
            missing,
            stage: 'schedule_config',
          }
        ),
      ]);
    });
    return;
  }

  after(async () => {
    try {
      const response = await fetch(`${config.baseUrl}${INTERNAL_ARTWORK_REVALIDATE_PATH}`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${config.cronSecret}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ artistNames: normalizedArtistNames }),
      });

      if (!response.ok) {
        await logSystemAction(
          'public_artwork_revalidation_failed',
          'artwork',
          context.artworkId ?? 'unknown',
          {
            title: context.title ?? null,
            artist_names: normalizedArtistNames,
            status: response.status,
            stage: 'route_response',
          }
        );
      }
    } catch (err) {
      await Promise.allSettled([
        notifyEmail('error', '공개 작품 캐시 갱신 요청 실패', {
          작품ID: context.artworkId ?? '',
          작품명: context.title ?? '',
          에러: err instanceof Error ? err.message : String(err),
        }),
        logSystemAction(
          'public_artwork_revalidation_failed',
          'artwork',
          context.artworkId ?? 'unknown',
          {
            title: context.title ?? null,
            artist_names: normalizedArtistNames,
            error: err instanceof Error ? err.message : String(err),
            stage: 'route_fetch',
          }
        ),
      ]);
    }
  });
}
```

In `createAdminArtworkRecord`, call:

```ts
schedulePublicArtworkSurfaceRevalidation([artistName], {
  artworkId: artwork.id,
  title: artwork.title,
});
```

- [x] **Step 8: Run GREEN**

Run:

```bash
npm test -- --runInBand __tests__/lib/public-artwork-revalidation.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts __tests__/app/admin-artwork-create-image-upload-source.test.ts
```

Expected: PASS.

---

### Task 2: 오래된 missing payment row backfill 모드 추가

**Files:**

- Modify: `app/api/internal/reconcile-payments/route.ts`
- Test: `__tests__/app/reconcile-payments-missing-payment-source.test.ts`
- Test: `__tests__/app/reconcile-payments-backfill-contract.test.ts`

**Interfaces:**

- Produces: query param `scope=missing-payments-backfill`
- Produces: query param `lookbackDays`, integer `1..90`, default `30`
- Produces: query param `limit`, integer `1..500`, default `100`
- Produces: default cron behavior remains the existing 5~28 minute window when `scope` is absent.
- Consumes: existing `ensureTossPaymentRecord` and `reconcileMissingDoneOrder` flow.

- [x] **Step 1: Add failing backfill contract test**

Create `__tests__/app/reconcile-payments-backfill-contract.test.ts`:

```ts
import { readFileSync } from 'node:fs';

describe('reconcile-payments missing-payment backfill mode', () => {
  it('keeps the cron window unchanged for normal scheduled runs', () => {
    const src = readFileSync('app/api/internal/reconcile-payments/route.ts', 'utf8');

    expect(src).toContain('28 * 60 * 1000');
    expect(src).toContain('5 * 60 * 1000');
  });

  it('adds an explicit bounded backfill mode for old paid/awaiting_deposit rows missing payments', () => {
    const src = readFileSync('app/api/internal/reconcile-payments/route.ts', 'utf8');

    expect(src).toContain("scope === 'missing-payments-backfill'");
    expect(src).toContain('parseBackfillLookbackDays');
    expect(src).toContain('parseBackfillLimit');
    expect(src).toContain('.limit(backfillLimit)');
    expect(src).toContain('idempotencyKey: `backfill-missing-payment-${order.order_no}`');
  });
});
```

- [x] **Step 2: Run RED**

Run:

```bash
npm test -- --runInBand __tests__/app/reconcile-payments-backfill-contract.test.ts
```

Expected: FAIL because backfill mode is not present.

- [x] **Step 3: Add bounded query parsing helpers in route**

Add near the top of `app/api/internal/reconcile-payments/route.ts`:

```ts
function clampInteger(raw: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function parseBackfillLookbackDays(searchParams: URLSearchParams): number {
  return clampInteger(searchParams.get('lookbackDays'), 30, 1, 90);
}

function parseBackfillLimit(searchParams: URLSearchParams): number {
  return clampInteger(searchParams.get('limit'), 100, 1, 500);
}
```

- [x] **Step 4: Implement backfill branch without changing cron branch**

Inside `GET(request: NextRequest)`, after Supabase admin client creation and before normal `minAge/maxAge` query:

```ts
const searchParams = request.nextUrl.searchParams;
const scope = searchParams.get('scope');

if (scope === 'missing-payments-backfill') {
  const lookbackDays = parseBackfillLookbackDays(searchParams);
  const backfillLimit = parseBackfillLimit(searchParams);
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: settledOrders, error: backfillFetchError } = await supabase
    .from('orders')
    .select(
      'id, order_no, artwork_id, total_amount, buyer_name, buyer_phone, metadata, status, order_items(artwork_id, quantity, unit_price), payments(id)'
    )
    .in('status', ['paid', 'awaiting_deposit'])
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(backfillLimit);

  if (backfillFetchError) {
    return NextResponse.json({ error: backfillFetchError.message }, { status: 500 });
  }

  const missingPaymentOrders = (settledOrders ?? []).filter((order) => !hasPaymentRows(order));
  let reconciled = 0;
  const errors: string[] = [];

  for (const order of missingPaymentOrders) {
    try {
      const provider = resolveOrderProvider(order.metadata);
      const tossPayment = await fetchPaymentByOrderId(order.order_no, provider);
      if (!tossPayment) continue;

      if (order.status === 'awaiting_deposit' && tossPayment.status === 'DONE') {
        const repaired = await reconcileMissingDoneOrder({
          supabase,
          order,
          tossPayment,
          provider,
          now: new Date().toISOString(),
          sourceStatuses: ['awaiting_deposit'],
          idempotencyKey: `backfill-missing-payment-${order.order_no}`,
          errors,
        });
        if (repaired) reconciled++;
        continue;
      }

      const expectedTossStatus =
        order.status === 'paid'
          ? 'DONE'
          : order.status === 'awaiting_deposit'
            ? 'WAITING_FOR_DEPOSIT'
            : null;

      if (expectedTossStatus && tossPayment.status !== expectedTossStatus) {
        errors.push(
          `${order.order_no}: order is ${order.status} but Toss status is ${tossPayment.status}`
        );
        continue;
      }

      const paymentRecordResult = await ensureTossPaymentRecord({
        supabase,
        orderId: order.id,
        tossPayment,
        idempotencyKey: `backfill-missing-payment-${order.order_no}`,
      });

      if (!paymentRecordResult.ok) {
        errors.push(
          `${order.order_no}: missing payment backfill failed: ${paymentRecordResult.error}`
        );
        continue;
      }

      reconciled++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${order.order_no}: ${msg}`);
    }
  }

  return NextResponse.json({
    scope,
    lookbackDays,
    limit: backfillLimit,
    checked: missingPaymentOrders.length,
    reconciled,
    ...(errors.length > 0 ? { errors } : {}),
  });
}
```

- [x] **Step 5: Run GREEN**

Run:

```bash
npm test -- --runInBand __tests__/app/reconcile-payments-backfill-contract.test.ts __tests__/app/reconcile-payments-missing-payment-source.test.ts
```

Expected: PASS.

- [x] **Step 6: Manual runtime command for operator use**

After deploy, run the protected backfill once from a trusted shell with the production `CRON_SECRET`:

```bash
curl -fsS \
  -H "Authorization: Bearer $CRON_SECRET" \
  "https://www.saf2026.com/api/internal/reconcile-payments?scope=missing-payments-backfill&lookbackDays=30&limit=200"
```

Expected: JSON with `scope:"missing-payments-backfill"`, `checked`, `reconciled`, and no `errors` field. If `errors` exists, do not rerun blindly; inspect each order number first.

---

### Task 3: 계좌이체 안내 정보를 단일 출처로 통합

**Files:**

- Create: `lib/payments/bank-transfer-info.ts`
- Modify: `app/actions/checkout.ts`
- Modify: `app/actions/admin-sms.ts`
- Modify: `.env.local.example`
- Test: `__tests__/lib/bank-transfer-info.test.ts`
- Test: `__tests__/app/actions/admin-sms.test.ts`
- Test: `__tests__/actions/checkout.test.ts`

**Interfaces:**

- Produces: `getBankTransferInfo(env?: NodeJS.ProcessEnv): { bankName: string; accountNumber: string; holderName: string; deadlineHours: number }`
- Produces: `formatBankTransferDueDate(date: Date, locale: 'ko' | 'en'): string`
- Produces: checkout and admin SMS resend both import the helper instead of duplicating account constants.

- [x] **Step 1: Add failing helper tests**

Create `__tests__/lib/bank-transfer-info.test.ts`:

```ts
import { formatBankTransferDueDate, getBankTransferInfo } from '@/lib/payments/bank-transfer-info';

describe('bank transfer info', () => {
  it('returns the current SAF default account when env is absent', () => {
    expect(getBankTransferInfo({} as NodeJS.ProcessEnv)).toEqual({
      bankName: '기업은행 (IBK)',
      accountNumber: '301-101031-04-095',
      holderName: '한국스마트협동조합',
      deadlineHours: 24,
    });
  });

  it('allows production env to override account info from one source', () => {
    expect(
      getBankTransferInfo({
        BANK_TRANSFER_BANK_NAME: '신한은행',
        BANK_TRANSFER_ACCOUNT_NUMBER: '110-000-000000',
        BANK_TRANSFER_HOLDER_NAME: '씨앗페',
        BANK_TRANSFER_DEADLINE_HOURS: '48',
      } as NodeJS.ProcessEnv)
    ).toEqual({
      bankName: '신한은행',
      accountNumber: '110-000-000000',
      holderName: '씨앗페',
      deadlineHours: 48,
    });
  });

  it('formats due date in KST for Korean and English messages', () => {
    const date = new Date('2026-06-20T05:00:00.000Z');

    expect(formatBankTransferDueDate(date, 'ko')).toContain('2026');
    expect(formatBankTransferDueDate(date, 'en')).toContain('2026');
  });
});
```

- [x] **Step 2: Run RED**

Run:

```bash
npm test -- --runInBand __tests__/lib/bank-transfer-info.test.ts
```

Expected: FAIL with module not found.

- [x] **Step 3: Add helper implementation**

Create `lib/payments/bank-transfer-info.ts`:

```ts
export type BankTransferInfo = {
  bankName: string;
  accountNumber: string;
  holderName: string;
  deadlineHours: number;
};

const DEFAULT_BANK_TRANSFER_INFO: BankTransferInfo = {
  bankName: '기업은행 (IBK)',
  accountNumber: '301-101031-04-095',
  holderName: '한국스마트협동조합',
  deadlineHours: 24,
};

function positiveIntegerOrDefault(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function getBankTransferInfo(env: NodeJS.ProcessEnv = process.env): BankTransferInfo {
  return {
    bankName: env.BANK_TRANSFER_BANK_NAME?.trim() || DEFAULT_BANK_TRANSFER_INFO.bankName,
    accountNumber:
      env.BANK_TRANSFER_ACCOUNT_NUMBER?.trim() || DEFAULT_BANK_TRANSFER_INFO.accountNumber,
    holderName: env.BANK_TRANSFER_HOLDER_NAME?.trim() || DEFAULT_BANK_TRANSFER_INFO.holderName,
    deadlineHours: positiveIntegerOrDefault(
      env.BANK_TRANSFER_DEADLINE_HOURS,
      DEFAULT_BANK_TRANSFER_INFO.deadlineHours
    ),
  };
}

export function formatBankTransferDueDate(date: Date, locale: 'ko' | 'en') {
  return locale === 'ko'
    ? date.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    : date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' });
}
```

- [x] **Step 4: Run GREEN for helper**

Run:

```bash
npm test -- --runInBand __tests__/lib/bank-transfer-info.test.ts
```

Expected: PASS.

- [x] **Step 5: Replace checkout duplicate constants**

In `app/actions/checkout.ts`, remove local `BANK_TRANSFER_INFO`, `DEPOSIT_DEADLINE_HOURS`, and local `formatBankTransferDueDate`. Add:

```ts
import { formatBankTransferDueDate, getBankTransferInfo } from '@/lib/payments/bank-transfer-info';
```

In the bank-transfer order branch:

```ts
const bankTransferInfo = getBankTransferInfo();
const dueDate = new Date(Date.now() + bankTransferInfo.deadlineHours * 60 * 60 * 1000);
const dueDateStr = formatBankTransferDueDate(dueDate, buyerLocale);
const bankTransferMetadata = {
  bankName: bankTransferInfo.bankName,
  accountNumber: bankTransferInfo.accountNumber,
  holderName: bankTransferInfo.holderName,
  dueDate: dueDateStr,
  dueDateIso: dueDate.toISOString(),
};
```

Use `bankTransferInfo.bankName`, `bankTransferInfo.accountNumber`, and `bankTransferInfo.holderName` in the admin notification fields.

- [x] **Step 6: Replace admin SMS fallback duplicate constants**

In `app/actions/admin-sms.ts`, remove local `BANK_TRANSFER_FALLBACK`, `DEPOSIT_DEADLINE_HOURS`, and local `formatBankTransferDueDate`. Add:

```ts
import { formatBankTransferDueDate, getBankTransferInfo } from '@/lib/payments/bank-transfer-info';
```

In `extractBankTransferInfo`:

```ts
const fallback = getBankTransferInfo();
const dueDate =
  typeof bankTransfer.dueDate === 'string' && bankTransfer.dueDate.trim()
    ? bankTransfer.dueDate
    : formatBankTransferDueDate(
        new Date(
          new Date(createdAt ?? Date.now()).getTime() + fallback.deadlineHours * 60 * 60 * 1000
        ),
        locale
      );

return {
  bankName:
    typeof bankTransfer.bankName === 'string' && bankTransfer.bankName.trim()
      ? bankTransfer.bankName
      : fallback.bankName,
  accountNumber:
    typeof bankTransfer.accountNumber === 'string' && bankTransfer.accountNumber.trim()
      ? bankTransfer.accountNumber
      : fallback.accountNumber,
  holderName:
    typeof bankTransfer.holderName === 'string' && bankTransfer.holderName.trim()
      ? bankTransfer.holderName
      : fallback.holderName,
  dueDate,
};
```

- [x] **Step 7: Document env names**

Add to `.env.local.example`:

```dotenv
# Manual bank-transfer fallback used by checkout and admin SMS resend.
# Defaults in code match the current SAF account, but production can override here.
BANK_TRANSFER_BANK_NAME="기업은행 (IBK)"
BANK_TRANSFER_ACCOUNT_NUMBER="301-101031-04-095"
BANK_TRANSFER_HOLDER_NAME="한국스마트협동조합"
BANK_TRANSFER_DEADLINE_HOURS="24"
```

- [x] **Step 8: Run GREEN**

Run:

```bash
npm test -- --runInBand __tests__/lib/bank-transfer-info.test.ts __tests__/app/actions/admin-sms.test.ts __tests__/actions/checkout.test.ts
```

Expected: PASS.

---

### Task 4: Final verification and operator handoff

**Files:**

- Modify: `walkthrough.md`

**Interfaces:**

- Produces: a short Korean walkthrough with changed files, commands run, backfill URL, and operational caveats.

- [x] **Step 1: Run full local verification**

Run:

```bash
npm run lint
npm run type-check
npm test -- --runInBand
npm run validate-artworks
```

Expected:

- `lint`: exit 0
- `type-check`: exit 0
- `test`: all suites pass
- `validate-artworks`: exit 0; existing warnings may remain and must be reported as warnings, not failures

- [x] **Step 2: Check whether build changed generated files before deciding to run it**

Run:

```bash
git status --short
```

If the tree is clean and the user approves generated-file churn, run:

```bash
npm run build
```

Expected: exit 0. If `content/changelog.json`, `lib/site-stats.ts`, or generated hero quality files change, inspect and either commit them with the implementation or explicitly leave build unrun in the final report.

- [x] **Step 3: Write walkthrough**

Update `walkthrough.md` with:

````md
# 최근 회귀 리스크 개선 결과

## 변경 요약

- 관리자 신규 작품 등록 후 공개 캐시 갱신 예약 실패를 관리자 알림/시스템 로그로 남기도록 개선.
- `/api/internal/reconcile-payments?scope=missing-payments-backfill` 모드로 오래된 missing payment row를 제한적으로 복구 가능하게 개선.
- 계좌이체 안내 계좌/기한 정보를 `lib/payments/bank-transfer-info.ts` 단일 출처로 통합.

## 운영 명령

```bash
curl -fsS \
  -H "Authorization: Bearer $CRON_SECRET" \
  "https://www.saf2026.com/api/internal/reconcile-payments?scope=missing-payments-backfill&lookbackDays=30&limit=200"
```
````

## 검증

- `npm run lint`
- `npm run type-check`
- `npm test -- --runInBand`
- `npm run validate-artworks`

````

- [x] **Step 4: Final clean-tree check**

Run:

```bash
git status --short --branch
````

Expected: only intended files are modified. No unrelated generated output should appear unless explicitly accepted in Step 2.

# 배송 검증 및 작품 공개 캐시 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 구현은 사용자 승인 후에만 진행하고, production code는 실패 테스트를 먼저 확인한 뒤 작성한다.

**Goal:** 주문 배송 필수정보가 서버에서 공백으로 저장되지 않게 하고, 작품 수정/판매 후 KO/EN 공개 상세 및 목록 캐시가 같은 운영 진실을 보게 만든다.

**Architecture:** checkout/order lookup 서버 action에서 입력을 `trim()` 기준으로 정규화한 뒤 같은 값으로 검증·저장한다. 작품 공개 캐시는 `lib/utils/revalidate.ts`에 개별 상세 KO/EN fan-out helper를 추가하고, 관리자/작가 작품 mutation은 상태 동기화가 끝난 뒤 상세와 공개 표면을 함께 무효화한다.

**Tech Stack:** Next.js App Router, Server Actions, Route Handlers, Supabase JS v2, Jest, TypeScript, Vercel Cron.

## Global Constraints

- `AGENTS.md`: 계획은 한국어로 작성하고, 승인 전에는 코드 수정하지 않는다.
- `AGENTS.md`: 실행 전 `implementation_plan.md`를 작성하고 사용자 승인을 받는다.
- 운영 의도: 헤더/설정/예외 우회가 아니라 운영자가 실제로 보는 주문·작품 상태를 정확하게 만든다.
- TDD: 각 bugfix는 실패 테스트 확인 -> 최소 구현 -> 통과 확인 순서로 진행한다.
- 기존 사용자/다른 에이전트 변경은 되돌리지 않는다. 현재 `content/changelog.json`, `lib/site-stats.ts` 수정은 이번 작업 범위 밖으로 보존한다.
- 데이터 경고: `content/artworks-batches/batch-db-generated.ts`는 auto-generated이므로 이번 코드 수정에서 직접 손패치하지 않고, 별도 DB/source 데이터 정정 작업으로 분리한다.

---

### Task 1: 주문 배송 필수값을 서버 불변조건으로 고정

**Files:**

- Modify: `app/actions/checkout.ts`
- Modify: `app/actions/order-lookup.ts`
- Test: `__tests__/actions/checkout.test.ts`
- Test: `__tests__/actions/order-lookup.test.ts`

**Interfaces:**

- Produces: `createOrder()`는 buyer/shipping 필수값을 trim 기준으로 검증하고, 저장도 trim된 값을 사용한다.
- Produces: `updateBuyerShipping()`은 수령인/연락처/주소 공백을 `INVALID_INPUT`으로 거부한다.
- Consumes: 기존 `ApiLocale` error key `required_buyer_info`, `required_shipping_info`, `invalid_shipping_phone_format`.

- [ ] **Step 1: checkout 실패 테스트 추가**

Add to `__tests__/actions/checkout.test.ts` near the existing required-field tests:

```ts
it('수령인 이름이 공백뿐이면 주문을 생성하지 않는다', async () => {
  const result = await createOrder({ ...validInput, shippingName: '   ' });

  expect(result.success).toBe(false);
  if (!result.success) expect(result.error).toBe('배송지 정보를 입력해주세요.');
  expect(mockInsert).not.toHaveBeenCalled();
});

it('배송 연락처가 공백뿐이면 주문을 생성하지 않는다', async () => {
  const result = await createOrder({ ...validInput, shippingPhone: '   ' });

  expect(result.success).toBe(false);
  if (!result.success) expect(result.error).toBe('배송지 정보를 입력해주세요.');
  expect(mockInsert).not.toHaveBeenCalled();
});

it('배송 주소가 공백뿐이면 주문을 생성하지 않는다', async () => {
  const result = await createOrder({ ...validInput, shippingAddress: '   ' });

  expect(result.success).toBe(false);
  if (!result.success) expect(result.error).toBe('배송지 정보를 입력해주세요.');
  expect(mockInsert).not.toHaveBeenCalled();
});

it('구매자 이름이 공백뿐이면 주문을 생성하지 않는다', async () => {
  const result = await createOrder({ ...validInput, buyerName: '   ' });

  expect(result.success).toBe(false);
  if (!result.success) expect(result.error).toBe('구매자 정보를 입력해주세요.');
  expect(mockInsert).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: checkout 테스트가 현재 실패하는지 확인**

Run: `npm test -- __tests__/actions/checkout.test.ts --runInBand`

Expected: 새 테스트가 FAIL. 현재 서버 action이 공백 문자열을 truthy로 보고 DB insert 경로까지 진행한다.

- [ ] **Step 3: checkout 서버 입력 정규화 구현**

In `app/actions/checkout.ts`, immediately after `buyerLocale`/`buyerEmailNorm` setup, add trim variables and use them for validation/storage:

```ts
const buyerNameTrimmed = buyerName.trim();
const buyerPhoneTrimmed = buyerPhone.trim();
const shippingNameTrimmed = shippingName.trim();
const shippingPhoneTrimmed = shippingPhone.trim();
const shippingAddressTrimmed = shippingAddress.trim();
const shippingAddressDetailTrimmed = shippingAddressDetail?.trim() ?? '';
const shippingMemoTrimmed = shippingMemo?.trim() ?? '';
```

Then change validation and storage to use these values:

```ts
if (!buyerNameTrimmed || !buyerEmailNorm || !buyerPhoneTrimmed) {
  return { success: false, error: apiError('required_buyer_info', buyerLocale) };
}
if (
  !shippingNameTrimmed ||
  !shippingPhoneTrimmed ||
  !shippingAddressTrimmed ||
  !shippingPostalCode
) {
  return { success: false, error: apiError('required_shipping_info', buyerLocale) };
}
```

Use `buyerPhoneTrimmed`/`shippingPhoneTrimmed` for digit validation, `shippingAddressTrimmed` for address length, and insert:

```ts
buyer_name: buyerNameTrimmed,
buyer_phone: buyerPhoneTrimmed,
shipping_name: shippingNameTrimmed,
shipping_phone: shippingPhoneTrimmed,
shipping_address: shippingAddressTrimmed,
shipping_address_detail: shippingAddressDetailTrimmed || null,
shipping_postal_code: trimmedPostal,
shipping_memo: shippingMemoTrimmed || null,
```

- [ ] **Step 4: checkout 테스트 통과 확인**

Run: `npm test -- __tests__/actions/checkout.test.ts --runInBand`

Expected: PASS. 기존 40개 테스트에 새 공백 필수값 테스트가 추가되어 모두 통과.

- [ ] **Step 5: 배송정보 수정 실패 테스트 추가**

Add to `__tests__/actions/order-lookup.test.ts` inside `describe('updateBuyerShipping')`:

```ts
it.each([
  ['shippingName', { shippingName: '   ', shippingPhone: '01012345678', shippingAddress: '서울' }],
  ['shippingPhone', { shippingName: '홍길동', shippingPhone: '   ', shippingAddress: '서울' }],
  [
    'shippingAddress',
    { shippingName: '홍길동', shippingPhone: '01012345678', shippingAddress: '   ' },
  ],
])('%s 공백 입력 시 INVALID_INPUT 반환', async (_field, payload) => {
  const result = await updateBuyerShipping('SAF-001', 'buyer@test.com', payload);

  expect(result.success).toBe(false);
  if (!result.success) expect(result.error).toBe('INVALID_INPUT');
});
```

- [ ] **Step 6: order-lookup 테스트가 현재 실패하는지 확인**

Run: `npm test -- __tests__/actions/order-lookup.test.ts --runInBand`

Expected: 새 `it.each` 케이스가 FAIL. 현재 코드는 길이만 보고 trim 후 빈 문자열을 저장한다.

- [ ] **Step 7: 배송정보 수정 서버 검증 구현**

In `app/actions/order-lookup.ts`, before the length check, add:

```ts
const shippingNameTrimmed = data.shippingName.trim();
const shippingPhoneTrimmed = data.shippingPhone.trim();
const shippingAddressTrimmed = data.shippingAddress.trim();
const shippingAddressDetailTrimmed = data.shippingAddressDetail?.trim() ?? '';
const shippingMemoTrimmed = data.shippingMemo?.trim() ?? '';
const shippingPostalCodeTrimmed = data.shippingPostalCode?.trim() ?? '';

if (!shippingNameTrimmed || !shippingPhoneTrimmed || !shippingAddressTrimmed) {
  return { success: false, error: 'INVALID_INPUT' };
}
```

Then use trimmed values in length checks and update:

```ts
shipping_name: shippingNameTrimmed,
shipping_phone: shippingPhoneTrimmed,
shipping_address: shippingAddressTrimmed,
shipping_address_detail: shippingAddressDetailTrimmed || null,
shipping_memo: shippingMemoTrimmed || null,
...(shippingPostalCodeTrimmed ? { shipping_postal_code: shippingPostalCodeTrimmed } : {}),
```

- [ ] **Step 8: order-lookup 테스트 통과 확인**

Run: `npm test -- __tests__/actions/order-lookup.test.ts --runInBand`

Expected: PASS.

---

### Task 2: 작품 상세 KO/EN revalidation을 한 helper로 통일

**Files:**

- Modify: `lib/utils/revalidate.ts`
- Modify: `app/actions/admin-artworks.ts`
- Modify: `app/actions/artwork.ts`
- Test: `__tests__/actions/admin-artworks-status.test.ts`
- Test: `__tests__/app/admin-artwork-create-revalidate-contract.test.ts`

**Interfaces:**

- Produces: `revalidatePublicArtworkDetails(ids: Array<string | null | undefined>): void`
- Consumes: affected mutation functions call `revalidatePublicArtworkDetails([id])` or `revalidatePublicArtworkDetails(ids)` instead of duplicating locale-specific paths.
- Ordering invariant: sale record create/update/void must call `deriveAndSyncArtworkStatus()` before public revalidation.

- [ ] **Step 1: helper 테스트 추가**

Add to `__tests__/app/admin-artwork-create-revalidate-contract.test.ts` or a new focused test file:

```ts
import { revalidatePublicArtworkDetails } from '@/lib/utils/revalidate';

const mockRevalidatePath = jest.fn();
const mockRevalidateTag = jest.fn();

jest.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

describe('revalidatePublicArtworkDetails', () => {
  beforeEach(() => mockRevalidatePath.mockClear());

  it('개별 작품 상세를 KO/EN 둘 다 무효화한다', () => {
    revalidatePublicArtworkDetails(['art-1', ' ', null, 'art-1']);

    expect(mockRevalidatePath.mock.calls).toEqual([['/artworks/art-1'], ['/en/artworks/art-1']]);
  });
});
```

- [ ] **Step 2: helper 테스트가 현재 실패하는지 확인**

Run: `npm test -- __tests__/app/admin-artwork-create-revalidate-contract.test.ts --runInBand`

Expected: FAIL because `revalidatePublicArtworkDetails` is not exported yet.

- [ ] **Step 3: helper 구현**

In `lib/utils/revalidate.ts`, add:

```ts
export function revalidatePublicArtworkDetails(ids: Array<string | null | undefined>): void {
  const uniqueIds = Array.from(
    new Set(
      ids
        .filter((id): id is string => typeof id === 'string')
        .map((id) => id.trim())
        .filter((id) => id.length > 0)
    )
  );

  uniqueIds.forEach((id) => {
    revalidatePath(`/artworks/${id}`);
    revalidatePath(`/en/artworks/${id}`);
  });
}
```

- [ ] **Step 4: helper 테스트 통과 확인**

Run: `npm test -- __tests__/app/admin-artwork-create-revalidate-contract.test.ts --runInBand`

Expected: PASS.

- [ ] **Step 5: sale action ordering/coverage contract 테스트 추가**

Add a source contract test to assert the current fragile paths are covered:

```ts
const src = readFileSync(join(process.cwd(), 'app/actions/admin-artworks.ts'), 'utf8');

function functionBlock(name: string) {
  const start = src.indexOf(`export async function ${name}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const next = src.indexOf('\nexport async function ', start + 1);
  return src.slice(start, next === -1 ? undefined : next);
}

it.each(['recordArtworkSale', 'updateArtworkSale', 'voidArtworkSale'])(
  '%s는 상태 동기화 후 공개 상세/목록을 무효화한다',
  (name) => {
    const block = functionBlock(name);
    expect(block.indexOf('await deriveAndSyncArtworkStatus')).toBeGreaterThanOrEqual(0);
    expect(block.indexOf('await deriveAndSyncArtworkStatus')).toBeLessThan(
      block.lastIndexOf('revalidatePublicArtworkDetails')
    );
    expect(block).toContain('revalidatePublicArtworkSurfaces');
  }
);
```

- [ ] **Step 6: contract 테스트가 현재 실패하는지 확인**

Run: `npm test -- __tests__/app/admin-artwork-create-revalidate-contract.test.ts --runInBand`

Expected: FAIL because sale actions revalidate before `deriveAndSyncArtworkStatus()` and do not call the new helper.

- [ ] **Step 7: admin/artist artwork mutation revalidation 수정**

In `app/actions/admin-artworks.ts`:

```ts
import {
  revalidatePublicArtworkDetails,
  revalidatePublicArtworkSurfaces,
} from '@/lib/utils/revalidate';
```

Replace duplicated or incomplete detail revalidation in these functions:

```ts
updateArtworkDetails: revalidatePublicArtworkDetails([id]);
updateArtworkImages: revalidatePublicArtworkDetails([id]);
batchUpdateArtworkStatus: revalidatePublicArtworkDetails(ids);
updateArtworkCategory: revalidatePublicArtworkDetails([id]);
recordArtworkSale/updateArtworkSale/voidArtworkSale: await deriveAndSyncArtworkStatus(...) first, then revalidatePublicArtworkDetails([artworkId]) and revalidatePublicArtworkSurfaces();
batchToggleHidden/batchDeleteArtworks or equivalent status/visibility batch mutation: revalidatePublicArtworkDetails(ids) when public detail visibility can change.
```

In `app/actions/artwork.ts`:

```ts
import {
  revalidatePublicArtworkDetails,
  revalidatePublicArtworkSurfaces,
} from '@/lib/utils/revalidate';
```

Replace:

```ts
revalidatePath(`/artworks/${id}`);
```

with:

```ts
revalidatePublicArtworkDetails([id]);
```

- [ ] **Step 8: targeted cache tests 통과 확인**

Run:

```bash
npm test -- __tests__/actions/admin-artworks-status.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts --runInBand
```

Expected: PASS.

---

### Task 3: 검증, 산출물, 데이터 경고 분리 보고

**Files:**

- Modify: `walkthrough.md`
- Do not modify: `content/artworks-batches/batch-db-generated.ts`
- Do not modify: existing unrelated `content/changelog.json`, `lib/site-stats.ts`

**Interfaces:**

- Produces: 완료 보고에는 코드 수정 결과, 테스트 결과, 미해결 데이터 정정 항목이 분리되어야 한다.
- Produces: 데이터 경고는 auto-generated source/DB 정정 필요로 별도 후속 작업에 남긴다.

- [ ] **Step 1: 전체 검증 실행**

Run:

```bash
npm run lint
npm run type-check
npm test -- --runInBand
npm run validate-artworks
```

Expected: lint/type/Jest PASS. `validate-artworks`는 exit 0이지만 기존 63개 데이터 경고가 남을 수 있다.

- [ ] **Step 2: build 실행 여부 판단**

Read `package.json` build script. If `npm run build` still writes generated changelog/site stats/image metrics, do not run it without explicit approval because this task already has unrelated dirty generated files.

- [ ] **Step 3: walkthrough 작성**

Update `walkthrough.md` with:

```md
## 배송 검증 및 작품 공개 캐시 개선

- 주문 생성/배송정보 수정 서버 action에서 공백 필수값 저장을 차단했다.
- 작품 판매/수정 후 KO/EN 상세 및 공개 목록 캐시를 같은 helper로 무효화하도록 정리했다.
- 검증: `npm run lint`, `npm run type-check`, `npm test -- --runInBand`, `npm run validate-artworks`.
- 남은 항목: `validate-artworks` 경고는 auto-generated artwork data/source DB 정정 작업으로 분리한다.
```

- [ ] **Step 4: final status 확인**

Run: `git status --short --branch`

Expected: 이번 작업 파일과 기존 unrelated dirty files가 분리되어 보인다. 최종 보고에서 기존 dirty files는 되돌리지 않았다고 명시한다.

---

# Historical Plan Below
