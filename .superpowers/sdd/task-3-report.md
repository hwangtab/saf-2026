# Task 3 Report: Bank Transfer Info Single Source

## Status

- Implemented one source of truth for manual bank-transfer account/deadline info.
- Checkout and admin SMS resend now import `getBankTransferInfo()` and `formatBankTransferDueDate()` from `lib/payments/bank-transfer-info.ts`.
- Production override envs are documented in `.env.local.example`.

## RED Evidence

Command:

```bash
npm test -- --runInBand __tests__/lib/bank-transfer-info.test.ts
```

Result: expected failure before helper implementation.

```text
FAIL __tests__/lib/bank-transfer-info.test.ts
Cannot find module '../../lib/payments/bank-transfer-info'
```

## GREEN Evidence

Command:

```bash
npm test -- --runInBand __tests__/lib/bank-transfer-info.test.ts
```

Result:

```text
Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
```

Command:

```bash
npm test -- --runInBand __tests__/lib/bank-transfer-info.test.ts __tests__/app/actions/admin-sms.test.ts __tests__/actions/checkout.test.ts
```

Result:

```text
Test Suites: 3 passed, 3 total
Tests:       59 passed, 59 total
```

Command:

```bash
npx eslint app/actions/checkout.ts app/actions/admin-sms.ts lib/payments/bank-transfer-info.ts __tests__/lib/bank-transfer-info.test.ts
```

Result: exit 0. Output included the existing Browserslist stale-data warning only.

## Changed Files

- Created `lib/payments/bank-transfer-info.ts`
- Created `__tests__/lib/bank-transfer-info.test.ts`
- Modified `app/actions/checkout.ts`
- Modified `app/actions/admin-sms.ts`
- Modified `.env.local.example`

## Concerns

- No runtime env values were changed in this task; production still needs the documented `BANK_TRANSFER_*` envs set if an override is desired.
- Existing user-facing message catalogs still contain bank-transfer wording; this task only centralized the transactional checkout/admin SMS account source.
