# Toss Payment Widget Migration (Step 1 — Korean Locale) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Korean-locale checkout from the v1 `/v1/payments` redirect flow (cafe24 경유 MID) to the Toss Payment Widget v2 (신규 국내 MID) so that 카드/간편결제/가상계좌 are unified in one widget UI. English-locale checkout becomes a "PayPal 준비 중" placeholder until Step 2.

**Architecture:**

- Provider-per-order: each `orders` row records `metadata.payment_provider = 'widget' | 'api_v1'`. `confirm`/`cancel`/`fetchPayment` select the right secret key based on the order's provider, so old (`api_v1`) and new (`widget`) MID payments coexist during cutover.
- Widget client mounts on `/[ko]/checkout/[artworkId]` using `@tosspayments/tosspayments-sdk@^2.6.0` (already installed). The widget itself renders payment-method selector + agreement; user clicks 결제하기 → widget opens Toss UX → Toss redirects to existing `successUrl`/`failUrl` → existing confirm route runs (now with widget secret).
- `app/actions/checkout.ts::initiatePayment` is removed (the widget supersedes it). `createOrder` keeps its existing role: validate, insert pending order, return `orderNo`/`totalAmount`/`orderName` to the client. `createBankTransferOrder` (manual NH 계좌 안내) is unchanged — it never went through Toss.
- English-locale checkout (`/en/checkout/[artworkId]`) renders a `PaypalPlaceholder` component that informs the buyer PayPal is coming and links to the social-funch donation page as fallback. Step 2 will replace this when overseas MID keys arrive.

**Tech Stack:**

- Next.js 16 App Router (React 19, Server Components + Server Actions)
- `@tosspayments/tosspayments-sdk` v2.6.0 (widget SDK, client-only)
- Supabase (orders/payments/artwork_sales tables — schema unchanged; provider tracked in `orders.metadata` JSON)
- Jest + jsdom + @testing-library/react for unit tests
- next-intl for ko/en messages

---

## File Structure

### Modified

- `lib/integrations/toss/config.ts` — add `PaymentProvider` type, `getTossConfig(provider)`, `getTossAuthHeader(provider)`, `getTossWidgetClientKey()`. Keep API v1 helpers as the `'api_v1'` branch.
- `lib/integrations/toss/confirm.ts` — `confirmPayment`/`fetchPayment`/`fetchPaymentByOrderId` accept optional `provider` parameter (default `'widget'`).
- `lib/integrations/toss/cancel.ts` — `cancelPayment` accepts optional `provider` parameter.
- `app/actions/checkout.ts` — remove `initiatePayment` + `InitiatePaymentInput`/`InitiatePaymentResult` exports; `createOrder` stamps `metadata.payment_provider = 'widget'`.
- `app/api/payments/toss/confirm/route.ts` — read `payment_provider` from order metadata and pass to `confirmPayment`. Default to `'api_v1'` for legacy orders without metadata key.
- `app/api/webhooks/toss/route.ts` — pass per-payment provider (looked up from `orders.metadata`) to `fetchPayment`. Webhook secret env var stays `TOSS_PAYMENTS_WEBHOOK_SECRET` (set to widget MID's webhook secret post-cutover).
- `app/[locale]/checkout/[artworkId]/page.tsx` — branch on `locale`: ko renders `CheckoutClient`; en renders new `PaypalPlaceholder`.
- `app/[locale]/checkout/[artworkId]/CheckoutClient.tsx` — full rewrite. No payment-method selector; widget renders methods. Removes `initiatePayment` import. Calls widget `requestPayment` after `createOrder` succeeds.
- `app/[locale]/checkout/[artworkId]/success/SuccessClient.tsx` — no behavioral change; document that `paymentKey` still arrives as a query param.
- `messages/ko.json` — adjust `checkout` namespace: rename method labels (widget renders its own), add `agreementTitle` + remove obsolete `methodCard`/`methodTransfer`/`methodVirtualAccount` button labels (still used elsewhere — keep but mark as legacy) + add `widgetMountFailed` error.
- `messages/en.json` — add `checkout.paypalPreparing.{title,description,donateCta,backCta}`.

### Created

- `app/[locale]/checkout/[artworkId]/PaypalPlaceholder.tsx` — server component (or client, see Task 7), shows "PayPal 준비 중" + 사회적펀딩 link.
- `__tests__/lib/integrations/toss/config.test.ts` — covers provider switch, auth header, missing-env nulls.
- `__tests__/actions/checkout.test.ts` — covers `createOrder` writes `metadata.payment_provider`. (If file exists, augment.)

### Deleted

- None. (`initiatePayment` is removed by editing `app/actions/checkout.ts`; no file deletion.)

---

## Pre-flight (Manual — Operator)

These steps depend on the Toss dashboard and cannot be automated. **Execute before Task 9 cutover.**

1. In Toss 결제위젯 MID dashboard, register webhook URL: `https://saf.kosmart.org/api/webhooks/toss`.
2. Copy the webhook secret shown by Toss after registration.
3. Update `TOSS_PAYMENTS_WEBHOOK_SECRET` in Vercel production to the **new** widget MID webhook secret:
   ```bash
   vercel env rm TOSS_PAYMENTS_WEBHOOK_SECRET production
   printf "<new-widget-webhook-secret>" | vercel env add TOSS_PAYMENTS_WEBHOOK_SECRET production
   ```
4. Verify env vars present in production:
   ```bash
   vercel env ls | grep -E "TOSS_(PAYMENTS_)?(WIDGET_|WEBHOOK)"
   ```
   Expected output: 3 rows — `NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY`, `TOSS_PAYMENTS_WIDGET_SECRET_KEY`, `TOSS_PAYMENTS_WEBHOOK_SECRET`.
5. Confirm with the user that the **old MID's** in-flight `pending_payment` orders are drained (run `select count(*) from orders where status = 'pending_payment' and (metadata->>'payment_provider' is null or metadata->>'payment_provider' = 'api_v1');` via Supabase MCP). If non-zero and older than 30 minutes, manually `cancel` them before deploying.

---

### Task 1: Provider-aware Toss config

**Files:**

- Modify: `lib/integrations/toss/config.ts`
- Create: `__tests__/lib/integrations/toss/config.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/integrations/toss/config.test.ts`:

```ts
import {
  getTossConfig,
  getTossAuthHeader,
  getTossWidgetClientKey,
  type PaymentProvider,
} from '@/lib/integrations/toss/config';

describe('toss/config — provider switch', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    delete process.env.TOSS_PAYMENTS_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY;
    delete process.env.TOSS_PAYMENTS_WIDGET_SECRET_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns null when widget keys missing', () => {
    expect(getTossConfig('widget')).toBeNull();
  });

  it('returns null when api_v1 keys missing', () => {
    expect(getTossConfig('api_v1')).toBeNull();
  });

  it('returns widget config when widget keys set', () => {
    process.env.NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY = 'live_gck_test';
    process.env.TOSS_PAYMENTS_WIDGET_SECRET_KEY = 'live_gsk_test';
    const cfg = getTossConfig('widget');
    expect(cfg).toEqual({
      clientKey: 'live_gck_test',
      secretKey: 'live_gsk_test',
      apiBaseUrl: 'https://api.tosspayments.com',
      provider: 'widget',
    });
  });

  it('returns api_v1 config independently of widget keys', () => {
    process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'live_ck_old';
    process.env.TOSS_PAYMENTS_SECRET_KEY = 'live_sk_old';
    const cfg = getTossConfig('api_v1');
    expect(cfg?.provider).toBe('api_v1');
    expect(cfg?.secretKey).toBe('live_sk_old');
  });

  it('defaults to widget when no provider passed', () => {
    process.env.NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY = 'live_gck_test';
    process.env.TOSS_PAYMENTS_WIDGET_SECRET_KEY = 'live_gsk_test';
    expect(getTossConfig()?.provider).toBe('widget');
  });

  it('builds Basic auth header with secret + colon', () => {
    process.env.TOSS_PAYMENTS_WIDGET_SECRET_KEY = 'sec';
    process.env.NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY = 'cli';
    const expected = 'Basic ' + Buffer.from('sec:').toString('base64');
    expect(getTossAuthHeader('widget')).toBe(expected);
  });

  it('throws when auth header requested but provider not configured', () => {
    expect(() => getTossAuthHeader('widget')).toThrow(/widget.*not configured/i);
  });

  it('exposes widget client key for browser use', () => {
    process.env.NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY = 'live_gck_pub';
    process.env.TOSS_PAYMENTS_WIDGET_SECRET_KEY = 'live_gsk_priv';
    expect(getTossWidgetClientKey()).toBe('live_gck_pub');
  });

  it('returns null widget client key when not configured', () => {
    expect(getTossWidgetClientKey()).toBeNull();
  });

  it('PaymentProvider type accepts only known values', () => {
    const a: PaymentProvider = 'widget';
    const b: PaymentProvider = 'api_v1';
    expect([a, b]).toEqual(['widget', 'api_v1']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/integrations/toss/config.test.ts`
Expected: FAIL — `getTossConfig` does not accept a provider, `getTossWidgetClientKey` does not exist, `PaymentProvider` is not exported.

- [ ] **Step 3: Implement provider-aware config**

Replace `lib/integrations/toss/config.ts` contents with:

```ts
/**
 * TossPayments configuration with provider switch.
 *
 * Two providers coexist during the v2 결제위젯 migration:
 * - 'api_v1': legacy 개별 연동 키 (cafe24 경유 MID, prefix `live_ck_`/`live_sk_`)
 * - 'widget': 결제위젯 키 (신규 국내 MID, prefix `live_gck_`/`live_gsk_`)
 *
 * Each order is bound to a single provider via `orders.metadata.payment_provider`,
 * so confirm/cancel calls always use the matching MID's secret.
 */

export const TOSS_API_BASE_URL = 'https://api.tosspayments.com';

export const SHIPPING_THRESHOLD = 200_000;
export const SHIPPING_FEE = 4_000;

export type PaymentProvider = 'api_v1' | 'widget';

export const DEFAULT_PROVIDER: PaymentProvider = 'widget';

export interface TossConfig {
  clientKey: string;
  secretKey: string;
  apiBaseUrl: string;
  provider: PaymentProvider;
}

export function getTossConfig(provider: PaymentProvider = DEFAULT_PROVIDER): TossConfig | null {
  if (provider === 'widget') {
    const clientKey = process.env.NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY;
    const secretKey = process.env.TOSS_PAYMENTS_WIDGET_SECRET_KEY;
    if (!clientKey || !secretKey) return null;
    return { clientKey, secretKey, apiBaseUrl: TOSS_API_BASE_URL, provider };
  }
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY;
  if (!clientKey || !secretKey) return null;
  return { clientKey, secretKey, apiBaseUrl: TOSS_API_BASE_URL, provider };
}

export function getTossAuthHeader(provider: PaymentProvider = DEFAULT_PROVIDER): string {
  const config = getTossConfig(provider);
  if (!config) throw new Error(`TossPayments (${provider}) is not configured`);
  return 'Basic ' + Buffer.from(config.secretKey + ':').toString('base64');
}

/** Browser-safe widget client key (returns null if not configured). */
export function getTossWidgetClientKey(): string | null {
  return process.env.NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY ?? null;
}

/** Payment mode is always 'toss' as long as either provider is configured. */
export function getPaymentMode(): 'toss' | 'disabled' {
  return getTossConfig('widget') || getTossConfig('api_v1') ? 'toss' : 'disabled';
}

export function calculateShippingFee(itemAmount: number): number {
  return itemAmount >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/integrations/toss/config.test.ts`
Expected: PASS — 10 tests passing.

- [ ] **Step 5: Run type-check**

Run: `npm run type-check`
Expected: 0 errors. (Existing call sites still pass — `getTossAuthHeader()` with no args defaults to `'widget'`, but they currently expect API v1 — Task 2/3 will fix.)

If type errors appear, they will be in `confirm.ts`/`cancel.ts`/`checkout.ts`/route handlers — those are addressed in subsequent tasks. **Do not fix them here.** If errors are anywhere else, stop and investigate.

- [ ] **Step 6: Commit**

```bash
git add lib/integrations/toss/config.ts __tests__/lib/integrations/toss/config.test.ts
git commit -m "$(cat <<'EOF'
feat(toss): add provider-aware Toss config (widget + api_v1)

요약: Toss 결제위젯 MID와 기존 API 개별 연동 MID를 한 코드베이스에서 공존시키기 위해 provider 파라미터로 키를 선택하는 헬퍼 추가

- PaymentProvider 타입 ('widget' | 'api_v1') 도입
- getTossConfig(provider), getTossAuthHeader(provider) 시그니처 확장 (기본값 'widget')
- getTossWidgetClientKey() — 브라우저 노출용
- getPaymentMode()는 둘 중 하나라도 구성되어 있으면 'toss' 반환
- 신규 유닛 테스트 10건

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Provider parameter in confirm.ts and cancel.ts

**Files:**

- Modify: `lib/integrations/toss/confirm.ts`
- Modify: `lib/integrations/toss/cancel.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/integrations/toss/confirm.test.ts`:

```ts
import { confirmPayment } from '@/lib/integrations/toss/confirm';

describe('toss/confirm — provider routing', () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY = 'gck';
    process.env.TOSS_PAYMENTS_WIDGET_SECRET_KEY = 'gsk_widget';
    process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY = 'ck';
    process.env.TOSS_PAYMENTS_SECRET_KEY = 'sk_legacy';
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it('uses widget secret when provider is widget', async () => {
    const calls: { url: string; headers: HeadersInit | undefined }[] = [];
    global.fetch = jest.fn(async (url, init) => {
      calls.push({ url: url as string, headers: init?.headers });
      return new Response(JSON.stringify({ paymentKey: 'p', orderId: 'o', status: 'DONE' }), {
        status: 200,
      });
    }) as unknown as typeof fetch;

    await confirmPayment({ paymentKey: 'p', orderId: 'o', amount: 1000 }, 'idem-1', 'widget');

    const auth = (calls[0].headers as Record<string, string>).Authorization;
    expect(auth).toBe('Basic ' + Buffer.from('gsk_widget:').toString('base64'));
  });

  it('uses legacy secret when provider is api_v1', async () => {
    const calls: { headers: HeadersInit | undefined }[] = [];
    global.fetch = jest.fn(async (_url, init) => {
      calls.push({ headers: init?.headers });
      return new Response(JSON.stringify({ paymentKey: 'p', orderId: 'o', status: 'DONE' }), {
        status: 200,
      });
    }) as unknown as typeof fetch;

    await confirmPayment({ paymentKey: 'p', orderId: 'o', amount: 1000 }, 'idem-2', 'api_v1');

    const auth = (calls[0].headers as Record<string, string>).Authorization;
    expect(auth).toBe('Basic ' + Buffer.from('sk_legacy:').toString('base64'));
  });

  it('defaults to widget when provider omitted', async () => {
    const calls: { headers: HeadersInit | undefined }[] = [];
    global.fetch = jest.fn(async (_url, init) => {
      calls.push({ headers: init?.headers });
      return new Response(JSON.stringify({ status: 'DONE' }), { status: 200 });
    }) as unknown as typeof fetch;

    await confirmPayment({ paymentKey: 'p', orderId: 'o', amount: 1 }, 'i');

    const auth = (calls[0].headers as Record<string, string>).Authorization;
    expect(auth).toBe('Basic ' + Buffer.from('gsk_widget:').toString('base64'));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/integrations/toss/confirm.test.ts`
Expected: FAIL — `confirmPayment` only takes 2 args.

- [ ] **Step 3: Update confirm.ts to accept provider**

Replace `lib/integrations/toss/confirm.ts` contents:

```ts
/**
 * TossPayments — server-side payment confirmation + lookup helpers.
 * Caller MUST pass the provider that originated the payment so the right MID
 * secret is used.
 */

import { getTossAuthHeader, getTossConfig, type PaymentProvider, DEFAULT_PROVIDER } from './config';
import { fetchWithTimeout } from './fetch-with-timeout';
import type { TossConfirmRequest, TossConfirmResponse, TossErrorResponse } from './types';

export type ConfirmResult =
  | { success: true; data: TossConfirmResponse }
  | { success: false; error: TossErrorResponse };

export async function confirmPayment(
  request: TossConfirmRequest,
  idempotencyKey?: string,
  provider: PaymentProvider = DEFAULT_PROVIDER
): Promise<ConfirmResult> {
  const config = getTossConfig(provider);
  if (!config) throw new Error(`TossPayments (${provider}) is not configured`);

  const headers: Record<string, string> = {
    Authorization: getTossAuthHeader(provider),
    'Content-Type': 'application/json',
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const response = await fetchWithTimeout(`${config.apiBaseUrl}/v1/payments/confirm`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    if (!response.ok) {
      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: `Toss 응답 파싱 실패 (${response.status}): ${text.slice(0, 200)}`,
        } as TossErrorResponse,
      };
    }
    throw new Error(`Toss 응답 파싱 실패: ${text.slice(0, 200)}`);
  }

  if (!response.ok) return { success: false, error: body as TossErrorResponse };
  return { success: true, data: body as TossConfirmResponse };
}

export async function fetchPayment(
  paymentKey: string,
  provider: PaymentProvider = DEFAULT_PROVIDER
): Promise<TossConfirmResponse | null> {
  const config = getTossConfig(provider);
  if (!config) return null;

  const response = await fetchWithTimeout(`${config.apiBaseUrl}/v1/payments/${paymentKey}`, {
    headers: { Authorization: getTossAuthHeader(provider) },
  });
  if (!response.ok) return null;
  const text = await response.text();
  try {
    return JSON.parse(text) as TossConfirmResponse;
  } catch {
    console.error(`[toss] fetchPayment JSON parse failed: ${text.slice(0, 200)}`);
    return null;
  }
}

export async function fetchPaymentByOrderId(
  orderId: string,
  provider: PaymentProvider = DEFAULT_PROVIDER
): Promise<TossConfirmResponse | null> {
  const config = getTossConfig(provider);
  if (!config) return null;

  const response = await fetchWithTimeout(`${config.apiBaseUrl}/v1/payments/orders/${orderId}`, {
    headers: { Authorization: getTossAuthHeader(provider) },
  });
  if (!response.ok) return null;
  const text = await response.text();
  try {
    return JSON.parse(text) as TossConfirmResponse;
  } catch {
    console.error(`[toss] fetchPaymentByOrderId JSON parse failed: ${text.slice(0, 200)}`);
    return null;
  }
}
```

- [ ] **Step 4: Update cancel.ts to accept provider**

Replace `lib/integrations/toss/cancel.ts` contents:

```ts
/**
 * TossPayments — server-side payment cancellation / refund.
 * Provider must match the order's payment_provider metadata.
 */

import { getTossAuthHeader, getTossConfig, type PaymentProvider, DEFAULT_PROVIDER } from './config';
import { fetchWithTimeout } from './fetch-with-timeout';
import type {
  TossCancelRequest,
  CancelResult,
  TossErrorResponse,
  TossCancelResponse,
} from './types';

export async function cancelPayment(
  paymentKey: string,
  request: TossCancelRequest,
  idempotencyKey?: string,
  provider: PaymentProvider = DEFAULT_PROVIDER
): Promise<CancelResult> {
  const config = getTossConfig(provider);
  if (!config) throw new Error(`TossPayments (${provider}) is not configured`);

  const headers: Record<string, string> = {
    Authorization: getTossAuthHeader(provider),
    'Content-Type': 'application/json',
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const response = await fetchWithTimeout(`${config.apiBaseUrl}/v1/payments/${paymentKey}/cancel`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    if (!response.ok) {
      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: `Toss 응답 파싱 실패 (${response.status}): ${text.slice(0, 200)}`,
        },
      };
    }
    throw new Error(`Toss 응답 파싱 실패: ${text.slice(0, 200)}`);
  }

  if (!response.ok) return { success: false, error: body as TossErrorResponse };
  return { success: true, data: body as TossCancelResponse };
}
```

- [ ] **Step 5: Run confirm test to verify pass**

Run: `npm test -- __tests__/lib/integrations/toss/confirm.test.ts`
Expected: PASS — 3 tests.

- [ ] **Step 6: Commit**

```bash
git add lib/integrations/toss/confirm.ts lib/integrations/toss/cancel.ts __tests__/lib/integrations/toss/confirm.test.ts
git commit -m "$(cat <<'EOF'
feat(toss): route confirm/cancel through per-order provider

요약: confirmPayment, fetchPayment, fetchPaymentByOrderId, cancelPayment에 provider 파라미터 추가하여 위젯 MID와 레거시 MID의 시크릿 키를 주문 메타데이터 기준으로 선택

- 기본 provider는 'widget' — 새 주문은 결제위젯 MID로 처리
- 명시적으로 'api_v1' 전달 시 기존 cafe24 경유 MID 시크릿 사용 (마이그레이션 윈도우 동안의 in-flight 주문 처리용)
- confirmPayment provider 라우팅 테스트 3건

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: createOrder stamps payment_provider in metadata

**Files:**

- Modify: `app/actions/checkout.ts`
- Create or modify: `__tests__/actions/checkout.test.ts`

- [ ] **Step 1: Write the failing test**

If `__tests__/actions/checkout.test.ts` does not exist, create it. Otherwise append to the existing `describe('createOrder')` block.

```ts
// __tests__/actions/checkout.test.ts
import { jest } from '@jest/globals';

jest.mock('next/headers', () => ({
  headers: async () => new Map([['x-forwarded-for', '1.2.3.4']]),
}));
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn(async () => ({ success: true })),
}));

const insertedRows: Array<Record<string, unknown>> = [];
const updateMock = jest.fn(() => ({
  eq: () => ({ eq: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }) }),
}));

jest.mock('@/lib/auth/server', () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      if (table === 'orders') {
        return {
          update: updateMock,
          insert: (row: Record<string, unknown>) => {
            insertedRows.push(row);
            return {
              select: () => ({
                single: async () => ({ data: { id: 'order-uuid' }, error: null }),
              }),
            };
          },
        };
      }
      if (table === 'artworks') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: 'art-1',
                    title: 'Test Artwork',
                    price: '₩5,000,000',
                    status: 'available',
                    artists: { name_ko: '테스트작가' },
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
    rpc: async () => ({ data: [{ is_available: true }], error: null }),
    auth: { getUser: async () => ({ data: { user: null } }) },
  }),
  createSupabaseServerClient: async () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
  }),
}));

import { createOrder } from '@/app/actions/checkout';

describe('createOrder — payment_provider metadata', () => {
  beforeEach(() => {
    insertedRows.length = 0;
  });

  it('stamps metadata.payment_provider = "widget" on insert', async () => {
    const result = await createOrder({
      artworkId: 'art-1',
      buyerName: '홍길동',
      buyerEmail: 'a@b.kr',
      buyerPhone: '010-0000-0000',
      shippingName: '홍길동',
      shippingPhone: '010-0000-0000',
      shippingAddress: '서울시 종로구 어딘가 1',
      shippingAddressDetail: '101호',
      shippingPostalCode: '03000',
      locale: 'ko',
    });

    expect(result.success).toBe(true);
    expect(insertedRows).toHaveLength(1);
    const meta = insertedRows[0].metadata as Record<string, unknown>;
    expect(meta.payment_provider).toBe('widget');
    expect(meta.locale).toBe('ko');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/actions/checkout.test.ts`
Expected: FAIL — `metadata.payment_provider` is undefined.

- [ ] **Step 3: Edit checkout.ts to remove initiatePayment and stamp provider**

In `app/actions/checkout.ts`:

**3a.** Remove the `getTossAuthHeader`, `TOSS_API_BASE_URL`, `fetchWithTimeout`, `TossErrorResponse` imports — they were only used by `initiatePayment`. Keep the `calculateShippingFee` import. Keep `generateOrderNumber`.

Old imports (lines 8-15):

```ts
import {
  calculateShippingFee,
  getTossAuthHeader,
  TOSS_API_BASE_URL,
} from '@/lib/integrations/toss/config';
import { fetchWithTimeout } from '@/lib/integrations/toss/fetch-with-timeout';
import { generateOrderNumber } from '@/lib/integrations/toss/order-number';
import type { TossErrorResponse } from '@/lib/integrations/toss/types';
```

New imports:

```ts
import { calculateShippingFee } from '@/lib/integrations/toss/config';
import { generateOrderNumber } from '@/lib/integrations/toss/order-number';
```

**3b.** In the `.insert({...})` call inside `createOrder` (around line 211 in current file), change:

```ts
        metadata: { locale: buyerLocale },
```

to:

```ts
        metadata: { locale: buyerLocale, payment_provider: 'widget' },
```

**3c.** Delete the `initiatePayment` function and its types entirely. Specifically remove:

- `export type InitiatePaymentInput = { ... };`
- `export type InitiatePaymentResult = ...;`
- `export async function initiatePayment(input: InitiatePaymentInput) { ... }`

(All lines from `export type InitiatePaymentInput` through the closing brace of `initiatePayment`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/actions/checkout.test.ts`
Expected: PASS — `metadata.payment_provider` test passes.

- [ ] **Step 5: Run full type-check**

Run: `npm run type-check`
Expected: errors in `app/[locale]/checkout/[artworkId]/CheckoutClient.tsx` (it still imports `initiatePayment`). These are addressed in Task 7. **Do not fix them now** — they prove Task 7 is necessary. Confirm there are no errors elsewhere.

- [ ] **Step 6: Commit**

```bash
git add app/actions/checkout.ts __tests__/actions/checkout.test.ts
git commit -m "$(cat <<'EOF'
feat(checkout): stamp payment_provider on orders.metadata, remove initiatePayment

요약: 결제위젯 마이그레이션을 위한 서버 액션 정리. 새 주문은 모두 metadata.payment_provider='widget'로 기록되고, v1 redirect 플로우용 initiatePayment 액션은 위젯이 대체하므로 제거

- createOrder가 metadata에 payment_provider, locale을 함께 저장
- initiatePayment, InitiatePaymentInput, InitiatePaymentResult 삭제
- toss config 의존성 calculateShippingFee + generateOrderNumber만 남김
- 신규 단위 테스트 1건 (provider 메타 검증)

CheckoutClient의 type 에러는 Task 7에서 해소

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: confirm route reads provider from order metadata

**Files:**

- Modify: `app/api/payments/toss/confirm/route.ts`

- [ ] **Step 1: Write the failing test**

This route is integration-heavy (Supabase, Resend, revalidation). Rather than mocking the world, we add a unit test for the small helper that reads provider from metadata.

Add to `__tests__/lib/integrations/toss/config.test.ts`:

```ts
import { resolveOrderProvider } from '@/lib/integrations/toss/config';

describe('toss/config — resolveOrderProvider', () => {
  it('returns widget for explicit widget metadata', () => {
    expect(resolveOrderProvider({ payment_provider: 'widget' })).toBe('widget');
  });

  it('returns api_v1 for explicit api_v1 metadata', () => {
    expect(resolveOrderProvider({ payment_provider: 'api_v1' })).toBe('api_v1');
  });

  it('returns api_v1 for legacy null/undefined metadata', () => {
    expect(resolveOrderProvider(null)).toBe('api_v1');
    expect(resolveOrderProvider({})).toBe('api_v1');
    expect(resolveOrderProvider(undefined)).toBe('api_v1');
  });

  it('returns api_v1 for unknown values', () => {
    expect(resolveOrderProvider({ payment_provider: 'mystery' })).toBe('api_v1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- __tests__/lib/integrations/toss/config.test.ts -t resolveOrderProvider`
Expected: FAIL — `resolveOrderProvider` not exported.

- [ ] **Step 3: Add resolveOrderProvider to config.ts**

Append to `lib/integrations/toss/config.ts`:

```ts
/**
 * Reads the payment provider from an order's metadata JSON.
 * Defaults to 'api_v1' for legacy orders that pre-date the widget migration.
 */
export function resolveOrderProvider(metadata: unknown): PaymentProvider {
  if (!metadata || typeof metadata !== 'object') return 'api_v1';
  const value = (metadata as { payment_provider?: unknown }).payment_provider;
  if (value === 'widget' || value === 'api_v1') return value;
  return 'api_v1';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- __tests__/lib/integrations/toss/config.test.ts`
Expected: PASS — all 14 tests (10 original + 4 new).

- [ ] **Step 5: Wire resolveOrderProvider into confirm route**

In `app/api/payments/toss/confirm/route.ts`:

**5a.** Add to imports (top of file):

```ts
import { resolveOrderProvider } from '@/lib/integrations/toss/config';
```

**5b.** After the existing `storedLocale`/`buyerLocale` derivation block (around line 56-61 in current file), add:

```ts
const provider = resolveOrderProvider(order.metadata);
```

**5c.** Find the `confirmPayment(...)` call (around line 103) and change:

```ts
const confirmResult = await confirmPayment({ paymentKey, orderId, amount }, idempotencyKey);
```

to:

```ts
const confirmResult = await confirmPayment(
  { paymentKey, orderId, amount },
  idempotencyKey,
  provider
);
```

**5d.** Find the `cancelPayment(...)` call inside the `after(async () => { ... })` block (around line 200) and change:

```ts
await cancelPayment(
  paymentKey as string,
  { cancelReason: '주문 취소 후 결제 승인 — 자동 환불' },
  `auto-refund-${orderId}`
);
```

to:

```ts
await cancelPayment(
  paymentKey as string,
  { cancelReason: '주문 취소 후 결제 승인 — 자동 환불' },
  `auto-refund-${orderId}`,
  provider
);
```

**5e.** Find the `artwork_sales` insert (around line 221) and change `source_detail`:

```ts
      source: 'toss',
      source_detail: 'toss_api',
```

to:

```ts
      source: 'toss',
      source_detail: provider === 'widget' ? 'toss_widget' : 'toss_api',
```

- [ ] **Step 6: Type-check confirm route**

Run: `npm run type-check`
Expected: 0 errors related to `route.ts`. Errors may remain in `CheckoutClient.tsx` (Task 7).

- [ ] **Step 7: Commit**

```ts
git add lib/integrations/toss/config.ts app/api/payments/toss/confirm/route.ts __tests__/lib/integrations/toss/config.test.ts
git commit -m "$(cat <<'EOF'
feat(checkout): resolve payment provider from order metadata

요약: confirm route가 주문의 metadata.payment_provider를 읽어 위젯 MID와 레거시 MID 시크릿을 자동 선택. 레거시 메타가 없는 주문은 'api_v1'로 폴백

- resolveOrderProvider 헬퍼 + 4건 테스트 추가
- confirm/cancel/auto-refund 호출이 provider 인자를 전달
- artwork_sales.source_detail이 위젯 결제는 'toss_widget'으로 구분 저장

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Webhook route routes per-payment to correct provider

**Files:**

- Modify: `app/api/webhooks/toss/route.ts`

The webhook handler calls `fetchPayment(paymentKey)` for double-verification (SEC-04b). Post-cutover, paymentKeys can belong to either MID. We resolve provider via the `payments → orders` join.

- [ ] **Step 1: Update DEPOSIT_CALLBACK branch**

In `app/api/webhooks/toss/route.ts`, find the `isDepositCallback(payload)` branch.

**1a.** After the `paymentRecord` lookup (around line 53), add a follow-up lookup of the order's metadata:

Old code (around lines 51-66):

```ts
const { data: paymentRecord, error: paymentLookupError } = await supabase
  .from('payments')
  .select('id, order_id, webhook_responses, confirm_response')
  .eq('payment_key', paymentKey)
  .maybeSingle();

if (paymentLookupError) {
  // ...
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
```

After this block (before the `storedSecret` derivation), add:

```ts
let provider: PaymentProvider = 'api_v1';
if (paymentRecord?.order_id) {
  const { data: orderForProvider } = await supabase
    .from('orders')
    .select('metadata')
    .eq('id', paymentRecord.order_id)
    .single();
  provider = resolveOrderProvider(orderForProvider?.metadata);
}
```

**1b.** Find the `fetchPayment(paymentKey)` call inside the `if (payload.data.paymentStatus === 'DONE')` branch (around line 88) and change:

```ts
const verified = await fetchPayment(paymentKey);
```

to:

```ts
const verified = await fetchPayment(paymentKey, provider);
```

**1c.** Find the `artwork_sales.insert` call (around line 170) and update `source_detail`:

```ts
                    source: 'toss',
                    source_detail: 'toss_api',
```

to:

```ts
                    source: 'toss',
                    source_detail: provider === 'widget' ? 'toss_widget' : 'toss_api',
```

- [ ] **Step 2: Update PAYMENT_STATUS_CHANGED branch**

Find the `isPaymentStatusChanged(payload)` branch.

**2a.** Before the first `fetchPayment(paymentKey)` call (around line 311), look up provider from `payments → orders`:

Replace lines 306-311 (current):

```ts
  } else if (isPaymentStatusChanged(payload)) {
    const paymentKey = payload.data.paymentKey;
    const newStatus = payload.data.status;

    // Toss API double-verify BEFORE any DB mutations
    const verified = await fetchPayment(paymentKey);
```

with:

```ts
  } else if (isPaymentStatusChanged(payload)) {
    const paymentKey = payload.data.paymentKey;
    const newStatus = payload.data.status;

    // Resolve provider from payment → order metadata
    let provider: PaymentProvider = 'api_v1';
    const { data: providerLookup } = await supabase
      .from('payments')
      .select('orders!inner(metadata)')
      .eq('payment_key', paymentKey)
      .maybeSingle();
    if (providerLookup?.orders) {
      const orderRow = Array.isArray(providerLookup.orders)
        ? providerLookup.orders[0]
        : providerLookup.orders;
      provider = resolveOrderProvider(orderRow?.metadata);
    }

    // Toss API double-verify BEFORE any DB mutations
    const verified = await fetchPayment(paymentKey, provider);
```

- [ ] **Step 3: Add imports**

At the top of `app/api/webhooks/toss/route.ts`, add to existing import group:

```ts
import { resolveOrderProvider, type PaymentProvider } from '@/lib/integrations/toss/config';
```

- [ ] **Step 4: Type-check**

Run: `npm run type-check`
Expected: 0 errors in webhook route.

- [ ] **Step 5: Verify existing webhook tests still pass**

Run: `npm test -- toss`
Expected: PASS for any existing webhook tests + the config + confirm tests.

If a Supabase mock breaks because the join shape changed, narrow the test fix to that mock only.

- [ ] **Step 6: Commit**

```bash
git add app/api/webhooks/toss/route.ts
git commit -m "$(cat <<'EOF'
feat(webhook): route Toss webhook double-verify through per-order provider

요약: 웹훅이 payments→orders 조인으로 metadata.payment_provider를 읽어 fetchPayment에 전달. DEPOSIT_CALLBACK·PAYMENT_STATUS_CHANGED 양쪽 분기 모두 적용

- artwork_sales.source_detail도 위젯 결제는 'toss_widget'으로 구분
- 레거시 메타 없는 주문은 'api_v1'로 폴백 — 마이그레이션 윈도우 동안 안전

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Update i18n strings

**Files:**

- Modify: `messages/ko.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add widget keys to ko.json**

Open `messages/ko.json`, find the `"checkout": { ... }` namespace, and add these entries (preserve existing keys, do not delete `methodCard`/`methodTransfer`/`methodVirtualAccount` — they may still be referenced in the legacy success/fail paths until the dust settles):

```json
    "widgetMountFailed": "결제 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
    "agreementTitle": "이용약관 동의",
    "preparingPayment": "결제 준비 중…",
    "transferOptionLabel": "계좌이체 / 무통장입금"
```

Place them next to the existing `"errorPayment"` key (alphabetical-ish order is fine — match existing style).

- [ ] **Step 2: Add PayPal placeholder keys to en.json**

Open `messages/en.json`, find the `"checkout": { ... }` namespace, and add:

```json
    "paypalPreparing": {
      "title": "International payment is coming soon",
      "description": "We are integrating PayPal to support international collectors. While we finalize this, please contact us at contact@kosmart.org or support the campaign through Social Funch.",
      "donateCta": "Support the campaign",
      "backCta": "Back to artwork"
    }
```

If there is a sibling Korean fallback in `ko.json` for `paypalPreparing`, add a Korean version too — but the placeholder is en-only, so a Korean fallback is unnecessary unless an existing key elsewhere requires parity. **Verify by running:** `grep -c "paypalPreparing" messages/*.json` — expected 1 (en only).

- [ ] **Step 3: Lint JSON**

Run: `npm run format -- messages/ko.json messages/en.json && npm run type-check`
Expected: 0 errors. JSON files reformatted by Prettier.

- [ ] **Step 4: Commit**

```bash
git add messages/ko.json messages/en.json
git commit -m "$(cat <<'EOF'
feat(i18n): add Toss widget + PayPal placeholder strings

요약: 결제위젯 마운트 실패/약관 동의/준비중 라벨, 영문 PayPal 준비중 안내 문구 추가

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Rewrite CheckoutClient with widget SDK (Korean only)

**Files:**

- Modify: `app/[locale]/checkout/[artworkId]/CheckoutClient.tsx`

This is the highest-risk file. The widget SDK is loaded client-side; payment-method selector + agreement panel are rendered into our containers. After `widgets.requestPayment(...)`, Toss redirects the browser to our `successUrl`, where existing `SuccessClient` already handles the confirm POST — no change needed there.

- [ ] **Step 1: Replace CheckoutClient.tsx contents**

Overwrite `app/[locale]/checkout/[artworkId]/CheckoutClient.tsx` with:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import SafeImage from '@/components/common/SafeImage';
import { Link } from '@/i18n/navigation';
import Button from '@/components/ui/Button';
import { calculateShippingFee } from '@/lib/integrations/toss/config';
import { formatPriceForDisplay } from '@/lib/utils';
import { createOrder, cancelPendingOrder } from '@/app/actions/checkout';
import BuyerInfoForm from './BuyerInfoForm';
import type { BuyerInfo } from './BuyerInfoForm';

interface Props {
  artworkId: string;
  artworkTitle: string;
  artist: string;
  price: number;
  displayPrice: string;
  imageUrl: string;
  locale: 'ko';
  widgetClientKey: string;
}

type Stage = 'idle' | 'mounting' | 'ready' | 'submitting' | 'mountError';

interface TossWidgetsInstance {
  setAmount(input: { currency: string; value: number }): Promise<void>;
  renderPaymentMethods(input: { selector: string; variantKey: string }): Promise<unknown>;
  renderAgreement(input: { selector: string; variantKey: string }): Promise<unknown>;
  requestPayment(input: {
    orderId: string;
    orderName: string;
    successUrl: string;
    failUrl: string;
    customerName?: string;
    customerEmail?: string;
    customerMobilePhone?: string;
  }): Promise<void>;
}

export default function CheckoutClient({
  artworkId,
  artworkTitle,
  artist,
  price,
  displayPrice,
  imageUrl,
  widgetClientKey,
}: Props) {
  const t = useTranslations('checkout');
  const shippingFee = calculateShippingFee(price);
  const totalAmount = price + shippingFee;

  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const buyerInfoRef = useRef<BuyerInfo | null>(null);
  const widgetsRef = useRef<TossWidgetsInstance | null>(null);
  const mountedOnceRef = useRef(false);

  useEffect(() => {
    if (mountedOnceRef.current) return;
    mountedOnceRef.current = true;
    setStage('mounting');

    let cancelled = false;

    (async () => {
      try {
        const { loadTossPayments, ANONYMOUS } = await import('@tosspayments/tosspayments-sdk');
        const tossPayments = await loadTossPayments(widgetClientKey);
        const widgets = tossPayments.widgets({ customerKey: ANONYMOUS });

        await widgets.setAmount({ currency: 'KRW', value: totalAmount });

        await widgets.renderPaymentMethods({
          selector: '#toss-payment-methods',
          variantKey: 'DEFAULT',
        });
        await widgets.renderAgreement({
          selector: '#toss-payment-agreement',
          variantKey: 'AGREEMENT',
        });

        if (cancelled) return;
        widgetsRef.current = widgets as TossWidgetsInstance;
        setStage('ready');
      } catch (err) {
        console.error('[checkout] widget mount failed:', err);
        if (!cancelled) {
          setStage('mountError');
          setError(t('widgetMountFailed'));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [totalAmount, widgetClientKey, t]);

  async function handlePayment() {
    setError(null);
    if (stage !== 'ready' || !widgetsRef.current) {
      setError(t('widgetMountFailed'));
      return;
    }

    const buyerInfo = buyerInfoRef.current;
    if (!buyerInfo) {
      setError(t('errorBuyerInfoRequired'));
      return;
    }

    const {
      buyerName,
      buyerEmail,
      buyerPhone,
      shippingName,
      shippingPhone,
      shippingAddress,
      shippingAddressDetail,
      shippingPostalCode,
      shippingMemo,
    } = buyerInfo;

    if (!buyerName || !buyerEmail || !buyerPhone) {
      setError(t('errorBuyerFieldsRequired'));
      return;
    }
    if (!shippingAddress || !shippingPostalCode || !shippingAddressDetail) {
      setError(t('errorShippingAddressRequired'));
      return;
    }
    if (!shippingName || !shippingPhone) {
      setError(t('errorRecipientRequired'));
      return;
    }

    setStage('submitting');
    let createdOrderNo: string | null = null;

    try {
      const result = await createOrder({
        artworkId,
        buyerName,
        buyerEmail,
        buyerPhone,
        shippingName,
        shippingPhone,
        shippingAddress,
        shippingAddressDetail,
        shippingPostalCode,
        shippingMemo,
        locale: 'ko',
      });

      if (!result.success) {
        setError(result.error);
        setStage('ready');
        return;
      }

      const { orderNo, orderName, totalAmount: serverTotal } = result;
      createdOrderNo = orderNo;

      // Re-sync widget amount with server-validated total before requestPayment
      await widgetsRef.current.setAmount({ currency: 'KRW', value: serverTotal });

      const successUrl = `${window.location.origin}/checkout/${artworkId}/success`;
      const failUrl = `${window.location.origin}/checkout/${artworkId}/fail`;

      await widgetsRef.current.requestPayment({
        orderId: orderNo,
        orderName,
        successUrl,
        failUrl,
        customerName: buyerName,
        customerEmail: buyerEmail,
        customerMobilePhone: buyerPhone.replace(/\D/g, ''),
      });
      // Toss redirects the browser; setStage stays 'submitting' until unload.
    } catch (err: unknown) {
      if (createdOrderNo) {
        cancelPendingOrder(createdOrderNo, buyerInfoRef.current?.buyerEmail ?? '').catch(
          (cancelErr) => console.error('[checkout] cancelPendingOrder failed:', cancelErr)
        );
      }
      const message = (err as { message?: string })?.message ?? t('errorPayment');
      // Toss SDK throws a known shape with .code on user cancel — silence those
      const code = (err as { code?: string })?.code;
      if (code === 'USER_CANCEL') {
        setError(null);
      } else {
        setError(message);
      }
      setStage('ready');
    }
  }

  return (
    <div className="bg-canvas-soft">
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-24">
        <Link
          href={`/artworks/${artworkId}`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-charcoal"
        >
          <span aria-hidden="true">←</span>
          {t('backToArtwork')}
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-charcoal">{t('pageTitle')}</h1>

        {/* Artwork summary */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            {imageUrl && (
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                <SafeImage
                  src={imageUrl}
                  alt={artworkTitle}
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">{artist}</p>
              <p className="mt-0.5 font-semibold text-charcoal truncate">{artworkTitle}</p>
              <p className="mt-1 text-lg font-bold text-primary-a11y">{displayPrice}</p>
            </div>
          </div>
        </div>

        {/* Buyer / shipping form */}
        <div className="mb-6">
          <BuyerInfoForm ref={buyerInfoRef} />
        </div>

        {/* Price breakdown */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-charcoal">{t('orderSummaryTitle')}</h3>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-2 text-gray-600">{t('artworkAmountLabel')}</td>
                <td className="py-2 text-right font-medium text-charcoal">
                  {formatPriceForDisplay(price)}
                </td>
              </tr>
              <tr>
                <td className="py-2 text-gray-600">{t('shippingFee')}</td>
                <td className="py-2 text-right font-medium text-charcoal">
                  {shippingFee === 0 ? t('freeShipping') : formatPriceForDisplay(shippingFee)}
                </td>
              </tr>
              <tr>
                <td className="py-2 font-bold text-charcoal">{t('totalAmount')}</td>
                <td className="py-2 text-right text-lg font-bold text-primary-a11y">
                  {formatPriceForDisplay(totalAmount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Toss widget mount targets */}
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
          <div id="toss-payment-methods" />
          <div id="toss-payment-agreement" />
        </div>

        {(stage === 'mounting' || stage === 'idle') && (
          <p className="mb-4 text-center text-sm text-gray-500">{t('preparingPayment')}</p>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger-a11y">
            {error}
          </div>
        )}

        <Button
          onClick={handlePayment}
          loading={stage === 'submitting'}
          disabled={stage !== 'ready' && stage !== 'submitting'}
          size="lg"
          className="w-full"
        >
          {stage === 'submitting' ? t('processingShort') : t('payNow')}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Pass widgetClientKey from page.tsx**

In `app/[locale]/checkout/[artworkId]/page.tsx`:

**2a.** Add to imports:

```ts
import { getTossWidgetClientKey } from '@/lib/integrations/toss/config';
import PaypalPlaceholder from './PaypalPlaceholder';
```

**2b.** Replace the `return ( <CheckoutClient ... /> )` block (current lines 72-82) with:

```tsx
if (locale === 'en') {
  return <PaypalPlaceholder artworkId={artworkId} artworkTitle={artwork.title} />;
}

const widgetClientKey = getTossWidgetClientKey();
if (!widgetClientKey) {
  notFound();
}

return (
  <CheckoutClient
    artworkId={artworkId}
    artworkTitle={artwork.title}
    artist={artistName}
    price={price}
    displayPrice={displayPrice}
    imageUrl={imageUrl}
    locale="ko"
    widgetClientKey={widgetClientKey}
  />
);
```

- [ ] **Step 3: Verify removal of `tossLogo` import is intentional**

The previous CheckoutClient imported `@/public/images/logo/toss-logo.png` for the `TRANSFER` button decoration. The widget renders its own branded buttons, so this import is gone. **Do not delete the asset file** — it may be used elsewhere; check via:

```bash
grep -rn "toss-logo" --include="*.tsx" --include="*.ts" /Users/hwang-gyeongha/saf-2026/app /Users/hwang-gyeongha/saf-2026/components
```

If only the previous CheckoutClient referenced it and that reference is gone, leave the asset for now (cleanup can happen in a follow-up commit if desired).

- [ ] **Step 4: Type-check**

Run: `npm run type-check`
Expected: 0 errors. Previous Task 3 errors should now resolve.

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: succeeds. The `import('@tosspayments/tosspayments-sdk')` is dynamic, so it won't be evaluated at build/SSR time. If the build complains about SSR-incompatibility, confirm the dynamic-import is inside the `useEffect` (it is) and re-run.

- [ ] **Step 6: Commit**

```bash
git add app/[locale]/checkout/[artworkId]/CheckoutClient.tsx app/[locale]/checkout/[artworkId]/page.tsx
git commit -m "$(cat <<'EOF'
feat(checkout): mount Toss Payment Widget for Korean checkout

요약: ko 로케일 체크아웃을 결제위젯 v2로 마이그레이션. SDK가 카드/간편결제/가상계좌 선택 UI와 약관 동의 패널을 직접 렌더하고, 결제하기 버튼 클릭 시 위젯이 결제창을 띄움. 영문 로케일은 PaypalPlaceholder로 분기

- 페이지 로드 시 widget mount 후 setAmount/renderPaymentMethods/renderAgreement 호출
- createOrder 성공 후 widgetsRef.requestPayment로 결제 요청
- 사용자 취소(USER_CANCEL)는 에러로 표시하지 않음
- 결제 후 successUrl 리다이렉트 → 기존 SuccessClient의 confirm 흐름 그대로 사용

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: PayPal placeholder for English locale

**Files:**

- Create: `app/[locale]/checkout/[artworkId]/PaypalPlaceholder.tsx`

- [ ] **Step 1: Create PaypalPlaceholder.tsx**

```tsx
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import LinkButton from '@/components/ui/LinkButton';
import { EXTERNAL_LINKS } from '@/lib/constants';

interface Props {
  artworkId: string;
  artworkTitle: string;
}

export default async function PaypalPlaceholder({ artworkId, artworkTitle }: Props) {
  const t = await getTranslations('checkout.paypalPreparing');

  return (
    <div className="min-h-screen bg-canvas-soft flex items-center justify-center pt-24 pb-16">
      <div className="max-w-lg w-full mx-auto px-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-10 shadow-sm text-center">
          <p className="text-4xl mb-4" aria-hidden="true">
            🌍
          </p>
          <h1 className="text-2xl font-bold text-charcoal mb-2">{t('title')}</h1>
          <p className="text-sm text-gray-600 mb-2">
            <span className="font-semibold text-charcoal">{artworkTitle}</span>
          </p>
          <p className="text-sm text-gray-500 mb-8">{t('description')}</p>

          <div className="flex flex-col gap-3">
            <LinkButton href={EXTERNAL_LINKS.donate} variant="primary" size="sm" className="w-full">
              {t('donateCta')}
            </LinkButton>
            <Link
              href={`/artworks/${artworkId}`}
              className="text-sm text-gray-500 underline hover:text-charcoal"
            >
              {t('backCta')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
```

If `EXTERNAL_LINKS.donate` does not exist, check `lib/constants.ts` and use whichever exported constant points to the social-funch URL (per CLAUDE.md: `https://www.socialfunch.org/SAF`). Read the file first to confirm the correct symbol — common name is `EXTERNAL_LINKS.donate` based on the project conventions.

Run before edit:

```bash
grep -n "socialfunch\|donate" /Users/hwang-gyeongha/saf-2026/lib/constants.ts
```

If the symbol is different, substitute accordingly.

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: 0 errors.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: succeeds. The `/en/checkout/[artworkId]` route now renders the placeholder.

- [ ] **Step 4: Commit**

```bash
git add app/[locale]/checkout/[artworkId]/PaypalPlaceholder.tsx
git commit -m "$(cat <<'EOF'
feat(checkout): add PaypalPlaceholder for English locale

요약: 영문 체크아웃은 해외결제 MID(PayPal) 연동 전까지 안내 페이지로 라우팅. 사회적펀딩 기부 링크와 작품 페이지 복귀 버튼 제공

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Manual smoke test (dev → preview → production)

This task is mandatory and not skippable — the widget is impossible to fully unit-test, and a payment processor mistake means real money loss. Each substep must be checked off only after a real test.

- [ ] **Step 1: Local dev — widget mount only**

Pull latest production env vars (operator runs this — tool-level pull is restricted):

```bash
vercel env pull .env.local --environment=production
```

Then:

```bash
npm run dev
```

Open `http://localhost:3000/artworks/<some-available-artwork-id>` in browser → click 구매 CTA → confirm checkout page renders without errors and the Toss widget mounts (showing payment-method buttons).

Open browser devtools console; expected: no red errors, no `widget mount failed`.

- [ ] **Step 2: Preview deploy**

Deploy a preview:

```bash
vercel
```

The preview URL is logged. Open it, navigate to a checkout page. Verify widget mounts.

**Do not run a real card transaction on preview** — preview uses production keys (we have not set test keys; if/when test keys are added per CLAUDE.md, swap to preview/dev environment). If you want to test the full flow, use a Toss-issued test card on the production environment in low-risk hours after Step 3.

- [ ] **Step 3: Production deploy**

After all earlier tasks are committed, run:

```bash
vercel --prod
```

(Per CLAUDE.md: production deploys require user confirmation. Pause here, confirm with user before running.)

- [ ] **Step 4: Production end-to-end test (one real transaction)**

With user permission, perform one ₩100~₩1,000 test purchase on production using a real card:

1. Add a temporary low-priced test artwork via admin (or use an existing low-priced item with seller's permission).
2. Buy the artwork end-to-end.
3. Verify in admin panel: `orders` row has `status='paid'`, `payments` row exists, `artwork_sales` row has `source='toss'` + `source_detail='toss_widget'`.
4. Verify Toss dashboard shows the transaction on the **새 결제위젯 MID** (not cafe24 경유 MID).
5. Refund the transaction via admin or Toss dashboard. Verify `orders.status` becomes `refunded` (via webhook or manual cancel).

- [ ] **Step 5: Production virtual-account test**

Repeat Step 4 but choose 가상계좌 in the widget. Verify success page shows assigned virtual account info. Either complete the deposit or wait for the 24h expiry — both paths must update DB correctly.

- [ ] **Step 6: Note production result in commit log**

```bash
git commit --allow-empty -m "$(cat <<'EOF'
chore(checkout): widget cutover smoke test passed

요약: production에서 카드 1건, 가상계좌 1건 end-to-end 테스트 완료. 결제위젯 MID 정상 동작 확인

- 카드 ₩XXX 환불 처리 완료
- 가상계좌 발급 → 입금 → DEPOSIT_CALLBACK 정상 수신 확인

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Final cleanup

**Files:**

- Optional: `public/images/logo/toss-logo.png` (only if no other code references it)

- [ ] **Step 1: Search for stale references**

```bash
grep -rn "initiatePayment\|TRANSFER.*VIRTUAL_ACCOUNT" --include="*.tsx" --include="*.ts" \
  /Users/hwang-gyeongha/saf-2026/app /Users/hwang-gyeongha/saf-2026/components \
  /Users/hwang-gyeongha/saf-2026/lib
```

Expected: no matches in app code (only test files / docs may contain mentions).

- [ ] **Step 2: Search for toss-logo asset reference**

```bash
grep -rn "toss-logo" --include="*.tsx" --include="*.ts" \
  /Users/hwang-gyeongha/saf-2026/app /Users/hwang-gyeongha/saf-2026/components
```

If 0 matches: optionally delete `public/images/logo/toss-logo.png`. Otherwise leave it.

- [ ] **Step 3: Run full test suite + type-check + build**

Run sequentially (must all pass):

```bash
npm run lint && npm run type-check && npm test && npm run build
```

Expected: all green.

- [ ] **Step 4: Final commit (if anything changed in cleanup)**

```bash
git add -A
git commit -m "$(cat <<'EOF'
chore(checkout): remove stale assets/refs after widget cutover

요약: initiatePayment 잔존 참조 제거 + 미사용 asset 정리

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

If nothing changed, skip this commit.

---

## Self-Review Notes

**Spec coverage:**

- ✅ 결제위젯 도입 (Tasks 1, 7)
- ✅ 가상계좌 노출 (widget의 default variant가 가상계좌 포함 — Task 7 confirms via Step 4 of Task 9)
- ✅ 영문 PayPal-only 분기 (Tasks 6, 8)
- ✅ 기존 API v1 키 롤백 가능성 유지 (Tasks 1-5: provider switch)
- ✅ 환경변수 등록 (이미 완료된 사전 작업)
- ⚠️ PayPal 실제 통합은 별도 plan (Step 2) — 본 plan에는 placeholder만

**Placeholder scan:** No "TBD", "TODO", or hand-wave instructions. Each step has exact code or exact command.

**Type consistency:** `PaymentProvider` is `'widget' | 'api_v1'` everywhere. `provider` parameter ordering is consistent across `confirmPayment`/`fetchPayment`/`fetchPaymentByOrderId`/`cancelPayment`. `resolveOrderProvider` returns `PaymentProvider`.

**Risks called out:**

1. Webhook secret rotation (manual operator step in Pre-flight) — if missed, all webhooks 401.
2. In-flight `pending_payment` orders pre-cutover that finish post-cutover would try widget secret first via `resolveOrderProvider` (defaults to `api_v1` for orders without `payment_provider`), so they should still confirm correctly with the legacy MID secret. Pre-flight Step 5 verifies queue is drained.
3. Production smoke test with real money is non-negotiable — Task 9 mandates it.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-27-toss-payment-widget-migration.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Fresh subagent per task, review between tasks, fast iteration. Good for this plan because Tasks 1-5 are tightly typed and reviewable in isolation, and the high-risk Tasks 7 & 9 deserve a dedicated review pass.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch with checkpoints.

Which approach?
