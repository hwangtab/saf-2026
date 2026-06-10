# SMS PR-1 (English Body + Log Viewer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship PR-1 of the SMS expansion: English (`en`) bodies for the 7 transactional buyer SMS types, plus a new `/admin/sms` log viewer with filters, pagination, and a gated resend action.

**Architecture:** Phase 1 extends `buildSmsText` with a `locale` parameter and removes the internal `en` skip in `sendBuyerSms`, so existing call sites that already pass `locale` activate English delivery with zero call-site changes. Phase 2 adds a server action module (`app/actions/admin-sms.ts`) that paginates `sms_logs` (mirroring the `getBroadcasts` `{ rows, total, page, pageSize }` shape so `EmailPagination` is reusable) and a `resendSms` action that re-reads the order, rebuilds `BuyerSmsData`, and calls `sendBuyerSms`. A new server page (`/admin/sms/page.tsx`) renders a client `SmsLogList` (filter bar + table + pagination + `AdminConfirmModal`-gated resend). The admin nav registers the page in the "도구" group for both ko/en locales.

**Tech Stack:** Next.js 16 App Router (Server Components + Server Actions), TypeScript strict, Supabase (`sms_logs`, `orders` tables via `createSupabaseAdminClient`), Solapi (`sendSolapiSms`), Jest (`npm test`), Tailwind brand tokens, existing admin UI primitives (`admin-ui.tsx`, `AdminConfirmModal`, `EmailPagination`).

**No DB migration in PR-1.** The `sms_logs` table already exists (`supabase/migrations/20260602120000_create_sms_logs.sql`) with columns `id, order_no, to_phone, type, provider, provider_message_id, status, segment, error, created_at` (confirmed in `types/supabase.ts` L1725–1763). No schema change, no `types/supabase.ts` regeneration needed.

---

## Task 1 — `buildSmsText` locale param + 7 English bodies

Add a `locale` parameter (defaulting to `'ko'`) to `buildSmsText` and branch all 7 transactional bodies into ko/en. ko prefix stays `[씨앗페]`; en prefix is `[Seed Art Festival]`. The `won()` currency helper stays `₩...` for both locales (KRW transactions). Existing ko bodies and existing tests must keep passing unchanged because the new param defaults to `'ko'`.

**Files:**

- Modify: `/Users/hwang-gyeongha/saf-2026/lib/sms/buyer-sms.ts` (L26–54 — `buildSmsText`)
- Modify: `/Users/hwang-gyeongha/saf-2026/__tests__/lib/sms/buyer-sms.test.ts` (append en cases to the `describe('buildSmsText')` block)

### Steps

- [ ] **1.1 Write failing test for en bodies.** Append the following `it` block inside the existing `describe('buildSmsText', () => { ... })` block in `/Users/hwang-gyeongha/saf-2026/__tests__/lib/sms/buyer-sms.test.ts`, immediately after the existing `it('refunded·delivered·deposit_confirmed·auto_cancelled 본문', ...)` test (which ends at L74) and before the closing `});` of the describe (L75):

```ts
it('en payment_confirmed: 영문 본문 + [Seed Art Festival] 접두어', () => {
  const t = buildSmsText(
    'payment_confirmed',
    { buyerName: 'Jane', artworkTitle: 'Wildflowers', amount: 1500000 },
    'en'
  );
  expect(t).toBe(
    "[Seed Art Festival] Jane, your payment (₩1,500,000) for 'Wildflowers' is complete. Thank you."
  );
});

it('en virtual_account_issued: 은행·계좌·금액·기한 (이름 없음)', () => {
  const t = buildSmsText(
    'virtual_account_issued',
    {
      buyerName: '',
      artworkTitle: '',
      amount: 50000,
      virtualAccount: { bankName: 'IBK', accountNumber: '01012345678', dueDate: '6/5 23:59' },
    },
    'en'
  );
  expect(t).toBe('[Seed Art Festival] Deposit: IBK 01012345678 / ₩50,000 (due 6/5 23:59)');
});

it('en virtual_account_issued: 이름이 있으면 인사말 포함', () => {
  const t = buildSmsText(
    'virtual_account_issued',
    {
      buyerName: 'Jane',
      artworkTitle: '',
      amount: 50000,
      virtualAccount: { bankName: 'IBK', accountNumber: '01012345678', dueDate: '6/5 23:59' },
    },
    'en'
  );
  expect(t).toBe('[Seed Art Festival] Jane, Deposit: IBK 01012345678 / ₩50,000 (due 6/5 23:59)');
});

it('en deposit_confirmed', () => {
  expect(
    buildSmsText('deposit_confirmed', { buyerName: 'Jane', artworkTitle: '', amount: 0 }, 'en')
  ).toBe("[Seed Art Festival] Jane, your deposit is confirmed. We're preparing your artwork.");
});

it('en shipped: 작품명·택배사·운송장', () => {
  const t = buildSmsText(
    'shipped',
    {
      buyerName: '',
      artworkTitle: 'Wildflowers',
      amount: 0,
      carrier: 'CJ Logistics',
      trackingNumber: '123456789',
    },
    'en'
  );
  expect(t).toBe("[Seed Art Festival] 'Wildflowers' has shipped. CJ Logistics 123456789");
});

it('en delivered·refunded·auto_cancelled 본문', () => {
  expect(
    buildSmsText('delivered', { buyerName: '', artworkTitle: 'Wildflowers', amount: 0 }, 'en')
  ).toBe("[Seed Art Festival] 'Wildflowers' has been delivered.");
  expect(buildSmsText('refunded', { buyerName: '', artworkTitle: '', amount: 50000 }, 'en')).toBe(
    '[Seed Art Festival] Your refund of ₩50,000 has been processed.'
  );
  expect(buildSmsText('auto_cancelled', { buyerName: '', artworkTitle: '', amount: 0 }, 'en')).toBe(
    '[Seed Art Festival] Your order has been automatically cancelled.'
  );
});
```

- [ ] **1.2 Run the test — expect FAIL.** `buildSmsText` currently takes only 2 args and always returns ko, so en assertions fail (TS will also complain about the extra `'en'` arg until 1.3 lands; run anyway to capture the failing baseline).

```bash
npm test -- __tests__/lib/sms/buyer-sms.test.ts
```

Expected: the new `en ...` tests FAIL (received ko `[씨앗페]` strings, not en `[Seed Art Festival]` strings). Existing ko tests still pass.

- [ ] **1.3 Implement the locale branch.** Replace the entire `buildSmsText` function (L26–54 of `/Users/hwang-gyeongha/saf-2026/lib/sms/buyer-sms.ts`) with the version below. The ko branch is byte-for-byte identical to the current code (so existing tests pass); the en branch is added. The `won()` helper at L23 is unchanged and reused for both locales.

Replace this current block:

```ts
/** 타입별 정보성 SMS 본문. 모든 본문에 [씨앗페] 접두어. */
export function buildSmsText(type: BuyerSmsType, data: BuyerSmsData): string {
  switch (type) {
    case 'payment_confirmed':
      return `[씨앗페] ${data.buyerName}님, '${data.artworkTitle}' 결제(${won(data.amount)})가 완료되었습니다. 감사합니다.`;
    case 'virtual_account_issued': {
      const va = data.virtualAccount ?? {};
      const due = va.dueDate ? ` / 기한 ${va.dueDate}` : '';
      const greeting = data.buyerName ? `${data.buyerName}님, ` : '';
      return `[씨앗페] ${greeting}입금안내: ${va.bankName ?? ''} ${va.accountNumber ?? ''} / ${won(data.amount)}${due}`;
    }
    case 'deposit_confirmed':
      return `[씨앗페] ${data.buyerName}님, 입금이 확인되었습니다. 작품을 준비합니다.`;
    case 'shipped': {
      const carrier = data.carrier ? ` ${data.carrier}` : '';
      const tracking = data.trackingNumber ? ` ${data.trackingNumber}` : '';
      return `[씨앗페] '${data.artworkTitle}' 발송완료.${carrier}${tracking}`;
    }
    case 'delivered':
      return `[씨앗페] '${data.artworkTitle}' 배송이 완료되었습니다.`;
    case 'refunded':
      return `[씨앗페] ${won(data.amount)} 환불이 처리되었습니다.`;
    case 'auto_cancelled':
      return `[씨앗페] 주문이 자동취소되었습니다.`;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}
```

with this:

```ts
/**
 * 타입별 정보성 SMS 본문.
 * - ko: [씨앗페] 접두어. en: [Seed Art Festival] 접두어.
 * - 금액은 원화 거래이므로 두 locale 모두 ₩ 유지.
 */
export function buildSmsText(
  type: BuyerSmsType,
  data: BuyerSmsData,
  locale: 'ko' | 'en' = 'ko'
): string {
  if (locale === 'en') return buildSmsTextEn(type, data);
  switch (type) {
    case 'payment_confirmed':
      return `[씨앗페] ${data.buyerName}님, '${data.artworkTitle}' 결제(${won(data.amount)})가 완료되었습니다. 감사합니다.`;
    case 'virtual_account_issued': {
      const va = data.virtualAccount ?? {};
      const due = va.dueDate ? ` / 기한 ${va.dueDate}` : '';
      const greeting = data.buyerName ? `${data.buyerName}님, ` : '';
      return `[씨앗페] ${greeting}입금안내: ${va.bankName ?? ''} ${va.accountNumber ?? ''} / ${won(data.amount)}${due}`;
    }
    case 'deposit_confirmed':
      return `[씨앗페] ${data.buyerName}님, 입금이 확인되었습니다. 작품을 준비합니다.`;
    case 'shipped': {
      const carrier = data.carrier ? ` ${data.carrier}` : '';
      const tracking = data.trackingNumber ? ` ${data.trackingNumber}` : '';
      return `[씨앗페] '${data.artworkTitle}' 발송완료.${carrier}${tracking}`;
    }
    case 'delivered':
      return `[씨앗페] '${data.artworkTitle}' 배송이 완료되었습니다.`;
    case 'refunded':
      return `[씨앗페] ${won(data.amount)} 환불이 처리되었습니다.`;
    case 'auto_cancelled':
      return `[씨앗페] 주문이 자동취소되었습니다.`;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

/** 영문 트랜잭션 SMS 본문. 접두어 [Seed Art Festival], 금액은 ₩ 유지. */
function buildSmsTextEn(type: BuyerSmsType, data: BuyerSmsData): string {
  switch (type) {
    case 'payment_confirmed':
      return `[Seed Art Festival] ${data.buyerName}, your payment (${won(data.amount)}) for '${data.artworkTitle}' is complete. Thank you.`;
    case 'virtual_account_issued': {
      const va = data.virtualAccount ?? {};
      const due = va.dueDate ? ` (due ${va.dueDate})` : '';
      const greeting = data.buyerName ? `${data.buyerName}, ` : '';
      return `[Seed Art Festival] ${greeting}Deposit: ${va.bankName ?? ''} ${va.accountNumber ?? ''} / ${won(data.amount)}${due}`;
    }
    case 'deposit_confirmed':
      return `[Seed Art Festival] ${data.buyerName}, your deposit is confirmed. We're preparing your artwork.`;
    case 'shipped': {
      const carrier = data.carrier ? ` ${data.carrier}` : '';
      const tracking = data.trackingNumber ? ` ${data.trackingNumber}` : '';
      return `[Seed Art Festival] '${data.artworkTitle}' has shipped.${carrier}${tracking}`;
    }
    case 'delivered':
      return `[Seed Art Festival] '${data.artworkTitle}' has been delivered.`;
    case 'refunded':
      return `[Seed Art Festival] Your refund of ${won(data.amount)} has been processed.`;
    case 'auto_cancelled':
      return `[Seed Art Festival] Your order has been automatically cancelled.`;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}
```

> NOTE on the `virtual_account_issued` en greeting: when `buyerName` is non-empty the en body is `[Seed Art Festival] Jane, Deposit: ...`; when empty it is `[Seed Art Festival] Deposit: ...` (no leading comma). This matches the two en assertions in 1.1 exactly.

- [ ] **1.4 Run the test — expect PASS.**

```bash
npm test -- __tests__/lib/sms/buyer-sms.test.ts
```

Expected: all `buildSmsText` tests (ko + en) PASS. (The `sendBuyerSms` `describe` block still has the old `en locale은 스킵` test passing for now — that flips in Task 2.)

- [ ] **1.5 Commit.**

```bash
git add lib/sms/buyer-sms.ts __tests__/lib/sms/buyer-sms.test.ts
git commit -m "feat(sms): add en locale param + 7 English bodies to buildSmsText

요약: 구매자 트랜잭션 SMS 7종에 영문 본문 추가 (buildSmsText locale 파라미터)

- buildSmsText(type, data, locale?) — locale 기본값 'ko'
- en 접두어 [Seed Art Festival], 금액은 ₩ 유지 (원화 거래)
- ko 본문/기존 테스트 불변 (locale 기본값으로 하위호환)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2 — Remove the `en` skip in `sendBuyerSms`

Remove the early `if (locale === 'en') return;` (L69) so en+010 buyers receive English SMS via `buildSmsText(type, data, locale)`. Non-010 numbers and missing numbers still skip (via `normalizeKoreanMobile` returning `null`). Pass `locale` through to `buildSmsText`. The signature is unchanged (`sendBuyerSms(phone, type, data, locale='ko', orderNo?)`), so all 13 call sites are unaffected.

**Files:**

- Modify: `/Users/hwang-gyeongha/saf-2026/lib/sms/buyer-sms.ts` (L67–74 — body of `sendBuyerSms`)
- Modify: `/Users/hwang-gyeongha/saf-2026/__tests__/lib/sms/buyer-sms.test.ts` (replace the `en locale은 스킵` test with new en-sends behavior; the non-010 skip test stays)

### Steps

- [ ] **2.1 Rewrite the failing test for the new en behavior.** In `/Users/hwang-gyeongha/saf-2026/__tests__/lib/sms/buyer-sms.test.ts`, **replace** the existing test (L80–88):

```ts
it('en locale은 스킵 (발송·로그 없음)', async () => {
  await sendBuyerSms(
    '01012345678',
    'payment_confirmed',
    { buyerName: 'A', artworkTitle: 'B', amount: 1 },
    'en'
  );
  expect(mockSend).not.toHaveBeenCalled();
});
```

with these two tests:

```ts
it('en+010 번호는 영문 본문으로 발송하고 sms_logs에 기록', async () => {
  const { client, insert } = fakeAdminClient();
  mockAdmin.mockReturnValue(client as unknown as ReturnType<typeof createSupabaseAdminClient>);
  mockSend.mockResolvedValue({ ok: true, messageId: 'M-EN', segment: 'SMS' });

  await sendBuyerSms(
    '010-1234-5678',
    'payment_confirmed',
    { buyerName: 'Jane', artworkTitle: 'Wildflowers', amount: 1500000 },
    'en',
    'SAF-EN-1'
  );

  expect(mockSend).toHaveBeenCalledWith({
    to: '01012345678',
    text: expect.stringContaining('[Seed Art Festival]'),
  });
  expect(insert).toHaveBeenCalledWith(
    expect.objectContaining({
      order_no: 'SAF-EN-1',
      to_phone: '01012345678',
      type: 'payment_confirmed',
      status: 'sent',
      provider_message_id: 'M-EN',
      segment: 'SMS',
    })
  );
});

it('en+비-010 번호는 여전히 스킵 (국제 발송 범위 밖)', async () => {
  await sendBuyerSms(
    '02-123-4567',
    'payment_confirmed',
    { buyerName: 'A', artworkTitle: 'B', amount: 1 },
    'en'
  );
  expect(mockSend).not.toHaveBeenCalled();
});
```

- [ ] **2.2 Run the test — expect FAIL.**

```bash
npm test -- __tests__/lib/sms/buyer-sms.test.ts
```

Expected: `en+010 번호는 영문 본문으로 발송...` FAILS — `mockSend` is not called because `sendBuyerSms` still returns early at L69 for `locale === 'en'`. (The `en+비-010` test passes already.)

- [ ] **2.3 Implement: remove the skip and thread locale into `buildSmsText`.** In `/Users/hwang-gyeongha/saf-2026/lib/sms/buyer-sms.ts`, change the `try` block body. Replace these lines (currently L68–74):

```ts
  try {
    if (locale === 'en') return; // 1차는 한국어 본문만
    const to = normalizeKoreanMobile(phone);
    if (!to) return;

    const text = buildSmsText(type, data);
    const result = await sendSolapiSms({ to, text });
```

with:

```ts
  try {
    const to = normalizeKoreanMobile(phone);
    if (!to) return;

    const text = buildSmsText(type, data, locale);
    const result = await sendSolapiSms({ to, text });
```

Also update the JSDoc above `sendBuyerSms` (currently L56–60) so it no longer claims en is skipped. Replace:

```ts
/**
 * 구매자 트랜잭션 SMS를 한국 휴대폰으로 발송하고 sms_logs에 기록한다.
 * - en locale·비-KR 번호·전화번호 없음 → 조용히 스킵 (이메일은 별도로 발송됨)
 * - never throw — 결제/웹훅 플로우를 막지 않음
 */
```

with:

```ts
/**
 * 구매자 트랜잭션 SMS를 한국 휴대폰으로 발송하고 sms_logs에 기록한다.
 * - locale(ko/en)에 맞는 본문으로 발송. 비-KR 번호·전화번호 없음 → 조용히 스킵.
 * - 국제(비-010) 발송은 범위 밖 — normalizeKoreanMobile가 null 반환 시 스킵.
 * - never throw — 결제/웹훅 플로우를 막지 않음
 */
```

- [ ] **2.4 Run the test — expect PASS.**

```bash
npm test -- __tests__/lib/sms/buyer-sms.test.ts
```

Expected: all `buildSmsText` and `sendBuyerSms` tests PASS, including the new en-sends and en+non-010-skip cases.

- [ ] **2.5 Type-check** to confirm the unchanged signature still satisfies all 13 call sites.

```bash
npm run type-check
```

Expected: no errors.

- [ ] **2.6 Commit.**

```bash
git add lib/sms/buyer-sms.ts __tests__/lib/sms/buyer-sms.test.ts
git commit -m "feat(sms): deliver English SMS to en buyers with KR mobile numbers

요약: en locale 구매자(국내 010 번호)에게 영문 트랜잭션 SMS 발송 활성화

- sendBuyerSms의 en 내부 스킵 제거 → buildSmsText(type, data, locale)로 발송
- 비-010 번호는 여전히 스킵 (normalizeKoreanMobile null → 국제 발송 범위 밖)
- 시그니처 불변 — 13개 호출부 수정 불필요

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 — `getSmsLogs` server action (paginated)

Create `app/actions/admin-sms.ts` with `getSmsLogs`, returning the same `{ rows, total, page, pageSize }` shape as `getBroadcasts` (so `EmailPagination` is reusable). Filters: `type`, `status`, `from`/`to` (created_at date range), `q` (matches `to_phone` OR `order_no`). Page-size normalization mirrors `admin-broadcast.ts` (default 25, max 100). This task only adds `getSmsLogs`; `resendSms` lands in Task 4.

**Files:**

- Create: `/Users/hwang-gyeongha/saf-2026/app/actions/admin-sms.ts`
- Create: `/Users/hwang-gyeongha/saf-2026/__tests__/app/actions/admin-sms.test.ts`

### Steps

- [ ] **3.1 Write the failing test.** Create `/Users/hwang-gyeongha/saf-2026/__tests__/app/actions/admin-sms.test.ts` with:

```ts
import { getSmsLogs } from '@/app/actions/admin-sms';
import { createSupabaseQueryMock } from '@/lib/test-utils/email-audience-mock';

const mockFrom = jest.fn();

jest.mock('@/lib/auth/guards', () => ({
  requireAdmin: jest.fn(async () => ({ id: 'admin-1' })),
  requireAdminClient: jest.fn(async () => ({ from: mockFrom })),
}));
jest.mock('@/app/actions/activity-log-writer', () => ({
  logAdminAction: jest.fn(async () => {}),
}));

describe('getSmsLogs', () => {
  beforeEach(() => jest.clearAllMocks());

  it('기본 페이지네이션 반환형 { rows, total, page, pageSize }', async () => {
    const rows = [
      {
        id: 'log-1',
        order_no: 'SAF-1',
        to_phone: '01012345678',
        type: 'payment_confirmed',
        provider: 'solapi',
        provider_message_id: 'M1',
        status: 'sent',
        segment: 'SMS',
        error: null,
        created_at: '2026-06-10T00:00:00.000Z',
      },
    ];
    mockFrom.mockReturnValue(createSupabaseQueryMock({ data: rows, error: null, count: 1 }));

    const result = await getSmsLogs({});

    expect(mockFrom).toHaveBeenCalledWith('sms_logs');
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].id).toBe('log-1');
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(25);
  });

  it('type/status 필터와 q 검색을 query builder에 적용한다', async () => {
    const query = createSupabaseQueryMock({ data: [], error: null, count: 0 });
    mockFrom.mockReturnValue(query);

    await getSmsLogs({
      type: 'shipped',
      status: 'failed',
      q: '01099998888',
      page: 2,
      pageSize: 50,
    });

    // Proxy mock: chain 메서드는 호출 기록을 남긴다.
    const q = query as unknown as Record<string, jest.Mock>;
    expect(q.eq).toHaveBeenCalledWith('type', 'shipped');
    expect(q.eq).toHaveBeenCalledWith('status', 'failed');
    expect(q.or).toHaveBeenCalledWith('to_phone.ilike.%01099998888%,order_no.ilike.%01099998888%');
    // page 2 · pageSize 50 → range(50, 99)
    expect(q.range).toHaveBeenCalledWith(50, 99);
  });

  it('from/to 기간 필터를 created_at에 적용한다', async () => {
    const query = createSupabaseQueryMock({ data: [], error: null, count: 0 });
    mockFrom.mockReturnValue(query);

    await getSmsLogs({ from: '2026-06-01', to: '2026-06-10' });

    const q = query as unknown as Record<string, jest.Mock>;
    expect(q.gte).toHaveBeenCalledWith('created_at', '2026-06-01T00:00:00.000Z');
    // to는 그 날의 끝(23:59:59.999)까지 포함
    expect(q.lte).toHaveBeenCalledWith('created_at', '2026-06-10T23:59:59.999Z');
  });
});
```

> NOTE: `createSupabaseQueryMock` currently types its argument as `{ data, error }` but the Proxy ignores extra keys; passing `count` is fine at runtime. To keep TS strict happy in the test, the `count` field is read by the action via the awaited result, and the mock's Proxy returns the whole `result` object on `await`. The action reads `count` off that object (see 3.2). If TS complains about `count` not being on `QueryResult`, cast the argument: `createSupabaseQueryMock({ data: rows, error: null, count: 1 } as unknown as { data: typeof rows; error: null })`.

- [ ] **3.2 Run the test — expect FAIL.**

```bash
npm test -- __tests__/app/actions/admin-sms.test.ts
```

Expected: FAIL with `Cannot find module '@/app/actions/admin-sms'` — the file doesn't exist yet.

- [ ] **3.3 Implement `getSmsLogs`.** Create `/Users/hwang-gyeongha/saf-2026/app/actions/admin-sms.ts` with the content below. (This file will gain `resendSms` in Task 4; create it complete-as-of-now here.)

```ts
'use server';

import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';

export type SmsLogRow = {
  id: string;
  order_no: string | null;
  to_phone: string;
  type: string;
  provider: string;
  provider_message_id: string | null;
  status: string;
  segment: string | null;
  error: string | null;
  created_at: string;
};

export type SmsLogsParams = {
  page?: number;
  pageSize?: number;
  type?: string;
  status?: string;
  from?: string;
  to?: string;
  q?: string;
};

export type SmsLogsResult = {
  rows: SmsLogRow[];
  total: number;
  page: number;
  pageSize: number;
};

const DEFAULT_SMS_PAGE_SIZE = 25;
const MAX_SMS_PAGE_SIZE = 100;

function normalizeSmsPageQuery(params: SmsLogsParams) {
  const page = Math.max(1, Math.floor(Number(params.page) || 1));
  const requested = Math.floor(Number(params.pageSize) || DEFAULT_SMS_PAGE_SIZE);
  const pageSize = Math.min(MAX_SMS_PAGE_SIZE, Math.max(1, requested));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { page, pageSize, from, to };
}

export async function getSmsLogs(params: SmsLogsParams = {}): Promise<SmsLogsResult> {
  await requireAdmin();

  const supabase = await requireAdminClient();
  const { page, pageSize, from, to } = normalizeSmsPageQuery(params);

  let query = supabase
    .from('sms_logs')
    .select(
      'id, order_no, to_phone, type, provider, provider_message_id, status, segment, error, created_at',
      { count: 'exact' }
    );

  if (params.type) query = query.eq('type', params.type);
  if (params.status) query = query.eq('status', params.status);
  if (params.from) query = query.gte('created_at', `${params.from}T00:00:00.000Z`);
  if (params.to) query = query.lte('created_at', `${params.to}T23:59:59.999Z`);
  if (params.q && params.q.trim()) {
    const term = params.q.trim().replace(/[%,]/g, '');
    query = query.or(`to_phone.ilike.%${term}%,order_no.ilike.%${term}%`);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('[get-sms-logs] error:', error);
    return { rows: [], total: 0, page, pageSize };
  }

  return {
    rows: (data ?? []) as SmsLogRow[],
    total: typeof count === 'number' ? count : (data?.length ?? 0),
    page,
    pageSize,
  };
}
```

> NOTE on `query.or(...)`: the term is stripped of `%` and `,` to prevent breaking the PostgREST `or` filter syntax. The test in 3.1 passes a clean numeric `01099998888`, so `or` is called with `to_phone.ilike.%01099998888%,order_no.ilike.%01099998888%`.

> NOTE on the chained `.eq()` reassignment: with the real Supabase client, `query = query.eq(...)` works because each builder method returns the builder. With `createSupabaseQueryMock`, each chain method returns the same proxy, so reassignment is a no-op that preserves the proxy — the test's `q.eq`/`q.or`/`q.range`/`q.gte`/`q.lte` assertions still see the calls.

- [ ] **3.4 Run the test — expect PASS.**

```bash
npm test -- __tests__/app/actions/admin-sms.test.ts
```

Expected: all three `getSmsLogs` tests PASS.

- [ ] **3.5 Commit.**

```bash
git add app/actions/admin-sms.ts __tests__/app/actions/admin-sms.test.ts
git commit -m "feat(admin): add getSmsLogs paginated server action

요약: sms_logs 조회용 getSmsLogs 서버 액션 추가 (필터·페이지네이션)

- 반환형 { rows, total, page, pageSize } — EmailPagination 재사용 위해 getBroadcasts와 동일
- 필터: type, status, 기간(from/to), q(전화번호·주문번호 ilike)
- 기본 페이지 25, 최대 100 (admin-broadcast 규칙 미러)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 — `resendSms` server action

Add `resendSms(logId)` to `app/actions/admin-sms.ts`. It re-reads the `sms_logs` row by `logId`, re-reads the linked `orders` row by `order_no` (joining `artworks(title)` for `artworkTitle`), rebuilds `BuyerSmsData`, calls `sendBuyerSms(order.buyer_phone, type, data, locale, order.order_no)`, and writes `logAdminAction('sms_resent', ...)`. Returns `{ ok, error? }`. Only the `error?` string is surfaced to the UI.

**Files:**

- Modify: `/Users/hwang-gyeongha/saf-2026/app/actions/admin-sms.ts` (append `resendSms`)
- Modify: `/Users/hwang-gyeongha/saf-2026/__tests__/app/actions/admin-sms.test.ts` (append `resendSms` describe block + mock `sendBuyerSms`)

### Steps

- [ ] **4.1 Write the failing test.** At the top of `/Users/hwang-gyeongha/saf-2026/__tests__/app/actions/admin-sms.test.ts`, add `resendSms` to the import and add a `sendBuyerSms` mock. Change the import line:

```ts
import { getSmsLogs } from '@/app/actions/admin-sms';
```

to:

```ts
import { getSmsLogs, resendSms } from '@/app/actions/admin-sms';
```

Add this mock alongside the existing `jest.mock` calls (after the `activity-log-writer` mock):

```ts
const mockSendBuyerSms = jest.fn(async () => {});
jest.mock('@/lib/sms/buyer-sms', () => ({
  sendBuyerSms: (...args: unknown[]) => mockSendBuyerSms(...args),
}));
```

Then append this `describe` block at the end of the file (after the `getSmsLogs` describe closes):

```ts
describe('resendSms', () => {
  beforeEach(() => jest.clearAllMocks());

  it('실패 로그를 order 재조회 후 sendBuyerSms로 재발송하고 활동 로그를 남긴다', async () => {
    const logRow = {
      id: 'log-9',
      order_no: 'SAF-9',
      to_phone: '01012345678',
      type: 'shipped',
      status: 'failed',
    };
    const orderRow = {
      order_no: 'SAF-9',
      buyer_name: 'Jane',
      buyer_phone: '01012345678',
      total_amount: 1500000,
      shipping_carrier: 'CJ Logistics',
      tracking_number: '123456789',
      metadata: { locale: 'en' },
      artworks: { title: 'Wildflowers' },
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'sms_logs')
        return createSupabaseQueryMock({ data: [logRow], error: null }) as never;
      if (table === 'orders')
        return createSupabaseQueryMock({ data: [orderRow], error: null }) as never;
      return createSupabaseQueryMock({ data: [], error: null }) as never;
    });

    const { logAdminAction } = jest.requireMock('@/app/actions/activity-log-writer') as {
      logAdminAction: jest.Mock;
    };

    const result = await resendSms('log-9');

    expect(result.ok).toBe(true);
    expect(mockSendBuyerSms).toHaveBeenCalledWith(
      '01012345678',
      'shipped',
      expect.objectContaining({
        buyerName: 'Jane',
        artworkTitle: 'Wildflowers',
        amount: 1500000,
        carrier: 'CJ Logistics',
        trackingNumber: '123456789',
      }),
      'en',
      'SAF-9'
    );
    expect(logAdminAction).toHaveBeenCalledWith(
      'sms_resent',
      'sms_log',
      'log-9',
      expect.objectContaining({ order_no: 'SAF-9', type: 'shipped' })
    );
  });

  it('로그를 찾지 못하면 ok:false', async () => {
    mockFrom.mockImplementation(() => createSupabaseQueryMock({ data: [], error: null }) as never);
    const result = await resendSms('missing');
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
    expect(mockSendBuyerSms).not.toHaveBeenCalled();
  });

  it('order_no가 없는 로그(개별 발송 등)는 재발송 불가 ok:false', async () => {
    const logRow = {
      id: 'log-x',
      order_no: null,
      to_phone: '01012345678',
      type: 'shipped',
      status: 'failed',
    };
    mockFrom.mockImplementation((table: string) => {
      if (table === 'sms_logs')
        return createSupabaseQueryMock({ data: [logRow], error: null }) as never;
      return createSupabaseQueryMock({ data: [], error: null }) as never;
    });
    const result = await resendSms('log-x');
    expect(result.ok).toBe(false);
    expect(mockSendBuyerSms).not.toHaveBeenCalled();
  });
});
```

> NOTE: `createSupabaseQueryMock` returns the same proxy for `.select().eq().maybeSingle()` etc., and is thenable. But `resendSms` reads a single row via `.maybeSingle()`, which resolves to `{ data, error }` where `data` is a single object, not an array. The Proxy mock resolves `await` to the whole `result` object (`{ data: [...], error: null }`). To make `.maybeSingle()` resolve to a single row, the action must call `.maybeSingle()` and read `data` — but the mock's `data` is an array. **Therefore the action reads the first element defensively** (see 4.2: `const log = Array.isArray(logData) ? logData[0] : logData;`). This keeps both the mock (array) and real client (single object) working.

- [ ] **4.2 Run the test — expect FAIL.**

```bash
npm test -- __tests__/app/actions/admin-sms.test.ts
```

Expected: FAIL — `resendSms` is not exported from `@/app/actions/admin-sms`.

- [ ] **4.3 Implement `resendSms`.** Append the following to `/Users/hwang-gyeongha/saf-2026/app/actions/admin-sms.ts`. Add the two imports at the top of the file (after the existing `requireAdmin` import):

```ts
import { logAdminAction } from '@/app/actions/activity-log-writer';
import { sendBuyerSms, type BuyerSmsType, type BuyerSmsData } from '@/lib/sms/buyer-sms';
```

Then append this function at the end of the file:

```ts
const RESENDABLE_TYPES = new Set<BuyerSmsType>([
  'payment_confirmed',
  'virtual_account_issued',
  'deposit_confirmed',
  'shipped',
  'delivered',
  'refunded',
  'auto_cancelled',
]);

function extractLocale(metadata: unknown): 'ko' | 'en' {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return 'ko';
  return (metadata as Record<string, unknown>).locale === 'en' ? 'en' : 'ko';
}

export async function resendSms(logId: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await requireAdminClient();

  const { data: logData, error: logError } = await supabase
    .from('sms_logs')
    .select('id, order_no, to_phone, type, status')
    .eq('id', logId)
    .maybeSingle();

  const log = Array.isArray(logData) ? logData[0] : logData;
  if (logError || !log) {
    return { ok: false, error: '발송 로그를 찾을 수 없습니다.' };
  }
  if (!log.order_no) {
    return { ok: false, error: '주문번호가 없는 로그는 재발송할 수 없습니다.' };
  }
  if (!RESENDABLE_TYPES.has(log.type as BuyerSmsType)) {
    return { ok: false, error: `재발송할 수 없는 유형입니다: ${log.type}` };
  }

  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .select(
      'order_no, buyer_name, buyer_phone, total_amount, shipping_carrier, tracking_number, metadata, artworks(title)'
    )
    .eq('order_no', log.order_no)
    .maybeSingle();

  const order = Array.isArray(orderData) ? orderData[0] : orderData;
  if (orderError || !order) {
    return { ok: false, error: '원본 주문을 찾을 수 없습니다.' };
  }

  const artwork = Array.isArray(order.artworks) ? order.artworks[0] : order.artworks;
  const type = log.type as BuyerSmsType;
  const locale = extractLocale(order.metadata);
  const data: BuyerSmsData = {
    buyerName: order.buyer_name ?? '',
    artworkTitle: (artwork?.title as string | undefined) ?? '',
    amount: order.total_amount ?? 0,
    carrier: order.shipping_carrier ?? undefined,
    trackingNumber: order.tracking_number ?? undefined,
  };

  try {
    await sendBuyerSms(order.buyer_phone, type, data, locale, order.order_no);
  } catch (err) {
    console.error('[resend-sms] send failed:', err);
    return { ok: false, error: '재발송 중 오류가 발생했습니다.' };
  }

  await logAdminAction('sms_resent', 'sms_log', logId, {
    order_no: log.order_no,
    type,
    to_phone: log.to_phone,
  });

  return { ok: true };
}
```

> NOTE: `resendSms` deliberately does NOT pass `virtualAccount` — virtual-account SMS resend would need the original bank/account/due from the payment record, which is out of PR-1 scope. A `virtual_account_issued` resend will produce a body with empty bank/account fields; that is acceptable for a manual operator-triggered resend (the operator resends failed delivery/shipping notices in practice). `sendBuyerSms` writes its own fresh `sms_logs` row, so the resend is independently auditable.

- [ ] **4.4 Run the test — expect PASS.**

```bash
npm test -- __tests__/app/actions/admin-sms.test.ts
```

Expected: all `getSmsLogs` and `resendSms` tests PASS.

- [ ] **4.5 Type-check.**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **4.6 Commit.**

```bash
git add app/actions/admin-sms.ts __tests__/app/actions/admin-sms.test.ts
git commit -m "feat(admin): add resendSms server action for failed SMS

요약: 실패한 트랜잭션 SMS를 주문 재조회 후 재발송하는 resendSms 액션 추가

- sms_logs → orders(order_no, artworks.title) 재조회 → BuyerSmsData 재구성
- sendBuyerSms 재호출(locale은 orders.metadata에서 추출), logAdminAction('sms_resent')
- order_no 없음/미지원 유형은 ok:false 반환

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5 — `/admin/sms` page + `SmsLogList` component

Create the server page (`requireAdmin` + `getSmsLogs(searchParams)`) and the client `SmsLogList` (filter bar with `AdminSelect`/`AdminInput`, table, `EmailPagination` reuse, resend button gated by `AdminConfirmModal`). This mirrors `/admin/email/page.tsx` (server fetch → client list) and `BroadcastHistory.tsx` (loadPage model, `STATUS_META` badge pattern). No automated test (UI component); verified via `npm run build` + manual smoke. Admin portal copy is permanently Korean.

**Files:**

- Create: `/Users/hwang-gyeongha/saf-2026/app/(portal)/admin/sms/page.tsx`
- Create: `/Users/hwang-gyeongha/saf-2026/app/(portal)/admin/sms/_components/SmsLogList.tsx`

### Steps

- [ ] **5.1 Create the server page.** Create `/Users/hwang-gyeongha/saf-2026/app/(portal)/admin/sms/page.tsx`. This mirrors `/admin/orders/page.tsx` (searchParams → action) and `/admin/email/page.tsx` (header + section). `searchParams` is a `Promise` in Next.js 16 and must be awaited.

```tsx
import { requireAdmin } from '@/lib/auth/guards';
import { getSmsLogs } from '@/app/actions/admin-sms';
import {
  AdminPageHeader,
  AdminPageTitle,
  AdminPageDescription,
} from '@/app/(portal)/admin/_components/admin-ui';
import { SmsLogList } from './_components/SmsLogList';

type Props = {
  searchParams: Promise<{
    type?: string;
    status?: string;
    from?: string;
    to?: string;
    q?: string;
  }>;
};

export default async function AdminSmsPage({ searchParams }: Props) {
  await requireAdmin();
  const params = await searchParams;
  const initial = await getSmsLogs({
    type: params.type,
    status: params.status,
    from: params.from,
    to: params.to,
    q: params.q,
  });

  return (
    <div className="space-y-8">
      <AdminPageHeader>
        <AdminPageTitle>문자/SMS 발송 로그</AdminPageTitle>
        <AdminPageDescription>
          구매자 트랜잭션 SMS 발송 내역을 조회하고, 실패한 건을 재발송합니다.
        </AdminPageDescription>
      </AdminPageHeader>

      <SmsLogList
        initial={initial}
        initialFilters={{
          type: params.type ?? '',
          status: params.status ?? '',
          from: params.from ?? '',
          to: params.to ?? '',
          q: params.q ?? '',
        }}
      />
    </div>
  );
}
```

- [ ] **5.2 Create the client `SmsLogList`.** Create `/Users/hwang-gyeongha/saf-2026/app/(portal)/admin/sms/_components/SmsLogList.tsx`. This combines: the `BroadcastHistory.tsx` `loadPage(page, pageSize)` + `STATUS_META` badge model, the `OrderList.tsx` filter-bar layout (`AdminCardHeader` + `AdminInput`/`AdminSelect`), the `EmailPagination` component, and an `AdminConfirmModal`-gated resend using `useTransition`.

```tsx
'use client';

import { useCallback, useState, useTransition } from 'react';

import {
  AdminCard,
  AdminCardHeader,
  AdminInput,
  AdminSelect,
  AdminBadge,
  AdminEmptyState,
} from '@/app/(portal)/admin/_components/admin-ui';
import { AdminConfirmModal } from '@/app/(portal)/admin/_components/AdminConfirmModal';
import { EmailPagination } from '@/app/(portal)/admin/email/_components/EmailPagination';
import { getSmsLogs, resendSms, type SmsLogRow, type SmsLogsResult } from '@/app/actions/admin-sms';

type BadgeTone = 'default' | 'info' | 'success' | 'warning' | 'danger';

const STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  sent: { label: '발송 완료', tone: 'success' },
  failed: { label: '발송 실패', tone: 'danger' },
};

const TYPE_LABELS: Record<string, string> = {
  payment_confirmed: '결제 완료',
  virtual_account_issued: '가상계좌 발급',
  deposit_confirmed: '입금 확인',
  shipped: '발송 완료',
  delivered: '배송 완료',
  refunded: '환불 완료',
  auto_cancelled: '자동 취소',
};

const TYPE_OPTIONS = [
  { value: '', label: '전체 유형' },
  ...Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

const STATUS_OPTIONS = [
  { value: '', label: '전체 상태' },
  { value: 'sent', label: '발송 완료' },
  { value: 'failed', label: '발송 실패' },
];

type Filters = { type: string; status: string; from: string; to: string; q: string };

function formatKst(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

export function SmsLogList({
  initial,
  initialFilters,
}: {
  initial: SmsLogsResult;
  initialFilters: Filters;
}) {
  const [rows, setRows] = useState<SmsLogRow[]>(initial.rows);
  const [total, setTotal] = useState(initial.total);
  const [page, setPage] = useState(initial.page);
  const [pageSize, setPageSize] = useState(initial.pageSize);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [loadState, setLoadState] = useState<'done' | 'loading' | 'error'>('done');
  const [confirmLogId, setConfirmLogId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isResending, startResend] = useTransition();

  const loadPage = useCallback(
    async (nextPage: number, nextPageSize: number, nextFilters: Filters) => {
      setLoadState('loading');
      try {
        const fresh = await getSmsLogs({
          page: nextPage,
          pageSize: nextPageSize,
          type: nextFilters.type || undefined,
          status: nextFilters.status || undefined,
          from: nextFilters.from || undefined,
          to: nextFilters.to || undefined,
          q: nextFilters.q || undefined,
        });
        setRows(fresh.rows);
        setTotal(fresh.total);
        setPage(fresh.page);
        setPageSize(fresh.pageSize);
        setLoadState('done');
      } catch {
        setLoadState('error');
      }
    },
    []
  );

  function applyFilter(patch: Partial<Filters>) {
    const next = { ...filters, ...patch };
    setFilters(next);
    void loadPage(1, pageSize, next);
  }

  function handlePageChange(nextPage: number) {
    void loadPage(nextPage, pageSize, filters);
  }

  function handlePageSizeChange(nextPageSize: number) {
    void loadPage(1, nextPageSize, filters);
  }

  function handleResendConfirm() {
    const logId = confirmLogId;
    if (!logId) return;
    startResend(async () => {
      const result = await resendSms(logId);
      setConfirmLogId(null);
      if (result.ok) {
        setFeedback('재발송했습니다.');
        await loadPage(page, pageSize, filters);
      } else {
        setFeedback(result.error ?? '재발송에 실패했습니다.');
      }
    });
  }

  return (
    <AdminCard>
      <AdminCardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <AdminInput
            placeholder="수신번호 / 주문번호 검색"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyFilter({ q: filters.q });
            }}
            className="w-full sm:w-56"
          />
          <AdminSelect
            value={filters.type}
            onChange={(e) => applyFilter({ type: e.target.value })}
            className="w-full sm:w-44"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </AdminSelect>
          <AdminSelect
            value={filters.status}
            onChange={(e) => applyFilter({ status: e.target.value })}
            className="w-full sm:w-36"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </AdminSelect>
          <AdminInput
            type="date"
            value={filters.from}
            onChange={(e) => applyFilter({ from: e.target.value })}
            className="w-full sm:w-40"
            aria-label="시작일"
          />
          <AdminInput
            type="date"
            value={filters.to}
            onChange={(e) => applyFilter({ to: e.target.value })}
            className="w-full sm:w-40"
            aria-label="종료일"
          />
        </div>
        <p className="text-sm text-charcoal-muted">{total.toLocaleString('ko-KR')}건</p>
      </AdminCardHeader>

      {feedback && (
        <p className="px-6 pt-4 text-sm text-charcoal-muted" role="status">
          {feedback}
        </p>
      )}

      {loadState === 'error' ? (
        <div className="p-8 text-center">
          <p className="text-sm text-danger-a11y">발송 로그를 불러오지 못했습니다.</p>
          <button
            type="button"
            onClick={() => void loadPage(page, pageSize, filters)}
            className="mt-3 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-charcoal-deep hover:bg-canvas-soft"
          >
            다시 시도
          </button>
        </div>
      ) : rows.length === 0 ? (
        <AdminEmptyState title="발송 로그 없음" description="조건에 맞는 발송 내역이 없습니다." />
      ) : (
        <div className="space-y-3 p-6">
          {loadState === 'loading' && (
            <p className="text-xs text-charcoal-muted">발송 로그를 불러오는 중입니다...</p>
          )}
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="bg-canvas-strong text-left text-xs text-charcoal-muted">
                  <th className="px-4 py-3 font-medium">유형</th>
                  <th className="px-4 py-3 font-medium">수신번호</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                  <th className="px-4 py-3 font-medium">세그먼트</th>
                  <th className="px-4 py-3 font-medium">주문번호</th>
                  <th className="px-4 py-3 font-medium">발송시각</th>
                  <th className="px-4 py-3 text-right font-medium">재발송</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gallery-divider">
                {rows.map((log) => {
                  const meta = STATUS_META[log.status] ?? {
                    label: log.status,
                    tone: 'default' as BadgeTone,
                  };
                  const canResend = log.status === 'failed' && Boolean(log.order_no);
                  return (
                    <tr key={log.id} className="bg-white">
                      <td className="whitespace-nowrap px-4 py-3 text-charcoal">
                        {TYPE_LABELS[log.type] ?? log.type}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-charcoal-muted">
                        {log.to_phone}
                      </td>
                      <td className="px-4 py-3">
                        <AdminBadge tone={meta.tone}>{meta.label}</AdminBadge>
                        {log.status === 'failed' && log.error && (
                          <span className="ml-2 text-xs text-charcoal-soft">{log.error}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-charcoal-muted">
                        {log.segment ?? '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-charcoal-muted">
                        {log.order_no ?? '-'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-charcoal-muted">
                        {formatKst(log.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={!canResend || isResending}
                          onClick={() => setConfirmLogId(log.id)}
                          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-charcoal-deep hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          재발송
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <EmailPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>
      )}

      <AdminConfirmModal
        isOpen={confirmLogId !== null}
        onClose={() => setConfirmLogId(null)}
        onConfirm={handleResendConfirm}
        title="SMS 재발송"
        description="이 건을 다시 발송합니다. 비용이 발생하며 수신자에게 문자가 재전송됩니다. 계속하시겠습니까?"
        confirmText="재발송"
        variant="warning"
        isLoading={isResending}
      />
    </AdminCard>
  );
}
```

> NOTE: The resend button is gated by `status === 'failed' && order_no != null` (spec §2: "`status === 'sent'`면 비활성"). The confirm modal uses `variant="warning"` because resend incurs cost / re-sends a message — not a destructive delete. The status badge only defines `sent`/`failed` tones; any other status (none currently exist in `sms_logs`) falls back to `default` tone.

- [ ] **5.3 Build to verify SSR/route compatibility.** Per CLAUDE.md, run `npm run build` before pushing to verify the new route compiles and the App Router page/client boundary is valid.

```bash
npm run build
```

Expected: build succeeds; `/admin/sms` appears in the route manifest as a server-rendered (dynamic, `requireAdmin`) route.

- [ ] **5.4 Lint the two new files.**

```bash
npm run lint
```

Expected: no errors. (Prettier: 2-space, single quote, semicolons, width 100 — already applied above.)

- [ ] **5.5 Commit.**

```bash
git add "app/(portal)/admin/sms/page.tsx" "app/(portal)/admin/sms/_components/SmsLogList.tsx"
git commit -m "feat(admin): add /admin/sms log viewer page with resend

요약: SMS 발송 로그 조회 화면(/admin/sms) — 필터·페이지네이션·재발송 추가

- page.tsx: requireAdmin + getSmsLogs(searchParams) → SmsLogList
- SmsLogList: 필터바(유형/상태/기간/검색) + 테이블 + EmailPagination 재사용
- 재발송 버튼은 실패 건만 활성, AdminConfirmModal로 확인

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6 — Admin nav registration

Register `/admin/sms` in the "도구" (Tools) group of `admin-nav-items.ts` for both ko and en locales. The nav layout iterates groups generically, so no other file changes. Place it after the existing 이메일 발송 / Email Broadcast entry.

**Files:**

- Modify: `/Users/hwang-gyeongha/saf-2026/app/(portal)/admin/_components/admin-nav-items.ts` (ko group L48–57, en group L97–105)

### Steps

- [ ] **6.1 Add the ko nav item.** In `/Users/hwang-gyeongha/saf-2026/app/(portal)/admin/_components/admin-nav-items.ts`, in the ko "도구" group (currently L49–56), change:

```ts
      label: '도구',
      items: [
        { href: '/admin/email', label: '이메일 발송' },
        { href: '/admin/social', label: '소셜 미디어' },
```

to:

```ts
      label: '도구',
      items: [
        { href: '/admin/email', label: '이메일 발송' },
        { href: '/admin/sms', label: '문자/SMS' },
        { href: '/admin/social', label: '소셜 미디어' },
```

- [ ] **6.2 Add the en nav item.** In the same file, in the en "Tools" group (currently L98–105), change:

```ts
      label: 'Tools',
      items: [
        { href: '/admin/email', label: 'Email Broadcast' },
        { href: '/admin/social', label: 'Social Media' },
```

to:

```ts
      label: 'Tools',
      items: [
        { href: '/admin/email', label: 'Email Broadcast' },
        { href: '/admin/sms', label: 'SMS' },
        { href: '/admin/social', label: 'Social Media' },
```

- [ ] **6.3 Type-check.**

```bash
npm run type-check
```

Expected: no errors (both entries satisfy `AdminNavItem = { href: string; label: string }`).

- [ ] **6.4 Commit.**

```bash
git add "app/(portal)/admin/_components/admin-nav-items.ts"
git commit -m "feat(admin): register /admin/sms in admin nav (ko/en 도구 group)

요약: 관리자 내비게이션 '도구' 그룹에 문자/SMS 메뉴 등록 (한/영)

- ko: 문자/SMS, en: SMS — 이메일 발송 항목 바로 뒤
- 내비 레이아웃은 그룹을 제네릭 순회하므로 추가 수정 불필요

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Final verification

- [ ] **F.1 Run the full SMS + admin-sms test set.**

```bash
npm test -- __tests__/lib/sms/buyer-sms.test.ts __tests__/app/actions/admin-sms.test.ts
```

Expected: all PASS.

- [ ] **F.2 Full type-check + lint + build.**

```bash
npm run type-check && npm run lint && npm run build
```

Expected: all clean; `/admin/sms` in route manifest.

- [ ] **F.3 Finish the branch** per superpowers:finishing-a-development-branch (push, open PR to `main`, merge). PR body must end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

---

## Self-review checklist (spec §1·§2 requirements → task mapping)

| Spec requirement (§1 Phase 1 / §2 Phase 2)                                                   | Task                            |
| -------------------------------------------------------------------------------------------- | ------------------------------- |
| `buildSmsText(type, data)` → `buildSmsText(type, data, locale)` with ko/en branch            | Task 1                          |
| 7 English bodies, ko `[씨앗페]` / en `[Seed Art Festival]` prefix                            | Task 1                          |
| Amount stays `₩` for both locales (KRW)                                                      | Task 1 (`won()` reused in en)   |
| Remove `if (locale === 'en') return;` at L69                                                 | Task 2                          |
| en+010 sends, en+non-010 skips (`normalizeKoreanMobile` unchanged)                           | Task 2                          |
| Call sites unaffected (signature unchanged)                                                  | Task 2.5 type-check             |
| `__tests__/lib/sms/buyer-sms.test.ts` en cases (body text, en+010 send, en+non-010 skip)     | Tasks 1.1, 2.1                  |
| `getSmsLogs` paginated `{ rows, total, page, pageSize }` (getBroadcasts shape)               | Task 3                          |
| Filters: type, status, 기간(from/to), q(전화번호/주문번호)                                   | Task 3                          |
| `resendSms(logId)`: re-read order by `order_no`, rebuild `BuyerSmsData`, call `sendBuyerSms` | Task 4                          |
| `resendSms` writes `logAdminAction('sms_resent', ...)`                                       | Task 4                          |
| `resendSms` returns `{ ok, error? }`                                                         | Task 4                          |
| `__tests__/app/actions/admin-sms.test.ts` (filter·pagination, resend 권한·경로)              | Tasks 3.1, 4.1                  |
| `/admin/sms/page.tsx` server, `requireAdmin`, calls `getSmsLogs(searchParams)`               | Task 5.1                        |
| `SmsLogList.tsx` client: filter bar (AdminSelect/AdminInput), table, EmailPagination reuse   | Task 5.2                        |
| Resend button gated by `AdminConfirmModal`, disabled when `status === 'sent'`                | Task 5.2                        |
| Status badge `STATUS_META` Record → `AdminBadge tone`                                        | Task 5.2                        |
| Table columns: 유형/수신번호/상태/세그먼트/주문번호/발송시각/재발송                          | Task 5.2                        |
| Nav registration in `admin-nav-items.ts` 도구 group (ko + en)                                | Task 6                          |
| Admin portal permanently Korean (i18n out of scope)                                          | Tasks 4, 5, 6 (Korean literals) |
| No DB migration / no `types/supabase.ts` regen (sms_logs already exists)                     | Plan preamble                   |
