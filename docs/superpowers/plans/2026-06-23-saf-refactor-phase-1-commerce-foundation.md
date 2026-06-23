# SAF Refactor Phase 1 Commerce Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** checkout token, order metadata, bank-transfer display logic을 도메인 util로 추출해 결제 lifecycle 공통화의 기반을 만든다.

**Architecture:** `app/actions/checkout.ts`와 `app/api/payments/toss/confirm/route.ts`에 중복된 token/metadata helper를 `lib/commerce` 아래 순수 함수로 이동한다. 첫 단계는 동작 변경 없는 추출이며, Server Action과 Route Handler는 기존 response shape를 유지한다.

**Tech Stack:** Next.js App Router, Server Actions, Route Handlers, TypeScript, Jest, Supabase JS mock.

## Execution Status

2026-06-23 Phase 1 완료:

- checkout token/session util 추출 완료
- order metadata/bank-transfer display util 추출 완료
- `app/actions/checkout.ts`와 `app/api/payments/toss/confirm/route.ts`가 shared util 사용
- 검증 완료:
  - `npm run type-check`
  - `npm test -- --runInBand __tests__/lib/commerce/checkout-session.test.ts __tests__/lib/commerce/bank-transfer.test.ts __tests__/actions/checkout.test.ts __tests__/app/checkout-success-analytics.test.ts __tests__/app/toss-confirm-payment-record-failure.test.ts __tests__/app/toss-confirm-virtual-account-reservation.test.ts`
  - `npm run lint`
- 다음 단계: `lib/commerce/payment-lifecycle/mark-order-paid.ts` 도입 후 reconcile route부터 shared lifecycle로 이전

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- `AGENTS.md`: 실행 전 계획은 한국어로 작성하고, 복잡한 작업은 체크리스트로 관리한다.
- 운영 의도: 기술적 shortcut보다 운영자가 기대하는 결제/주문 최종 상태를 기준으로 구조화한다.
- 기존 dirty files `content/changelog.json`, `lib/site-stats.ts`는 이번 작업 범위가 아니며 되돌리거나 섞지 않는다.
- Phase 1은 동작 변경 없는 추출이다. 실패/성공 응답 문구, cookie 이름, token hash, bank-transfer fallback 결과가 바뀌면 안 된다.
- TDD: production code 변경 전에 관련 failing test를 먼저 추가하거나 기존 source-contract test가 실패하는 것을 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 Phase 검증 명령에 포함하지 않는다.

---

## File Structure

- Create: `lib/commerce/checkout/checkout-session.ts`
  - checkout token 생성, hash, metadata hash 읽기, timing-safe 검증, cookie name, latest-cookie name, cookie payload encode/decode를 담당한다.
- Create: `lib/commerce/order-metadata.ts`
  - unknown metadata를 안전한 record로 바꾸고 locale/payment_provider/manual-bank-transfer 판정을 제공한다.
- Create: `lib/commerce/checkout/bank-transfer.ts`
  - order metadata와 created_at에서 success/lookup 화면용 무통장 표시 모델을 만든다.
- Create: `__tests__/lib/commerce/checkout-session.test.ts`
  - token hash/verify, cookie payload decode, malformed cookie fallback을 검증한다.
- Create: `__tests__/lib/commerce/bank-transfer.test.ts`
  - metadata 우선값, env fallback, locale별 due date fallback을 검증한다.
- Modify: `app/actions/checkout.ts`
  - local helper를 제거하고 `lib/commerce` util을 사용한다.
- Modify: `app/api/payments/toss/confirm/route.ts`
  - local checkout-token helper를 제거하고 `lib/commerce` util을 사용한다.
- Modify: `__tests__/app/checkout-success-analytics.test.ts`
  - source-level guard가 새 util import를 허용하도록 업데이트한다.
- Modify: `__tests__/actions/checkout.test.ts`
  - 필요한 경우 test-local hash helper 대신 shared util을 사용한다.

---

### Task 1: checkout session util 추출

**Files:**

- Create: `lib/commerce/checkout/checkout-session.ts`
- Create Test: `__tests__/lib/commerce/checkout-session.test.ts`

**Interfaces:**

- Produces: `CHECKOUT_TOKEN_HASH_KEY = 'checkout_token_hash'`
- Produces: `CHECKOUT_COOKIE_MAX_AGE_SECONDS = 3600`
- Produces: `type CheckoutCookiePayload = { orderId: string; checkoutToken: string; currency?: 'KRW' | 'USD' }`
- Produces: `generateCheckoutToken(): string`
- Produces: `hashCheckoutToken(token: string): string`
- Produces: `getCheckoutTokenHash(metadata: unknown): string | null`
- Produces: `isCheckoutTokenValid(metadata: unknown, checkoutToken: string): boolean`
- Produces: `checkoutCookieName(orderId: string): string`
- Produces: `latestCheckoutCookieName(artworkId: string): string`
- Produces: `encodeCheckoutCookie(payload: CheckoutCookiePayload): string`
- Produces: `decodeCheckoutCookie(value: string | undefined): CheckoutCookiePayload | null`

- [ ] **Step 1: RED test 추가**

Create `__tests__/lib/commerce/checkout-session.test.ts`:

```ts
import {
  CHECKOUT_TOKEN_HASH_KEY,
  checkoutCookieName,
  decodeCheckoutCookie,
  encodeCheckoutCookie,
  getCheckoutTokenHash,
  hashCheckoutToken,
  isCheckoutTokenValid,
  latestCheckoutCookieName,
} from '@/lib/commerce/checkout/checkout-session';

describe('checkout-session', () => {
  it('uses the existing metadata key and sha256 hash contract', () => {
    const token = 'raw-token';
    const hash = hashCheckoutToken(token);

    expect(CHECKOUT_TOKEN_HASH_KEY).toBe('checkout_token_hash');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(getCheckoutTokenHash({ checkout_token_hash: hash })).toBe(hash);
    expect(isCheckoutTokenValid({ checkout_token_hash: hash }, token)).toBe(true);
    expect(isCheckoutTokenValid({ checkout_token_hash: hash }, 'wrong-token')).toBe(false);
  });

  it('keeps the existing order and latest checkout cookie names', () => {
    expect(checkoutCookieName('SAF-001')).toBe('saf_checkout_SAF-001');
    expect(latestCheckoutCookieName('artwork-1')).toMatch(/^saf_checkout_latest_[a-f0-9]{32}$/);
    expect(latestCheckoutCookieName('artwork-1')).toBe(latestCheckoutCookieName('artwork-1'));
    expect(latestCheckoutCookieName('artwork-1')).not.toBe(latestCheckoutCookieName('artwork-2'));
  });

  it('round-trips valid checkout cookie payloads and rejects malformed values', () => {
    const encoded = encodeCheckoutCookie({
      orderId: 'SAF-001',
      checkoutToken: 'token-1',
      currency: 'USD',
    });

    expect(decodeCheckoutCookie(encoded)).toEqual({
      orderId: 'SAF-001',
      checkoutToken: 'token-1',
      currency: 'USD',
    });
    expect(decodeCheckoutCookie(undefined)).toBeNull();
    expect(decodeCheckoutCookie('not-base64-json')).toBeNull();
    expect(
      decodeCheckoutCookie(
        Buffer.from(JSON.stringify({ orderId: 'SAF-001' })).toString('base64url')
      )
    ).toBeNull();
  });
});
```

- [ ] **Step 2: RED 확인**

Run:

```bash
npm test -- --runInBand __tests__/lib/commerce/checkout-session.test.ts
```

Expected: FAIL with module not found for `@/lib/commerce/checkout/checkout-session`.

- [ ] **Step 3: minimal implementation 작성**

Create `lib/commerce/checkout/checkout-session.ts`:

```ts
import crypto from 'crypto';

export const CHECKOUT_TOKEN_BYTES = 32;
export const CHECKOUT_TOKEN_HASH_KEY = 'checkout_token_hash';
export const CHECKOUT_COOKIE_MAX_AGE_SECONDS = 60 * 60;

export type CheckoutCookiePayload = {
  orderId: string;
  checkoutToken: string;
  currency?: 'KRW' | 'USD';
};

export function generateCheckoutToken(): string {
  return crypto.randomBytes(CHECKOUT_TOKEN_BYTES).toString('base64url');
}

export function hashCheckoutToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getCheckoutTokenHash(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const value = (metadata as Record<string, unknown>)[CHECKOUT_TOKEN_HASH_KEY];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export function isCheckoutTokenValid(metadata: unknown, checkoutToken: string): boolean {
  const storedHash = getCheckoutTokenHash(metadata);
  if (!storedHash || !checkoutToken) return false;
  const providedHash = hashCheckoutToken(checkoutToken);
  const stored = Buffer.from(storedHash);
  const provided = Buffer.from(providedHash);
  return stored.length === provided.length && crypto.timingSafeEqual(stored, provided);
}

export function checkoutCookieName(orderId: string): string {
  return `saf_checkout_${orderId}`;
}

export function latestCheckoutCookieName(artworkId: string): string {
  const key = crypto.createHash('sha256').update(artworkId).digest('hex').slice(0, 32);
  return `saf_checkout_latest_${key}`;
}

export function encodeCheckoutCookie(payload: CheckoutCookiePayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeCheckoutCookie(value: string | undefined): CheckoutCookiePayload | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const payload = parsed as Partial<CheckoutCookiePayload>;
    if (typeof payload.orderId !== 'string' || typeof payload.checkoutToken !== 'string') {
      return null;
    }
    return {
      orderId: payload.orderId,
      checkoutToken: payload.checkoutToken,
      currency: payload.currency === 'USD' ? 'USD' : payload.currency === 'KRW' ? 'KRW' : undefined,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: GREEN 확인**

Run:

```bash
npm test -- --runInBand __tests__/lib/commerce/checkout-session.test.ts
```

Expected: PASS.

---

### Task 2: order metadata와 bank-transfer display util 추출

**Files:**

- Create: `lib/commerce/order-metadata.ts`
- Create: `lib/commerce/checkout/bank-transfer.ts`
- Create Test: `__tests__/lib/commerce/bank-transfer.test.ts`

**Interfaces:**

- Consumes: `formatBankTransferDueDate`, `getBankTransferInfo`
- Produces: `asOrderMetadataRecord(metadata: unknown): Record<string, unknown>`
- Produces: `getBuyerLocaleFromOrderMetadata(metadata: unknown): 'ko' | 'en'`
- Produces: `isManualBankTransferMetadata(metadata: unknown): boolean`
- Produces: `type BankTransferDisplay = { bankName: string; accountNumber: string; holderName: string; dueDate: string }`
- Produces: `buildBankTransferDisplay(metadata: unknown, createdAt: string | null | undefined): BankTransferDisplay`

- [ ] **Step 1: RED test 추가**

Create `__tests__/lib/commerce/bank-transfer.test.ts`:

```ts
import { buildBankTransferDisplay } from '@/lib/commerce/checkout/bank-transfer';
import {
  asOrderMetadataRecord,
  getBuyerLocaleFromOrderMetadata,
  isManualBankTransferMetadata,
} from '@/lib/commerce/order-metadata';

const ENV_KEYS = [
  'BANK_TRANSFER_BANK_NAME',
  'BANK_TRANSFER_ACCOUNT_NUMBER',
  'BANK_TRANSFER_HOLDER_NAME',
  'BANK_TRANSFER_DEADLINE_HOURS',
] as const;

const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
  process.env.BANK_TRANSFER_BANK_NAME = '테스트은행';
  process.env.BANK_TRANSFER_ACCOUNT_NUMBER = '123-456';
  process.env.BANK_TRANSFER_HOLDER_NAME = '테스트예금주';
  process.env.BANK_TRANSFER_DEADLINE_HOURS = '24';
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
  process.env = originalEnv;
});

describe('order metadata helpers', () => {
  it('normalizes unknown metadata and detects locale/payment provider', () => {
    expect(asOrderMetadataRecord(null)).toEqual({});
    expect(asOrderMetadataRecord(['bad'])).toEqual({});
    expect(getBuyerLocaleFromOrderMetadata({ locale: 'en' })).toBe('en');
    expect(getBuyerLocaleFromOrderMetadata({ locale: 'ko' })).toBe('ko');
    expect(getBuyerLocaleFromOrderMetadata({ locale: 'ja' })).toBe('ko');
    expect(isManualBankTransferMetadata({ payment_provider: 'manual_bank_transfer' })).toBe(true);
    expect(isManualBankTransferMetadata({ payment_provider: 'domestic' })).toBe(false);
  });
});

describe('buildBankTransferDisplay', () => {
  it('prefers metadata bank transfer fields when present', () => {
    expect(
      buildBankTransferDisplay(
        {
          locale: 'ko',
          bank_transfer: {
            bankName: '메타은행',
            accountNumber: '999-999',
            holderName: '메타예금주',
            dueDate: '2026년 6월 24일 10:00까지',
          },
        },
        '2026-06-23T00:00:00.000Z'
      )
    ).toEqual({
      bankName: '메타은행',
      accountNumber: '999-999',
      holderName: '메타예금주',
      dueDate: '2026년 6월 24일 10:00까지',
    });
  });

  it('falls back to configured account values and computed due date', () => {
    const display = buildBankTransferDisplay(
      { locale: 'en', payment_provider: 'manual_bank_transfer' },
      '2026-06-23T00:00:00.000Z'
    );

    expect(display.bankName).toBe('테스트은행');
    expect(display.accountNumber).toBe('123-456');
    expect(display.holderName).toBe('테스트예금주');
    expect(display.dueDate).toMatch(/2026/);
  });
});
```

- [ ] **Step 2: RED 확인**

Run:

```bash
npm test -- --runInBand __tests__/lib/commerce/bank-transfer.test.ts
```

Expected: FAIL with module not found for `@/lib/commerce/checkout/bank-transfer`.

- [ ] **Step 3: minimal implementation 작성**

Create `lib/commerce/order-metadata.ts`:

```ts
export type CommerceLocale = 'ko' | 'en';

export function asOrderMetadataRecord(metadata: unknown): Record<string, unknown> {
  return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
}

export function getBuyerLocaleFromOrderMetadata(metadata: unknown): CommerceLocale {
  return asOrderMetadataRecord(metadata).locale === 'en' ? 'en' : 'ko';
}

export function isManualBankTransferMetadata(metadata: unknown): boolean {
  return asOrderMetadataRecord(metadata).payment_provider === 'manual_bank_transfer';
}
```

Create `lib/commerce/checkout/bank-transfer.ts`:

```ts
import { formatBankTransferDueDate, getBankTransferInfo } from '@/lib/payments/bank-transfer-info';
import {
  asOrderMetadataRecord,
  getBuyerLocaleFromOrderMetadata,
} from '@/lib/commerce/order-metadata';

export type BankTransferDisplay = {
  bankName: string;
  accountNumber: string;
  holderName: string;
  dueDate: string;
};

export function buildBankTransferDisplay(
  metadata: unknown,
  createdAt: string | null | undefined
): BankTransferDisplay {
  const meta = asOrderMetadataRecord(metadata);
  const bankTransfer =
    meta.bank_transfer &&
    typeof meta.bank_transfer === 'object' &&
    !Array.isArray(meta.bank_transfer)
      ? (meta.bank_transfer as Record<string, unknown>)
      : {};
  const fallback = getBankTransferInfo();
  const baseTime = createdAt ? new Date(createdAt).getTime() : NaN;
  const base = Number.isFinite(baseTime) ? baseTime : Date.now();
  const fallbackDueDate = formatBankTransferDueDate(
    new Date(base + fallback.deadlineHours * 60 * 60 * 1000),
    getBuyerLocaleFromOrderMetadata(metadata)
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
    dueDate:
      typeof bankTransfer.dueDate === 'string' && bankTransfer.dueDate.trim()
        ? bankTransfer.dueDate
        : fallbackDueDate,
  };
}
```

- [ ] **Step 4: GREEN 확인**

Run:

```bash
npm test -- --runInBand __tests__/lib/commerce/bank-transfer.test.ts
```

Expected: PASS.

---

### Task 3: checkout action adapter가 commerce util을 사용하게 전환

**Files:**

- Modify: `app/actions/checkout.ts`
- Modify Test: `__tests__/actions/checkout.test.ts`

**Interfaces:**

- Consumes: Task 1 `checkout-session.ts`
- Consumes: Task 2 `order-metadata.ts`, `bank-transfer.ts`
- Produces: 기존 exported action/type 이름을 유지한다.
- Produces: cookie value, token hash, bank transfer landing result가 기존과 동일하다.

- [ ] **Step 1: source contract RED test 추가**

Append to `__tests__/actions/checkout.test.ts`:

```ts
describe('checkout commerce util wiring', () => {
  it('uses shared checkout-session and bank-transfer helpers instead of local duplicates', () => {
    const src = readSource('app/actions/checkout.ts');

    expect(src).toContain('@/lib/commerce/checkout/checkout-session');
    expect(src).toContain('@/lib/commerce/checkout/bank-transfer');
    expect(src).toContain('@/lib/commerce/order-metadata');
    expect(src).not.toContain('function hashCheckoutToken(token: string)');
    expect(src).not.toContain('function buildBankTransferDisplay(');
  });
});
```

- [ ] **Step 2: RED 확인**

Run:

```bash
npm test -- --runInBand __tests__/actions/checkout.test.ts -t "checkout commerce util wiring"
```

Expected: FAIL because helpers are still local.

- [ ] **Step 3: checkout.ts import 변경**

Modify imports in `app/actions/checkout.ts`:

```ts
import { after } from 'next/server';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/auth/server';
import { getClientIp } from '@/lib/security/get-client-ip';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';
import { parsePrice } from '@/lib/parsePrice';
import { formatBankTransferDueDate, getBankTransferInfo } from '@/lib/payments/bank-transfer-info';
import {
  calculateShippingFee,
  getTossAuthHeader,
  getTossConfig,
  type PaymentProvider,
} from '@/lib/integrations/toss/config';
import {
  CHECKOUT_COOKIE_MAX_AGE_SECONDS,
  CHECKOUT_TOKEN_HASH_KEY,
  checkoutCookieName,
  decodeCheckoutCookie,
  encodeCheckoutCookie,
  generateCheckoutToken,
  getCheckoutTokenHash,
  hashCheckoutToken,
  isCheckoutTokenValid,
  latestCheckoutCookieName,
  type CheckoutCookiePayload,
} from '@/lib/commerce/checkout/checkout-session';
import {
  buildBankTransferDisplay,
  type BankTransferDisplay,
} from '@/lib/commerce/checkout/bank-transfer';
import {
  asOrderMetadataRecord,
  getBuyerLocaleFromOrderMetadata,
  isManualBankTransferMetadata,
} from '@/lib/commerce/order-metadata';
```

Then remove local definitions from `app/actions/checkout.ts`:

- `const CHECKOUT_TOKEN_BYTES = 32;`
- `const CHECKOUT_TOKEN_HASH_KEY = 'checkout_token_hash';`
- `const CHECKOUT_COOKIE_MAX_AGE_SECONDS = 60 * 60;`
- local `type CheckoutCookiePayload`
- local `type BankTransferDisplay`
- local `generateCheckoutToken`
- local `hashCheckoutToken`
- local `getCheckoutTokenHash`
- local `isCheckoutTokenValid`
- local `asMetadataRecord`
- local `getBuyerLocaleFromMetadata`
- local `isManualBankTransferMetadata`
- local `buildBankTransferDisplay`
- local `checkoutCookieName`
- local `latestCheckoutCookieName`
- local `encodeCheckoutCookie`
- local `decodeCheckoutCookie`

- [ ] **Step 4: callsite 이름 조정**

Replace:

```ts
asMetadataRecord(
```

with:

```ts
asOrderMetadataRecord(
```

Replace:

```ts
getBuyerLocaleFromMetadata(
```

with:

```ts
getBuyerLocaleFromOrderMetadata(
```

Keep existing calls to `isManualBankTransferMetadata`, `buildBankTransferDisplay`, `hashCheckoutToken`, `isCheckoutTokenValid`, `checkoutCookieName`, `decodeCheckoutCookie` unchanged because the shared util exports the same names.

- [ ] **Step 5: GREEN 확인**

Run:

```bash
npm test -- --runInBand __tests__/actions/checkout.test.ts -t "checkout commerce util wiring"
```

Expected: PASS.

Run broader checkout tests:

```bash
npm test -- --runInBand __tests__/actions/checkout.test.ts
```

Expected: PASS.

---

### Task 4: Toss confirm route가 shared checkout-session util을 사용하게 전환

**Files:**

- Modify: `app/api/payments/toss/confirm/route.ts`
- Modify Test: `__tests__/app/checkout-success-analytics.test.ts`
- Run Test: `__tests__/app/toss-confirm-payment-record-failure.test.ts`
- Run Test: `__tests__/app/toss-confirm-virtual-account-reservation.test.ts`

**Interfaces:**

- Consumes: Task 1 `checkout-session.ts`
- Produces: confirm route token 검증 방식과 cookie fallback 결과가 기존과 동일하다.

- [ ] **Step 1: source contract RED test 수정**

Modify `__tests__/app/checkout-success-analytics.test.ts` so the first test expects shared util wiring:

```ts
it('confirm route reads checkout token from request body or shared cookie helper before validating metadata', () => {
  const src = readFileSync('app/api/payments/toss/confirm/route.ts', 'utf8');

  expect(src).toContain('@/lib/commerce/checkout/checkout-session');
  expect(src).toContain('decodeCheckoutCookie');
  expect(src).toContain('isCheckoutTokenValid(order.metadata, resolvedCheckoutToken)');
  expect(src).not.toContain('function hashCheckoutToken(token: string)');
});
```

- [ ] **Step 2: RED 확인**

Run:

```bash
npm test -- --runInBand __tests__/app/checkout-success-analytics.test.ts
```

Expected: FAIL because confirm route still imports `crypto` and defines local helpers.

- [ ] **Step 3: route import 변경**

Modify imports in `app/api/payments/toss/confirm/route.ts`:

```ts
import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
```

Remove:

```ts
import crypto from 'crypto';
```

Add:

```ts
import {
  checkoutCookieName,
  decodeCheckoutCookie,
  isCheckoutTokenValid,
} from '@/lib/commerce/checkout/checkout-session';
```

Remove local definitions:

- `const CHECKOUT_TOKEN_HASH_KEY = 'checkout_token_hash';`
- `function hashCheckoutToken(...)`
- `function checkoutCookieName(...)`
- `function decodeCheckoutCookie(...)`
- `function getCheckoutTokenHash(...)`
- `function isCheckoutTokenValid(...)`

- [ ] **Step 4: GREEN 확인**

Run:

```bash
npm test -- --runInBand __tests__/app/checkout-success-analytics.test.ts
npm test -- --runInBand __tests__/app/toss-confirm-payment-record-failure.test.ts
npm test -- --runInBand __tests__/app/toss-confirm-virtual-account-reservation.test.ts
```

Expected: PASS.

---

### Task 5: Phase 1 verification and handoff

**Files:**

- Modify: `docs/superpowers/plans/2026-06-23-saf-refactor-phase-1-commerce-foundation.md`
- Optional Modify: `walkthrough.md` only after implementation is actually complete.

**Interfaces:**

- Consumes: Tasks 1-4.
- Produces: verified Phase 1 foundation ready for Phase 2 `markOrderPaid()` design implementation.

- [ ] **Step 1: type-check 실행**

Run:

```bash
npm run type-check
```

Expected: exit 0.

- [ ] **Step 2: targeted test suite 실행**

Run:

```bash
npm test -- --runInBand \
  __tests__/lib/commerce/checkout-session.test.ts \
  __tests__/lib/commerce/bank-transfer.test.ts \
  __tests__/actions/checkout.test.ts \
  __tests__/app/checkout-success-analytics.test.ts \
  __tests__/app/toss-confirm-payment-record-failure.test.ts \
  __tests__/app/toss-confirm-virtual-account-reservation.test.ts
```

Expected: PASS.

- [ ] **Step 3: lint 실행**

Run:

```bash
npm run lint
```

Expected: exit 0.

- [ ] **Step 4: diff audit**

Run:

```bash
git status --short
git diff --stat
git diff --check
```

Expected:

- No whitespace errors.
- Existing dirty `content/changelog.json`, `lib/site-stats.ts` are still not staged or modified by this Phase unless they were dirty before.
- Phase 1 changes are limited to commerce util files, checkout action, confirm route, tests, and plan/spec docs.

- [ ] **Step 5: Phase 2 readiness note**

If all checks pass, update this plan or `walkthrough.md` with:

```md
Phase 1 완료:

- checkout token/session util 추출 완료
- order metadata/bank-transfer display util 추출 완료
- checkout action과 Toss confirm route가 shared util 사용
- 검증: npm run type-check, targeted Jest, npm run lint

다음 단계:

- `lib/commerce/payment-lifecycle/mark-order-paid.ts` 도입
- reconcile route의 결제 완료 처리부터 shared lifecycle로 이전
```
