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

- [ ] **Step 1: Add failing helper tests**

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

- [ ] **Step 2: Run RED**

Run:

```bash
npm test -- --runInBand __tests__/lib/public-artwork-revalidation.test.ts
```

Expected: FAIL with module not found for `@/lib/admin/public-artwork-revalidation`.

- [ ] **Step 3: Add helper implementation**

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

- [ ] **Step 4: Run GREEN for helper**

Run:

```bash
npm test -- --runInBand __tests__/lib/public-artwork-revalidation.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add failing source contract for visible failure handling**

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

- [ ] **Step 6: Run RED**

Run:

```bash
npm test -- --runInBand __tests__/app/admin-artwork-create-revalidate-contract.test.ts
```

Expected: FAIL because `app/actions/admin-artworks.ts` still logs missing env only with `console.error`.

- [ ] **Step 7: Update scheduler implementation**

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

- [ ] **Step 8: Run GREEN**

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

- [ ] **Step 1: Add failing backfill contract test**

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

- [ ] **Step 2: Run RED**

Run:

```bash
npm test -- --runInBand __tests__/app/reconcile-payments-backfill-contract.test.ts
```

Expected: FAIL because backfill mode is not present.

- [ ] **Step 3: Add bounded query parsing helpers in route**

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

- [ ] **Step 4: Implement backfill branch without changing cron branch**

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

- [ ] **Step 5: Run GREEN**

Run:

```bash
npm test -- --runInBand __tests__/app/reconcile-payments-backfill-contract.test.ts __tests__/app/reconcile-payments-missing-payment-source.test.ts
```

Expected: PASS.

- [ ] **Step 6: Manual runtime command for operator use**

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

- [ ] **Step 1: Add failing helper tests**

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

- [ ] **Step 2: Run RED**

Run:

```bash
npm test -- --runInBand __tests__/lib/bank-transfer-info.test.ts
```

Expected: FAIL with module not found.

- [ ] **Step 3: Add helper implementation**

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

- [ ] **Step 4: Run GREEN for helper**

Run:

```bash
npm test -- --runInBand __tests__/lib/bank-transfer-info.test.ts
```

Expected: PASS.

- [ ] **Step 5: Replace checkout duplicate constants**

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

- [ ] **Step 6: Replace admin SMS fallback duplicate constants**

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

- [ ] **Step 7: Document env names**

Add to `.env.local.example`:

```dotenv
# Manual bank-transfer fallback used by checkout and admin SMS resend.
# Defaults in code match the current SAF account, but production can override here.
BANK_TRANSFER_BANK_NAME="기업은행 (IBK)"
BANK_TRANSFER_ACCOUNT_NUMBER="301-101031-04-095"
BANK_TRANSFER_HOLDER_NAME="한국스마트협동조합"
BANK_TRANSFER_DEADLINE_HOURS="24"
```

- [ ] **Step 8: Run GREEN**

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

- [ ] **Step 1: Run full local verification**

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

- [ ] **Step 2: Check whether build changed generated files before deciding to run it**

Run:

```bash
git status --short
```

If the tree is clean and the user approves generated-file churn, run:

```bash
npm run build
```

Expected: exit 0. If `content/changelog.json`, `lib/site-stats.ts`, or generated hero quality files change, inspect and either commit them with the implementation or explicitly leave build unrun in the final report.

- [ ] **Step 3: Write walkthrough**

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

- [ ] **Step 4: Final clean-tree check**

Run:

```bash
git status --short --branch
````

Expected: only intended files are modified. No unrelated generated output should appear unless explicitly accepted in Step 2.
