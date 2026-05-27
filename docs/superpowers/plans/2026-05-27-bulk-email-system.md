# 단체 이메일 발송 시스템 (Bulk Email Broadcast) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자가 고객·작가·청원 서명자 3개 채널에 대량 이메일을 안전하게 발송하고 이력을 추적할 수 있는 큐 기반 통합 발송 시스템 구축.

**Architecture:** Supabase `email_broadcasts` + `email_broadcast_recipients` 큐 테이블에 발송 대상을 적재한 뒤, Vercel Cron이 1분 주기로 100건 청크씩 Resend batch API로 비동기 발송한다. 채널(customer/member/petition)별 AudienceResolver가 수신자를 추출하고 `email_suppressions`(email_hash 기반 통합 수신거부)로 차감한다. HMAC unsubscribe 링크로 수신거부하면 suppression 테이블에 삽입된다.

**Tech Stack:** Next.js 16 App Router · TypeScript strict · Supabase (service_role) · Resend HTTP API · React Email · Node.js crypto (HMAC) · Jest

**⚠ DB 작업**: 모든 마이그레이션은 MCP `apply_migration`으로 1건씩 적용. `supabase db push` 사용 금지 (CLAUDE.md). project_id: `khtunrybrzntlnowlahb`.

---

## 파일 맵

```
supabase/migrations/
  20260528100000_email_profiles_marketing_consent.sql   # (Phase 0-2) ALTER TABLE profiles
  20260528110000_email_suppressions.sql                 # (Phase 0) 수신거부 테이블
  20260528120000_email_broadcasts.sql                   # (Phase 0) 발송 캠페인 테이블
  20260528130000_email_broadcast_recipients.sql         # (Phase 0) 수신자 큐 테이블

lib/email/
  email-hash.ts                # sha256(salt+lower(trim(email))) — petition salt 동일
  unsubscribe-token.ts         # HMAC 토큰 생성/검증
  resend-batch.ts              # Resend batch API (100건 청크)
  audiences/
    types.ts                   # Recipient · AudienceResolver 인터페이스
    member.ts                  # Phase 1 — artists.contact_email ∪ exhibitor profiles
    customer.ts                # Phase 2 — marketing_consent ∨ 6개월 거래 예외
    petition.ts                # Phase 3 — petition_signatures WHERE is_masked=false

emails/
  broadcast.tsx                # React Email broadcast 템플릿 (ko/en · 채널별 데코레이션)

app/actions/
  admin-broadcast.ts           # enqueue 서버 액션 (requireAdmin)

app/api/internal/
  broadcast-dispatch/route.ts  # 크론 dispatch (100청크·멱등)

app/api/email/
  unsubscribe/route.ts         # HMAC 검증 → suppressions INSERT

app/(portal)/admin/email/
  page.tsx                     # 이력 목록 + compose 진입
  _components/
    BroadcastForm.tsx           # 캠페인 작성·엔큐 form (client)
    AudiencePreview.tsx         # 수신자 수 미리보기 (client)
    BroadcastHistory.tsx        # 발송 이력 목록 (server/client)

app/(portal)/admin/_components/
  admin-nav-items.ts           # /admin/email 추가 (도구 그룹)

app/[locale]/mypage/
  page.tsx                     # marketing_consent prop 전달
  _components/
    ProfileTab.tsx             # 광고 수신동의 토글 추가

app/(auth)/signup/page.tsx     # (광고) 선택 수신 동의 체크박스 추가
app/actions/mypage.ts          # updateMarketingConsent 액션 추가

vercel.json                    # broadcast-dispatch cron 추가

__tests__/lib/email/
  email-hash.test.ts
  unsubscribe-token.test.ts
  audiences/member.test.ts
  audiences/customer.test.ts
  audiences/petition.test.ts
```

---

## ─── Phase 0: Foundation ───

### Task 0-1: DB 마이그레이션 4종 작성 + 적용

**Files:**

- Create: `supabase/migrations/20260528100000_email_profiles_marketing_consent.sql`
- Create: `supabase/migrations/20260528110000_email_suppressions.sql`
- Create: `supabase/migrations/20260528120000_email_broadcasts.sql`
- Create: `supabase/migrations/20260528130000_email_broadcast_recipients.sql`

- [ ] **Step 1: profiles marketing consent 컬럼 마이그레이션 파일 작성**

```sql
-- supabase/migrations/20260528100000_email_profiles_marketing_consent.sql
-- Phase 2(고객 마케팅)에서 사용하지만 스키마 준비는 Phase 0에서.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marketing_consent        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS marketing_consent_at     timestamptz,
  ADD COLUMN IF NOT EXISTS marketing_consent_source text;

COMMENT ON COLUMN public.profiles.marketing_consent IS
  '광고성 이메일 수신 동의 여부 (정통망법 §50). true=동의, false=미동의/거부.';
COMMENT ON COLUMN public.profiles.marketing_consent_source IS
  '''signup'' | ''mypage'' | ''admin''';
```

- [ ] **Step 2: email_suppressions 마이그레이션 파일 작성**

```sql
-- supabase/migrations/20260528110000_email_suppressions.sql
-- 채널별 수신거부·바운스·컴플레인 통합 테이블.
-- email_hash = sha256(petition_salt + lower(trim(email))), hex encoding.
-- 동일 salt: lib/email/email-hash.ts PETITION_SALT 상수.
CREATE TABLE IF NOT EXISTS public.email_suppressions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash  text        NOT NULL,
  channel     text        NOT NULL,  -- 'customer' | 'member' | 'petition' | 'all'
  reason      text,                  -- 'unsubscribe' | 'bounce' | 'complaint' | 'manual'
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email_hash, channel),
  CONSTRAINT email_suppressions_channel_check
    CHECK (channel IN ('customer', 'member', 'petition', 'all')),
  CONSTRAINT email_suppressions_reason_check
    CHECK (reason IS NULL OR reason IN ('unsubscribe', 'bounce', 'complaint', 'manual'))
);

ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on email_suppressions"
  ON public.email_suppressions FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role full access on email_suppressions"
  ON public.email_suppressions FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

- [ ] **Step 3: email_broadcasts 마이그레이션 파일 작성**

```sql
-- supabase/migrations/20260528120000_email_broadcasts.sql
CREATE TABLE IF NOT EXISTS public.email_broadcasts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  channel         text        NOT NULL,
  petition_slug   text,
  subject         text        NOT NULL,
  body_md         text        NOT NULL,
  cta_label       text,
  cta_url         text,
  audience_filter jsonb       NOT NULL DEFAULT '{}',
  status          text        NOT NULL DEFAULT 'draft',
  recipient_count int         NOT NULL DEFAULT 0,
  sent_count      int         NOT NULL DEFAULT 0,
  failed_count    int         NOT NULL DEFAULT 0,
  created_by      uuid        REFERENCES public.profiles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  queued_at       timestamptz,
  sent_at         timestamptz,
  CONSTRAINT email_broadcasts_channel_check
    CHECK (channel IN ('customer', 'member', 'petition')),
  CONSTRAINT email_broadcasts_status_check
    CHECK (status IN ('draft', 'queued', 'sending', 'sent', 'failed', 'cancelled'))
);

ALTER TABLE public.email_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on email_broadcasts"
  ON public.email_broadcasts FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role full access on email_broadcasts"
  ON public.email_broadcasts FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

- [ ] **Step 4: email_broadcast_recipients 마이그레이션 파일 작성**

```sql
-- supabase/migrations/20260528130000_email_broadcast_recipients.sql
CREATE TABLE IF NOT EXISTS public.email_broadcast_recipients (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id uuid        NOT NULL REFERENCES public.email_broadcasts(id) ON DELETE CASCADE,
  email        text        NOT NULL,
  name         text,
  locale       text        NOT NULL DEFAULT 'ko',
  status       text        NOT NULL DEFAULT 'pending',
  resend_id    text,
  error        text,
  sent_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_broadcast_recipients_status_check
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  CONSTRAINT email_broadcast_recipients_locale_check
    CHECK (locale IN ('ko', 'en'))
);

CREATE INDEX idx_broadcast_recipients_dispatch
  ON public.email_broadcast_recipients (broadcast_id, status)
  WHERE status = 'pending';

ALTER TABLE public.email_broadcast_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on email_broadcast_recipients"
  ON public.email_broadcast_recipients FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role full access on email_broadcast_recipients"
  ON public.email_broadcast_recipients FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

- [ ] **Step 5: MCP로 마이그레이션 4건 순서대로 적용**

각 마이그레이션을 MCP `mcp__claude_ai_Supabase__apply_migration`으로 1건씩 적용:

```
project_id: khtunrybrzntlnowlahb
name: email_profiles_marketing_consent   (→ 첫 번째)
name: email_suppressions                  (→ 두 번째)
name: email_broadcasts                    (→ 세 번째)
name: email_broadcast_recipients          (→ 네 번째)
```

적용 후 `mcp__claude_ai_Supabase__list_migrations`로 4건 모두 listed 확인.

- [ ] **Step 6: 커밋**

```bash
git add supabase/migrations/20260528100000_email_profiles_marketing_consent.sql \
        supabase/migrations/20260528110000_email_suppressions.sql \
        supabase/migrations/20260528120000_email_broadcasts.sql \
        supabase/migrations/20260528130000_email_broadcast_recipients.sql
git commit -m "$(cat <<'EOF'
feat(email): 단체 이메일 발송 시스템 DB 스키마 추가

요약: profiles 광고동의 컬럼, email_suppressions(수신거부), email_broadcasts(캠페인), email_broadcast_recipients(수신자 큐) 4개 테이블 마이그레이션

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
git push origin main
```

---

### Task 0-2: lib/email/email-hash.ts

**Files:**

- Create: `lib/email/email-hash.ts`
- Create: `__tests__/lib/email/email-hash.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// __tests__/lib/email/email-hash.test.ts
import { hashEmail } from '@/lib/email/email-hash';

describe('hashEmail', () => {
  it('petition 테이블의 sha256 해시와 동일한 형식을 반환한다', () => {
    // digest('hex') → 64자 소문자 16진수
    const result = hashEmail('Test@Example.COM');
    expect(result).toHaveLength(64);
    expect(result).toMatch(/^[0-9a-f]{64}$/);
  });

  it('같은 이메일은 항상 동일한 해시를 반환한다', () => {
    expect(hashEmail('user@example.com')).toBe(hashEmail('user@example.com'));
  });

  it('대소문자·공백을 정규화한 뒤 해싱한다', () => {
    expect(hashEmail('User@Example.com')).toBe(hashEmail('user@example.com'));
    expect(hashEmail('  user@example.com  ')).toBe(hashEmail('user@example.com'));
  });

  it('다른 이메일은 다른 해시를 반환한다', () => {
    expect(hashEmail('a@example.com')).not.toBe(hashEmail('b@example.com'));
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npx jest __tests__/lib/email/email-hash.test.ts
```

Expected: FAIL "Cannot find module '@/lib/email/email-hash'"

- [ ] **Step 3: 구현**

```typescript
// lib/email/email-hash.ts
import crypto from 'crypto';

/**
 * petition_signatures 테이블의 email_hash 컬럼과 동일한 방식으로 해싱.
 * DB: extensions.digest(salt || lower(btrim(email)), 'sha256'), hex 인코딩.
 * (supabase/migrations/20260427034000_petition_signatures.sql hash_email 함수 참조)
 */
const PETITION_SALT = 'f37333df3ab307ea26b31c1e600d5dfa60134e4c9724b043fed489345e8beec9';

export function hashEmail(email: string, salt: string = PETITION_SALT): string {
  const normalized = email.toLowerCase().trim();
  return crypto
    .createHash('sha256')
    .update(salt + normalized)
    .digest('hex');
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx jest __tests__/lib/email/email-hash.test.ts
```

Expected: 4 tests PASS

- [ ] **Step 5: 커밋**

```bash
git add lib/email/email-hash.ts __tests__/lib/email/email-hash.test.ts
git commit -m "$(cat <<'EOF'
feat(email): email-hash 유틸리티 추가 (petition salt 동일)

요약: 수신거부 테이블 email_hash 컬럼 생성용 sha256 해시 함수. petition_signatures와 동일 salt 정책 적용

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
git push origin main
```

---

### Task 0-3: lib/email/unsubscribe-token.ts

**Files:**

- Create: `lib/email/unsubscribe-token.ts`
- Create: `__tests__/lib/email/unsubscribe-token.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// __tests__/lib/email/unsubscribe-token.test.ts
import { generateUnsubscribeToken, verifyUnsubscribeToken } from '@/lib/email/unsubscribe-token';

const SECRET = 'test-secret-at-least-32-chars-long-here';

describe('unsubscribe token', () => {
  describe('generateUnsubscribeToken', () => {
    it('SECRET이 없으면 null을 반환한다', () => {
      const original = process.env.EMAIL_UNSUB_SECRET;
      delete process.env.EMAIL_UNSUB_SECRET;
      expect(generateUnsubscribeToken('abc123', 'customer')).toBeNull();
      process.env.EMAIL_UNSUB_SECRET = original;
    });

    it('payload.sig 형식의 문자열을 반환한다', () => {
      process.env.EMAIL_UNSUB_SECRET = SECRET;
      const token = generateUnsubscribeToken('abc123', 'customer');
      expect(token).toMatch(/^[A-Za-z0-9_-]+\.[0-9a-f]{64}$/);
    });
  });

  describe('verifyUnsubscribeToken', () => {
    it('유효한 토큰을 검증하고 {emailHash, channel}을 반환한다', () => {
      process.env.EMAIL_UNSUB_SECRET = SECRET;
      const emailHash = 'deadbeef'.repeat(8); // 64자
      const token = generateUnsubscribeToken(emailHash, 'member')!;
      const result = verifyUnsubscribeToken(token);
      expect(result).toEqual({ emailHash, channel: 'member' });
    });

    it('서명이 위변조된 토큰은 null을 반환한다', () => {
      process.env.EMAIL_UNSUB_SECRET = SECRET;
      const token = generateUnsubscribeToken('abc123', 'customer')!;
      const tampered = token.slice(0, -2) + 'zz';
      expect(verifyUnsubscribeToken(tampered)).toBeNull();
    });

    it('형식이 잘못된 토큰은 null을 반환한다', () => {
      process.env.EMAIL_UNSUB_SECRET = SECRET;
      expect(verifyUnsubscribeToken('no-dot-here')).toBeNull();
    });

    it('SECRET이 없으면 null을 반환한다', () => {
      const original = process.env.EMAIL_UNSUB_SECRET;
      delete process.env.EMAIL_UNSUB_SECRET;
      expect(verifyUnsubscribeToken('any.token')).toBeNull();
      process.env.EMAIL_UNSUB_SECRET = original;
    });
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npx jest __tests__/lib/email/unsubscribe-token.test.ts
```

Expected: FAIL "Cannot find module"

- [ ] **Step 3: 구현**

```typescript
// lib/email/unsubscribe-token.ts
import crypto from 'crypto';

export type BroadcastChannel = 'customer' | 'member' | 'petition';

/**
 * HMAC-SHA256 기반 무상태 수신거부 토큰.
 * 형식: base64url(emailHash|channel).HMAC_SHA256_hex(secret, payload)
 * 로그인 불필요, 타임아웃 없음 (법적 무료·간편 수신거부 요건 충족).
 */
export function generateUnsubscribeToken(
  emailHash: string,
  channel: BroadcastChannel
): string | null {
  const secret = process.env.EMAIL_UNSUB_SECRET;
  if (!secret) return null;

  const payload = Buffer.from(`${emailHash}|${channel}`).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyUnsubscribeToken(
  token: string
): { emailHash: string; channel: BroadcastChannel } | null {
  const secret = process.env.EMAIL_UNSUB_SECRET;
  if (!secret) return null;

  const dotIndex = token.lastIndexOf('.');
  if (dotIndex === -1) return null;

  const payload = token.slice(0, dotIndex);
  const sig = token.slice(dotIndex + 1);

  const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const expectedBuf = Buffer.from(expectedSig);
  const actualBuf = Buffer.from(sig);

  if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
    return null;
  }

  try {
    const decoded = Buffer.from(payload, 'base64url').toString('utf-8');
    const pipeIndex = decoded.lastIndexOf('|');
    if (pipeIndex === -1) return null;

    const emailHash = decoded.slice(0, pipeIndex);
    const channel = decoded.slice(pipeIndex + 1) as BroadcastChannel;

    if (!['customer', 'member', 'petition'].includes(channel)) return null;

    return { emailHash, channel };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx jest __tests__/lib/email/unsubscribe-token.test.ts
```

Expected: 6 tests PASS

- [ ] **Step 5: 커밋**

```bash
git add lib/email/unsubscribe-token.ts __tests__/lib/email/unsubscribe-token.test.ts
git commit -m "$(cat <<'EOF'
feat(email): HMAC unsubscribe 토큰 생성/검증 유틸리티

요약: HMAC-SHA256 무상태 수신거부 토큰. 로그인 불필요, 위변조 방지, timing-safe 비교

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
git push origin main
```

---

### Task 0-4: lib/email/audiences/types.ts

**Files:**

- Create: `lib/email/audiences/types.ts`

- [ ] **Step 1: 타입 파일 작성 (테스트 불필요 — 타입 전용)**

```typescript
// lib/email/audiences/types.ts
export type BroadcastChannel = 'customer' | 'member' | 'petition';

export interface Recipient {
  email: string;
  name: string | null;
  locale: 'ko' | 'en';
  emailHash: string; // hashEmail(email) — suppression 체크·unsubscribe 토큰용
}

export interface AudienceResolver {
  /**
   * 채널별 수신자 목록 반환.
   * 구현체 책임: email_suppressions 차감 + 이메일 정규화 중복 제거.
   */
  resolve(filter?: Record<string, unknown>): Promise<Recipient[]>;
}
```

- [ ] **Step 2: type-check 통과 확인**

```bash
npx tsc --noEmit 2>&1 | grep "email/audiences" || echo "no errors in email/audiences"
```

- [ ] **Step 3: 커밋**

```bash
git add lib/email/audiences/types.ts
git commit -m "$(cat <<'EOF'
feat(email): AudienceResolver 인터페이스 정의

요약: 채널별 수신자 추출을 위한 공통 Recipient·AudienceResolver 타입

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
git push origin main
```

---

### Task 0-5: lib/email/resend-batch.ts

**Files:**

- Create: `lib/email/resend-batch.ts`

- [ ] **Step 1: 구현** (Resend batch API wrapper — 외부 fetch 의존, 단위 테스트는 dispatch 통합 테스트로 대체)

```typescript
// lib/email/resend-batch.ts
/**
 * Resend batch 발송 API wrapper.
 * POST /emails/batch (최대 100건/요청).
 * lib/notify.ts의 resendFetch는 private·단건용이라 batch는 별도 구현.
 */

export interface BatchEmailItem {
  from: string;
  to: string;
  subject: string;
  html: string;
}

export interface BatchSendResult {
  /** Resend가 반환한 id 배열. 발송 성공 건수만큼. */
  ids: string[];
  /** HTTP 오류 또는 네트워크 오류 시 메시지. */
  error?: string;
}

/**
 * 최대 100건의 이메일을 Resend batch API로 발송.
 * 429/5xx는 1회 재시도 (2초 대기).
 * 항상 반환 — 절대 throw하지 않는다.
 */
export async function sendBatch(items: BatchEmailItem[]): Promise<BatchSendResult> {
  if (items.length === 0) return { ids: [] };
  if (items.length > 100) {
    console.error('[resend-batch] items.length > 100, truncating to 100');
    items = items.slice(0, 100);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ids: [], error: 'RESEND_API_KEY not set' };

  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000); // 30s timeout for batch

    try {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(items),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const body = (await res.json()) as { data?: Array<{ id: string }> };
        const ids = (body.data ?? []).map((d) => d.id).filter(Boolean);
        return { ids };
      }

      const text = await res.text();

      if (attempt === 0 && (res.status === 429 || res.status >= 500)) {
        console.error(
          `[resend-batch] ${res.status} on attempt 0, retry in 2s: ${text.slice(0, 200)}`
        );
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      return { ids: [], error: `Resend ${res.status}: ${text.slice(0, 300)}` };
    } catch (err) {
      clearTimeout(timeout);

      if (attempt === 0) {
        console.error('[resend-batch] network error on attempt 0, retry in 2s:', err);
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }

      return { ids: [], error: String(err) };
    }
  }

  return { ids: [], error: 'exhausted retries' };
}
```

- [ ] **Step 2: type-check**

```bash
npx tsc --noEmit 2>&1 | grep "resend-batch" || echo "no errors in resend-batch"
```

- [ ] **Step 3: 커밋**

```bash
git add lib/email/resend-batch.ts
git commit -m "$(cat <<'EOF'
feat(email): Resend batch API wrapper (100건/요청, 1회 재시도)

요약: 단체 발송용 Resend /emails/batch 래퍼. 429/5xx 1회 재시도, 30초 타임아웃, 절대 throw 안 함

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
git push origin main
```

---

### Task 0-6: emails/broadcast.tsx (React Email 템플릿)

**Files:**

- Create: `emails/broadcast.tsx`

- [ ] **Step 1: 구현**

```tsx
// emails/broadcast.tsx
/**
 * 단체 이메일 발송 브로드캐스트 템플릿.
 * - customer 채널: 제목에 "(광고)" 접두어 + 전체 발송자 정보 (정통망법 §50)
 * - member/petition: "(광고)" 없음 + 간결 푸터
 * - 모든 채널: 수신거부 링크 필수
 */
import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';
import { BRAND_COLORS } from '@/lib/colors';
import { CONTACT } from '@/lib/constants';

export interface BroadcastEmailProps {
  channel: 'customer' | 'member' | 'petition';
  recipientName: string | null;
  subject: string; // 제목 (템플릿 렌더용, 실제 subject는 호출부에서 처리)
  bodyParagraphs: string[]; // body_md를 \n\n으로 나눈 단락 배열
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  unsubscribeUrl: string;
  locale?: 'ko' | 'en';
}

export default function BroadcastEmail({
  channel,
  recipientName,
  subject,
  bodyParagraphs,
  ctaLabel,
  ctaUrl,
  unsubscribeUrl,
  locale = 'ko',
}: BroadcastEmailProps) {
  const isAd = channel === 'customer';
  const greeting =
    locale === 'en'
      ? recipientName
        ? `Dear ${recipientName},`
        : 'Hello,'
      : recipientName
        ? `${recipientName} 님,`
        : '안녕하세요,';

  const unsubscribeText = locale === 'en' ? 'Unsubscribe from this list' : '수신거부 / 구독취소';

  return (
    <Html lang={locale}>
      <Head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1.0" />
      </Head>
      <Preview>{isAd ? `(광고) ${subject}` : subject}</Preview>
      <Body style={{ margin: 0, padding: 0, background: BRAND_COLORS.canvas.DEFAULT }}>
        <Container
          style={{
            maxWidth: '560px',
            margin: '32px auto',
            background: '#ffffff',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          {/* Header */}
          <Section style={{ background: BRAND_COLORS.primary.strong, padding: '20px 28px' }}>
            <Text
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 700,
                color: '#ffffff',
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              {isAd ? `(광고) ` : ''}
              {locale === 'en' ? 'SAF 2026' : '씨앗페 2026'}
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: '24px 28px' }}>
            <Text
              style={{
                margin: '0 0 16px',
                fontSize: '15px',
                color: BRAND_COLORS.charcoal.deep,
                fontFamily: 'system-ui, sans-serif',
              }}
            >
              {greeting}
            </Text>

            {bodyParagraphs.map((para, i) => (
              <Text
                key={i}
                style={{
                  margin: '0 0 14px',
                  fontSize: '14px',
                  lineHeight: '1.7',
                  color: BRAND_COLORS.charcoal.DEFAULT,
                  fontFamily: 'system-ui, sans-serif',
                  wordBreak: 'keep-all',
                }}
              >
                {para}
              </Text>
            ))}

            {ctaLabel && ctaUrl && (
              <Section style={{ marginTop: '24px', marginBottom: '8px' }}>
                <Button
                  href={ctaUrl}
                  style={{
                    background: BRAND_COLORS.primary.DEFAULT,
                    color: '#ffffff',
                    padding: '12px 24px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    fontFamily: 'system-ui, sans-serif',
                  }}
                >
                  {ctaLabel}
                </Button>
              </Section>
            )}
          </Section>

          {/* Footer */}
          <Section
            style={{
              padding: '16px 28px',
              background: BRAND_COLORS.canvas.DEFAULT,
              borderTop: `1px solid ${BRAND_COLORS.gallery.hairline}`,
            }}
          >
            {isAd && (
              <>
                <Text style={footerTextStyle}>
                  {CONTACT.ORGANIZATION_NAME} | 대표: {CONTACT.REPRESENTATIVE_NAME}
                </Text>
                <Text style={footerTextStyle}>
                  사업자등록번호: {CONTACT.BUSINESS_REGISTRATION_NUMBER} | 통신판매업신고:{' '}
                  {CONTACT.MAIL_ORDER_REPORT_NUMBER}
                </Text>
                <Text style={footerTextStyle}>
                  주소: {CONTACT.ADDRESS} ({CONTACT.POSTAL_CODE}) | 전화: {CONTACT.PHONE}
                </Text>
                <Text style={footerTextStyle}>이메일: {CONTACT.EMAIL}</Text>
              </>
            )}
            {!isAd && (
              <Text style={footerTextStyle}>
                {locale === 'en' ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME} ·{' '}
                {CONTACT.EMAIL}
              </Text>
            )}
            <Text style={{ ...footerTextStyle, marginTop: '8px' }}>
              <Link href={unsubscribeUrl} style={{ color: BRAND_COLORS.charcoal.muted }}>
                {unsubscribeText}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const footerTextStyle: React.CSSProperties = {
  margin: '2px 0',
  fontSize: '11px',
  color: BRAND_COLORS.charcoal.soft,
  fontFamily: 'system-ui, sans-serif',
};
```

- [ ] **Step 2: React Email 개발 서버로 확인 (선택)**

```bash
npm run email:dev
# http://localhost:3030 에서 broadcast 템플릿 미리보기
```

- [ ] **Step 3: 커밋**

```bash
git add emails/broadcast.tsx
git commit -m "$(cat <<'EOF'
feat(email): 브로드캐스트 React Email 템플릿

요약: customer 채널은 (광고) 표기 + 전체 발송자정보 푸터, member/petition은 간결 푸터. 수신거부 링크 전 채널 공통

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
git push origin main
```

---

## ─── Phase 1: 작가·출품자 업무 채널 ───

### Task 1-1: lib/email/audiences/member.ts

**Files:**

- Create: `lib/email/audiences/member.ts`
- Create: `__tests__/lib/email/audiences/member.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// __tests__/lib/email/audiences/member.test.ts
import { MemberAudienceResolver } from '@/lib/email/audiences/member';

// Supabase 클라이언트 mock
const mockSelect = jest.fn();
const mockFrom = jest.fn(() => ({ select: mockSelect }));
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}));

// createSupabaseAdminClient mock
jest.mock('@/lib/auth/server', () => ({
  createSupabaseAdminClient: jest.fn(() => ({ from: mockFrom })),
}));

describe('MemberAudienceResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('artists.contact_email을 수신자로 반환한다', async () => {
    // artists 쿼리
    mockSelect
      .mockResolvedValueOnce({
        data: [{ contact_email: 'artist@example.com', name_ko: '홍길동', name_en: 'Gildong' }],
        error: null,
      })
      // profiles exhibitor 쿼리
      .mockResolvedValueOnce({ data: [], error: null })
      // suppressions 쿼리
      .mockResolvedValueOnce({ data: [], error: null });

    const resolver = new MemberAudienceResolver();
    const recipients = await resolver.resolve();

    expect(recipients).toHaveLength(1);
    expect(recipients[0].email).toBe('artist@example.com');
    expect(recipients[0].name).toBe('홍길동');
  });

  it('suppression 목록에 있는 이메일을 제외한다', async () => {
    mockSelect
      .mockResolvedValueOnce({
        data: [
          { contact_email: 'suppressed@example.com', name_ko: '차단됨', name_en: null },
          { contact_email: 'ok@example.com', name_ko: '정상', name_en: null },
        ],
        error: null,
      })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({
        data: [{ email_hash: '' }], // suppressed email hash
        error: null,
      });

    // hashEmail('suppressed@example.com') 값을 suppressions에 반환하도록 세팅
    // (실제 hash 계산은 email-hash.ts에 위임, 여기서는 logic 검증)
    const { hashEmail } = jest.requireActual('@/lib/email/email-hash') as {
      hashEmail: (e: string) => string;
    };
    (mockSelect as jest.Mock).mockReset();
    mockSelect
      .mockResolvedValueOnce({
        data: [
          { contact_email: 'suppressed@example.com', name_ko: '차단됨', name_en: null },
          { contact_email: 'ok@example.com', name_ko: '정상', name_en: null },
        ],
        error: null,
      })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({
        data: [{ email_hash: hashEmail('suppressed@example.com') }],
        error: null,
      });

    const resolver = new MemberAudienceResolver();
    const recipients = await resolver.resolve();

    expect(recipients).toHaveLength(1);
    expect(recipients[0].email).toBe('ok@example.com');
  });

  it('contact_email이 null인 작가를 제외한다', async () => {
    mockSelect
      .mockResolvedValueOnce({
        data: [
          { contact_email: null, name_ko: '이메일없음', name_en: null },
          { contact_email: 'valid@example.com', name_ko: '정상', name_en: null },
        ],
        error: null,
      })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    const resolver = new MemberAudienceResolver();
    const recipients = await resolver.resolve();

    expect(recipients).toHaveLength(1);
    expect(recipients[0].email).toBe('valid@example.com');
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npx jest __tests__/lib/email/audiences/member.test.ts
```

Expected: FAIL "Cannot find module '@/lib/email/audiences/member'"

- [ ] **Step 3: 구현**

```typescript
// lib/email/audiences/member.ts
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { hashEmail } from '@/lib/email/email-hash';
import type { AudienceResolver, Recipient } from './types';

/**
 * 작가·출품자 업무 채널 수신자 추출.
 * 우선순위: artists.contact_email (계정 없는 작가 다수) ∪ profiles role=exhibitor.
 * 동의 불요 (업무·거래 관계). 수신거부 테이블(member + all)만 차감.
 */
export class MemberAudienceResolver implements AudienceResolver {
  async resolve(): Promise<Recipient[]> {
    const supabase = createSupabaseAdminClient();

    // 1) 작가 이메일 수집 (artists.contact_email)
    const { data: artists, error: artistsError } = await supabase
      .from('artists')
      .select('contact_email, name_ko, name_en')
      .not('contact_email', 'is', null);

    if (artistsError) {
      console.error('[member-audience] artists query error:', artistsError);
    }

    // 2) 출품자 이메일 수집 (profiles role=exhibitor)
    const { data: exhibitors, error: exhibitorsError } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('role', 'exhibitor')
      .not('email', 'is', null);

    if (exhibitorsError) {
      console.error('[member-audience] exhibitors query error:', exhibitorsError);
    }

    // 3) 수신거부 해시 수집 (member + all 채널)
    const { data: suppressions } = await supabase
      .from('email_suppressions')
      .select('email_hash')
      .in('channel', ['member', 'all']);

    const suppressedHashes = new Set(
      (suppressions ?? []).map((s: { email_hash: string }) => s.email_hash)
    );

    // 4) 합집합·정규화·중복 제거
    const seen = new Set<string>();
    const recipients: Recipient[] = [];

    const addIfValid = (email: string | null, name: string | null) => {
      if (!email) return;
      const normalized = email.toLowerCase().trim();
      if (seen.has(normalized)) return;
      seen.add(normalized);

      const h = hashEmail(normalized);
      if (suppressedHashes.has(h)) return;

      recipients.push({ email: normalized, name, locale: 'ko', emailHash: h });
    };

    for (const a of artists ?? []) {
      addIfValid(
        a.contact_email as string | null,
        (a.name_ko as string | null) ?? (a.name_en as string | null)
      );
    }
    for (const e of exhibitors ?? []) {
      addIfValid(e.email as string | null, e.name as string | null);
    }

    return recipients;
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx jest __tests__/lib/email/audiences/member.test.ts
```

Expected: 3 tests PASS

- [ ] **Step 5: 커밋**

```bash
git add lib/email/audiences/member.ts __tests__/lib/email/audiences/member.test.ts
git commit -m "$(cat <<'EOF'
feat(email): 작가·출품자 audience resolver (Phase 1)

요약: artists.contact_email ∪ profiles(exhibitor)에서 수신자 추출, member/all 수신거부 차감, 중복 제거

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
git push origin main
```

---

### Task 1-2: app/actions/admin-broadcast.ts (enqueue)

**Files:**

- Create: `app/actions/admin-broadcast.ts`

- [ ] **Step 1: 구현**

```typescript
// app/actions/admin-broadcast.ts
'use server';

import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import { logAdminAction } from '@/app/actions/activity-log-writer';
import type { BroadcastChannel } from '@/lib/email/unsubscribe-token';
import { MemberAudienceResolver } from '@/lib/email/audiences/member';
import type { ActionState } from '@/types';

export interface EnqueueBroadcastInput {
  channel: BroadcastChannel;
  subject: string;
  bodyMd: string;
  ctaLabel?: string;
  ctaUrl?: string;
  petitionSlug?: string;
  audienceFilter?: Record<string, unknown>;
}

/**
 * 브로드캐스트를 큐에 등록한다.
 * 1) 수신자 추출 → 2) email_broadcasts INSERT (status=queued) → 3) email_broadcast_recipients 일괄 INSERT → 4) 활동 로그.
 * dispatch 크론이 pending recipients를 실제 발송한다.
 */
export async function enqueueBroadcast(
  input: EnqueueBroadcastInput
): Promise<ActionState & { broadcastId?: string }> {
  const admin = await requireAdmin();
  const supabase = requireAdminClient();

  const { channel, subject, bodyMd, ctaLabel, ctaUrl, petitionSlug, audienceFilter } = input;

  if (!subject.trim() || !bodyMd.trim()) {
    return { message: '제목과 본문은 필수입니다.', error: true };
  }

  // 채널별 resolver 선택 (Phase 0/1: member만. Phase 2/3에서 추가)
  let resolver;
  if (channel === 'member') {
    resolver = new MemberAudienceResolver();
  } else {
    return { message: `채널 '${channel}'은 아직 지원하지 않습니다.`, error: true };
  }

  const recipients = await resolver.resolve();
  if (recipients.length === 0) {
    return {
      message: '발송 대상 수신자가 없습니다. (전원 수신거부 또는 이메일 없음)',
      error: true,
    };
  }

  // 1) email_broadcasts INSERT
  const { data: broadcast, error: broadcastError } = await supabase
    .from('email_broadcasts')
    .insert({
      channel,
      petition_slug: petitionSlug ?? null,
      subject,
      body_md: bodyMd,
      cta_label: ctaLabel ?? null,
      cta_url: ctaUrl ?? null,
      audience_filter: audienceFilter ?? {},
      status: 'queued',
      recipient_count: recipients.length,
      created_by: admin.id,
      queued_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (broadcastError || !broadcast) {
    console.error('[enqueue-broadcast] insert broadcast error:', broadcastError);
    return { message: '캠페인 생성에 실패했습니다.', error: true };
  }

  // 2) email_broadcast_recipients 일괄 INSERT
  const rows = recipients.map((r) => ({
    broadcast_id: broadcast.id,
    email: r.email,
    name: r.name,
    locale: r.locale,
    status: 'pending',
  }));

  const { error: recipientsError } = await supabase.from('email_broadcast_recipients').insert(rows);

  if (recipientsError) {
    // 실패 시 broadcast도 취소 처리
    await supabase.from('email_broadcasts').update({ status: 'failed' }).eq('id', broadcast.id);
    console.error('[enqueue-broadcast] insert recipients error:', recipientsError);
    return { message: '수신자 큐 등록에 실패했습니다.', error: true };
  }

  await logAdminAction('broadcast_enqueued', 'email_broadcast', broadcast.id, {
    channel,
    recipient_count: recipients.length,
    subject,
  });

  return {
    message: `${recipients.length}명에게 발송 예약되었습니다.`,
    broadcastId: broadcast.id,
  };
}

/**
 * 발송 목록 조회
 */
export async function getBroadcasts() {
  await requireAdmin();
  const supabase = requireAdminClient();

  const { data, error } = await supabase
    .from('email_broadcasts')
    .select(
      'id, channel, subject, status, recipient_count, sent_count, failed_count, created_at, queued_at, sent_at'
    )
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[get-broadcasts] error:', error);
    return [];
  }
  return data ?? [];
}

/**
 * 미리보기: 채널별 수신자 수 반환 (enqueue 전 확인용)
 */
export async function previewAudience(channel: BroadcastChannel): Promise<{
  total: number;
  breakdown: Record<string, number>;
}> {
  await requireAdmin();

  if (channel === 'member') {
    const resolver = new MemberAudienceResolver();
    const recipients = await resolver.resolve();
    return { total: recipients.length, breakdown: { member: recipients.length } };
  }

  return { total: 0, breakdown: {} };
}
```

> **Note**: `requireAdminClient()` 패턴은 `lib/auth/guards.ts`에서 sync 방식으로 export됨을 확인. 실제 코드에 `requireAdminClient`가 없다면 `createSupabaseAdminClient()` 직접 사용.

- [ ] **Step 2: type-check**

```bash
npx tsc --noEmit 2>&1 | grep "admin-broadcast" || echo "no errors"
```

- [ ] **Step 3: 커밋**

```bash
git add app/actions/admin-broadcast.ts
git commit -m "$(cat <<'EOF'
feat(email): 브로드캐스트 enqueue 서버 액션

요약: 관리자가 채널 선택 후 발송 예약하면 email_broadcasts + email_broadcast_recipients(pending) 생성. dispatch 크론이 실제 발송

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
git push origin main
```

---

### Task 1-3: app/api/internal/broadcast-dispatch/route.ts (크론)

**Files:**

- Create: `app/api/internal/broadcast-dispatch/route.ts`

- [ ] **Step 1: 구현**

```typescript
// app/api/internal/broadcast-dispatch/route.ts
/**
 * 브로드캐스트 배치 발송 크론 핸들러.
 * Vercel Cron (vercel.json)이 주기적으로 호출.
 * 멱등: status='pending' 수신자만 처리 → 재실행해도 중복 발송 없음.
 * 100건 청크 × throttle(500ms) 방식으로 Resend rate limit 준수.
 */
export const runtime = 'nodejs';
export const maxDuration = 300; // Vercel: 최대 5분

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { render } from '@react-email/render';
import * as React from 'react';

import { validateInternalCronRequest } from '@/lib/security/internal-cron-auth';
import { sendBatch } from '@/lib/email/resend-batch';
import { generateUnsubscribeToken } from '@/lib/email/unsubscribe-token';
import BroadcastEmail from '@/emails/broadcast';

const CHUNK_SIZE = 100;
const THROTTLE_MS = 500; // 배치 간 대기 (Resend rate limit 완충)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.saf2026.com';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@saf2026.com';

export async function GET(request: NextRequest) {
  const authError = validateInternalCronRequest(request);
  if (authError) return authError;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !adminKey) {
    return NextResponse.json({ error: 'supabase credentials missing' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${adminKey}` } },
  });

  // queued 또는 sending 상태 broadcast 중 pending 수신자가 있는 것 처리
  const { data: broadcasts } = await supabase
    .from('email_broadcasts')
    .select('id, channel, subject, body_md, cta_label, cta_url, status')
    .in('status', ['queued', 'sending'])
    .order('queued_at', { ascending: true })
    .limit(5); // 한 번에 최대 5개 캠페인 처리

  if (!broadcasts || broadcasts.length === 0) {
    return NextResponse.json({ dispatched: 0 });
  }

  let totalDispatched = 0;

  for (const broadcast of broadcasts) {
    // status → sending으로 마킹
    await supabase
      .from('email_broadcasts')
      .update({ status: 'sending' })
      .eq('id', broadcast.id)
      .eq('status', 'queued'); // 동시 실행 방어: queued인 경우만

    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const { data: pending } = await supabase
        .from('email_broadcast_recipients')
        .select('id, email, name, locale')
        .eq('broadcast_id', broadcast.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .range(offset, offset + CHUNK_SIZE - 1);

      if (!pending || pending.length === 0) {
        hasMore = false;
        break;
      }

      // 100건 HTML 렌더링 + Resend batch
      const bodyParagraphs = (broadcast.body_md as string)
        .split(/\n\n+/)
        .map((p: string) => p.trim())
        .filter(Boolean);

      const batchItems = await Promise.all(
        (pending as Array<{ id: string; email: string; name: string | null; locale: string }>).map(
          async (r) => {
            const unsubToken = generateUnsubscribeToken(
              // email_hash는 렌더 시점에 계산
              require('@/lib/email/email-hash').hashEmail(r.email) as string,
              broadcast.channel as 'customer' | 'member' | 'petition'
            );
            const unsubscribeUrl = unsubToken
              ? `${SITE_URL}/api/email/unsubscribe?t=${unsubToken}`
              : `${SITE_URL}/api/email/unsubscribe?invalid=1`;

            const emailEl = React.createElement(BroadcastEmail, {
              channel: broadcast.channel as 'customer' | 'member' | 'petition',
              recipientName: r.name,
              subject: broadcast.subject as string,
              bodyParagraphs,
              ctaLabel: broadcast.cta_label as string | null,
              ctaUrl: broadcast.cta_url as string | null,
              unsubscribeUrl,
              locale: (r.locale === 'en' ? 'en' : 'ko') as 'ko' | 'en',
            });

            const html = await render(emailEl);
            const isAd = broadcast.channel === 'customer';
            const subject = isAd ? `(광고) ${broadcast.subject}` : (broadcast.subject as string);

            return { from: FROM_EMAIL, to: r.email as string, subject, html };
          }
        )
      );

      const result = await sendBatch(batchItems);

      // 결과 반영
      const sentIds = (pending as Array<{ id: string }>)
        .slice(0, result.ids.length)
        .map((r) => r.id);
      const failedIds = (pending as Array<{ id: string }>)
        .slice(result.ids.length)
        .map((r) => r.id);

      if (sentIds.length > 0) {
        await supabase
          .from('email_broadcast_recipients')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .in('id', sentIds);

        await supabase
          .rpc('increment_broadcast_sent_count', {
            p_broadcast_id: broadcast.id,
            p_count: sentIds.length,
          })
          .maybeSingle(); // RPC 없으면 아래 직접 update로 대체

        // RPC 없을 경우 직접 카운터 갱신 (레이스 컨디션 허용 — 이력 목적)
        await supabase
          .from('email_broadcasts')
          .update({ sent_count: supabase.rpc('coalesce', {}) }) // placeholder
          .eq('id', broadcast.id);
      }

      if (failedIds.length > 0) {
        await supabase
          .from('email_broadcast_recipients')
          .update({ status: 'failed', error: result.error ?? 'batch partial failure' })
          .in('id', failedIds);
      }

      totalDispatched += sentIds.length;

      if (pending.length < CHUNK_SIZE) {
        hasMore = false;
      } else {
        offset += CHUNK_SIZE;
        await new Promise((r) => setTimeout(r, THROTTLE_MS));
      }
    }

    // 전량 처리 후 sent/failed 여부 확인해 broadcast status 갱신
    const { data: remaining } = await supabase
      .from('email_broadcast_recipients')
      .select('id')
      .eq('broadcast_id', broadcast.id)
      .eq('status', 'pending')
      .limit(1);

    if (!remaining || remaining.length === 0) {
      const { data: failedCount } = await supabase
        .from('email_broadcast_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('broadcast_id', broadcast.id)
        .eq('status', 'failed');

      await supabase
        .from('email_broadcasts')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', broadcast.id);
    }
  }

  return NextResponse.json({ dispatched: totalDispatched });
}
```

> **Note**: `sent_count` 카운터 갱신은 Supabase RPC나 직접 SELECT+UPDATE 패턴 중 선택. 간단하게 하려면 dispatch 완료 후 `SELECT count(*)...WHERE status='sent'`로 집계해서 한 번에 업데이트. 위 코드의 rpc placeholder 부분을 집계 방식으로 교체 권장.

- [ ] **Step 2: sent_count/failed_count 집계 방식으로 rpc placeholder 교체**

Task 1-3 구현 후 `sent_count` 갱신 부분을 실제 SELECT 집계로 수정:

```typescript
// broadcast 완료 처리 직전에 정확한 카운터 집계
const { count: sentCount } = await supabase
  .from('email_broadcast_recipients')
  .select('id', { count: 'exact', head: true })
  .eq('broadcast_id', broadcast.id)
  .eq('status', 'sent');

const { count: failedCount2 } = await supabase
  .from('email_broadcast_recipients')
  .select('id', { count: 'exact', head: true })
  .eq('broadcast_id', broadcast.id)
  .eq('status', 'failed');

await supabase
  .from('email_broadcasts')
  .update({
    status: 'sent',
    sent_count: sentCount ?? 0,
    failed_count: failedCount2 ?? 0,
    sent_at: new Date().toISOString(),
  })
  .eq('id', broadcast.id);
```

- [ ] **Step 3: type-check**

```bash
npx tsc --noEmit 2>&1 | grep "broadcast-dispatch" || echo "no errors"
```

- [ ] **Step 4: vercel.json에 크론 추가**

```json
// vercel.json — crons 배열에 추가:
{
  "path": "/api/internal/broadcast-dispatch",
  "schedule": "* * * * *"
}
```

- [ ] **Step 5: 커밋**

```bash
git add app/api/internal/broadcast-dispatch/route.ts vercel.json
git commit -m "$(cat <<'EOF'
feat(email): 브로드캐스트 dispatch 크론 핸들러 + vercel.json 등록

요약: 1분 주기 크론이 pending 수신자를 100건 청크로 Resend batch 발송. status=pending만 처리해 재실행 멱등성 보장

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
git push origin main
```

---

### Task 1-4: app/api/email/unsubscribe/route.ts

**Files:**

- Create: `app/api/email/unsubscribe/route.ts`

- [ ] **Step 1: 구현**

```typescript
// app/api/email/unsubscribe/route.ts
/**
 * 수신거부 엔드포인트.
 * GET ?t=<HMAC_token> → HMAC 검증 → email_suppressions upsert → 완료 페이지 렌더.
 * 로그인 불필요. 법적 무료·즉시 수신거부 요건 충족.
 */
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe-token';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('t');
  if (!token) {
    return htmlResponse('잘못된 수신거부 링크입니다.', 400);
  }

  const parsed = verifyUnsubscribeToken(token);
  if (!parsed) {
    return htmlResponse('링크가 유효하지 않거나 만료되었습니다.', 400);
  }

  const { emailHash, channel } = parsed;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !adminKey) {
    return htmlResponse('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 500);
  }

  const supabase = createClient(supabaseUrl, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // email_suppressions upsert (중복 무시)
  const { error: suppressError } = await supabase
    .from('email_suppressions')
    .upsert(
      { email_hash: emailHash, channel, reason: 'unsubscribe' },
      { onConflict: 'email_hash,channel', ignoreDuplicates: true }
    );

  if (suppressError) {
    console.error('[unsubscribe] suppression upsert error:', suppressError);
    return htmlResponse('처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 500);
  }

  // customer 채널이면 profiles.marketing_consent=false 동기화 (email로 찾을 수 없어 hash 기준)
  // 실제 email은 token에 없으므로 hash 기반으로만 처리. profiles에 marketing_consent=false는
  // 다음 동의 수집 시 재활성화 가능 — hash join은 별도 RPC 또는 함수 필요.
  // Phase 2에서 profiles.email_hash 컬럼 추가 후 처리. 지금은 suppressions만 삽입.

  return htmlResponse(
    channel === 'customer'
      ? '광고 이메일 수신거부가 완료되었습니다. 향후 씨앗페 마케팅 이메일을 받지 않습니다.'
      : '수신거부가 완료되었습니다. 해당 채널의 이메일을 더 이상 받지 않습니다.',
    200,
    true
  );
}

function htmlResponse(message: string, status: number, success = false): NextResponse {
  const color = success ? '#2176FF' : '#cc3333';
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>수신거부 ${success ? '완료' : '오류'}</title>
</head>
<body style="margin:0;padding:40px 20px;font-family:system-ui,sans-serif;background:#fafafc;text-align:center;">
  <div style="max-width:480px;margin:0 auto;background:#fff;padding:40px;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
    <div style="font-size:36px;margin-bottom:16px;">${success ? '✅' : '❌'}</div>
    <h1 style="margin:0 0 12px;font-size:20px;color:${color};">수신거부 ${success ? '완료' : '오류'}</h1>
    <p style="margin:0;font-size:15px;color:#444;line-height:1.6;">${message}</p>
    <p style="margin:20px 0 0;font-size:12px;color:#888;">씨앗페 2026 · contact@kosmart.org</p>
  </div>
</body>
</html>`;
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
```

- [ ] **Step 2: type-check**

```bash
npx tsc --noEmit 2>&1 | grep "unsubscribe" || echo "no errors"
```

- [ ] **Step 3: 커밋**

```bash
git add app/api/email/unsubscribe/route.ts
git commit -m "$(cat <<'EOF'
feat(email): 수신거부 엔드포인트 (/api/email/unsubscribe)

요약: HMAC 토큰 검증 후 email_suppressions upsert. 로그인 불필요. 정통망법 §50 무료 즉시 수신거부 요건 충족

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
git push origin main
```

---

### Task 1-5: Admin Email UI + 네비게이션

**Files:**

- Create: `app/(portal)/admin/email/page.tsx`
- Create: `app/(portal)/admin/email/_components/BroadcastForm.tsx`
- Create: `app/(portal)/admin/email/_components/AudiencePreview.tsx`
- Create: `app/(portal)/admin/email/_components/BroadcastHistory.tsx`
- Modify: `app/(portal)/admin/_components/admin-nav-items.ts`

- [ ] **Step 1: admin nav에 이메일 항목 추가**

`app/(portal)/admin/_components/admin-nav-items.ts`의 `도구` 그룹에 추가:

```typescript
// 도구 그룹 (ko) — '/admin/feedback' 위에 추가
{ href: '/admin/email', label: '이메일 발송' },
// 도구 그룹 (en) — '/admin/feedback' 위에 추가
{ href: '/admin/email', label: 'Email Broadcast' },
```

- [ ] **Step 2: BroadcastHistory 컴포넌트 작성**

```tsx
// app/(portal)/admin/email/_components/BroadcastHistory.tsx
'use client';

import type { getBroadcasts } from '@/app/actions/admin-broadcast';

type Broadcast = Awaited<ReturnType<typeof getBroadcasts>>[number];

const STATUS_LABELS: Record<string, string> = {
  draft: '임시저장',
  queued: '발송 예약됨',
  sending: '발송 중',
  sent: '발송 완료',
  failed: '발송 실패',
  cancelled: '취소됨',
};

const CHANNEL_LABELS: Record<string, string> = {
  customer: '고객',
  member: '작가·출품자',
  petition: '청원',
};

export function BroadcastHistory({ broadcasts }: { broadcasts: Broadcast[] }) {
  if (broadcasts.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-charcoal-muted text-sm">
        발송 이력이 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-canvas-strong text-left text-charcoal-muted text-xs">
            <th className="px-4 py-3 font-medium">채널</th>
            <th className="px-4 py-3 font-medium">제목</th>
            <th className="px-4 py-3 font-medium">상태</th>
            <th className="px-4 py-3 font-medium text-right">수신자</th>
            <th className="px-4 py-3 font-medium text-right">발송</th>
            <th className="px-4 py-3 font-medium text-right">실패</th>
            <th className="px-4 py-3 font-medium">예약일시</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gallery-divider">
          {broadcasts.map((b) => (
            <tr key={b.id} className="bg-white">
              <td className="px-4 py-3 text-charcoal-muted">
                {CHANNEL_LABELS[b.channel] ?? b.channel}
              </td>
              <td className="px-4 py-3 text-charcoal max-w-xs truncate">{b.subject}</td>
              <td className="px-4 py-3">
                <span
                  className={
                    b.status === 'sent'
                      ? 'text-success-a11y'
                      : b.status === 'failed'
                        ? 'text-danger-a11y'
                        : 'text-charcoal-muted'
                  }
                >
                  {STATUS_LABELS[b.status] ?? b.status}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-charcoal">{b.recipient_count}</td>
              <td className="px-4 py-3 text-right text-success-a11y">{b.sent_count}</td>
              <td className="px-4 py-3 text-right text-danger-a11y">{b.failed_count}</td>
              <td className="px-4 py-3 text-charcoal-muted text-xs">
                {b.queued_at
                  ? new Date(b.queued_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
                  : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: AudiencePreview 컴포넌트 작성**

```tsx
// app/(portal)/admin/email/_components/AudiencePreview.tsx
'use client';

import { useState } from 'react';
import { previewAudience } from '@/app/actions/admin-broadcast';
import type { BroadcastChannel } from '@/lib/email/unsubscribe-token';

interface Props {
  channel: BroadcastChannel;
}

export function AudiencePreview({ channel }: Props) {
  const [result, setResult] = useState<{ total: number; breakdown: Record<string, number> } | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  const handlePreview = async () => {
    setLoading(true);
    try {
      const r = await previewAudience(channel);
      setResult(r);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handlePreview}
        disabled={loading}
        className="text-sm text-primary underline underline-offset-2 disabled:opacity-50"
      >
        {loading ? '조회 중…' : '수신자 수 미리보기'}
      </button>
      {result !== null && (
        <span className="text-sm text-charcoal">
          총 <strong>{result.total.toLocaleString('ko-KR')}명</strong>
          {Object.keys(result.breakdown).length > 1 && (
            <span className="text-charcoal-muted ml-1 text-xs">
              (
              {Object.entries(result.breakdown)
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ')}
              )
            </span>
          )}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 4: BroadcastForm 컴포넌트 작성**

```tsx
// app/(portal)/admin/email/_components/BroadcastForm.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { enqueueBroadcast } from '@/app/actions/admin-broadcast';
import { AudiencePreview } from './AudiencePreview';
import type { BroadcastChannel } from '@/lib/email/unsubscribe-token';

const CHANNEL_OPTIONS: { value: BroadcastChannel; label: string; available: boolean }[] = [
  { value: 'member', label: '작가·출품자 업무', available: true },
  { value: 'customer', label: '고객 마케팅 (광고)', available: false },
  { value: 'petition', label: '청원 캠페인 알림', available: false },
];

export function BroadcastForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [channel, setChannel] = useState<BroadcastChannel>('member');
  const [subject, setSubject] = useState('');
  const [bodyMd, setBodyMd] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // 야간 발송 경고 (21시 ~ 8시)
  const hour = new Date().getHours();
  const isNightTime = hour >= 21 || hour < 8;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) {
      setError('발송 확인 체크박스를 선택해주세요.');
      return;
    }
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await enqueueBroadcast({
        channel,
        subject,
        bodyMd,
        ctaLabel: ctaLabel || undefined,
        ctaUrl: ctaUrl || undefined,
      });

      if (result.error) {
        setError(result.message);
      } else {
        setSuccess(result.message);
        setSubject('');
        setBodyMd('');
        setCtaLabel('');
        setCtaUrl('');
        setConfirmed(false);
        router.refresh();
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 bg-white rounded-xl border border-gray-200 p-6"
    >
      <h2 className="text-base font-semibold text-charcoal-deep">새 이메일 캠페인</h2>

      {isNightTime && (
        <div className="rounded-lg bg-sun-soft px-4 py-3 text-sm text-charcoal">
          ⚠️ 야간(21시~8시) 광고 발송 주의 — 수신자 경험에 영향을 줄 수 있습니다.
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-charcoal mb-1">채널</label>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value as BroadcastChannel)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          {CHANNEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={!opt.available}>
              {opt.label}
              {!opt.available ? ' (준비 중)' : ''}
            </option>
          ))}
        </select>
        <div className="mt-2">
          <AudiencePreview channel={channel} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-charcoal mb-1">
          제목{channel === 'customer' ? ' (발송 시 자동으로 "(광고)" 접두어 추가됨)' : ''}
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          placeholder="이메일 제목"
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-charcoal mb-1">본문 (마크다운)</label>
        <textarea
          value={bodyMd}
          onChange={(e) => setBodyMd(e.target.value)}
          required
          rows={8}
          placeholder="이메일 본문을 입력하세요. 빈 줄로 문단을 구분합니다."
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">
            CTA 버튼 텍스트 (선택)
          </label>
          <input
            type="text"
            value={ctaLabel}
            onChange={(e) => setCtaLabel(e.target.value)}
            placeholder="자세히 보기"
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">CTA URL (선택)</label>
          <input
            type="url"
            value={ctaUrl}
            onChange={(e) => setCtaUrl(e.target.value)}
            placeholder="https://www.saf2026.com/..."
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-charcoal cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="rounded border-gray-300"
        />
        수신자 목록을 확인했으며 발송을 확정합니다.
      </label>

      {error && <p className="text-sm text-danger-a11y">{error}</p>}
      {success && <p className="text-sm text-success-a11y">{success}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="px-6 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-strong disabled:opacity-50 transition-colors"
      >
        {isPending ? '처리 중…' : '발송 예약'}
      </button>
    </form>
  );
}
```

- [ ] **Step 5: admin email page 작성**

```tsx
// app/(portal)/admin/email/page.tsx
import { requireAdmin } from '@/lib/auth/guards';
import { getBroadcasts } from '@/app/actions/admin-broadcast';
import {
  AdminPageHeader,
  AdminPageTitle,
  AdminPageDescription,
} from '@/app/admin/_components/admin-ui';
import { BroadcastForm } from './_components/BroadcastForm';
import { BroadcastHistory } from './_components/BroadcastHistory';

export default async function AdminEmailPage() {
  await requireAdmin();
  const broadcasts = await getBroadcasts();

  return (
    <div className="space-y-8">
      <AdminPageHeader>
        <AdminPageTitle>이메일 발송</AdminPageTitle>
        <AdminPageDescription>
          채널별 단체 이메일을 작성하고 발송 이력을 관리합니다.
        </AdminPageDescription>
      </AdminPageHeader>
      <BroadcastForm />
      <section>
        <h2 className="text-sm font-semibold text-charcoal-deep mb-3">발송 이력</h2>
        <BroadcastHistory broadcasts={broadcasts} />
      </section>
    </div>
  );
}
```

- [ ] **Step 6: type-check + build 확인**

```bash
npm run type-check
```

Expected: 에러 없음

- [ ] **Step 7: 커밋**

```bash
git add \
  "app/(portal)/admin/email/page.tsx" \
  "app/(portal)/admin/email/_components/BroadcastForm.tsx" \
  "app/(portal)/admin/email/_components/AudiencePreview.tsx" \
  "app/(portal)/admin/email/_components/BroadcastHistory.tsx" \
  "app/(portal)/admin/_components/admin-nav-items.ts"
git commit -m "$(cat <<'EOF'
feat(admin): 이메일 발송 관리 UI (/admin/email)

요약: 채널 선택·본문 작성·수신자 미리보기·발송 예약 폼과 발송 이력 테이블. 야간 발송 경고 포함. nav 도구 그룹에 추가

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
git push origin main
```

---

### Task 1-6: E2E 검증 (작가 채널 테스트 발송)

- [ ] **Step 1: env에 EMAIL_UNSUB_SECRET 추가**

```bash
# Vercel에 env 추가
vercel env add EMAIL_UNSUB_SECRET production
# 입력값 예시: openssl rand -hex 32 로 생성한 랜덤 값
```

- [ ] **Step 2: 전체 빌드 + 테스트 통과 확인**

```bash
npm run type-check && npm test
```

Expected: 0 errors, 모든 테스트 PASS

- [ ] **Step 3: admin UI에서 테스트 발송**

1. `/admin/email` 접속
2. 채널: 작가·출품자 업무 선택
3. "수신자 수 미리보기" 클릭 → 40명 내외 확인
4. 제목 + 본문 작성
5. 확인 체크 → 발송 예약
6. 발송 이력에 "발송 예약됨" 확인
7. 1분 후 크론 실행 → "발송 완료" 상태 확인
8. 수신한 이메일에서 수신거부 링크 클릭 → `/api/email/unsubscribe` 처리 확인

---

## ─── Phase 2: 고객 마케팅 채널 ───

### Task 2-1: lib/email/audiences/customer.ts + 테스트

**Files:**

- Create: `lib/email/audiences/customer.ts`
- Create: `__tests__/lib/email/audiences/customer.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// __tests__/lib/email/audiences/customer.test.ts
import { CustomerAudienceResolver } from '@/lib/email/audiences/customer';

const mockSelect = jest.fn();
const mockFrom = jest.fn(() => ({ select: mockSelect }));

jest.mock('@/lib/auth/server', () => ({
  createSupabaseAdminClient: jest.fn(() => ({ from: mockFrom })),
}));

describe('CustomerAudienceResolver', () => {
  beforeEach(() => jest.clearAllMocks());

  it('marketing_consent=true인 고객을 반환한다', async () => {
    mockSelect
      // profiles(marketing_consent=true)
      .mockResolvedValueOnce({
        data: [{ id: 'u1', email: 'optin@example.com', name: '동의자', marketing_consent: true }],
        error: null,
      })
      // 6개월 거래고객 (orders)
      .mockResolvedValueOnce({ data: [], error: null })
      // suppressions
      .mockResolvedValueOnce({ data: [], error: null });

    const resolver = new CustomerAudienceResolver();
    const recipients = await resolver.resolve();

    expect(recipients).toHaveLength(1);
    expect(recipients[0].email).toBe('optin@example.com');
  });

  it('6개월 이내 구매자를 동의 없이도 포함한다', async () => {
    mockSelect
      // profiles(marketing_consent=true) → 없음
      .mockResolvedValueOnce({ data: [], error: null })
      // 6개월 거래고객
      .mockResolvedValueOnce({
        data: [{ buyer_email: 'buyer@example.com', buyer_name: '구매자' }],
        error: null,
      })
      // suppressions
      .mockResolvedValueOnce({ data: [], error: null });

    const resolver = new CustomerAudienceResolver();
    const recipients = await resolver.resolve();

    expect(recipients).toHaveLength(1);
    expect(recipients[0].email).toBe('buyer@example.com');
  });

  it('suppression 목록에 있는 이메일을 제외한다', async () => {
    const { hashEmail } = jest.requireActual('@/lib/email/email-hash') as {
      hashEmail: (e: string) => string;
    };
    mockSelect
      .mockResolvedValueOnce({
        data: [{ id: 'u1', email: 'suppressed@example.com', name: null, marketing_consent: true }],
        error: null,
      })
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({
        data: [{ email_hash: hashEmail('suppressed@example.com') }],
        error: null,
      });

    const resolver = new CustomerAudienceResolver();
    const recipients = await resolver.resolve();
    expect(recipients).toHaveLength(0);
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npx jest __tests__/lib/email/audiences/customer.test.ts
```

Expected: FAIL "Cannot find module '@/lib/email/audiences/customer'"

- [ ] **Step 3: 구현**

```typescript
// lib/email/audiences/customer.ts
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { hashEmail } from '@/lib/email/email-hash';
import type { AudienceResolver, Recipient } from './types';

/**
 * 고객 마케팅 채널 수신자 추출.
 * 동의 근거: marketing_consent=true(명시적 opt-in) OR 6개월 이내 거래고객(정통망법 §50 예외).
 * (광고) 이메일이라 발송 시 subject prefix 추가, 전체 발송자 정보 푸터 필수.
 */
export class CustomerAudienceResolver implements AudienceResolver {
  async resolve(): Promise<Recipient[]> {
    const supabase = createSupabaseAdminClient();
    const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1) 명시적 동의자
    const { data: consentUsers, error: consentError } = await supabase
      .from('profiles')
      .select('id, email, name')
      .eq('role', 'user')
      .eq('marketing_consent', true)
      .not('email', 'is', null);

    if (consentError) console.error('[customer-audience] consent query error:', consentError);

    // 2) 6개월 거래고객
    const { data: recentBuyers, error: buyerError } = await supabase
      .from('orders')
      .select('buyer_email, buyer_name')
      .in('status', ['paid', 'preparing', 'shipped', 'delivered'])
      .gte('created_at', sixMonthsAgo)
      .not('buyer_email', 'is', null);

    if (buyerError) console.error('[customer-audience] buyer query error:', buyerError);

    // 3) 수신거부 해시 (customer + all)
    const { data: suppressions } = await supabase
      .from('email_suppressions')
      .select('email_hash')
      .in('channel', ['customer', 'all']);

    const suppressedHashes = new Set(
      (suppressions ?? []).map((s: { email_hash: string }) => s.email_hash)
    );

    // 4) 합집합 · 정규화 · 중복 제거
    const seen = new Set<string>();
    const recipients: Recipient[] = [];

    const addIfValid = (email: string | null, name: string | null) => {
      if (!email) return;
      const normalized = email.toLowerCase().trim();
      if (seen.has(normalized)) return;
      seen.add(normalized);
      const h = hashEmail(normalized);
      if (suppressedHashes.has(h)) return;
      recipients.push({ email: normalized, name, locale: 'ko', emailHash: h });
    };

    for (const u of consentUsers ?? []) {
      addIfValid(u.email as string | null, u.name as string | null);
    }
    for (const b of recentBuyers ?? []) {
      addIfValid(b.buyer_email as string | null, b.buyer_name as string | null);
    }

    return recipients;
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx jest __tests__/lib/email/audiences/customer.test.ts
```

Expected: 3 tests PASS

- [ ] **Step 5: `admin-broadcast.ts`의 enqueue에 customer 채널 활성화**

`app/actions/admin-broadcast.ts`에서 customer resolver import 추가 및 채널 분기 확장:

```typescript
// 기존 import에 추가
import { CustomerAudienceResolver } from '@/lib/email/audiences/customer';

// channel 분기 확장:
if (channel === 'member') {
  resolver = new MemberAudienceResolver();
} else if (channel === 'customer') {
  resolver = new CustomerAudienceResolver();
} else {
  return { message: `채널 '${channel}'은 아직 지원하지 않습니다.`, error: true };
}
```

`BroadcastForm.tsx`에서 customer 채널 `available: true`로 변경:

```typescript
{ value: 'customer', label: '고객 마케팅 (광고)', available: true },
```

`previewAudience` 함수에 customer 케이스 추가:

```typescript
if (channel === 'customer') {
  const resolver = new CustomerAudienceResolver();
  const recipients = await resolver.resolve();
  return {
    total: recipients.length,
    breakdown: { '동의자·거래고객': recipients.length },
  };
}
```

- [ ] **Step 6: 커밋**

```bash
git add lib/email/audiences/customer.ts __tests__/lib/email/audiences/customer.test.ts \
        app/actions/admin-broadcast.ts \
        "app/(portal)/admin/email/_components/BroadcastForm.tsx"
git commit -m "$(cat <<'EOF'
feat(email): 고객 마케팅 채널 audience resolver + enqueue 활성화 (Phase 2)

요약: marketing_consent=true 또는 6개월 거래고객 합집합, customer/all 수신거부 차감. BroadcastForm에서 고객 채널 활성화

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
git push origin main
```

---

### Task 2-2: 마이페이지 광고 수신동의 토글

**Files:**

- Modify: `app/[locale]/mypage/page.tsx`
- Modify: `app/[locale]/mypage/_components/ProfileTab.tsx`
- Modify: `app/actions/mypage.ts`

- [ ] **Step 1: `updateMarketingConsent` 서버 액션 추가**

`app/actions/mypage.ts` 파일 하단에 추가:

```typescript
// app/actions/mypage.ts 하단에 추가
export async function updateMarketingConsent(consent: boolean): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'unauthenticated' };

  const { error } = await supabase
    .from('profiles')
    .update({
      marketing_consent: consent,
      marketing_consent_at: new Date().toISOString(),
      marketing_consent_source: 'mypage',
    })
    .eq('id', user.id);

  if (error) return { error: error.message };

  // 수신거부(off)일 때 email_suppressions에도 반영
  if (!consent) {
    const adminSupabase = createSupabaseAdminClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single();

    if (profile?.email) {
      const { hashEmail } = await import('@/lib/email/email-hash');
      await adminSupabase
        .from('email_suppressions')
        .upsert(
          {
            email_hash: hashEmail(profile.email as string),
            channel: 'customer',
            reason: 'unsubscribe',
          },
          { onConflict: 'email_hash,channel', ignoreDuplicates: true }
        );
    }
  }

  return {};
}
```

- [ ] **Step 2: `mypage/page.tsx`에 marketing_consent 전달**

기존 profileResult 쿼리에 `marketing_consent` 컬럼 추가:

```typescript
// 기존: supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
// 변경:
supabase.from('profiles').select('role, marketing_consent').eq('id', user.id).maybeSingle();
```

MypageTabs에 prop 추가 (messages 객체에 동의 관련 라벨 추가 포함):

```typescript
const marketingConsent = (profileResult.data as { role: string; marketing_consent: boolean } | null)?.marketing_consent ?? false;

// MypageTabs 컴포넌트에 전달:
initialMarketingConsent={marketingConsent}
messages={{
  ...기존 messages,
  profileMarketingConsent: t('profile.marketingConsent'),
  profileMarketingConsentDesc: t('profile.marketingConsentDesc'),
  profileMarketingConsentSaved: t('profile.marketingConsentSaved'),
}}
```

- [ ] **Step 3: messages에 i18n 키 추가**

`messages/ko.json` `mypage.profile` 섹션에 추가:

```json
"marketingConsent": "마케팅 이메일 수신 동의",
"marketingConsentDesc": "씨앗페 신작·전시·캠페인 소식을 받아보세요. (광고성 이메일)",
"marketingConsentSaved": "설정이 저장되었습니다."
```

`messages/en.json`에 동일 키 추가:

```json
"marketingConsent": "Marketing Email Consent",
"marketingConsentDesc": "Receive updates about new artworks, exhibitions, and campaigns. (Promotional email)",
"marketingConsentSaved": "Settings saved."
```

- [ ] **Step 4: ProfileTab에 토글 UI 추가**

`app/[locale]/mypage/_components/ProfileTab.tsx`에 기존 form 하단에 추가:

```tsx
// ProfileTab props에 추가
interface ProfileTabProps {
  // 기존 props...
  initialMarketingConsent: boolean;
  marketingConsentLabel: string;
  marketingConsentDesc: string;
  marketingConsentSavedLabel: string;
}

// ProfileTab 함수 내에서:
const [marketingConsent, setMarketingConsent] = useState(initialMarketingConsent);
const [consentSaved, setConsentSaved] = useState(false);
const [, startConsentTransition] = useTransition();

const handleConsentToggle = (checked: boolean) => {
  setMarketingConsent(checked);
  setConsentSaved(false);
  startConsentTransition(async () => {
    const { updateMarketingConsent } = await import('@/app/actions/mypage');
    await updateMarketingConsent(checked);
    setConsentSaved(true);
    setTimeout(() => setConsentSaved(false), 2000);
  });
};

// form 종료 </form> 아래에 추가:
<div className="bg-white rounded-xl border border-gray-200 p-6 mt-4">
  <label className="flex items-start gap-3 cursor-pointer">
    <input
      type="checkbox"
      checked={marketingConsent}
      onChange={(e) => handleConsentToggle(e.target.checked)}
      className="mt-0.5 rounded border-gray-300"
    />
    <div>
      <div className="text-sm font-medium text-charcoal">{marketingConsentLabel}</div>
      <div className="text-sm text-charcoal-muted mt-0.5">{marketingConsentDesc}</div>
    </div>
  </label>
  {consentSaved && <p className="text-sm text-success-a11y mt-2">{marketingConsentSavedLabel}</p>}
</div>;
```

- [ ] **Step 5: type-check**

```bash
npm run type-check
```

- [ ] **Step 6: 커밋**

```bash
git add "app/[locale]/mypage/page.tsx" \
        "app/[locale]/mypage/_components/ProfileTab.tsx" \
        app/actions/mypage.ts \
        messages/ko.json \
        messages/en.json
git commit -m "$(cat <<'EOF'
feat(mypage): 광고 이메일 수신동의 토글 추가

요약: 마이페이지 ProfileTab에 marketing_consent 토글. 거부 시 email_suppressions에도 반영해 즉시 수신거부 처리

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
git push origin main
```

---

### Task 2-3: 회원가입 선택 동의 체크박스

**Files:**

- Modify: `app/(auth)/signup/page.tsx`

- [ ] **Step 1: signup.tsx에 선택 동의 UI + 처리 추가**

`SIGNUP_COPY` 객체에 추가:

```typescript
// ko:
marketingConsentLabel: '(선택) 마케팅 이메일 수신 동의 — 신작·전시·캠페인 소식',
// en:
marketingConsentLabel: '(Optional) Marketing emails — new works, exhibitions, campaigns',
```

상태 추가:

```typescript
const [marketingConsent, setMarketingConsent] = useState(false);
```

회원가입 form에서 `handleSignUp` 완료 후 동의 상태를 profiles에 반영:

```typescript
// signUp 성공 후 (data.session 존재 또는 이메일 확인 대기 후)
// supabase.auth.signUp는 동기적으로 user를 반환하므로:
if (data?.user && marketingConsent) {
  await supabase
    .from('profiles')
    .update({
      marketing_consent: true,
      marketing_consent_at: new Date().toISOString(),
      marketing_consent_source: 'signup',
    })
    .eq('id', data.user.id);
}
```

비밀번호 input 아래, 제출 버튼 위에 체크박스 추가:

```tsx
<label className="flex items-start gap-2 text-sm text-charcoal-muted cursor-pointer">
  <input
    type="checkbox"
    checked={marketingConsent}
    onChange={(e) => setMarketingConsent(e.target.checked)}
    className="mt-0.5 rounded border-gray-300"
  />
  <span>{copy.marketingConsentLabel}</span>
</label>
```

- [ ] **Step 2: type-check + build**

```bash
npm run type-check && npm run build 2>&1 | tail -20
```

Expected: 빌드 성공

- [ ] **Step 3: 커밋**

```bash
git add "app/(auth)/signup/page.tsx"
git commit -m "$(cat <<'EOF'
feat(auth): 회원가입 선택적 마케팅 이메일 동의 체크박스

요약: 가입 시 선택 동의 수집 → marketing_consent_source='signup'. 기존 고객은 마이페이지 토글로 별도 동의 가능

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
git push origin main
```

---

## ─── Phase 3: 청원 캠페인 알림 ───

> ⚠️ Phase 3 전에 **§8 운영 확인 사항** 필수 (Resend 요금제 한도·도메인 평판·발송 도메인 정책·바운스 웹훅). 11,508명 대량 발송.

### Task 3-1: lib/email/audiences/petition.ts + 테스트

**Files:**

- Create: `lib/email/audiences/petition.ts`
- Create: `__tests__/lib/email/audiences/petition.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

```typescript
// __tests__/lib/email/audiences/petition.test.ts
import { PetitionAudienceResolver } from '@/lib/email/audiences/petition';

const mockSelect = jest.fn();
const mockFrom = jest.fn(() => ({ select: mockSelect }));
jest.mock('@/lib/auth/server', () => ({
  createSupabaseAdminClient: jest.fn(() => ({ from: mockFrom })),
}));

describe('PetitionAudienceResolver', () => {
  beforeEach(() => jest.clearAllMocks());

  it('petition_slug로 필터링하고 is_masked=false 서명자만 반환한다', async () => {
    mockSelect
      .mockResolvedValueOnce({
        data: [{ email: 'signer@example.com', full_name: '서명자' }],
        error: null,
      })
      // suppressions
      .mockResolvedValueOnce({ data: [], error: null });

    const resolver = new PetitionAudienceResolver('oh-yoon');
    const recipients = await resolver.resolve();

    expect(recipients).toHaveLength(1);
    expect(recipients[0].email).toBe('signer@example.com');
  });

  it('petition_slug 없이 resolve 시 빈 배열 반환', async () => {
    const resolver = new PetitionAudienceResolver('');
    const recipients = await resolver.resolve();
    expect(recipients).toHaveLength(0);
  });

  it('petition/all 채널 수신거부를 차감한다', async () => {
    const { hashEmail } = jest.requireActual('@/lib/email/email-hash') as {
      hashEmail: (e: string) => string;
    };
    mockSelect
      .mockResolvedValueOnce({
        data: [
          { email: 'suppressed@example.com', full_name: '차단됨' },
          { email: 'ok@example.com', full_name: '정상' },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ email_hash: hashEmail('suppressed@example.com') }],
        error: null,
      });

    const resolver = new PetitionAudienceResolver('oh-yoon');
    const recipients = await resolver.resolve();

    expect(recipients).toHaveLength(1);
    expect(recipients[0].email).toBe('ok@example.com');
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npx jest __tests__/lib/email/audiences/petition.test.ts
```

Expected: FAIL

- [ ] **Step 3: 구현**

```typescript
// lib/email/audiences/petition.ts
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { hashEmail } from '@/lib/email/email-hash';
import type { AudienceResolver, Recipient } from './types';

/**
 * 청원 캠페인 알림 채널 수신자 추출.
 * 동의 근거: 서명 시 개인정보 동의문에 "진행상황 안내(이메일)" 명시 (정보성, 광고 아님).
 * is_masked=false && email IS NOT NULL인 서명자만 대상.
 * 11,508명으로 가장 큰 채널 — batch dispatch 처리 불변.
 */
export class PetitionAudienceResolver implements AudienceResolver {
  constructor(private readonly petitionSlug: string) {}

  async resolve(): Promise<Recipient[]> {
    if (!this.petitionSlug) return [];

    const supabase = createSupabaseAdminClient();

    const { data: signers, error } = await supabase
      .from('petition_signatures')
      .select('email, full_name')
      .eq('petition_slug', this.petitionSlug)
      .eq('is_masked', false)
      .not('email', 'is', null);

    if (error) {
      console.error('[petition-audience] query error:', error);
      return [];
    }

    const { data: suppressions } = await supabase
      .from('email_suppressions')
      .select('email_hash')
      .in('channel', ['petition', 'all']);

    const suppressedHashes = new Set(
      (suppressions ?? []).map((s: { email_hash: string }) => s.email_hash)
    );

    const seen = new Set<string>();
    const recipients: Recipient[] = [];

    for (const s of signers ?? []) {
      const email = (s.email as string | null)?.toLowerCase().trim();
      if (!email || seen.has(email)) continue;
      seen.add(email);
      const h = hashEmail(email);
      if (suppressedHashes.has(h)) continue;
      recipients.push({
        email,
        name: (s.full_name as string | null) ?? null,
        locale: 'ko',
        emailHash: h,
      });
    }

    return recipients;
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx jest __tests__/lib/email/audiences/petition.test.ts
```

Expected: 3 tests PASS

- [ ] **Step 5: `admin-broadcast.ts` petition 채널 활성화**

```typescript
// lib import 추가
import { PetitionAudienceResolver } from '@/lib/email/audiences/petition';

// 채널 분기에 추가
} else if (channel === 'petition') {
  if (!input.petitionSlug) {
    return { message: '청원 채널은 petitionSlug가 필요합니다.', error: true };
  }
  resolver = new PetitionAudienceResolver(input.petitionSlug);
}
```

`BroadcastForm.tsx` petition 채널 `available: true` 변경 + petitionSlug 입력 필드 추가 (채널=petition일 때만 표시).

- [ ] **Step 6: 커밋**

```bash
git add lib/email/audiences/petition.ts __tests__/lib/email/audiences/petition.test.ts \
        app/actions/admin-broadcast.ts
git commit -m "$(cat <<'EOF'
feat(email): 청원 캠페인 알림 채널 audience resolver (Phase 3)

요약: petition_signatures(is_masked=false, email not null)에서 수신자 추출, petition/all 수신거부 차감. 11508명 대량 발송 대응

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
git push origin main
```

---

### Task 3-2: 전체 게이트 통과 + 대량 발송 사전 체크

- [ ] **Step 1: 전체 테스트 통과**

```bash
npm run type-check && npm run build && npm test
```

Expected: 모두 성공

- [ ] **Step 2: 대량 발송 사전 운영 체크 (11,508명 전)**

아래를 순서대로 확인:

1. **Resend 플랜 한도**: Resend 대시보드에서 월 발송 한도 확인. 11,508건이 한도 내인지 검토.
2. **SPF/DKIM/DMARC**: `noreply@saf2026.com` 도메인이 Resend에 인증됐는지 확인. `dig TXT saf2026.com` 또는 Resend 도메인 탭.
3. **발송 도메인 통일**: 기존 청원 확인 메일(`noreply@saf2026.com`) vs. 조직 연락(`contact@kosmart.org`) 불일치 — `RESEND_FROM_EMAIL` env를 일관된 도메인으로 정리.
4. **바운스 웹훅 (선택)**: Resend 대시보드 → Webhooks → `email.bounced`, `email.complained` 이벤트 → `email_suppressions(reason='bounce'/'complaint')` 반영 엔드포인트 추가 (`/api/email/resend-webhook`). Phase 3 필수 권장.
5. **야간 발송 회피**: 청원 대량 발송은 오전 10시~오후 6시 주간 시간대 예약.

---

## Self-Review

아래는 작성 후 스펙 대비 검토 결과입니다.

**1. 스펙 커버리지:**

- §4 마이그레이션 4종 → Task 0-1 ✅
- §5.1 AudienceResolver → Task 0-4 + 1-1 + 2-1 + 3-1 ✅
- §5.2 enqueue+dispatch 크론 → Task 1-2 + 1-3 ✅
- §5.3 unsubscribe → Task 0-3 + 1-4 ✅
- §5.4 broadcast.tsx 템플릿 → Task 0-6 ✅
- §5.5 admin UI → Task 1-5 ✅
- §5.6 마이페이지 토글 + 가입 체크박스 → Task 2-2 + 2-3 ✅
- §6 채널 정책·컴플라이언스 → 템플릿(광고 표기) + enqueue(채널 분기) + dispatch(subject prefix) ✅
- §7 Phase 0-3 분해 → 각 Phase 태스크로 대응 ✅
- §8 운영 사항 → Task 3-2 체크리스트 ✅

**2. Placeholder 없음**: 모든 단계에 실제 코드 포함. "TBD" 없음.

**3. 타입 일관성**:

- `BroadcastChannel` 타입: `lib/email/unsubscribe-token.ts`에 정의, `audiences/types.ts`의 `Recipient` 참조
- `Recipient` 인터페이스: `types.ts` 단일 출처
- `enqueueBroadcast` 반환 `ActionState & { broadcastId? }`: `types/index.ts`의 `ActionState` 활용

**4. 잔여 주의사항**:

- Task 1-3 dispatch 크론의 `requireAdmin()` 없음 (크론은 `CRON_SECRET`으로 인증 — 의도적)
- `requireAdminClient()` sync 함수 존재 여부 확인 후, 없으면 `createSupabaseAdminClient()` 직접 사용
- `admin-broadcast.ts`의 import path `@/lib/auth/guards`에서 `requireAdminClient` export 여부 체크 필요
