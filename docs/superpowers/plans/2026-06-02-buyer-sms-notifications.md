# 구매자 트랜잭션 SMS 알림 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Solapi로 결제·배송 등 트랜잭션 이벤트에서 구매자에게 정보성 SMS를 이메일과 병행 발송한다.

**Architecture:** 기존 이메일 발송(`lib/notify.ts`의 `resendFetch`) 패턴(raw `fetch` + 타임아웃 + 1회 재시도 + never-throw + env 미설정 시 no-op)을 SMS에 복제. `lib/sms/`에 phone 정규화·Solapi 클라이언트·buyer-sms 디스패처를 분리. 발송 결과는 `sms_logs` 테이블에 best-effort 기록. 기존 `sendBuyerEmail` 호출처 13곳에 `sendBuyerSms` 한 줄씩 병행 추가.

**Tech Stack:** TypeScript, Next.js 16, Node `crypto`(HMAC-SHA256), Supabase(service-role client for logging), Jest.

**참고 스펙:** [docs/superpowers/specs/2026-06-02-buyer-sms-notifications-design.md](../specs/2026-06-02-buyer-sms-notifications-design.md)

---

## 파일 구조

| 파일                                                            | 책임                                                         |
| --------------------------------------------------------------- | ------------------------------------------------------------ |
| `lib/sms/phone.ts` (생성)                                       | 한국 휴대폰 번호 정규화·검증                                 |
| `lib/sms/solapi.ts` (생성)                                      | Solapi 저수준 클라이언트 (HMAC 서명 + 단건 발송)             |
| `lib/sms/buyer-sms.ts` (생성)                                   | 타입별 본문 생성 + `sendBuyerSms` 디스패처 + `sms_logs` 기록 |
| `supabase/migrations/20260602120000_create_sms_logs.sql` (생성) | `sms_logs` 테이블 + RLS                                      |
| `__tests__/lib/sms/phone.test.ts` (생성)                        | phone 단위 테스트                                            |
| `__tests__/lib/sms/solapi.test.ts` (생성)                       | solapi 클라이언트 테스트                                     |
| `__tests__/lib/sms/buyer-sms.test.ts` (생성)                    | 본문 생성·디스패처 테스트                                    |
| `.env.local.example` (수정)                                     | SOLAPI\_\* 환경변수 주석 추가                                |
| `app/api/payments/toss/confirm/route.ts` (수정)                 | 2곳 배선                                                     |
| `app/api/webhooks/toss/route.ts` (수정)                         | 2곳 배선                                                     |
| `app/actions/admin-orders.ts` (수정)                            | 5곳 배선                                                     |
| `app/actions/order-lookup.ts` (수정)                            | 2곳 배선                                                     |
| `app/actions/checkout.ts` (수정)                                | 1곳 배선                                                     |
| `app/api/internal/expire-stale-orders/route.ts` (수정)          | 1곳 배선                                                     |

---

## Task 1: 전화번호 정규화 (`lib/sms/phone.ts`)

**Files:**

- Create: `lib/sms/phone.ts`
- Test: `__tests__/lib/sms/phone.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/sms/phone.test.ts`:

```ts
import { normalizeKoreanMobile } from '@/lib/sms/phone';

describe('normalizeKoreanMobile', () => {
  it('하이픈·공백을 제거하고 11자리 010 번호를 반환한다', () => {
    expect(normalizeKoreanMobile('010-1234-5678')).toBe('01012345678');
    expect(normalizeKoreanMobile('010 1234 5678')).toBe('01012345678');
    expect(normalizeKoreanMobile('01012345678')).toBe('01012345678');
  });

  it('+82 / 82 국가코드를 0으로 치환한다', () => {
    expect(normalizeKoreanMobile('+82 10-1234-5678')).toBe('01012345678');
    expect(normalizeKoreanMobile('821012345678')).toBe('01012345678');
  });

  it('010이 아니거나 자릿수가 틀리면 null', () => {
    expect(normalizeKoreanMobile('02-123-4567')).toBeNull();
    expect(normalizeKoreanMobile('0212345678')).toBeNull();
    expect(normalizeKoreanMobile('0101234567')).toBeNull(); // 10자리
    expect(normalizeKoreanMobile('010123456789')).toBeNull(); // 12자리
  });

  it('빈값·null·undefined는 null', () => {
    expect(normalizeKoreanMobile('')).toBeNull();
    expect(normalizeKoreanMobile(null)).toBeNull();
    expect(normalizeKoreanMobile(undefined)).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- phone.test`
Expected: FAIL — `Cannot find module '@/lib/sms/phone'`

- [ ] **Step 3: Write minimal implementation**

Create `lib/sms/phone.ts`:

```ts
/**
 * 한국 휴대폰 번호를 발송용 정규형(01012345678)으로 변환한다.
 * 한국 010 휴대폰이 아니면 null — 호출지는 null이면 SMS를 스킵한다(국제 SMS 비용 방지).
 */
export function normalizeKoreanMobile(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, '');
  // +82 / 82 국가코드 → 0
  if (digits.startsWith('82')) {
    digits = '0' + digits.slice(2);
  }
  if (/^010\d{8}$/.test(digits)) return digits;
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- phone.test`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/sms/phone.ts __tests__/lib/sms/phone.test.ts
git commit -m "feat(sms): add Korean mobile number normalization

요약: SMS 발송용 한국 휴대폰 번호 정규화 유틸 추가"
```

---

## Task 2: Solapi 저수준 클라이언트 (`lib/sms/solapi.ts`)

**Files:**

- Create: `lib/sms/solapi.ts`
- Test: `__tests__/lib/sms/solapi.test.ts`

Solapi 단건 발송 API: `POST https://api.solapi.com/messages/v4/send`
인증 헤더: `Authorization: HMAC-SHA256 apiKey=<key>, date=<ISO8601>, salt=<hex>, signature=<HMAC_SHA256_hex(secret, date+salt)>`
요청 body: `{ message: { to, from, text } }`
성공 응답: HTTP 200 + `{ statusCode: '2000', messageId, type: 'SMS'|'LMS', ... }`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/sms/solapi.test.ts`:

```ts
/** @jest-environment node */
import { sendSolapiSms } from '@/lib/sms/solapi';

const ORIGINAL_ENV = { ...process.env };

function mockFetchOnce(status: number, body: unknown) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  });
}

describe('sendSolapiSms', () => {
  beforeEach(() => {
    process.env.SOLAPI_API_KEY = 'key';
    process.env.SOLAPI_API_SECRET = 'secret';
    process.env.SOLAPI_SENDER = '0287654321';
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.restoreAllMocks();
  });

  it('env 미설정 시 no-op (fetch 미호출, not-configured)', async () => {
    delete process.env.SOLAPI_API_KEY;
    const fetchSpy = jest.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    const r = await sendSolapiSms({ to: '01012345678', text: 'hi' });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(r).toEqual({ ok: false, error: 'not-configured' });
  });

  it('성공 응답에서 messageId·segment를 파싱한다', async () => {
    global.fetch = mockFetchOnce(200, {
      statusCode: '2000',
      messageId: 'M123',
      type: 'LMS',
    }) as unknown as typeof fetch;
    const r = await sendSolapiSms({ to: '01012345678', text: 'hi' });
    expect(r.ok).toBe(true);
    expect(r.messageId).toBe('M123');
    expect(r.segment).toBe('LMS');
  });

  it('HMAC-SHA256 Authorization 헤더와 message body를 전송한다', async () => {
    const fetchSpy = mockFetchOnce(200, { statusCode: '2000', messageId: 'M1', type: 'SMS' });
    global.fetch = fetchSpy as unknown as typeof fetch;
    await sendSolapiSms({ to: '01012345678', text: 'hello' });
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('https://api.solapi.com/messages/v4/send');
    expect((init.headers as Record<string, string>).Authorization).toMatch(
      /^HMAC-SHA256 apiKey=key, date=.+, salt=.+, signature=[a-f0-9]+$/
    );
    expect(JSON.parse(init.body as string)).toEqual({
      message: { to: '01012345678', from: '0287654321', text: 'hello' },
    });
  });

  it('5xx는 1회 재시도 후 실패 반환', async () => {
    const fetchSpy = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'err' })
      .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'err' });
    global.fetch = fetchSpy as unknown as typeof fetch;
    const r = await sendSolapiSms({ to: '01012345678', text: 'hi' });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(r.ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- solapi.test`
Expected: FAIL — `Cannot find module '@/lib/sms/solapi'`

- [ ] **Step 3: Write minimal implementation**

Create `lib/sms/solapi.ts`:

```ts
import crypto from 'crypto';

const SOLAPI_ENDPOINT = 'https://api.solapi.com/messages/v4/send';

export interface SolapiResult {
  ok: boolean;
  messageId?: string;
  segment?: 'SMS' | 'LMS' | 'MMS';
  error?: string;
}

/**
 * Solapi 단건 SMS 발송. resendFetch와 동일 철학:
 * env 미설정 시 no-op, never throw, 5초 타임아웃, 429/5xx 1회 재시도.
 * SMS/LMS 구분은 Solapi가 본문 byte 길이로 자동 판별.
 */
export async function sendSolapiSms(opts: { to: string; text: string }): Promise<SolapiResult> {
  const apiKey = process.env.SOLAPI_API_KEY;
  const apiSecret = process.env.SOLAPI_API_SECRET;
  const from = process.env.SOLAPI_SENDER;
  if (!apiKey || !apiSecret || !from) return { ok: false, error: 'not-configured' };

  const body = JSON.stringify({ message: { to: opts.to, from, text: opts.text } });

  for (let attempt = 0; attempt < 2; attempt++) {
    const date = new Date().toISOString();
    const salt = crypto.randomBytes(32).toString('hex');
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(date + salt)
      .digest('hex');
    const authorization = `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(SOLAPI_ENDPOINT, {
        method: 'POST',
        headers: { Authorization: authorization, 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const raw = await res.text();
      if (res.ok) {
        let parsed: { statusCode?: string; messageId?: string; type?: string } = {};
        try {
          parsed = JSON.parse(raw);
        } catch {
          /* 비-JSON 응답이라도 200이면 성공 취급 */
        }
        // 단건 응답 statusCode '2000' = 정상 접수. 미존재 시 200만으로 성공 취급.
        if (parsed.statusCode && parsed.statusCode !== '2000') {
          console.error(`[solapi] non-2000 statusCode: ${raw.slice(0, 300)}`);
          return { ok: false, error: parsed.statusCode };
        }
        return {
          ok: true,
          messageId: parsed.messageId,
          segment: parsed.type as SolapiResult['segment'],
        };
      }

      if (attempt === 0 && (res.status === 429 || res.status >= 500)) {
        console.error(`[solapi] ${res.status}, retrying in 1s: ${raw.slice(0, 200)}`);
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      console.error(`[solapi] returned ${res.status}: ${raw.slice(0, 500)}`);
      return { ok: false, error: `http_${res.status}` };
    } catch (err) {
      clearTimeout(timeout);
      if (attempt === 0) {
        console.error('[solapi] failed, retrying in 1s:', err);
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      console.error('[solapi] send failed after retry:', err);
      return { ok: false, error: 'network' };
    }
  }
  return { ok: false, error: 'unknown' };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- solapi.test`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/sms/solapi.ts __tests__/lib/sms/solapi.test.ts
git commit -m "feat(sms): add Solapi single-send client with HMAC auth

요약: Solapi 단건 SMS 발송 클라이언트(HMAC 서명·재시도·no-op) 추가"
```

---

## Task 3: sms_logs 마이그레이션

**Files:**

- Create: `supabase/migrations/20260602120000_create_sms_logs.sql`

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/20260602120000_create_sms_logs.sql`:

```sql
-- 구매자 트랜잭션 SMS 발송 로그 (건당 과금·민원 추적용)
create table if not exists public.sms_logs (
  id                  uuid primary key default gen_random_uuid(),
  order_no            text,
  to_phone            text not null,
  type                text not null,           -- BuyerSmsType (payment_confirmed 등)
  provider            text not null default 'solapi',
  provider_message_id text,
  status              text not null,           -- 'sent' | 'failed'
  segment             text,                    -- 'SMS' | 'LMS' | 'MMS'
  error               text,
  created_at          timestamptz not null default now()
);

create index if not exists sms_logs_order_no_idx on public.sms_logs (order_no);
create index if not exists sms_logs_created_at_idx on public.sms_logs (created_at desc);

alter table public.sms_logs enable row level security;

-- 관리자만 조회. 쓰기는 service-role(서버)만 — service-role은 RLS 우회하므로 insert 정책 불요.
create policy "admins_can_view_sms_logs" on public.sms_logs
  for select using (get_my_role() = 'admin');

comment on table public.sms_logs is '구매자 트랜잭션 SMS 발송 로그';
```

- [ ] **Step 2: Apply via MCP (사용자 컨펌 필수)**

CLAUDE.md 정책: MCP `apply_migration` 우선. 사용자에게 컨펌 받은 뒤
`mcp__claude_ai_Supabase__apply_migration` 호출 (project_id `khtunrybrzntlnowlahb`, name `create_sms_logs`, query = 위 SQL 본문).

Expected: 성공. 직후 `mcp__claude_ai_Supabase__list_migrations`로 적용 확인.

- [ ] **Step 3: 타입 재생성**

`mcp__claude_ai_Supabase__generate_typescript_types` (project_id `khtunrybrzntlnowlahb`) 실행 →
결과로 `types/supabase.ts` 갱신 (sms_logs 추가분 반영). diff 확인 후 저장.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260602120000_create_sms_logs.sql types/supabase.ts
git commit -m "feat(sms): add sms_logs table migration

요약: SMS 발송 로그 테이블(sms_logs) + admin RLS 추가"
```

---

## Task 4: buyer-sms 디스패처 (`lib/sms/buyer-sms.ts`)

**Files:**

- Create: `lib/sms/buyer-sms.ts`
- Test: `__tests__/lib/sms/buyer-sms.test.ts`

본문 생성(`buildSmsText`)은 순수 함수로 분리해 단위 테스트. `sendBuyerSms`는 스킵 규칙 +
발송 + best-effort 로그 기록.

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/sms/buyer-sms.test.ts`:

```ts
/** @jest-environment node */
import { buildSmsText, sendBuyerSms } from '@/lib/sms/buyer-sms';

jest.mock('@/lib/sms/solapi', () => ({ sendSolapiSms: jest.fn() }));
jest.mock('@/lib/auth/server', () => ({ createSupabaseAdminClient: jest.fn() }));

import { sendSolapiSms } from '@/lib/sms/solapi';
import { createSupabaseAdminClient } from '@/lib/auth/server';

const mockSend = sendSolapiSms as jest.MockedFunction<typeof sendSolapiSms>;
const mockAdmin = createSupabaseAdminClient as jest.MockedFunction<
  typeof createSupabaseAdminClient
>;

function fakeAdminClient() {
  const insert = jest.fn().mockResolvedValue({ error: null });
  return { client: { from: () => ({ insert }) }, insert };
}

describe('buildSmsText', () => {
  it('payment_confirmed: 이름·작품명·금액 포함', () => {
    const t = buildSmsText('payment_confirmed', {
      buyerName: '홍길동',
      artworkTitle: '들꽃',
      amount: 1500000,
    });
    expect(t).toBe("[씨앗페] 홍길동님, '들꽃' 결제(₩1,500,000)가 완료되었습니다. 감사합니다.");
  });

  it('virtual_account_issued: 은행·계좌·금액·기한', () => {
    const t = buildSmsText('virtual_account_issued', {
      buyerName: '',
      artworkTitle: '',
      amount: 50000,
      virtualAccount: { bankName: 'IBK기업', accountNumber: '01012345678', dueDate: '6/5 23:59' },
    });
    expect(t).toBe('[씨앗페] 입금안내: IBK기업 01012345678 / ₩50,000 / 기한 6/5 23:59');
  });

  it('shipped: 작품명·택배사·운송장', () => {
    const t = buildSmsText('shipped', {
      buyerName: '',
      artworkTitle: '들꽃',
      amount: 0,
      carrier: 'CJ대한통운',
      trackingNumber: '123456789',
    });
    expect(t).toBe("[씨앗페] '들꽃' 발송완료. CJ대한통운 123456789");
  });

  it('refunded·delivered·deposit_confirmed·auto_cancelled 본문', () => {
    expect(buildSmsText('refunded', { buyerName: '', artworkTitle: '', amount: 50000 })).toBe(
      '[씨앗페] ₩50,000 환불이 처리되었습니다.'
    );
    expect(buildSmsText('delivered', { buyerName: '', artworkTitle: '들꽃', amount: 0 })).toBe(
      "[씨앗페] '들꽃' 배송이 완료되었습니다."
    );
    expect(
      buildSmsText('deposit_confirmed', { buyerName: '김작가', artworkTitle: '', amount: 0 })
    ).toBe('[씨앗페] 김작가님, 입금이 확인되었습니다. 작품을 준비합니다.');
    expect(buildSmsText('auto_cancelled', { buyerName: '', artworkTitle: '', amount: 0 })).toBe(
      '[씨앗페] 주문이 자동취소되었습니다.'
    );
  });
});

describe('sendBuyerSms', () => {
  beforeEach(() => jest.clearAllMocks());

  it('en locale은 스킵 (발송·로그 없음)', async () => {
    await sendBuyerSms(
      '01012345678',
      'payment_confirmed',
      { buyerName: 'A', artworkTitle: 'B', amount: 1 },
      'en'
    );
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('비-KR 번호는 스킵', async () => {
    await sendBuyerSms('02-123-4567', 'payment_confirmed', {
      buyerName: 'A',
      artworkTitle: 'B',
      amount: 1,
    });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('정상 발송 시 정규화된 번호로 호출하고 sms_logs에 sent 기록', async () => {
    const { client, insert } = fakeAdminClient();
    mockAdmin.mockReturnValue(client as unknown as ReturnType<typeof createSupabaseAdminClient>);
    mockSend.mockResolvedValue({ ok: true, messageId: 'M1', segment: 'SMS' });

    await sendBuyerSms(
      '010-1234-5678',
      'payment_confirmed',
      { buyerName: 'A', artworkTitle: 'B', amount: 1 },
      'ko',
      'SAF-1'
    );

    expect(mockSend).toHaveBeenCalledWith({
      to: '01012345678',
      text: expect.stringContaining('[씨앗페]'),
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        order_no: 'SAF-1',
        to_phone: '01012345678',
        type: 'payment_confirmed',
        status: 'sent',
        provider_message_id: 'M1',
        segment: 'SMS',
      })
    );
  });

  it('발송 실패해도 throw하지 않고 failed 로그', async () => {
    const { client, insert } = fakeAdminClient();
    mockAdmin.mockReturnValue(client as unknown as ReturnType<typeof createSupabaseAdminClient>);
    mockSend.mockResolvedValue({ ok: false, error: 'http_400' });

    await expect(
      sendBuyerSms('01012345678', 'refunded', { buyerName: '', artworkTitle: '', amount: 1 })
    ).resolves.toBeUndefined();
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed', error: 'http_400' })
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- buyer-sms.test`
Expected: FAIL — `Cannot find module '@/lib/sms/buyer-sms'`

- [ ] **Step 3: Write minimal implementation**

Create `lib/sms/buyer-sms.ts`:

```ts
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { normalizeKoreanMobile } from '@/lib/sms/phone';
import { sendSolapiSms } from '@/lib/sms/solapi';

export type BuyerSmsType =
  | 'payment_confirmed'
  | 'virtual_account_issued'
  | 'deposit_confirmed'
  | 'shipped'
  | 'delivered'
  | 'refunded'
  | 'auto_cancelled';

export interface BuyerSmsData {
  buyerName: string;
  artworkTitle: string;
  amount: number;
  virtualAccount?: { bankName?: string; accountNumber?: string; dueDate?: string };
  carrier?: string;
  trackingNumber?: string;
}

const won = (n: number) => `₩${(n ?? 0).toLocaleString('ko-KR')}`;

/** 타입별 정보성 SMS 본문. 모든 본문에 [씨앗페] 접두어. */
export function buildSmsText(type: BuyerSmsType, data: BuyerSmsData): string {
  switch (type) {
    case 'payment_confirmed':
      return `[씨앗페] ${data.buyerName}님, '${data.artworkTitle}' 결제(${won(data.amount)})가 완료되었습니다. 감사합니다.`;
    case 'virtual_account_issued': {
      const va = data.virtualAccount ?? {};
      const due = va.dueDate ? ` / 기한 ${va.dueDate}` : '';
      return `[씨앗페] 입금안내: ${va.bankName ?? ''} ${va.accountNumber ?? ''} / ${won(data.amount)}${due}`;
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

/**
 * 구매자 트랜잭션 SMS를 한국 휴대폰으로 발송하고 sms_logs에 기록한다.
 * - en locale·비-KR 번호·전화번호 없음 → 조용히 스킵 (이메일은 별도로 발송됨)
 * - never throw — 결제/웹훅 플로우를 막지 않음
 */
export async function sendBuyerSms(
  phone: string | null | undefined,
  type: BuyerSmsType,
  data: BuyerSmsData,
  locale: 'ko' | 'en' = 'ko',
  orderNo?: string
): Promise<void> {
  try {
    if (locale === 'en') return; // 1차는 한국어 본문만
    const to = normalizeKoreanMobile(phone);
    if (!to) return;

    const text = buildSmsText(type, data);
    const result = await sendSolapiSms({ to, text });

    // best-effort 로그 — 실패해도 무시
    try {
      const admin = createSupabaseAdminClient();
      await admin.from('sms_logs').insert({
        order_no: orderNo ?? null,
        to_phone: to,
        type,
        provider: 'solapi',
        provider_message_id: result.messageId ?? null,
        status: result.ok ? 'sent' : 'failed',
        segment: result.segment ?? null,
        error: result.ok ? null : (result.error ?? 'unknown'),
      });
    } catch (logErr) {
      console.error(`[buyer-sms:${type}] log insert failed:`, logErr);
    }
  } catch (err) {
    console.error(`[buyer-sms:${type}] send failed:`, err);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- buyer-sms.test`
Expected: PASS (모든 it 통과)

- [ ] **Step 5: Commit**

```bash
git add lib/sms/buyer-sms.ts __tests__/lib/sms/buyer-sms.test.ts
git commit -m "feat(sms): add buyer SMS dispatcher with per-type templates

요약: 타입별 본문 생성 + sendBuyerSms 디스패처(스킵 규칙·로그) 추가"
```

---

## Task 5: 환경변수 예시 추가

**Files:**

- Modify: `.env.local.example` (RESEND 섹션 직후, 현재 line 41 부근)

- [ ] **Step 1: Add SOLAPI env block**

`.env.local.example`의 `NOTIFY_EMAIL_TO` 줄(line 41) 다음에 추가:

```
# SMS 발송 (Solapi). 미설정 시 SMS no-op (이메일은 정상 발송)
# SOLAPI_API_KEY=...
# SOLAPI_API_SECRET=...
# SOLAPI_SENDER=0287654321   # Solapi 콘솔에 사전등록한 발신번호 (숫자만)
```

- [ ] **Step 2: Commit**

```bash
git add .env.local.example
git commit -m "docs(sms): document SOLAPI_* env vars

요약: Solapi SMS 환경변수 예시 추가"
```

---

## Task 6: confirm/route.ts 배선 (2곳)

**Files:**

- Modify: `app/api/payments/toss/confirm/route.ts:302`, `:348`

이 파일은 `order.buyer_phone`, `notifyInfo`, `buyerLocale`가 이미 스코프에 있다.

- [ ] **Step 1: import 추가**

파일 상단 import 블록(`import { notifyEmail, sendBuyerEmail } from '@/lib/notify';`, line 10) 다음 줄에 추가:

```ts
import { sendBuyerSms } from '@/lib/sms/buyer-sms';
```

- [ ] **Step 2: payment_confirmed (line 302 `void sendBuyerEmail(...)` 블록 직후) 추가**

`payment_confirmed` 이메일을 보내는 `void sendBuyerEmail(...)` 호출이 끝나는 `);` 바로 다음 줄에 추가:

```ts
void sendBuyerSms(
  order.buyer_phone,
  'payment_confirmed',
  {
    buyerName: order.buyer_name ?? '',
    artworkTitle: notifyInfo?.artworkTitle ?? '',
    amount: tossResponse.totalAmount,
  },
  buyerLocale,
  orderId
);
```

> 참고: `tossResponse.totalAmount`·`orderId`는 해당 블록에서 이미 사용 중인 식별자(line 302~323의 email 호출과 동일 소스). 이름이 다르면 email 호출에 전달된 `amount`/`orderNo` 값과 동일한 식별자를 사용한다.

- [ ] **Step 3: virtual_account_issued (line 348 블록 직후) 추가**

`virtual_account_issued` 이메일 `void sendBuyerEmail(...)` 호출의 닫는 `);` 다음 줄에 추가:

```ts
void sendBuyerSms(
  order.buyer_phone,
  'virtual_account_issued',
  {
    buyerName: order.buyer_name ?? '',
    artworkTitle: notifyInfo?.artworkTitle ?? '',
    amount: tossResponse.totalAmount,
    virtualAccount: {
      bankName: tossResponse.virtualAccount?.bankCode,
      accountNumber: tossResponse.virtualAccount?.accountNumber,
      dueDate: tossResponse.virtualAccount?.dueDate,
    },
  },
  buyerLocale,
  orderId
);
```

> 참고: virtualAccount 필드는 line 348 email 호출의 `virtualAccount` data와 동일 소스를 사용한다. email 쪽이 `data.virtualAccount`에 넘기는 값을 그대로 복사한다.

- [ ] **Step 4: Verify**

Run: `npm run type-check`
Expected: 에러 없음. (식별자 불일치 시 email 호출부의 동일 값으로 교정)

- [ ] **Step 5: Commit**

```bash
git add app/api/payments/toss/confirm/route.ts
git commit -m "feat(sms): send SMS on payment confirm and virtual account issue

요약: 결제승인·가상계좌 발급 시 구매자 SMS 병행 발송"
```

---

## Task 7: webhooks/toss/route.ts 배선 (2곳)

**Files:**

- Modify: `app/api/webhooks/toss/route.ts:234` (deposit_confirmed), `:645` (refunded)

`order.buyer_phone`(line 163 select)·`existingOrder.buyer_phone`(line 478 select)가 스코프에 있다.

- [ ] **Step 1: import 추가**

`import { notifyEmail, sendBuyerEmail, extractBuyerLocale } from '@/lib/notify';`(line 16) 다음 줄:

```ts
import { sendBuyerSms } from '@/lib/sms/buyer-sms';
```

- [ ] **Step 2: deposit_confirmed (line 234 블록 직후)**

`deposit_confirmed` 이메일 `void sendBuyerEmail(...)`의 닫는 `);` 다음 줄에 추가:

```ts
void sendBuyerSms(
  order.buyer_phone,
  'deposit_confirmed',
  {
    buyerName: order.buyer_name ?? '',
    artworkTitle: depositInfo?.artworkTitle ?? '',
    amount: order.total_amount ?? 0,
  },
  extractBuyerLocale(order.metadata),
  order.order_no ?? undefined
);
```

> 참고: `depositInfo`/`artworkTitle` 식별자는 같은 블록의 email 호출이 `artworkTitle`에 사용하는 값과 동일하게 맞춘다(해당 위치의 `getOrderNotificationInfo` 결과 변수). email 호출부를 보고 동일 변수를 사용한다.

- [ ] **Step 3: refunded (line 645 블록 직후)**

`refunded` 이메일 `void sendBuyerEmail(...)`의 닫는 `);` 다음 줄에 추가:

```ts
void sendBuyerSms(
  existingOrder.buyer_phone,
  'refunded',
  {
    buyerName: existingOrder.buyer_name ?? '',
    artworkTitle: '',
    amount: existingOrder.total_amount ?? 0,
  },
  extractBuyerLocale(existingOrder.metadata),
  existingOrder.order_no ?? undefined
);
```

- [ ] **Step 4: Verify**

Run: `npm run type-check`
Expected: 에러 없음.

- [ ] **Step 5: Commit**

```bash
git add app/api/webhooks/toss/route.ts
git commit -m "feat(sms): send SMS on deposit confirm and refund webhook

요약: 입금확인·환불 웹훅 시 구매자 SMS 병행 발송"
```

---

## Task 8: admin-orders.ts 배선 (5곳)

**Files:**

- Modify: `app/actions/admin-orders.ts` lines 333(refunded), 531(shipped), 547(delivered), 693(deposit_confirmed), 866(auto_cancelled)

각 호출처의 `order` 객체는 select에 `buyer_phone`을 포함한다(line 250·624는 buyer_phone, line 147 select는 buyer_phone·shipping_carrier·tracking_number 포함). 본문 SMS data는 같은 블록의 email 호출이 쓰는 값과 동일 소스를 사용한다.

- [ ] **Step 1: import 추가**

파일 상단 notify import 다음 줄에 추가:

```ts
import { sendBuyerSms } from '@/lib/sms/buyer-sms';
```

(기존 `import { ... } from '@/lib/notify';` 위치 확인 후 그 아래)

- [ ] **Step 2: refunded (line 333 블록 직후)**

해당 `void sendBuyerEmail(order.buyer_email, 'refunded', {...})` 닫는 `);` 다음:

```ts
void sendBuyerSms(
  order.buyer_phone,
  'refunded',
  { buyerName: order.buyer_name ?? '', artworkTitle: '', amount: order.total_amount ?? 0 },
  extractBuyerLocale(order.metadata),
  order.order_no ?? undefined
);
```

> `extractBuyerLocale`가 이 파일에 import되어 있지 않으면 notify import에 추가한다. email 호출부가 locale에 쓰는 동일 식별자를 사용해도 된다.

- [ ] **Step 3: shipped (line 531 블록 직후)**

```ts
void sendBuyerSms(
  order.buyer_phone,
  'shipped',
  {
    buyerName: order.buyer_name ?? '',
    artworkTitle: order.artworks?.title ?? '',
    amount: 0,
    carrier: order.shipping_carrier ?? undefined,
    trackingNumber: order.tracking_number ?? undefined,
  },
  extractBuyerLocale(order.metadata),
  order.order_no ?? undefined
);
```

> `order.artworks?.title`·`order.shipping_carrier`·`order.tracking_number` 식별자는 같은 블록 email 호출(`'shipped'`)이 `artworkTitle`·`carrier`·`trackingNumber`에 넘기는 값과 동일하게 맞춘다.

- [ ] **Step 4: delivered (line 547 블록 직후)**

```ts
void sendBuyerSms(
  order.buyer_phone,
  'delivered',
  { buyerName: order.buyer_name ?? '', artworkTitle: order.artworks?.title ?? '', amount: 0 },
  extractBuyerLocale(order.metadata),
  order.order_no ?? undefined
);
```

- [ ] **Step 5: deposit_confirmed (line 693 블록 직후)**

```ts
void sendBuyerSms(
  order.buyer_phone,
  'deposit_confirmed',
  { buyerName: order.buyer_name ?? '', artworkTitle: '', amount: 0 },
  extractBuyerLocale(order.metadata),
  order.order_no ?? undefined
);
```

- [ ] **Step 6: auto_cancelled (line 866 블록 직후)**

```ts
void sendBuyerSms(
  order.buyer_phone,
  'auto_cancelled',
  { buyerName: order.buyer_name ?? '', artworkTitle: '', amount: 0 },
  extractBuyerLocale(order.metadata),
  order.order_no ?? undefined
);
```

- [ ] **Step 7: Verify**

Run: `npm run type-check`
Expected: 에러 없음. (각 블록에서 사용하는 order 변수가 `buyer_phone`·`metadata`·`order_no`를 갖는지 select 재확인. 누락 시 해당 select에 컬럼 추가)

- [ ] **Step 8: Commit**

```bash
git add app/actions/admin-orders.ts
git commit -m "feat(sms): send SMS on admin order status changes

요약: 관리자 환불·배송·배송완료·입금확인·취소 시 구매자 SMS 병행 발송"
```

---

## Task 9: order-lookup.ts 배선 (2곳)

**Files:**

- Modify: `app/actions/order-lookup.ts:618` (auto_cancelled), `:745` (refunded)

이 두 호출처는 `info`(= `getOrderNotificationInfo` 결과, `info.buyerPhone` 보유)와 `order` 객체를 함께 사용한다. 전화번호는 `info?.buyerPhone`을 우선 사용한다.

- [ ] **Step 1: import 추가**

notify import 다음 줄:

```ts
import { sendBuyerSms } from '@/lib/sms/buyer-sms';
```

- [ ] **Step 2: auto_cancelled (line 618 블록 직후)**

`void sendBuyerEmail(order.buyer_email, 'auto_cancelled', {...})` 닫는 `);` 다음:

```ts
void sendBuyerSms(
  info?.buyerPhone,
  'auto_cancelled',
  {
    buyerName: order.buyer_name ?? '',
    artworkTitle: info?.artworkTitle ?? '',
    amount: order.total_amount,
  },
  extractBuyerLocale(order.metadata),
  order.order_no
);
```

- [ ] **Step 3: refunded (line 745 블록 직후)**

`void sendBuyerEmail(order.buyer_email, 'refunded', {...})` 닫는 `);` 다음. 이 블록에서 `getOrderNotificationInfo` 결과 변수명이 `info`가 아니면 해당 블록 email 호출이 `artworkTitle`에 쓰는 동일 변수를 사용한다. 전화번호 소스가 블록에 없으면 `order.buyer_phone`을 select에 추가(현 select 확인)하거나 `getOrderNotificationInfo` 결과의 `buyerPhone`을 사용:

```ts
void sendBuyerSms(
  info?.buyerPhone,
  'refunded',
  { buyerName: order.buyer_name ?? '', artworkTitle: '', amount: order.total_amount },
  extractBuyerLocale(order.metadata),
  order.order_no
);
```

> 구현자 주의: line 745 블록의 실제 변수 스코프를 읽고 `info`/`order` 식별자를 그 블록에 맞춰 교정한다. info가 없으면 그 직전에 `const info = await getOrderNotificationInfo(adminClient, { id: order.id });`가 이미 호출됐는지 확인 후 재사용.

- [ ] **Step 4: Verify**

Run: `npm run type-check`
Expected: 에러 없음.

- [ ] **Step 5: Commit**

```bash
git add app/actions/order-lookup.ts
git commit -m "feat(sms): send SMS on buyer self-cancel and refund

요약: 구매자 셀프취소·환불 시 SMS 병행 발송"
```

---

## Task 10: checkout.ts + expire-stale-orders 배선 (2곳)

**Files:**

- Modify: `app/actions/checkout.ts:588` (virtual_account_issued)
- Modify: `app/api/internal/expire-stale-orders/route.ts:154` (auto_cancelled)

- [ ] **Step 1: checkout.ts — import + 배선**

notify import 다음 줄에 `import { sendBuyerSms } from '@/lib/sms/buyer-sms';` 추가.

`void sendBuyerEmail(input.buyerEmail..., 'virtual_account_issued', {...})` 닫는 `);` 다음에 추가. 이 블록은 raw 입력(`input.buyerPhone`)을 보유한다:

```ts
void sendBuyerSms(
  input.buyerPhone,
  'virtual_account_issued',
  {
    buyerName: input.buyerName ?? '',
    artworkTitle: '',
    amount: /* email 호출에 쓰인 동일 amount 식별자 */ 0,
    virtualAccount: {
      /* email 호출의 virtualAccount data와 동일 소스 복사 */
    },
  },
  'ko'
  /* 생성된 order_no가 스코프에 있으면 전달, 없으면 생략 */
);
```

> 구현자 주의: line 588 블록을 읽고 email이 `amount`·`virtualAccount`·`orderNo`에 넘기는 실제 식별자를 그대로 복사한다. locale은 이 경로가 항상 'ko'면 'ko' 유지, 아니면 email과 동일 locale 식별자 사용.

- [ ] **Step 2: expire-stale-orders — import + 배선**

notify import 다음 줄에 `import { sendBuyerSms } from '@/lib/sms/buyer-sms';` 추가.

line 154 `void sendBuyerEmail(expiredOrder.buyer_email, 'auto_cancelled', {...})` 닫는 `);` 다음. 전화번호는 `info`(= `depositInfoById.get(expiredOrder.id)`)의 `buyerPhone` 사용 (expiredOrder select에는 buyer_phone 없음):

```ts
void sendBuyerSms(
  info?.buyerPhone,
  'auto_cancelled',
  {
    buyerName: expiredOrder.buyer_name ?? '',
    artworkTitle: info?.artworkTitle ?? '',
    amount: expiredOrder.total_amount ?? 0,
  },
  extractBuyerLocale(expiredOrder.metadata),
  expiredOrder.order_no
);
```

> `info`는 line 152 `const info = depositInfoById.get(expiredOrder.id);`로 이미 정의됨. `extractBuyerLocale`가 import 안 돼 있으면 notify import에 추가.

- [ ] **Step 3: Verify**

Run: `npm run type-check`
Expected: 에러 없음.

- [ ] **Step 4: Commit**

```bash
git add app/actions/checkout.ts app/api/internal/expire-stale-orders/route.ts
git commit -m "feat(sms): send SMS on checkout VA issue and stale order expiry

요약: 체크아웃 가상계좌 발급·만료주문 자동취소 시 SMS 병행 발송"
```

---

## Task 11: 전체 검증

- [ ] **Step 1: 전체 테스트**

Run: `npm test -- sms`
Expected: phone/solapi/buyer-sms 3개 스위트 모두 PASS

- [ ] **Step 2: 타입·린트·빌드**

Run: `npm run type-check && npm run lint && npm run build`
Expected: 모두 통과 (SSG 호환 확인)

- [ ] **Step 3: 최종 푸시**

```bash
git push -u origin feat/buyer-sms-notifications
```

> 이후 PR 생성·머지는 사용자 정책에 따라 진행. Solapi env(키·발신번호)가 프로덕션 Vercel에 등록되기 전까지 SMS는 no-op이므로 머지 자체는 안전.

---

## Self-Review 체크 결과

- **스펙 커버리지:** phone 정규화(T1)·Solapi 클라이언트(T2)·sms_logs(T3)·디스패처+본문(T4)·env(T5)·트리거 13곳(T6~T10: 2+2+5+2+2=13)·검증(T11). 스펙의 모든 섹션이 태스크에 매핑됨.
- **트리거 13곳 합계:** confirm 2 + webhook 2 + admin-orders 5 + order-lookup 2 + checkout 1 + expire-stale 1 = 13 = `grep` 집계와 일치.
- **타입 일관성:** `BuyerSmsType`·`BuyerSmsData`·`sendBuyerSms(phone, type, data, locale?, orderNo?)`·`sendSolapiSms({to,text})`·`buildSmsText(type,data)`·`normalizeKoreanMobile(raw)` 전 태스크 동일 시그니처.
- **플레이스홀더:** T6·T10에 "email 호출부의 동일 식별자 사용" 지시가 있으나, 이는 호출처마다 변수명이 다를 수 있는 기존 코드에 맞추라는 구현 지침이며 각 위치의 정확한 라인 앵커·기대 코드를 제공함. 구현 시 해당 블록을 읽어 식별자만 맞추면 됨.
