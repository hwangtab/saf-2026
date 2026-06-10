# SMS PR-2 — Kakao AlimTalk-First Transactional Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the 7 transactional buyer messages to "Kakao AlimTalk first, automatic SMS/LMS fallback" via Solapi, while degrading safely to plain SMS whenever the sender profile or a per-type template ID is not configured.

**Architecture:** A new `sendSolapiAlimTalk` in `lib/sms/solapi.ts` mirrors `sendSolapiSms` (same endpoint, HMAC auth, 5s timeout, 429/5xx single retry, no-op-when-unconfigured, statusCode `'2000'` parsing) but adds a `kakaoOptions` object (`pfId`, `templateId`, `disableSms: false`, `variables`, optional `buttons`). When `SOLAPI_KAKAO_PF_ID` or the per-type `templateId` is missing, it delegates to `sendSolapiSms({ to, text })` so the existing no-op contract is preserved. `lib/sms/buyer-sms.ts` gains a per-`BuyerSmsType` template-ID env lookup plus a variables builder, and `sendBuyerSms` routes to AlimTalk when a template is configured (logging `provider='kakao'`) and to plain SMS otherwise (logging `provider='solapi'`). No DB migration is required — `sms_logs.provider` and `sms_logs.segment` are unconstrained `text` columns (verified in `types/supabase.ts` L1731/L1733).

**Tech Stack:** TypeScript (strict), Node `crypto` HMAC-SHA256, `fetch` with `AbortController`, Jest (`@jest-environment node`), Solapi Messages v4 API, Supabase admin client (`sms_logs` insert).

**Depends on:** **PR-1** (Phase 1 + Phase 2). PR-1 changed `buildSmsText(type, data, locale?)` to accept a `locale` argument and removed the internal `if (locale === 'en') return;` early-skip in `sendBuyerSms`. This plan builds on that signature — `buildSmsText(type, data, locale)` is the source of the AlimTalk fallback text. Do not start PR-2 until PR-1 is merged.

---

## Verified repository facts (read before coding)

- **`lib/sms/solapi.ts`** — `sendSolapiSms({ to, text })` returns `{ ok, messageId?, segment?, error? }`. Endpoint constant `SOLAPI_ENDPOINT = 'https://api.solapi.com/messages/v4/send'` (L3). Env: `SOLAPI_API_KEY`, `SOLAPI_API_SECRET`, `SOLAPI_SENDER` (L18–20). No-op returns `{ ok: false, error: 'not-configured' }` (L21). HMAC header format `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}` (L32). 5s timeout via `AbortController` (L34–35). statusCode `'2000'` parse (L53–57). 429/5xx single retry (L65–69). `SolapiResult.segment` is typed `'SMS' | 'LMS' | 'MMS'` (L8) — this must widen to include `'ATA'` for AlimTalk.
- **`lib/sms/buyer-sms.ts`** — `BuyerSmsType` union of 7 (L5–12). `BuyerSmsData` (L14–21). `buildSmsText` switch (L26–54). `sendBuyerSms` normalizes via `normalizeKoreanMobile` (L70), calls `sendSolapiSms` (L74), best-effort inserts into `sms_logs` with `provider: 'solapi'` (L82), `provider_message_id`, `status`, `segment`, `error` (L79–88), never throws (L92–94).
- **`lib/sms/phone.ts`** — `normalizeKoreanMobile(raw)` returns `'01012345678'` form or `null` (010 11-digit only).
- **`types/supabase.ts` L1725–1763** — `sms_logs` Row/Insert/Update: `provider: string`, `segment: string | null`, `status: string`, `type: string`, all plain text. **No CHECK constraint → no migration for `'kakao'`/`'ATA'`.**
- **`__tests__/lib/sms/solapi.test.ts`** — `@jest-environment node`, sets `SOLAPI_API_KEY`/`SOLAPI_API_SECRET`/`SOLAPI_SENDER` in `beforeEach`, restores `process.env` in `afterEach`, `mockFetchOnce(status, body)` helper returns `{ ok, status, text }`.
- **`__tests__/lib/sms/buyer-sms.test.ts`** — mocks `@/lib/sms/solapi` and `@/lib/auth/server`; `fakeAdminClient()` returns `{ client: { from: () => ({ insert }) }, insert }`.

## Solapi AlimTalk mechanism (verified — bake into code)

- Same endpoint `https://api.solapi.com/messages/v4/send`, same HMAC-SHA256 auth.
- Body shape: `{ message: { to, from, text, kakaoOptions: { pfId, templateId, disableSms: false, variables, buttons? } } }`.
- `variables` map **keys include the `#{ }` delimiters**, e.g. `{ "#{name}": "홍길동" }`; **all values are strings**.
- `disableSms: false` (default) ⇒ AlimTalk failure auto-fails-over to SMS/LMS using `message.text`. `message.from` must be the registered sender (`SOLAPI_SENDER`).
- AlimTalk is **informational** (정보성): no friend-add or marketing consent required, no night-time restriction. Template must be pre-approved by Kakao. (Friend-talk/광고성 is out of scope.)
- **Graceful degrade:** if `SOLAPI_KAKAO_PF_ID` env OR the per-type `templateId` is missing → call `sendSolapiSms({ to, text })` (preserves no-op-when-unconfigured).
- **Provider/segment logging:** AlimTalk path logs `sms_logs.provider = 'kakao'`; the Solapi single-send response `type` for AlimTalk is `'ATA'`, recorded in `segment`.

> ⚠️ **INLINE RISK (carry forward to live test):** Solapi docs are inconsistent about whether the SMS fallback body comes from `message.text` or `kakaoOptions.replacements`. This plan uses **`message.text`** (matches the SDK and single-send API). After templates are approved, send one real AlimTalk to a number where the template is intentionally invalid and confirm the fallback SMS body matches `message.text`. If it does not, switch the fallback body field — the rest of the code is unaffected.

---

## Task 1 — `KakaoButton` type + `sendSolapiAlimTalk` in `lib/sms/solapi.ts` (with SMS degrade)

**Files:**

- Modify: `lib/sms/solapi.ts` (widen `SolapiResult.segment` at L8; append `KakaoButton` interface + `sendSolapiAlimTalk` after `sendSolapiSms` ends at L84)
- Modify: `__tests__/lib/sms/solapi.test.ts` (append a new `describe('sendSolapiAlimTalk', ...)` block after L70)

### Steps

- [ ] **1.1 — Write failing tests.** Append the following block to `__tests__/lib/sms/solapi.test.ts` (after the closing `});` of the `sendSolapiSms` describe at L70). It imports `sendSolapiAlimTalk` (add to the top import) and asserts: (a) AlimTalk body carries `kakaoOptions` with `#{}` variable keys + `disableSms:false`; (b) degrade to plain SMS when `SOLAPI_KAKAO_PF_ID` missing; (c) degrade when `templateId` empty; (d) statusCode `'2000'`/`type:'ATA'` parsing; (e) `buttons` included when passed; (f) no-op when core Solapi env missing.

  First change the import line at the top of the file from:

  ```ts
  import { sendSolapiSms } from '@/lib/sms/solapi';
  ```

  to:

  ```ts
  import { sendSolapiSms, sendSolapiAlimTalk } from '@/lib/sms/solapi';
  ```

  Then append:

  ```ts
  describe('sendSolapiAlimTalk', () => {
    beforeEach(() => {
      process.env.SOLAPI_API_KEY = 'key';
      process.env.SOLAPI_API_SECRET = 'secret';
      process.env.SOLAPI_SENDER = '0287654321';
      process.env.SOLAPI_KAKAO_PF_ID = 'PF001';
    });
    afterEach(() => {
      process.env = { ...ORIGINAL_ENV };
      jest.restoreAllMocks();
    });

    it('kakaoOptions(pfId·templateId·disableSms·#{} variables)를 포함한 body를 전송한다', async () => {
      const fetchSpy = mockFetchOnce(200, { statusCode: '2000', messageId: 'K1', type: 'ATA' });
      global.fetch = fetchSpy as unknown as typeof fetch;
      const r = await sendSolapiAlimTalk({
        to: '01012345678',
        text: '[씨앗페] 홍길동님 결제 완료',
        templateId: 'TMPL_PAY',
        variables: { '#{name}': '홍길동' },
      });
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('https://api.solapi.com/messages/v4/send');
      expect((init.headers as Record<string, string>).Authorization).toMatch(
        /^HMAC-SHA256 apiKey=key, date=.+, salt=.+, signature=[a-f0-9]+$/
      );
      expect(JSON.parse(init.body as string)).toEqual({
        message: {
          to: '01012345678',
          from: '0287654321',
          text: '[씨앗페] 홍길동님 결제 완료',
          kakaoOptions: {
            pfId: 'PF001',
            templateId: 'TMPL_PAY',
            disableSms: false,
            variables: { '#{name}': '홍길동' },
          },
        },
      });
      expect(r.ok).toBe(true);
      expect(r.messageId).toBe('K1');
      expect(r.segment).toBe('ATA');
    });

    it('buttons가 주어지면 kakaoOptions.buttons에 포함한다', async () => {
      const fetchSpy = mockFetchOnce(200, { statusCode: '2000', messageId: 'K2', type: 'ATA' });
      global.fetch = fetchSpy as unknown as typeof fetch;
      await sendSolapiAlimTalk({
        to: '01012345678',
        text: 'fallback',
        templateId: 'TMPL_SHIP',
        buttons: [
          { buttonName: '배송조회', buttonType: 'WL', linkMo: 'https://m', linkPc: 'https://p' },
        ],
      });
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
      expect(body.message.kakaoOptions.buttons).toEqual([
        { buttonName: '배송조회', buttonType: 'WL', linkMo: 'https://m', linkPc: 'https://p' },
      ]);
    });

    it('SOLAPI_KAKAO_PF_ID 미설정 시 sendSolapiSms로 degrade (kakaoOptions 없음)', async () => {
      delete process.env.SOLAPI_KAKAO_PF_ID;
      const fetchSpy = mockFetchOnce(200, { statusCode: '2000', messageId: 'M9', type: 'SMS' });
      global.fetch = fetchSpy as unknown as typeof fetch;
      const r = await sendSolapiAlimTalk({
        to: '01012345678',
        text: 'fallback text',
        templateId: 'TMPL_PAY',
      });
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
      expect(body).toEqual({
        message: { to: '01012345678', from: '0287654321', text: 'fallback text' },
      });
      expect(r.ok).toBe(true);
      expect(r.segment).toBe('SMS');
    });

    it('templateId가 빈 문자열이면 sendSolapiSms로 degrade', async () => {
      const fetchSpy = mockFetchOnce(200, { statusCode: '2000', messageId: 'M10', type: 'SMS' });
      global.fetch = fetchSpy as unknown as typeof fetch;
      const r = await sendSolapiAlimTalk({ to: '01012345678', text: 'fb', templateId: '' });
      const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
      expect(body.message.kakaoOptions).toBeUndefined();
      expect(r.ok).toBe(true);
    });

    it('core Solapi env 미설정 시 no-op (fetch 미호출, not-configured)', async () => {
      delete process.env.SOLAPI_API_KEY;
      const fetchSpy = jest.fn();
      global.fetch = fetchSpy as unknown as typeof fetch;
      const r = await sendSolapiAlimTalk({ to: '01012345678', text: 'hi', templateId: 'TMPL_PAY' });
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(r).toEqual({ ok: false, error: 'not-configured' });
    });

    it('5xx는 1회 재시도 후 실패 반환 (alimtalk 경로)', async () => {
      const fetchSpy = jest
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'err' })
        .mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'err' });
      global.fetch = fetchSpy as unknown as typeof fetch;
      const r = await sendSolapiAlimTalk({ to: '01012345678', text: 'hi', templateId: 'TMPL_PAY' });
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(r.ok).toBe(false);
    });
  });
  ```

- [ ] **1.2 — Run the test, expect FAIL** (import resolves to nothing / `sendSolapiAlimTalk is not a function`):

  ```bash
  npm test -- __tests__/lib/sms/solapi.test.ts
  ```

  Expected: FAIL — `sendSolapiAlimTalk` is not exported.

- [ ] **1.3 — Minimal implementation.** First widen the `segment` type on `SolapiResult`. In `lib/sms/solapi.ts`, change L8 from:

  ```ts
    segment?: 'SMS' | 'LMS' | 'MMS';
  ```

  to:

  ```ts
    segment?: 'SMS' | 'LMS' | 'MMS' | 'ATA';
  ```

  Then append the `KakaoButton` interface and `sendSolapiAlimTalk` function at the end of the file (after the closing `}` of `sendSolapiSms` at L84). This function shares the exact HMAC/timeout/retry/`'2000'`-parse logic as `sendSolapiSms`, only adding the `kakaoOptions` object and the degrade branch:

  ```ts
  /**
   * 카카오 알림톡 버튼. WL=웹링크, AL=앱링크, DS=배송조회, BK=봇키워드, MD=메시지전달.
   * 트랜잭션 템플릿은 대부분 버튼 없음 — 옵셔널.
   */
  export interface KakaoButton {
    buttonName: string;
    buttonType: 'WL' | 'AL' | 'DS' | 'BK' | 'MD';
    linkMo?: string;
    linkPc?: string;
    linkAnd?: string;
    linkIos?: string;
  }

  /**
   * Solapi 카카오 알림톡 단건 발송 (알림톡 우선 → 실패 시 SMS/LMS 자동대체).
   * sendSolapiSms와 동일 철학: env 미설정 시 no-op, never throw, 5초 타임아웃, 429/5xx 1회 재시도.
   *
   * - 같은 엔드포인트·HMAC 인증. message에 kakaoOptions만 추가.
   * - disableSms:false(기본) → 알림톡 실패 시 Solapi가 message.text를 SMS/LMS로 자동 재발송.
   * - SOLAPI_KAKAO_PF_ID 또는 templateId 미설정 → sendSolapiSms({ to, text })로 graceful degrade.
   * - variables 키는 #{name} 형태로 #{} 포함, 값은 문자열.
   */
  export async function sendSolapiAlimTalk(opts: {
    to: string;
    text: string;
    templateId: string;
    variables?: Record<string, string>;
    buttons?: KakaoButton[];
  }): Promise<SolapiResult> {
    const apiKey = process.env.SOLAPI_API_KEY;
    const apiSecret = process.env.SOLAPI_API_SECRET;
    const from = process.env.SOLAPI_SENDER;
    if (!apiKey || !apiSecret || !from) return { ok: false, error: 'not-configured' };

    const pfId = process.env.SOLAPI_KAKAO_PF_ID;
    // 발신프로필 또는 템플릿 미등록 → 기존 SMS-only 동작으로 degrade (심사 완료 전 안전)
    if (!pfId || !opts.templateId) {
      return sendSolapiSms({ to: opts.to, text: opts.text });
    }

    const kakaoOptions: {
      pfId: string;
      templateId: string;
      disableSms: boolean;
      variables?: Record<string, string>;
      buttons?: KakaoButton[];
    } = {
      pfId,
      templateId: opts.templateId,
      disableSms: false, // 알림톡 실패 시 message.text를 SMS/LMS로 자동대체
    };
    if (opts.variables) kakaoOptions.variables = opts.variables;
    if (opts.buttons) kakaoOptions.buttons = opts.buttons;

    const body = JSON.stringify({
      message: { to: opts.to, from, text: opts.text, kakaoOptions },
    });

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
          if (parsed.statusCode && parsed.statusCode !== '2000') {
            console.error(`[solapi:alimtalk] non-2000 statusCode: ${raw.slice(0, 300)}`);
            return { ok: false, error: parsed.statusCode };
          }
          return {
            ok: true,
            messageId: parsed.messageId,
            segment: parsed.type as SolapiResult['segment'],
          };
        }

        if (attempt === 0 && (res.status === 429 || res.status >= 500)) {
          console.error(`[solapi:alimtalk] ${res.status}, retrying in 1s: ${raw.slice(0, 200)}`);
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        console.error(`[solapi:alimtalk] returned ${res.status}: ${raw.slice(0, 500)}`);
        return { ok: false, error: `http_${res.status}` };
      } catch (err) {
        clearTimeout(timeout);
        if (attempt === 0) {
          console.error('[solapi:alimtalk] failed, retrying in 1s:', err);
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        console.error('[solapi:alimtalk] send failed after retry:', err);
        return { ok: false, error: 'network' };
      }
    }
    return { ok: false, error: 'unknown' };
  }
  ```

- [ ] **1.4 — Run the test, expect PASS:**

  ```bash
  npm test -- __tests__/lib/sms/solapi.test.ts
  ```

  Expected: PASS — all `sendSolapiSms` tests still green + the 6 new `sendSolapiAlimTalk` tests pass.

- [ ] **1.5 — Type-check:**

  ```bash
  npm run type-check
  ```

  Expected: no errors (the `segment` widening and new function compile under strict mode).

- [ ] **1.6 — Commit:**

  ```bash
  git add lib/sms/solapi.ts __tests__/lib/sms/solapi.test.ts
  git commit -m "feat(sms): add sendSolapiAlimTalk with SMS auto-fallback degrade
  ```

요약: 카카오 알림톡 단건 발송 함수 추가 (발신프로필/템플릿 미설정 시 SMS로 자동 강등)

- sendSolapiAlimTalk: 같은 엔드포인트·HMAC 인증에 kakaoOptions(pfId/templateId/disableSms:false/variables/buttons) 추가
- SOLAPI_KAKAO_PF_ID 또는 templateId 미설정 시 sendSolapiSms로 graceful degrade (no-op 계약 유지)
- KakaoButton 타입 추가, SolapiResult.segment에 'ATA'(알림톡) 허용
- statusCode '2000'·5초 타임아웃·429/5xx 1회 재시도 sendSolapiSms와 동일

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"

````

---

## Task 2 — Per-type template-ID mapping + variables builder + routing in `lib/sms/buyer-sms.ts`

**Files:**
- Modify: `lib/sms/buyer-sms.ts` (add `sendSolapiAlimTalk` import at L3; add `ALIMTALK_TEMPLATE_ENV` map + `alimTalkTemplateId()` + `buildAlimTalkVariables()` after `buildSmsText` ends at L54; route inside `sendBuyerSms` at L70–88)
- Modify: `__tests__/lib/sms/buyer-sms.test.ts` (mock `sendSolapiAlimTalk` in the existing `jest.mock('@/lib/sms/solapi', ...)`; append a `describe('sendBuyerSms — alimtalk routing', ...)` block after L140)

### Background — env var naming contract

Each `BuyerSmsType` maps to env var `SOLAPI_KAKAO_TEMPLATE_<UPPER_SNAKE>` where `<UPPER_SNAKE>` is the type literal uppercased (it is already snake_case):

| BuyerSmsType             | Env var                                          |
| ------------------------ | ------------------------------------------------ |
| `payment_confirmed`      | `SOLAPI_KAKAO_TEMPLATE_PAYMENT_CONFIRMED`        |
| `virtual_account_issued` | `SOLAPI_KAKAO_TEMPLATE_VIRTUAL_ACCOUNT_ISSUED`   |
| `deposit_confirmed`      | `SOLAPI_KAKAO_TEMPLATE_DEPOSIT_CONFIRMED`        |
| `shipped`                | `SOLAPI_KAKAO_TEMPLATE_SHIPPED`                  |
| `delivered`              | `SOLAPI_KAKAO_TEMPLATE_DELIVERED`                |
| `refunded`               | `SOLAPI_KAKAO_TEMPLATE_REFUNDED`                 |
| `auto_cancelled`         | `SOLAPI_KAKAO_TEMPLATE_AUTO_CANCELLED`           |

The map is declared explicitly (not computed by string interpolation) so the TypeScript exhaustiveness of `Record<BuyerSmsType, string>` forces all 7 keys to be present — adding a new `BuyerSmsType` later will fail to compile until its env name is added.

### Steps

- [ ] **2.1 — Write failing tests.** In `__tests__/lib/sms/buyer-sms.test.ts`:

First, update the `jest.mock('@/lib/sms/solapi', ...)` factory (currently L7) to also mock `sendSolapiAlimTalk`, and import it. Change L4 + L7 + L10 region from:

```ts
import { sendSolapiSms } from '@/lib/sms/solapi';
import { createSupabaseAdminClient } from '@/lib/auth/server';

jest.mock('@/lib/sms/solapi', () => ({ sendSolapiSms: jest.fn() }));
jest.mock('@/lib/auth/server', () => ({ createSupabaseAdminClient: jest.fn() }));

const mockSend = sendSolapiSms as jest.MockedFunction<typeof sendSolapiSms>;
````

to:

```ts
import { sendSolapiSms, sendSolapiAlimTalk } from '@/lib/sms/solapi';
import { createSupabaseAdminClient } from '@/lib/auth/server';

jest.mock('@/lib/sms/solapi', () => ({
  sendSolapiSms: jest.fn(),
  sendSolapiAlimTalk: jest.fn(),
}));
jest.mock('@/lib/auth/server', () => ({ createSupabaseAdminClient: jest.fn() }));

const mockSend = sendSolapiSms as jest.MockedFunction<typeof sendSolapiSms>;
const mockAlimTalk = sendSolapiAlimTalk as jest.MockedFunction<typeof sendSolapiAlimTalk>;
```

Then append this describe block after the final `});` of the `sendBuyerSms` describe (L140):

```ts
describe('sendBuyerSms — alimtalk routing', () => {
  const ENV = { ...process.env };
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ENV };
  });
  afterEach(() => {
    process.env = { ...ENV };
  });

  it('템플릿 env 설정 시 알림톡 경로 (provider kakao 로그, #{} 변수)', async () => {
    process.env.SOLAPI_KAKAO_TEMPLATE_PAYMENT_CONFIRMED = 'TMPL_PAY';
    const { client, insert } = fakeAdminClient();
    mockAdmin.mockReturnValue(client as unknown as ReturnType<typeof createSupabaseAdminClient>);
    mockAlimTalk.mockResolvedValue({ ok: true, messageId: 'K1', segment: 'ATA' });

    await sendBuyerSms(
      '010-1234-5678',
      'payment_confirmed',
      { buyerName: '홍길동', artworkTitle: '들꽃', amount: 1500000 },
      'ko',
      'SAF-9'
    );

    expect(mockAlimTalk).toHaveBeenCalledWith({
      to: '01012345678',
      text: "[씨앗페] 홍길동님, '들꽃' 결제(₩1,500,000)가 완료되었습니다. 감사합니다.",
      templateId: 'TMPL_PAY',
      variables: {
        '#{name}': '홍길동',
        '#{title}': '들꽃',
        '#{amount}': '₩1,500,000',
      },
    });
    expect(mockSend).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        order_no: 'SAF-9',
        to_phone: '01012345678',
        type: 'payment_confirmed',
        provider: 'kakao',
        provider_message_id: 'K1',
        status: 'sent',
        segment: 'ATA',
      })
    );
  });

  it('템플릿 env 미설정 시 SMS 경로 (provider solapi)', async () => {
    delete process.env.SOLAPI_KAKAO_TEMPLATE_PAYMENT_CONFIRMED;
    const { client, insert } = fakeAdminClient();
    mockAdmin.mockReturnValue(client as unknown as ReturnType<typeof createSupabaseAdminClient>);
    mockSend.mockResolvedValue({ ok: true, messageId: 'M1', segment: 'SMS' });

    await sendBuyerSms(
      '010-1234-5678',
      'payment_confirmed',
      { buyerName: '홍길동', artworkTitle: '들꽃', amount: 1500000 },
      'ko',
      'SAF-10'
    );

    expect(mockSend).toHaveBeenCalledWith({
      to: '01012345678',
      text: "[씨앗페] 홍길동님, '들꽃' 결제(₩1,500,000)가 완료되었습니다. 감사합니다.",
    });
    expect(mockAlimTalk).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'solapi', provider_message_id: 'M1', segment: 'SMS' })
    );
  });

  it('en locale도 알림톡 본문은 en buildSmsText (PR-1에서 en 스킵 제거됨)', async () => {
    process.env.SOLAPI_KAKAO_TEMPLATE_DELIVERED = 'TMPL_DLV';
    const { client } = fakeAdminClient();
    mockAdmin.mockReturnValue(client as unknown as ReturnType<typeof createSupabaseAdminClient>);
    mockAlimTalk.mockResolvedValue({ ok: true, messageId: 'K2', segment: 'ATA' });

    await sendBuyerSms(
      '01012345678',
      'delivered',
      { buyerName: 'A', artworkTitle: 'Wildflowers', amount: 0 },
      'en'
    );

    expect(mockAlimTalk).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '01012345678',
        templateId: 'TMPL_DLV',
        text: expect.stringContaining('Wildflowers'),
      })
    );
  });

  it('shipped: 운송장 변수 매핑', async () => {
    process.env.SOLAPI_KAKAO_TEMPLATE_SHIPPED = 'TMPL_SHIP';
    const { client } = fakeAdminClient();
    mockAdmin.mockReturnValue(client as unknown as ReturnType<typeof createSupabaseAdminClient>);
    mockAlimTalk.mockResolvedValue({ ok: true, messageId: 'K3', segment: 'ATA' });

    await sendBuyerSms('01012345678', 'shipped', {
      buyerName: '',
      artworkTitle: '들꽃',
      amount: 0,
      carrier: 'CJ대한통운',
      trackingNumber: '123456789',
    });

    expect(mockAlimTalk).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: 'TMPL_SHIP',
        variables: expect.objectContaining({
          '#{title}': '들꽃',
          '#{carrier}': 'CJ대한통운',
          '#{tracking}': '123456789',
        }),
      })
    );
  });

  it('알림톡 실패해도 throw하지 않고 failed 로그 (provider kakao)', async () => {
    process.env.SOLAPI_KAKAO_TEMPLATE_REFUNDED = 'TMPL_REF';
    const { client, insert } = fakeAdminClient();
    mockAdmin.mockReturnValue(client as unknown as ReturnType<typeof createSupabaseAdminClient>);
    mockAlimTalk.mockResolvedValue({ ok: false, error: 'http_400' });

    await expect(
      sendBuyerSms('01012345678', 'refunded', { buyerName: '', artworkTitle: '', amount: 50000 })
    ).resolves.toBeUndefined();
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'kakao', status: 'failed', error: 'http_400' })
    );
  });

  it('비-KR 번호는 알림톡 경로에서도 스킵', async () => {
    process.env.SOLAPI_KAKAO_TEMPLATE_PAYMENT_CONFIRMED = 'TMPL_PAY';
    await sendBuyerSms('02-123-4567', 'payment_confirmed', {
      buyerName: 'A',
      artworkTitle: 'B',
      amount: 1,
    });
    expect(mockAlimTalk).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });
});
```

> Note: the existing `sendBuyerSms` tests at L77–139 do **not** set any `SOLAPI_KAKAO_TEMPLATE_*` env, so they continue to exercise the SMS path (`provider: 'solapi'`) unchanged. Their `mockSend.toHaveBeenCalledWith({ to, text })` assertions remain valid.

- [ ] **2.2 — Run the test, expect FAIL** (`sendSolapiAlimTalk` is now mocked but never called by production code; `provider` still `'solapi'`):

  ```bash
  npm test -- __tests__/lib/sms/buyer-sms.test.ts
  ```

  Expected: FAIL — alimtalk routing tests fail (`mockAlimTalk` not called; `provider` not `'kakao'`).

- [ ] **2.3 — Minimal implementation.** Edit `lib/sms/buyer-sms.ts`.

  First, extend the solapi import (L3) from:

  ```ts
  import { sendSolapiSms } from '@/lib/sms/solapi';
  ```

  to:

  ```ts
  import { sendSolapiAlimTalk, sendSolapiSms } from '@/lib/sms/solapi';
  ```

  Next, insert the template map + helpers immediately after the closing `}` of `buildSmsText` (after L54, before the `sendBuyerSms` doc comment at L56):

  ```ts
  /** BuyerSmsType → 알림톡 템플릿 ID env 변수명. Record로 7종 강제 (누락 시 컴파일 에러). */
  const ALIMTALK_TEMPLATE_ENV: Record<BuyerSmsType, string> = {
    payment_confirmed: 'SOLAPI_KAKAO_TEMPLATE_PAYMENT_CONFIRMED',
    virtual_account_issued: 'SOLAPI_KAKAO_TEMPLATE_VIRTUAL_ACCOUNT_ISSUED',
    deposit_confirmed: 'SOLAPI_KAKAO_TEMPLATE_DEPOSIT_CONFIRMED',
    shipped: 'SOLAPI_KAKAO_TEMPLATE_SHIPPED',
    delivered: 'SOLAPI_KAKAO_TEMPLATE_DELIVERED',
    refunded: 'SOLAPI_KAKAO_TEMPLATE_REFUNDED',
    auto_cancelled: 'SOLAPI_KAKAO_TEMPLATE_AUTO_CANCELLED',
  };

  /** 타입에 매핑된 승인 알림톡 템플릿 ID. env 미설정이면 빈 문자열 → SMS 경로. */
  function alimTalkTemplateId(type: BuyerSmsType): string {
    return process.env[ALIMTALK_TEMPLATE_ENV[type]] ?? '';
  }

  /**
   * 알림톡 변수 맵 구성. 키는 #{name} 형태로 #{} 포함, 값은 문자열.
   * 승인 템플릿의 변수명과 일치해야 함 — 운영자가 템플릿 등록 시 동일 변수명 사용.
   */
  export function buildAlimTalkVariables(
    type: BuyerSmsType,
    data: BuyerSmsData
  ): Record<string, string> {
    switch (type) {
      case 'payment_confirmed':
        return {
          '#{name}': data.buyerName,
          '#{title}': data.artworkTitle,
          '#{amount}': won(data.amount),
        };
      case 'virtual_account_issued': {
        const va = data.virtualAccount ?? {};
        return {
          '#{name}': data.buyerName,
          '#{bank}': va.bankName ?? '',
          '#{account}': va.accountNumber ?? '',
          '#{amount}': won(data.amount),
          '#{due}': va.dueDate ?? '',
        };
      }
      case 'deposit_confirmed':
        return { '#{name}': data.buyerName };
      case 'shipped':
        return {
          '#{title}': data.artworkTitle,
          '#{carrier}': data.carrier ?? '',
          '#{tracking}': data.trackingNumber ?? '',
        };
      case 'delivered':
        return { '#{title}': data.artworkTitle };
      case 'refunded':
        return { '#{amount}': won(data.amount) };
      case 'auto_cancelled':
        return {};
      default: {
        const _exhaustive: never = type;
        return _exhaustive;
      }
    }
  }
  ```

  Then rewrite the body of `sendBuyerSms` to route. Replace the current core (L70–88):

  ```ts
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
  ```

  with:

  ```ts
  const to = normalizeKoreanMobile(phone);
  if (!to) return;

  const text = buildSmsText(type, data, locale);
  const templateId = alimTalkTemplateId(type);

  // 템플릿 매핑 있으면 알림톡 우선(SMS 자동대체), 없으면 기존 SMS-only
  const useAlimTalk = templateId.length > 0;
  const result = useAlimTalk
    ? await sendSolapiAlimTalk({
        to,
        text,
        templateId,
        variables: buildAlimTalkVariables(type, data),
      })
    : await sendSolapiSms({ to, text });

  // best-effort 로그 — 실패해도 무시
  try {
    const admin = createSupabaseAdminClient();
    await admin.from('sms_logs').insert({
      order_no: orderNo ?? null,
      to_phone: to,
      type,
      provider: useAlimTalk ? 'kakao' : 'solapi',
      provider_message_id: result.messageId ?? null,
      status: result.ok ? 'sent' : 'failed',
      segment: result.segment ?? null,
      error: result.ok ? null : (result.error ?? 'unknown'),
    });
  } catch (logErr) {
    console.error(`[buyer-sms:${type}] log insert failed:`, logErr);
  }
  ```

  > Note: `buildSmsText(type, data, locale)` already takes `locale` after PR-1. The fallback text passed to AlimTalk is therefore locale-correct. The `provider` recorded reflects the **intended channel** (`'kakao'` when an AlimTalk send was attempted, even if Solapi internally fell back to SMS) — channel-level fallback is invisible to the app and surfaces only via `segment` (`'ATA'` vs `'SMS'`/`'LMS'` in the Solapi response `type`).

- [ ] **2.4 — Run the test, expect PASS:**

  ```bash
  npm test -- __tests__/lib/sms/buyer-sms.test.ts
  ```

  Expected: PASS — original SMS-path tests (no template env) still green; new alimtalk-routing tests pass.

- [ ] **2.5 — Run the full SMS suite + type-check:**

  ```bash
  npm test -- __tests__/lib/sms/ && npm run type-check
  ```

  Expected: all SMS tests pass; no type errors (`Record<BuyerSmsType, string>` is exhaustive).

- [ ] **2.6 — Commit:**

  ```bash
  git add lib/sms/buyer-sms.ts __tests__/lib/sms/buyer-sms.test.ts
  git commit -m "feat(sms): route transactional sends through AlimTalk when template set
  ```

요약: 트랜잭션 7종을 알림톡 우선 발송으로 라우팅 (템플릿 ID 매핑·변수 빌더 추가, 미설정 시 기존 SMS)

- ALIMTALK*TEMPLATE_ENV: BuyerSmsType→SOLAPI_KAKAO_TEMPLATE*<TYPE> env Record(7종 강제)
- buildAlimTalkVariables: #{name} 형태 #{} 포함 변수 맵 구성
- sendBuyerSms: 템플릿 매핑 있으면 sendSolapiAlimTalk, 없으면 sendSolapiSms — sms_logs.provider 'kakao'/'solapi' 구분
- 폴백 본문은 buildSmsText(type, data, locale) 재사용 (PR-1 locale 시그니처 의존)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"

```

---

## Task 3 — `.env.local.example` AlimTalk variables

**Files:**
- Modify: `.env.local.example` (after the SMS block at L44–47)

### Steps

- [ ] **3.1 — Add the AlimTalk env documentation.** In `.env.local.example`, locate the existing SMS block (L44–47):

```

# SMS 발송 (Solapi). 미설정 시 SMS no-op (이메일은 정상 발송)

# SOLAPI_API_KEY=...

# SOLAPI_API_SECRET=...

# SOLAPI_SENDER=0287654321 # Solapi 콘솔에 사전등록한 발신번호 (숫자만)

```

Insert immediately after the `SOLAPI_SENDER` line (after L47), before the blank line preceding the 소셜 미디어 section:

```

#

# 카카오 알림톡 (트랜잭션 7종, Phase 3). 미설정 시 자동으로 기존 SMS-only 동작 (심사 완료 전 안전)

# - 외부 선행: 카카오 비즈니스 채널 → Solapi 발신프로필(pfId) → 알림톡 템플릿 7종 카카오 심사

# - pfId 또는 해당 타입 템플릿 미등록 시 그 타입만 SMS로 강등 (disableSms:false 자동대체와 별개)

# SOLAPI_KAKAO_PF_ID= # Solapi 발신프로필 pfId

# SOLAPI_KAKAO_TEMPLATE_PAYMENT_CONFIRMED= # 결제완료

# SOLAPI_KAKAO_TEMPLATE_VIRTUAL_ACCOUNT_ISSUED= # 가상계좌 발급

# SOLAPI_KAKAO_TEMPLATE_DEPOSIT_CONFIRMED= # 입금확인

# SOLAPI_KAKAO_TEMPLATE_SHIPPED= # 발송완료

# SOLAPI_KAKAO_TEMPLATE_DELIVERED= # 배송완료

# SOLAPI_KAKAO_TEMPLATE_REFUNDED= # 환불완료

# SOLAPI_KAKAO_TEMPLATE_AUTO_CANCELLED= # 자동취소

````

Use the Edit tool with `old_string` = the existing `SOLAPI_SENDER` line plus the trailing blank line, and `new_string` = that line + the block above + blank line, to insert in place precisely.

- [ ] **3.2 — Verify formatting (Prettier ignores `.env.local.example`, but keep alignment consistent):**

```bash
grep -n "SOLAPI_KAKAO" .env.local.example
````

Expected: 8 lines (1 pfId + 7 templates) printed.

- [ ] **3.3 — Commit:**

  ```bash
  git add .env.local.example
  git commit -m "docs(sms): document AlimTalk pfId and 7 template env vars
  ```

요약: .env.local.example에 카카오 알림톡 발신프로필·템플릿 7종 env 문서화

- SOLAPI*KAKAO_PF_ID + SOLAPI_KAKAO_TEMPLATE*<TYPE> 7종 주석 추가
- 미설정 시 SMS-only 강등 동작 명시 (외부 심사 선행작업 안내)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"

````

---

## Task 4 — Full verification + branch finish

**Files:** none (verification only)

### Steps

- [ ] **4.1 — Run the full SMS test suite:**

```bash
npm test -- __tests__/lib/sms/
````

Expected: PASS — `solapi.test.ts`, `buyer-sms.test.ts`, `phone.test.ts` all green.

- [ ] **4.2 — Lint + type-check:**

  ```bash
  npm run lint && npm run type-check
  ```

  Expected: clean.

- [ ] **4.3 — Production build (SSG safety — `sendBuyerSms` is imported by payment routes/actions):**

  ```bash
  npm run build
  ```

  Expected: build succeeds.

- [ ] **4.4 — Confirm no DB migration was needed.** `sms_logs.provider` (`types/supabase.ts` L1731) and `sms_logs.segment` (L1733) are plain `string`/`string | null` with no CHECK constraint. Writing `provider='kakao'` / `segment='ATA'` requires no schema change. (If a future audit adds a CHECK constraint, this is where it would need `'kakao'`/`'ATA'` added — out of scope for PR-2.)

- [ ] **4.5 — Finish the branch.** Use superpowers:finishing-a-development-branch. Per repo convention (MEMORY: 커밋 후 항상 push·PR이면 머지까지), push the branch and, if a PR is opened, merge to `main` with `gh pr merge --merge`. PR body must end with:

  ```
  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  ```

  Include in the PR description the **live-test follow-up** from the inline risk: after Kakao approves the 7 templates and `SOLAPI_KAKAO_PF_ID` + template IDs are set in Vercel env, send one transactional AlimTalk with an intentionally invalid template to confirm the fallback SMS body equals `message.text` (not `kakaoOptions.replacements`).

---

## Self-review checklist

Maps each PR-2 (spec §3) requirement to the task that satisfies it:

- [ ] **§3 — `sendSolapiAlimTalk` on same endpoint + HMAC + 5s timeout + 429/5xx retry + `'2000'` parse** → Task 1 (steps 1.3).
- [ ] **§3 — body `kakaoOptions: { pfId, templateId, disableSms: false, variables, buttons? }`** → Task 1 (1.3) + asserted in 1.1.
- [ ] **§3 — `variables` keys include `#{ }`, values are strings** → Task 1 (1.1 assertion `{ '#{name}': '홍길동' }`) + Task 2 (`buildAlimTalkVariables`).
- [ ] **§3 — graceful degrade to `sendSolapiSms({ to, text })` when `SOLAPI_KAKAO_PF_ID` or `templateId` missing (no-op contract preserved)** → Task 1 (1.3 degrade branch; 1.1 tests b/c) + Task 2 (`sendBuyerSms` routes to SMS when no template env; 2.1 test "템플릿 env 미설정 시 SMS 경로").
- [ ] **§3 — `KakaoButton` type** → Task 1 (1.3 interface; 1.1 buttons test).
- [ ] **§3 — `SolapiResult.segment` accepts `'ATA'`** → Task 1 (1.3 type widen; 1.1 `r.segment === 'ATA'`).
- [ ] **§3 — per-type template-ID env mapping (`SOLAPI_KAKAO_TEMPLATE_<TYPE>`, 7)** → Task 2 (`ALIMTALK_TEMPLATE_ENV` Record) + Task 3 (env docs).
- [ ] **§3 — `sendBuyerSms` routes AlimTalk when template set vs SMS when unset** → Task 2 (routing in `sendBuyerSms`; 2.1 tests asserting both paths).
- [ ] **§3 — `sms_logs.provider` gains `'kakao'`; `segment` may be `'ATA'`; no DB migration** → Task 2 (`provider: useAlimTalk ? 'kakao' : 'solapi'`) + Task 4 (4.4 verification that columns are unconstrained `text`).
- [ ] **§3 — fallback text reuses `buildSmsText`** → Task 2 (`buildSmsText(type, data, locale)` passed as `text`).
- [ ] **§3 / §6.1 — inline risk: `message.text` vs `kakaoOptions.replacements`** → noted at top "INLINE RISK" + Task 4 (4.5 live-test follow-up in PR body).
- [ ] **§3 — new env vars + `.env.local.example` updated** → Task 3.
- [ ] **Depends on PR-1 (`buildSmsText` locale signature, en-skip removed)** → stated in header + Task 2 (2.1 en test) + 2.3 (`buildSmsText(type, data, locale)`).
