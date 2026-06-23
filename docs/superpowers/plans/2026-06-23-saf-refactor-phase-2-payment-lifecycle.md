# SAF Refactor Phase 2 Payment Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** reconcile, confirm, webhook이 공유할 수 있는 결제 완료 lifecycle 도메인 함수를 도입한다.

**Architecture:** 먼저 `app/api/internal/reconcile-payments/route.ts`의 `reconcileMissingDoneOrder()`를 `lib/commerce/payment-lifecycle/mark-order-paid.ts`로 추출한다. 이후 confirm/webhook route는 같은 도메인 함수의 입력 adapter로 점진 이전한다.

**Tech Stack:** Next.js App Router Route Handler, Supabase JS v2 mock, TossPayments response types, Jest, TypeScript.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: 결제 외부 truth와 내부 주문/매출/작품 상태가 갈라지면 성공처럼 말하지 않는다.
- Phase 2 Task 1은 동작 변경 없는 추출이다. `reconcile-payments` 응답 shape와 error accumulation semantics가 바뀌면 안 된다.
- `order_items`가 주문-작품 truth이며, legacy `orders.artwork_id`는 fallback으로만 사용한다.
- payment row 보장은 `ensureTossPaymentRecord()`를 계속 사용한다.
- public artwork cache 갱신은 기존 `revalidatePublicArtworkSurfaces()`와 detail `revalidatePath()` 동작을 유지한다.
- 기존 dirty files `content/changelog.json`, `lib/site-stats.ts`는 이번 작업 범위가 아니며 되돌리거나 섞지 않는다.
- TDD: production code 변경 전에 관련 failing test를 먼저 추가하거나 기존 source-contract test가 실패하는 것을 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 Phase 검증 명령에 포함하지 않는다.

---

## File Structure

- Create: `lib/commerce/payment-lifecycle/mark-order-paid.ts`
  - payment row 보장, `orders.status='paid'` 전이, `artwork_sales` 기록, 작품 상태 동기화, public cache invalidation을 담당한다.
- Create Test: `__tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts`
  - payment insert failure, zero-row update, line item fallback, artwork taken/error 결과를 검증한다.
- Modify: `app/api/internal/reconcile-payments/route.ts`
  - local `reconcileMissingDoneOrder()`를 제거하고 `markOrderPaid()`를 호출한다.
- Modify Test: `__tests__/app/reconcile-payments-backfill-contract.test.ts`
  - source-level guard가 shared lifecycle import를 확인하게 한다.

---

### Task 1: markOrderPaid 도메인 함수 도입

**Files:**

- Create: `lib/commerce/payment-lifecycle/mark-order-paid.ts`
- Create Test: `__tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts`

**Interfaces:**

- Consumes: `ensureTossPaymentRecord(input): Promise<{ ok: true } | { ok: false; error: string }>`
- Consumes: `recordOrderArtworkSales(supabase, params): Promise<RecordSalesResult>`
- Consumes: `extractLineItems(order): ArtworkSaleLine[]`
- Produces: `type MarkOrderPaidOrder`
- Produces: `type MarkOrderPaidPayment`
- Produces: `type MarkOrderPaidInput`
- Produces: `markOrderPaid(input: MarkOrderPaidInput): Promise<boolean>`

Expected function signature:

```ts
export type MarkOrderPaidInput = {
  supabase: AdminClient;
  order: MarkOrderPaidOrder;
  tossPayment: MarkOrderPaidPayment;
  provider: PaymentProvider;
  now: string;
  sourceStatuses: Array<'pending_payment' | 'awaiting_deposit'>;
  idempotencyKey: string;
  errors: string[];
};

export async function markOrderPaid(input: MarkOrderPaidInput): Promise<boolean>;
```

- [x] **Step 1: RED test 추가**

Create `__tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts`:

```ts
const mockEnsureTossPaymentRecord = jest.fn();
const mockExtractLineItems = jest.fn();
const mockRecordOrderArtworkSales = jest.fn();
const mockDeriveAndSyncArtworkStatus = jest.fn();
const mockRevalidatePublicArtworkSurfaces = jest.fn();
const mockRevalidatePath = jest.fn();

jest.mock('@/lib/payments/toss-payment-record', () => ({
  ensureTossPaymentRecord: (...args: unknown[]) => mockEnsureTossPaymentRecord(...args),
}));

jest.mock('@/lib/orders/record-artwork-sales', () => ({
  extractLineItems: (...args: unknown[]) => mockExtractLineItems(...args),
  recordOrderArtworkSales: (...args: unknown[]) => mockRecordOrderArtworkSales(...args),
}));

jest.mock('@/app/actions/admin-artworks', () => ({
  deriveAndSyncArtworkStatus: (...args: unknown[]) => mockDeriveAndSyncArtworkStatus(...args),
}));

jest.mock('@/lib/utils/revalidate', () => ({
  revalidatePublicArtworkSurfaces: (...args: unknown[]) =>
    mockRevalidatePublicArtworkSurfaces(...args),
}));

jest.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

type QueryResult = { data: unknown; error: { message: string } | null };

function createSupabase(updateResult: QueryResult = { data: [{ id: 'order-1' }], error: null }) {
  const updateBuilder = {
    in: jest.fn(() => updateBuilder),
    select: jest.fn(async () => updateResult),
  };
  const ordersBuilder = {
    update: jest.fn(() => ({
      eq: jest.fn(() => updateBuilder),
    })),
  };

  return {
    client: {
      from: jest.fn((table: string) => {
        if (table === 'orders') return ordersBuilder;
        return {};
      }),
    },
    ordersBuilder,
    updateBuilder,
  };
}

const basePayment = {
  paymentKey: 'pay-1',
  orderId: 'SAF-001',
  status: 'DONE',
  method: '카드',
  totalAmount: 100000,
  currency: 'KRW',
  approvedAt: '2026-06-23T10:00:00+09:00',
};

const baseOrder = {
  id: 'order-1',
  order_no: 'SAF-001',
  artwork_id: 'art-legacy',
  total_amount: 100000,
  buyer_name: '구매자',
  buyer_phone: '01012345678',
  metadata: { locale: 'ko' },
};

describe('markOrderPaid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEnsureTossPaymentRecord.mockResolvedValue({
      ok: true,
      paymentId: 'pay-row',
      created: true,
    });
    mockExtractLineItems.mockReturnValue([
      { artwork_id: 'art-1', quantity: 1, unit_price: 100000 },
    ]);
    mockRecordOrderArtworkSales.mockResolvedValue({ inserted: true, rows: 1 });
  });

  it('returns false and records an error when payment row creation fails', async () => {
    const { markOrderPaid } = await import('@/lib/commerce/payment-lifecycle/mark-order-paid');
    const supabase = createSupabase();
    const errors: string[] = [];
    mockEnsureTossPaymentRecord.mockResolvedValue({ ok: false, error: 'db down' });

    const result = await markOrderPaid({
      supabase: supabase.client as never,
      order: baseOrder,
      tossPayment: basePayment,
      provider: 'api_v1',
      now: '2026-06-23T00:00:00.000Z',
      sourceStatuses: ['pending_payment'],
      idempotencyKey: 'reconcile-SAF-001',
      errors,
    });

    expect(result).toBe(false);
    expect(errors).toEqual(['SAF-001: payment insert failed: db down']);
    expect(supabase.ordersBuilder.update).not.toHaveBeenCalled();
  });

  it('promotes the order, records sales, syncs artwork status, and revalidates public surfaces', async () => {
    const { markOrderPaid } = await import('@/lib/commerce/payment-lifecycle/mark-order-paid');
    const supabase = createSupabase();
    const errors: string[] = [];

    const result = await markOrderPaid({
      supabase: supabase.client as never,
      order: baseOrder,
      tossPayment: basePayment,
      provider: 'api_v1',
      now: '2026-06-23T00:00:00.000Z',
      sourceStatuses: ['pending_payment', 'awaiting_deposit'],
      idempotencyKey: 'reconcile-SAF-001',
      errors,
    });

    expect(result).toBe(true);
    expect(errors).toEqual([]);
    expect(supabase.ordersBuilder.update).toHaveBeenCalledWith({
      status: 'paid',
      paid_at: basePayment.approvedAt,
      metadata: {
        locale: 'ko',
        payment_method: '카드',
        reconciled: true,
      },
    });
    expect(supabase.updateBuilder.in).toHaveBeenCalledWith('status', [
      'pending_payment',
      'awaiting_deposit',
    ]);
    expect(mockRecordOrderArtworkSales).toHaveBeenCalledWith(
      supabase.client,
      expect.objectContaining({
        orderId: 'order-1',
        orderNo: 'SAF-001',
        source: 'toss',
        sourceDetail: 'toss_api',
      })
    );
    expect(mockDeriveAndSyncArtworkStatus).toHaveBeenCalledWith(supabase.client, 'art-1');
    expect(mockRevalidatePublicArtworkSurfaces).toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith('/artworks/art-1');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/en/artworks/art-1');
  });

  it('falls back to legacy order.artwork_id when order_items are missing', async () => {
    const { markOrderPaid } = await import('@/lib/commerce/payment-lifecycle/mark-order-paid');
    const supabase = createSupabase();
    mockExtractLineItems.mockReturnValue([]);

    await markOrderPaid({
      supabase: supabase.client as never,
      order: baseOrder,
      tossPayment: basePayment,
      provider: 'widget',
      now: '2026-06-23T00:00:00.000Z',
      sourceStatuses: ['pending_payment'],
      idempotencyKey: 'reconcile-SAF-001',
      errors: [],
    });

    expect(mockRecordOrderArtworkSales).toHaveBeenCalledWith(
      supabase.client,
      expect.objectContaining({
        lineItems: [{ artwork_id: 'art-legacy', quantity: 1, unit_price: 100000 }],
        sourceDetail: 'toss_widget',
      })
    );
  });

  it('returns false when the order update affects zero rows', async () => {
    const { markOrderPaid } = await import('@/lib/commerce/payment-lifecycle/mark-order-paid');
    const supabase = createSupabase({ data: [], error: null });
    const errors: string[] = [];

    const result = await markOrderPaid({
      supabase: supabase.client as never,
      order: baseOrder,
      tossPayment: basePayment,
      provider: 'api_v1',
      now: '2026-06-23T00:00:00.000Z',
      sourceStatuses: ['pending_payment'],
      idempotencyKey: 'reconcile-SAF-001',
      errors,
    });

    expect(result).toBe(false);
    expect(errors).toEqual([]);
    expect(mockRecordOrderArtworkSales).not.toHaveBeenCalled();
  });
});
```

- [x] **Step 2: RED 확인**

Run:

```bash
npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts
```

Expected: FAIL with module not found for `@/lib/commerce/payment-lifecycle/mark-order-paid`.

- [x] **Step 3: minimal implementation 작성**

Create `lib/commerce/payment-lifecycle/mark-order-paid.ts` by moving the existing logic from `reconcileMissingDoneOrder()`:

```ts
import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';

import { deriveAndSyncArtworkStatus } from '@/app/actions/admin-artworks';
import { ensureTossPaymentRecord } from '@/lib/payments/toss-payment-record';
import { extractLineItems, recordOrderArtworkSales } from '@/lib/orders/record-artwork-sales';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';
import type { Database } from '@/types/supabase';

export type PaymentProvider = 'api_v1' | 'widget' | 'domestic' | 'overseas';
export type AdminClient = SupabaseClient<Database>;

export type MarkOrderPaidPayment = {
  paymentKey: string;
  orderId: string;
  status?: string | null;
  method?: string | null;
  totalAmount: number;
  currency?: string | null;
  approvedAt?: string | null;
  [key: string]: unknown;
};

export type MarkOrderPaidOrder = {
  id: string;
  order_no: string;
  artwork_id?: string | null;
  total_amount?: number | null;
  buyer_name?: string | null;
  buyer_phone?: string | null;
  metadata?: unknown;
  order_items?: unknown;
};

export type MarkOrderPaidInput = {
  supabase: AdminClient;
  order: MarkOrderPaidOrder;
  tossPayment: MarkOrderPaidPayment;
  provider: PaymentProvider;
  now: string;
  sourceStatuses: Array<'pending_payment' | 'awaiting_deposit'>;
  idempotencyKey: string;
  errors: string[];
};

function metadataRecord(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
}

export async function markOrderPaid({
  supabase,
  order,
  tossPayment,
  provider,
  now,
  sourceStatuses,
  idempotencyKey,
  errors,
}: MarkOrderPaidInput): Promise<boolean> {
  const paymentRecordResult = await ensureTossPaymentRecord({
    supabase,
    orderId: order.id,
    tossPayment,
    idempotencyKey,
  });

  if (!paymentRecordResult.ok) {
    errors.push(`${order.order_no}: payment insert failed: ${paymentRecordResult.error}`);
    return false;
  }

  const { data: updatedOrders, error: orderUpdateError } = await supabase
    .from('orders')
    .update({
      status: 'paid',
      paid_at: tossPayment.approvedAt ?? now,
      metadata: {
        ...metadataRecord(order.metadata),
        payment_method: tossPayment.method ?? null,
        reconciled: true,
      },
    })
    .eq('id', order.id)
    .in('status', sourceStatuses)
    .select('id');

  if (orderUpdateError) {
    errors.push(`${order.order_no}: order update failed: ${orderUpdateError.message}`);
    return false;
  }

  if (!updatedOrders || updatedOrders.length === 0) {
    console.error(
      `[markOrderPaid] SKIP: ${order.order_no} — order no longer ${sourceStatuses.join('/')}, skipping artwork_sales`
    );
    return false;
  }

  const lineItems = extractLineItems(order);
  const salesLines =
    lineItems.length > 0
      ? lineItems
      : order.artwork_id
        ? [
            {
              artwork_id: order.artwork_id,
              quantity: 1,
              unit_price: order.total_amount ?? tossPayment.totalAmount,
            },
          ]
        : [];

  if (salesLines.length > 0) {
    const salesResult = await recordOrderArtworkSales(supabase, {
      orderId: order.id,
      orderNo: order.order_no,
      lineItems: salesLines,
      source: 'toss',
      sourceDetail: provider === 'widget' ? 'toss_widget' : 'toss_api',
      buyerName: order.buyer_name ?? null,
      buyerPhone: order.buyer_phone ?? null,
      soldAt: tossPayment.approvedAt ?? now,
    });

    if (salesResult.inserted === false && salesResult.reason === 'artwork_taken') {
      errors.push(
        `${order.order_no}: artwork already taken by another order (동시 구매 경합 — 수동 환불 검토 필요)`
      );
      return false;
    }

    if (salesResult.inserted === false && salesResult.reason === 'error') {
      errors.push(`${order.order_no}: artwork_sales insert failed: ${salesResult.error}`);
      return false;
    }

    for (const item of salesLines) {
      await deriveAndSyncArtworkStatus(supabase, item.artwork_id);
    }
    revalidatePublicArtworkSurfaces();
    for (const item of salesLines) {
      revalidatePath(`/artworks/${item.artwork_id}`);
      revalidatePath(`/en/artworks/${item.artwork_id}`);
    }
  }

  return true;
}
```

- [x] **Step 4: GREEN 확인**

Run:

```bash
npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts
```

Expected: PASS.

---

### Task 2: reconcile route가 markOrderPaid를 사용하게 전환

**Files:**

- Modify: `app/api/internal/reconcile-payments/route.ts`
- Modify Test: `__tests__/app/reconcile-payments-backfill-contract.test.ts`
- Run Test: `__tests__/app/reconcile-payments-missing-payment-source.test.ts`
- Run Test: `__tests__/app/reconcile-payments-reservation-source.test.ts`

**Interfaces:**

- Consumes: Task 1 `markOrderPaid(input): Promise<boolean>`
- Produces: `reconcile-payments` route의 response body counters and errors unchanged.

- [x] **Step 1: source contract RED test 추가**

Add to `__tests__/app/reconcile-payments-backfill-contract.test.ts`:

```ts
it('routes DONE payment promotion through the shared payment lifecycle helper', () => {
  const src = readFileSync('app/api/internal/reconcile-payments/route.ts', 'utf8');

  expect(src).toContain('@/lib/commerce/payment-lifecycle/mark-order-paid');
  expect(src).toContain('markOrderPaid({');
  expect(src).not.toContain('async function reconcileMissingDoneOrder');
});
```

- [x] **Step 2: RED 확인**

Run:

```bash
npm test -- --runInBand __tests__/app/reconcile-payments-backfill-contract.test.ts -t "shared payment lifecycle"
```

Expected: FAIL because route still defines local `reconcileMissingDoneOrder`.

- [x] **Step 3: route import와 local helper 제거**

In `app/api/internal/reconcile-payments/route.ts`:

Remove imports only used by local helper:

```ts
import { revalidatePath } from 'next/cache';
import { deriveAndSyncArtworkStatus } from '@/app/actions/admin-artworks';
import { recordOrderArtworkSales, extractLineItems } from '@/lib/orders/record-artwork-sales';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';
import { ensureTossPaymentRecord } from '@/lib/payments/toss-payment-record';
```

Keep `reserveUniqueArtworksOrRollback` and `releaseReservedArtworksIfUnowned` because other reconcile branches still use them.

Add:

```ts
import { markOrderPaid } from '@/lib/commerce/payment-lifecycle/mark-order-paid';
import { extractLineItems } from '@/lib/orders/record-artwork-sales';
```

Then delete local `metadataRecord()` and `reconcileMissingDoneOrder()` from the route. Keep `metadataRecord()` only if another branch still uses it; otherwise route can import `asOrderMetadataRecord` from `@/lib/commerce/order-metadata`.

- [x] **Step 4: callsites 교체**

Replace:

```ts
const reconciled = await reconcileMissingDoneOrder({
  supabase,
  order,
  tossPayment,
  provider,
  now,
  sourceStatuses: ['pending_payment'],
  idempotencyKey,
  errors,
});
```

with:

```ts
const reconciled = await markOrderPaid({
  supabase,
  order,
  tossPayment,
  provider,
  now,
  sourceStatuses: ['pending_payment'],
  idempotencyKey,
  errors,
});
```

Do the same for missing-payments-backfill callsites, preserving each callsite's `sourceStatuses` value.

- [x] **Step 5: GREEN 확인**

Run:

```bash
npm test -- --runInBand __tests__/app/reconcile-payments-backfill-contract.test.ts
npm test -- --runInBand __tests__/app/reconcile-payments-missing-payment-source.test.ts
npm test -- --runInBand __tests__/app/reconcile-payments-reservation-source.test.ts
```

Expected: PASS.

---

### Task 3: Phase 2 verification

**Files:**

- Modify: `docs/superpowers/plans/2026-06-23-saf-refactor-phase-2-payment-lifecycle.md`

**Interfaces:**

- Consumes: Tasks 1-2.
- Produces: Phase 2 first slice ready for confirm route migration.

- [x] **Step 1: type-check 실행**

Run:

```bash
npm run type-check
```

Expected: exit 0.

- [x] **Step 2: targeted tests 실행**

Run:

```bash
npm test -- --runInBand \
  __tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts \
  __tests__/app/reconcile-payments-backfill-contract.test.ts \
  __tests__/app/reconcile-payments-missing-payment-source.test.ts \
  __tests__/app/reconcile-payments-reservation-source.test.ts
```

Expected: PASS.

- [x] **Step 3: lint 실행**

Run:

```bash
npm run lint
```

Expected: exit 0.

- [x] **Step 4: completion note 추가**

If checks pass, add:

```md
## Execution Status

2026-06-23 Phase 2 first slice 완료:

- `markOrderPaid()` 도메인 함수 도입
- reconcile route DONE promotion path가 shared lifecycle 사용
- 검증: npm run type-check, targeted Jest, npm run lint

다음 단계:

- Toss confirm route의 DONE promotion branch를 `markOrderPaid()` compatible orchestration으로 이전
- Toss webhook DONE/statusChanged branch를 같은 lifecycle로 이전
```

## Execution Status

2026-06-23 Phase 2 first slice 완료:

- `markOrderPaid()` 도메인 함수 도입
- reconcile route의 Toss `DONE` promotion path가 shared payment lifecycle 사용
- legacy `orders.artwork_id` fallback과 `order_items` 기반 sales 기록 유지
- 검증: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts __tests__/app/reconcile-payments-backfill-contract.test.ts __tests__/app/reconcile-payments-missing-payment-source.test.ts __tests__/app/reconcile-payments-reservation-source.test.ts`, `npm run type-check`, `npm run lint`, `git diff --check`

다음 단계:

- Toss confirm route의 `DONE` promotion branch를 `markOrderPaid()` compatible orchestration으로 이전
- Toss webhook `DONE` / statusChanged branch를 같은 lifecycle로 이전
