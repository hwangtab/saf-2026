# SMS Broadcast (Phase 4 / PR-3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a marketing/notice broadcast SMS system that faithfully mirrors the existing EMAIL broadcast lifecycle (enqueue → lease-locked dispatch cron → per-recipient status), with 정보통신망법 §50 compliance guard rails ((광고) prefix, free 080 opt-out, 21:00–08:00 KST night block, consent + suppression gating) applied only to advertisement sends.

**Architecture:** Three new Supabase tables (`sms_suppressions`, `sms_broadcasts`, `sms_broadcast_recipients`) plus a `profiles.phone` column mirror the email schema and its inline-EXISTS-role='admin' + service_role RLS convention. A pure phone-hash + audience-resolver layer (`lib/sms/audiences/*`) builds deduped recipient lists from `profiles.phone` (marketing consent) ∪ `orders.buyer_phone` (recent paid orders), minus `sms_suppressions`. A `app/actions/admin-sms-broadcast.ts` server-action set enqueues with 5-min dedup + 500 direct cap, and a `app/api/internal/sms-broadcast-dispatch/route.ts` cron drains each broadcast under a per-broadcast lease lock (RPCs `claim_sms_broadcast_dispatch`/`renew_sms_broadcast_dispatch`), committing each recipient `pending→sent` before re-fetching the leading pending chunk. Since Solapi has **no** Resend-style Idempotency-Key header, duplicate-send protection rests entirely on the lease lock + that commit-before-refetch ordering.

**Tech Stack:** Next.js 16 App Router (server actions, route handlers, `runtime='nodejs'`, `maxDuration=300`), Supabase Postgres (RLS, SECURITY DEFINER RPCs, partial indexes), Solapi v4 HMAC SMS API, Jest (jsdom default; `/** @jest-environment node */` for server/lib tests), TypeScript strict, Tailwind brand tokens, Prettier (2-space, single quote, semicolons, width 100).

> **Depends on PR-1** (Phase 1 + Phase 2): the `/admin/sms` page (`app/(portal)/admin/sms/page.tsx` + `_components/SmsLogList.tsx`), the `EmailPagination` component reused as the pagination control, and the `lib/sms/buyer-sms.ts` signature change (internal `en` skip removed). Tasks 13–14 ADD sections to that existing page; do not recreate it.

> **Shared interface contract (do not deviate):**
>
> - `lib/sms/phone-hash.ts` → `export function hashPhone(phone: string): string` — `sha256(PETITION_SALT + normalizeKoreanMobile(phone))` hex; reuse the salt scheme from `lib/email/email-hash.ts`.
> - `lib/sms/audiences/types.ts` → `export interface SmsRecipient { phone: string; name: string | null; phoneHash: string }`.
> - Existing, unchanged: `sendSolapiSms({ to, text })` in `lib/sms/solapi.ts` → `{ ok, messageId?, segment?, error? }`; `normalizeKoreanMobile(raw)` in `lib/sms/phone.ts` → `string | null`.

---

## Reference map (exact lines mirrored)

| Concern                                                                                        | Email source (cite)                                                                                                                                                       | SMS target                                                   |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Suppressions table                                                                             | `supabase/migrations/20260528110000_email_suppressions.sql` L4–26                                                                                                         | `sms_suppressions` (Task 2)                                  |
| Broadcasts table + body/ad/individual evolution                                                | `…20260528120000_email_broadcasts.sql` L2–34, `…20260603120000_email_broadcasts_individual_and_ad_flag.sql` L5–14, `…20260609052232_email_broadcast_rich_body.sql` L36–41 | `sms_broadcasts` with `body_text` only (Task 3)              |
| Recipients table + partial index                                                               | `…20260528130000_email_broadcast_recipients.sql` L2–32                                                                                                                    | `sms_broadcast_recipients` (Task 4)                          |
| Lease-lock RPCs                                                                                | `…20260529130000_broadcast_dispatch_lease_lock.sql` L6–67                                                                                                                 | `claim/renew_sms_broadcast_dispatch` (Task 5)                |
| Phone hash                                                                                     | `lib/email/email-hash.ts` L8–16                                                                                                                                           | `lib/sms/phone-hash.ts` (Task 6)                             |
| Audience types                                                                                 | `lib/email/audiences/types.ts` L1–14                                                                                                                                      | `lib/sms/audiences/types.ts` (Task 7)                        |
| Member resolver                                                                                | `lib/email/audiences/member.ts` L10–95                                                                                                                                    | `lib/sms/audiences/member.ts` (Task 8)                       |
| Customer resolver (union + suppression)                                                        | `lib/email/audiences/customer.ts` L9–88                                                                                                                                   | `lib/sms/audiences/customer.ts` (Task 9)                     |
| Individual dedup + suppression                                                                 | `app/actions/admin-broadcast.ts` L513–529                                                                                                                                 | `lib/sms/audiences/individual.ts` (Task 10)                  |
| Segment union / `deriveIsAdvertisement` / `buildGroupInput` / `MAX_DIRECT_RECIPIENTS`          | `lib/email/broadcast-segment.ts` L23–246                                                                                                                                  | `lib/sms/broadcast-segment.ts` (Task 11)                     |
| Body builder (prefix/personalize)                                                              | `app/actions/admin-broadcast.ts` L660–662 (`(광고)` prefix), dispatch L166–169                                                                                            | `lib/sms/broadcast-body.ts` (Task 12)                        |
| Batch send                                                                                     | `lib/email/resend-batch.ts` L42–104                                                                                                                                       | `lib/sms/solapi-batch.ts` (Task 13)                          |
| Enqueue lifecycle (5-min dedup L130–156, 500 cap L497–502, ad derivation L91–110, status flow) | `app/actions/admin-broadcast.ts`                                                                                                                                          | `app/actions/admin-sms-broadcast.ts` (Task 14)               |
| Dispatch lease loop                                                                            | `app/api/internal/broadcast-dispatch/route.ts` L23–352                                                                                                                    | `app/api/internal/sms-broadcast-dispatch/route.ts` (Task 15) |
| Composer                                                                                       | `app/(portal)/admin/email/_components/BroadcastComposer.tsx`                                                                                                              | `SmsBroadcastComposer.tsx` (Task 17)                         |
| History                                                                                        | `app/(portal)/admin/email/_components/BroadcastHistory.tsx`                                                                                                               | `SmsBroadcastHistory.tsx` (Task 18)                          |

**Migration timestamps must be AFTER `20260610090000`** (latest applied). Apply each via MCP `mcp__claude_ai_Supabase__apply_migration` (single migration, `project_id='khtunrybrzntlnowlahb'`) — NOT `supabase db push`. Regenerate `types/supabase.ts` via `mcp__claude_ai_Supabase__generate_typescript_types` after the last DDL task (Task 5).

---

## Task 1 — `profiles.phone` column (Migration A)

**Files:**

- Create: `supabase/migrations/20260610100000_profiles_add_phone.sql`

Steps:

- [ ] Write the migration file:

```sql
-- supabase/migrations/20260610100000_profiles_add_phone.sql
-- 마케팅/회원 브로드캐스트 SMS 대상 추출용 전화번호 컬럼.
-- 수집 지점: 회원가입·마이페이지(별도 태스크). 정규화는 발송 시 normalizeKoreanMobile에 위임.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text;
```

- [ ] Apply via MCP:
  - Tool `mcp__claude_ai_Supabase__apply_migration`, `project_id='khtunrybrzntlnowlahb'`, `name='profiles_add_phone'`, `query=` the SQL body above.
  - This is a DDL change — confirm with the user before applying per CLAUDE.md.
- [ ] Commit:

```bash
git add supabase/migrations/20260610100000_profiles_add_phone.sql
git commit -m "feat(sms): add profiles.phone column for broadcast SMS audiences

요약: 회원/마케팅 브로드캐스트 SMS 대상 추출용 profiles.phone 컬럼 추가

- ALTER TABLE profiles ADD COLUMN phone text
- 수집 폼은 후속 태스크(회원가입·마이페이지)에서 추가

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 2 — `sms_suppressions` table (Migration B)

Mirrors `email_suppressions` (`20260528110000` L4–26) — same inline-EXISTS-role='admin' + service_role(true) RLS, `UNIQUE(phone_hash, channel)`, reason check. Channel adds `'individual'` (email got it later in `20260603120000` L17–19) and keeps `'all'`.

**Files:**

- Create: `supabase/migrations/20260610100100_sms_suppressions.sql`

Steps:

- [ ] Write the migration file:

```sql
-- supabase/migrations/20260610100100_sms_suppressions.sql
-- 채널별 SMS 수신거부·바운스·컴플레인 통합 테이블 (email_suppressions 미러).
-- phone_hash = sha256(petition_salt + normalizeKoreanMobile(phone)), hex encoding.
CREATE TABLE IF NOT EXISTS public.sms_suppressions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_hash  text        NOT NULL,
  channel     text        NOT NULL,  -- 'customer' | 'member' | 'individual' | 'all'
  reason      text,                  -- 'unsubscribe' | 'bounce' | 'complaint' | 'manual'
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (phone_hash, channel),
  CONSTRAINT sms_suppressions_channel_check
    CHECK (channel IN ('customer', 'member', 'individual', 'all')),
  CONSTRAINT sms_suppressions_reason_check
    CHECK (reason IS NULL OR reason IN ('unsubscribe', 'bounce', 'complaint', 'manual'))
);

ALTER TABLE public.sms_suppressions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on sms_suppressions"
  ON public.sms_suppressions FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role full access on sms_suppressions"
  ON public.sms_suppressions FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

- [ ] Apply via MCP `apply_migration`, `name='sms_suppressions'` (user confirm — DDL).
- [ ] Commit:

```bash
git add supabase/migrations/20260610100100_sms_suppressions.sql
git commit -m "feat(sms): add sms_suppressions table (email_suppressions mirror)

요약: 채널별 SMS 수신거부 테이블 추가 (이메일 미러, admin+service_role RLS)

- phone_hash + channel(customer/member/individual/all) UNIQUE
- reason check, inline EXISTS role=admin RLS

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 3 — `sms_broadcasts` table (Migration C)

Mirrors the **final** email*broadcasts shape (base `20260528120000` + `is_advertisement` from `20260603120000` L5 + `body_text`/no-`body_md` from `20260609052232` + lease-lock columns from `20260529130000` L6–8). Differences: `body_text` only (no `subject`/`body_html`/`cta*\*`/`petition_slug`/`body_md`); channel restricted to `('customer','member','individual')`; `created_by`FK is`ON DELETE SET NULL` (email's was the implicit default — make SMS explicit so admin deletion never blocks).

**Files:**

- Create: `supabase/migrations/20260610100200_sms_broadcasts.sql`

Steps:

- [ ] Write the migration file:

```sql
-- supabase/migrations/20260610100200_sms_broadcasts.sql
-- 마케팅/공지 브로드캐스트 SMS 캠페인 (email_broadcasts 미러; HTML/제목/CTA 없음, body_text 단일).
CREATE TABLE IF NOT EXISTS public.sms_broadcasts (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  channel               text        NOT NULL,
  body_text             text        NOT NULL,
  audience_filter       jsonb       NOT NULL DEFAULT '{}',
  is_advertisement      boolean     NOT NULL DEFAULT false,
  status                text        NOT NULL DEFAULT 'draft',
  recipient_count       int         NOT NULL DEFAULT 0,
  sent_count            int         NOT NULL DEFAULT 0,
  failed_count          int         NOT NULL DEFAULT 0,
  dispatch_locked_until timestamptz,
  dispatch_lock_token   uuid,
  created_by            uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  queued_at             timestamptz,
  sent_at               timestamptz,
  CONSTRAINT sms_broadcasts_channel_check
    CHECK (channel IN ('customer', 'member', 'individual')),
  CONSTRAINT sms_broadcasts_status_check
    CHECK (status IN ('draft', 'queued', 'sending', 'sent', 'failed', 'cancelled'))
);

ALTER TABLE public.sms_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on sms_broadcasts"
  ON public.sms_broadcasts FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role full access on sms_broadcasts"
  ON public.sms_broadcasts FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

- [ ] Apply via MCP `apply_migration`, `name='sms_broadcasts'` (user confirm — DDL).
- [ ] Commit:

```bash
git add supabase/migrations/20260610100200_sms_broadcasts.sql
git commit -m "feat(sms): add sms_broadcasts table with lease-lock columns

요약: 브로드캐스트 SMS 캠페인 테이블 추가 (body_text 단일, lease-lock 포함)

- channel(customer/member/individual), status 6종, is_advertisement
- dispatch_locked_until/dispatch_lock_token (cron 중복 발송 차단)
- created_by FK ON DELETE SET NULL

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4 — `sms_broadcast_recipients` table (Migration D)

Mirrors `email_broadcast_recipients` (`20260528130000` L2–32) + admin index pattern (`20260529172000`). Email's `resend_id` → SMS's `provider_message_id`; add `segment` (`'SMS'|'LMS'`). No `locale` column (SMS body is single-language per broadcast). Partial index `(broadcast_id,status) WHERE status='pending'` (drives the dispatch leading-chunk query) + plain `(broadcast_id)` index (history counts).

**Files:**

- Create: `supabase/migrations/20260610100300_sms_broadcast_recipients.sql`

Steps:

- [ ] Write the migration file:

```sql
-- supabase/migrations/20260610100300_sms_broadcast_recipients.sql
CREATE TABLE IF NOT EXISTS public.sms_broadcast_recipients (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id        uuid        NOT NULL REFERENCES public.sms_broadcasts(id) ON DELETE CASCADE,
  phone               text        NOT NULL,
  name                text,
  status              text        NOT NULL DEFAULT 'pending',
  provider_message_id text,
  segment             text,       -- 'SMS' | 'LMS' (발송 후 Solapi 응답)
  error               text,
  sent_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sms_broadcast_recipients_status_check
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped'))
);

-- 디스패치 선두 pending 청크 조회용 부분 인덱스 (pending 변형 중 offset 누적 금지).
CREATE INDEX IF NOT EXISTS idx_sms_broadcast_recipients_dispatch
  ON public.sms_broadcast_recipients (broadcast_id, status)
  WHERE status = 'pending';

-- 이력 화면 카운트(sent/failed 집계)용 broadcast_id 인덱스.
CREATE INDEX IF NOT EXISTS idx_sms_broadcast_recipients_broadcast
  ON public.sms_broadcast_recipients (broadcast_id);

ALTER TABLE public.sms_broadcast_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on sms_broadcast_recipients"
  ON public.sms_broadcast_recipients FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role full access on sms_broadcast_recipients"
  ON public.sms_broadcast_recipients FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

- [ ] Apply via MCP `apply_migration`, `name='sms_broadcast_recipients'` (user confirm — DDL).
- [ ] Commit:

```bash
git add supabase/migrations/20260610100300_sms_broadcast_recipients.sql
git commit -m "feat(sms): add sms_broadcast_recipients table with dispatch index

요약: 브로드캐스트 SMS 수신자 큐 테이블 추가 (per-recipient 상태 추적)

- phone/name/status/provider_message_id/segment/error/sent_at
- 부분 인덱스(broadcast_id,status WHERE pending) + (broadcast_id) 인덱스

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 5 — Lease-lock RPCs + type regen (Migration E)

Copy `20260529130000` L12–67 verbatim, renaming the function names and the target table from `email_broadcasts` to `sms_broadcasts`. The lease-lock columns already exist (added in Task 3) so no `ALTER TABLE` here. After applying, regenerate types — the last DDL change, so `types/supabase.ts` will pick up all five migrations at once.

**Files:**

- Create: `supabase/migrations/20260610100400_sms_broadcast_dispatch_lease_lock.sql`
- Modify: `types/supabase.ts` (regenerated)

Steps:

- [ ] Write the migration file:

```sql
-- supabase/migrations/20260610100400_sms_broadcast_dispatch_lease_lock.sql
-- 크론 중복 발송 차단: sms-broadcast-dispatch는 매분 cron + maxDuration 300s.
-- 브로드캐스트 단위 리스 락으로 동시 처리를 직렬화하고 락 만료 기반 resume.
-- (email broadcast 20260529130000 미러; 테이블명만 sms_broadcasts.)

-- 락 획득: queued이거나 (sending이며 리스 만료)인 경우에만 claim.
CREATE OR REPLACE FUNCTION public.claim_sms_broadcast_dispatch(
  p_broadcast_id uuid,
  p_lease_seconds int DEFAULT 120
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token uuid := gen_random_uuid();
  v_claimed uuid;
BEGIN
  IF p_lease_seconds <= 0 THEN
    RAISE EXCEPTION 'p_lease_seconds must be positive, got %', p_lease_seconds;
  END IF;
  UPDATE sms_broadcasts
  SET status = 'sending',
      dispatch_locked_until = now() + make_interval(secs => p_lease_seconds),
      dispatch_lock_token = v_token,
      queued_at = COALESCE(queued_at, now())
  WHERE id = p_broadcast_id
    AND status IN ('queued', 'sending')
    AND (dispatch_locked_until IS NULL OR dispatch_locked_until < now())
  RETURNING dispatch_lock_token INTO v_claimed;
  RETURN v_claimed;
END;
$$;

-- 리스 갱신: 토큰 일치할 때만 만료시각 연장. 빼앗겼으면 false.
CREATE OR REPLACE FUNCTION public.renew_sms_broadcast_dispatch(
  p_broadcast_id uuid,
  p_token uuid,
  p_lease_seconds int DEFAULT 120
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
BEGIN
  IF p_lease_seconds <= 0 THEN
    RAISE EXCEPTION 'p_lease_seconds must be positive, got %', p_lease_seconds;
  END IF;
  UPDATE sms_broadcasts
  SET dispatch_locked_until = now() + make_interval(secs => p_lease_seconds)
  WHERE id = p_broadcast_id AND dispatch_lock_token = p_token AND status = 'sending'
  RETURNING true INTO v_ok;
  RETURN COALESCE(v_ok, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_sms_broadcast_dispatch(uuid, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.renew_sms_broadcast_dispatch(uuid, uuid, int) TO service_role;
```

- [ ] Apply via MCP `apply_migration`, `name='sms_broadcast_dispatch_lease_lock'` (user confirm — DDL).
- [ ] Regenerate types: tool `mcp__claude_ai_Supabase__generate_typescript_types`, `project_id='khtunrybrzntlnowlahb'`. Overwrite `types/supabase.ts` with the returned content. Read-only generation (no confirm needed); writing the file is local.
- [ ] Sanity-check the regen picked up new tables:

```bash
grep -c "sms_broadcasts\|sms_broadcast_recipients\|sms_suppressions\|claim_sms_broadcast_dispatch" /Users/hwang-gyeongha/saf-2026/types/supabase.ts
```

Expected: a count ≥ 4 (each appears at least once). Also confirm `phone:` appears under the `profiles` Row.

- [ ] Run type-check to ensure the regenerated file compiles:

```bash
npm run type-check
```

Expected: PASS (no SMS code consumes these types yet; this only validates the regen).

- [ ] Commit:

```bash
git add supabase/migrations/20260610100400_sms_broadcast_dispatch_lease_lock.sql types/supabase.ts
git commit -m "feat(sms): add sms broadcast dispatch lease-lock RPCs + regen types

요약: SMS 브로드캐스트 리스 락 RPC 추가 (claim/renew) + supabase 타입 재생성

- claim_sms_broadcast_dispatch / renew_sms_broadcast_dispatch (email 미러)
- SECURITY DEFINER + service_role GRANT
- 5개 마이그레이션 반영해 types/supabase.ts 재생성

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 6 — `lib/sms/phone-hash.ts`

Mirrors `lib/email/email-hash.ts` L8–16 but keys on the normalized **mobile** form. `normalizeKoreanMobile` returns `null` for non-010 numbers; for non-mobile input we hash the raw-trimmed string so suppression lookups never throw (the resolvers will already have filtered out non-mobile recipients, so a stable hash for any input is sufficient and matches email's tolerance).

**Files:**

- Create: `lib/sms/phone-hash.ts`
- Create: `__tests__/lib/sms/phone-hash.test.ts`

Steps:

- [ ] Write the failing test:

```ts
/** @jest-environment node */
import { hashPhone } from '@/lib/sms/phone-hash';
import { PETITION_SALT } from '@/lib/email/email-hash';
import crypto from 'crypto';

describe('hashPhone', () => {
  it('정규화된 010 번호를 salt+sha256 hex로 해싱한다', () => {
    const expected = crypto
      .createHash('sha256')
      .update(PETITION_SALT + '01012345678')
      .digest('hex');
    expect(hashPhone('010-1234-5678')).toBe(expected);
  });

  it('하이픈·공백·국가코드 변형이 같은 해시로 수렴한다', () => {
    const a = hashPhone('010-1234-5678');
    const b = hashPhone('+82 10 1234 5678');
    const c = hashPhone('01012345678');
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('비-010 번호는 raw-trim 기반으로 안정적 해시(throw 없음)', () => {
    expect(() => hashPhone('02-123-4567')).not.toThrow();
    expect(hashPhone('02-123-4567')).toBe(hashPhone('02-123-4567'));
  });
});
```

- [ ] Run it (expected FAIL — module not found):

```bash
npm test -- __tests__/lib/sms/phone-hash.test.ts
```

- [ ] Implement `lib/sms/phone-hash.ts`:

```ts
import crypto from 'crypto';

import { PETITION_SALT } from '@/lib/email/email-hash';
import { normalizeKoreanMobile } from '@/lib/sms/phone';

// SMS 수신거부(sms_suppressions.phone_hash) 매칭·발송 로그 키용 전화번호 해시.
// email-hash.ts의 salt 스킴을 재사용 — 단일 PETITION_SALT로 이메일·전화 해시를 통일 관리.
// normalizeKoreanMobile로 010 정규형(01012345678)으로 수렴시킨 뒤 해싱하므로
// 하이픈·공백·+82 변형이 모두 동일 해시가 된다. 비-010은 raw-trim fallback(안정적·throw 없음).
export function hashPhone(phone: string): string {
  const normalized = normalizeKoreanMobile(phone) ?? phone.trim();
  return crypto
    .createHash('sha256')
    .update(PETITION_SALT + normalized)
    .digest('hex');
}
```

- [ ] Run it (expected PASS):

```bash
npm test -- __tests__/lib/sms/phone-hash.test.ts
```

- [ ] Commit:

```bash
git add lib/sms/phone-hash.ts __tests__/lib/sms/phone-hash.test.ts
git commit -m "feat(sms): add hashPhone with shared petition salt scheme

요약: 전화번호 해시 유틸 추가 (수신거부 매칭·로그 키)

- normalizeKoreanMobile 정규화 후 sha256(PETITION_SALT + 정규형)
- 하이픈·+82 변형 동일 해시로 수렴, email-hash salt 재사용

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 7 — `lib/sms/audiences/types.ts`

Mirrors `lib/email/audiences/types.ts` L1–14 with the phone shape. `BroadcastChannel` here is the SMS-scoped set (no `petition`). The `SmsAudienceResolver` interface documents the same contract: suppression-subtracted, normalized, deduped.

**Files:**

- Create: `lib/sms/audiences/types.ts`

Steps:

- [ ] Implement (no separate test — exercised by Tasks 8–10 resolver tests):

```ts
export type SmsBroadcastChannel = 'customer' | 'member' | 'individual';

export interface SmsRecipient {
  phone: string; // normalizeKoreanMobile 정규형 (01012345678)
  name: string | null;
  phoneHash: string; // hashPhone(phone) — sms_suppressions 차감용
}

export interface SmsAudienceResolver {
  // 채널별 수신자 목록 반환.
  // 구현체 책임: sms_suppressions 차감 + normalizeKoreanMobile 정규화 + 중복 제거.
  resolve(filter?: Record<string, unknown>): Promise<SmsRecipient[]>;
}
```

- [ ] Verify it type-checks (no consumers yet, so just ensure no syntax error):

```bash
npx tsc --noEmit lib/sms/audiences/types.ts
```

Expected: PASS.

- [ ] Commit:

```bash
git add lib/sms/audiences/types.ts
git commit -m "feat(sms): add SMS audience types (SmsRecipient/SmsAudienceResolver)

요약: SMS 수신자 타입 추가 (phone/name/phoneHash, customer/member/individual 채널)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 8 — `lib/sms/audiences/member.ts`

Mirrors `lib/email/audiences/member.ts` L10–95: `artists.contact_phone` ∪ `profiles(role='exhibitor').phone`, suppression channels `['member','all']`, batched fetch via `fetchAllInBatches`. Informational channel — **no consent gate, no night/prefix** (those apply at the body/dispatch layer only for ads; member is never an ad). Email used `contact_email`/`email`; SMS uses `contact_phone`/`phone` and normalizes with `normalizeKoreanMobile` (skip non-010).

**Files:**

- Create: `lib/sms/audiences/member.ts`
- Create: `__tests__/lib/sms/audiences/member.test.ts`

Steps:

- [ ] Write the failing test:

```ts
/** @jest-environment node */
import { MemberSmsAudienceResolver } from '@/lib/sms/audiences/member';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { hashPhone } from '@/lib/sms/phone-hash';

jest.mock('@/lib/auth/server', () => ({ createSupabaseAdminClient: jest.fn() }));

// fetchAllInBatches는 .range(from,to)를 호출하므로, range가 thenable을 반환하도록 한다.
function tableStub(rows: unknown[]) {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'not', 'order', 'in']) {
    builder[m] = jest.fn(() => builder);
  }
  builder.range = jest.fn((from: number) =>
    Promise.resolve({ data: from === 0 ? rows : [], error: null, count: rows.length })
  );
  return builder;
}

function adminStub(tables: Record<string, unknown[]>) {
  return { from: (t: string) => tableStub(tables[t] ?? []) };
}

const mockAdmin = createSupabaseAdminClient as jest.MockedFunction<
  typeof createSupabaseAdminClient
>;

describe('MemberSmsAudienceResolver', () => {
  beforeEach(() => jest.clearAllMocks());

  it('artists.contact_phone ∪ exhibitor.phone 합집합·정규화·중복제거', async () => {
    mockAdmin.mockReturnValue(
      adminStub({
        artists: [{ contact_phone: '010-1111-2222', name_ko: '작가', name_en: null }],
        profiles: [{ phone: '01033334444', name: '출품자' }],
        sms_suppressions: [],
      }) as unknown as ReturnType<typeof createSupabaseAdminClient>
    );
    const r = await new MemberSmsAudienceResolver().resolve();
    expect(r.map((x) => x.phone).sort()).toEqual(['01011112222', '01033334444']);
    expect(r.find((x) => x.phone === '01011112222')?.name).toBe('작가');
  });

  it('비-010 번호는 제외', async () => {
    mockAdmin.mockReturnValue(
      adminStub({
        artists: [{ contact_phone: '02-123-4567', name_ko: '유선', name_en: null }],
        profiles: [],
        sms_suppressions: [],
      }) as unknown as ReturnType<typeof createSupabaseAdminClient>
    );
    const r = await new MemberSmsAudienceResolver().resolve();
    expect(r).toHaveLength(0);
  });

  it('sms_suppressions(member) 해시는 차감', async () => {
    mockAdmin.mockReturnValue(
      adminStub({
        artists: [{ contact_phone: '01011112222', name_ko: '작가', name_en: null }],
        profiles: [],
        sms_suppressions: [{ phone_hash: hashPhone('01011112222') }],
      }) as unknown as ReturnType<typeof createSupabaseAdminClient>
    );
    const r = await new MemberSmsAudienceResolver().resolve();
    expect(r).toHaveLength(0);
  });
});
```

- [ ] Run it (expected FAIL — module not found):

```bash
npm test -- __tests__/lib/sms/audiences/member.test.ts
```

- [ ] Implement `lib/sms/audiences/member.ts`:

```ts
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { fetchAllInBatches } from '@/lib/utils/supabase-batch';
import { normalizeKoreanMobile } from '@/lib/sms/phone';
import { hashPhone } from '@/lib/sms/phone-hash';
import type { SmsAudienceResolver, SmsRecipient } from './types';

// 작가·출품자 업무 채널 SMS 수신자 추출 (email member 미러).
// artists.contact_phone ∪ profiles role=exhibitor.phone. 동의 불요(업무·거래 관계).
// sms_suppressions(member + all)만 차감. 정보성이므로 (광고) prefix·야간 차단 비대상.
// filter.subset: 'artist' | 'exhibitor' | 미지정(기본: 둘 다)
export class MemberSmsAudienceResolver implements SmsAudienceResolver {
  async resolve(filter?: Record<string, unknown>): Promise<SmsRecipient[]> {
    const supabase = createSupabaseAdminClient();
    const subset =
      filter?.subset === 'artist' || filter?.subset === 'exhibitor' ? filter.subset : 'all';

    let artists: Array<{
      contact_phone: string | null;
      name_ko: string | null;
      name_en: string | null;
    }> = [];
    if (subset !== 'exhibitor') {
      const { data: res } = await fetchAllInBatches<{
        contact_phone: string | null;
        name_ko: string | null;
        name_en: string | null;
      }>((from, to) =>
        supabase
          .from('artists')
          .select('contact_phone, name_ko, name_en')
          .order('created_at', { ascending: true })
          .range(from, to)
      ).catch((err) => {
        console.error('[member-sms-audience] artists query error:', err);
        throw new Error(`작가 명단 조회 실패: ${err?.message ?? err}`);
      });
      artists = res ?? [];
    }

    let exhibitors: Array<{ phone: string | null; name: string | null }> = [];
    if (subset !== 'artist') {
      const { data: res } = await fetchAllInBatches<{
        phone: string | null;
        name: string | null;
      }>((from, to) =>
        supabase
          .from('profiles')
          .select('phone, name')
          .eq('role', 'exhibitor')
          .not('phone', 'is', null)
          .range(from, to)
      ).catch((err) => {
        console.error('[member-sms-audience] exhibitors query error:', err);
        throw new Error(`출품자 명단 조회 실패: ${err?.message ?? err}`);
      });
      exhibitors = res ?? [];
    }

    const { data: suppressions } = await fetchAllInBatches<{ phone_hash: string }>((from, to) =>
      supabase
        .from('sms_suppressions')
        .select('phone_hash')
        .in('channel', ['member', 'all'])
        .range(from, to)
    ).catch((err) => {
      console.error('[member-sms-audience] suppressions query error:', err);
      throw new Error('수신거부 목록 조회 실패 — 발송을 중단합니다');
    });

    const suppressedHashes = new Set(
      (suppressions ?? []).map((s: { phone_hash: string }) => s.phone_hash)
    );

    const seen = new Set<string>();
    const recipients: SmsRecipient[] = [];

    const addIfValid = (rawPhone: string | null, name: string | null) => {
      const normalized = normalizeKoreanMobile(rawPhone);
      if (!normalized) return;
      if (seen.has(normalized)) return;
      seen.add(normalized);
      const h = hashPhone(normalized);
      if (suppressedHashes.has(h)) return;
      recipients.push({ phone: normalized, name, phoneHash: h });
    };

    for (const a of artists) addIfValid(a.contact_phone, a.name_ko ?? a.name_en);
    for (const e of exhibitors) addIfValid(e.phone, e.name);

    return recipients;
  }
}
```

- [ ] Run it (expected PASS):

```bash
npm test -- __tests__/lib/sms/audiences/member.test.ts
```

- [ ] Commit:

```bash
git add lib/sms/audiences/member.ts __tests__/lib/sms/audiences/member.test.ts
git commit -m "feat(sms): add member SMS audience resolver (artist+exhibitor phones)

요약: 작가·출품자 SMS 수신자 추출 (email member 미러, 정보성·동의 불요)

- artists.contact_phone ∪ exhibitor.phone, 010 정규화·중복제거
- sms_suppressions(member/all) 차감

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 9 — `lib/sms/audiences/customer.ts`

Mirrors `lib/email/audiences/customer.ts` L9–88: `profiles(role='user', marketing_consent=true).phone` ∪ `orders.buyer_phone` (status `['paid','preparing','shipped','delivered']`, last 6 months), suppression channels `['customer','all']`, union+normalize+dedup. This is the **advertisement** channel — but per spec the consent gate (`marketing_consent=true`) and the 6-month transactional exception are applied **here** at audience selection; the `(광고)`/night-block guards live in body/dispatch. Recent buyers are included under the 정보통신망법 §50 transactional-relationship exception (matching email).

**Files:**

- Create: `lib/sms/audiences/customer.ts`
- Create: `__tests__/lib/sms/audiences/customer.test.ts`

Steps:

- [ ] Write the failing test:

```ts
/** @jest-environment node */
import { CustomerSmsAudienceResolver } from '@/lib/sms/audiences/customer';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { hashPhone } from '@/lib/sms/phone-hash';

jest.mock('@/lib/auth/server', () => ({ createSupabaseAdminClient: jest.fn() }));

function tableStub(rows: unknown[]) {
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'not', 'order', 'in', 'gte']) {
    builder[m] = jest.fn(() => builder);
  }
  builder.range = jest.fn((from: number) =>
    Promise.resolve({ data: from === 0 ? rows : [], error: null, count: rows.length })
  );
  return builder;
}
function adminStub(tables: Record<string, unknown[]>) {
  return { from: (t: string) => tableStub(tables[t] ?? []) };
}
const mockAdmin = createSupabaseAdminClient as jest.MockedFunction<
  typeof createSupabaseAdminClient
>;

describe('CustomerSmsAudienceResolver', () => {
  beforeEach(() => jest.clearAllMocks());

  it('동의자.phone ∪ 거래고객.buyer_phone 합집합·중복제거', async () => {
    mockAdmin.mockReturnValue(
      adminStub({
        profiles: [{ id: 'u1', phone: '010-1111-2222', name: '동의' }],
        orders: [
          { buyer_phone: '01033334444', buyer_name: '구매' },
          { buyer_phone: '010-1111-2222', buyer_name: '중복' }, // 동의자와 중복
        ],
        sms_suppressions: [],
      }) as unknown as ReturnType<typeof createSupabaseAdminClient>
    );
    const r = await new CustomerSmsAudienceResolver().resolve();
    expect(r.map((x) => x.phone).sort()).toEqual(['01011112222', '01033334444']);
  });

  it('sms_suppressions(customer)는 차감', async () => {
    mockAdmin.mockReturnValue(
      adminStub({
        profiles: [{ id: 'u1', phone: '01011112222', name: '동의' }],
        orders: [],
        sms_suppressions: [{ phone_hash: hashPhone('01011112222') }],
      }) as unknown as ReturnType<typeof createSupabaseAdminClient>
    );
    const r = await new CustomerSmsAudienceResolver().resolve();
    expect(r).toHaveLength(0);
  });
});
```

- [ ] Run it (expected FAIL):

```bash
npm test -- __tests__/lib/sms/audiences/customer.test.ts
```

- [ ] Implement `lib/sms/audiences/customer.ts`:

```ts
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { fetchAllInBatches } from '@/lib/utils/supabase-batch';
import { normalizeKoreanMobile } from '@/lib/sms/phone';
import { hashPhone } from '@/lib/sms/phone-hash';
import type { SmsAudienceResolver, SmsRecipient } from './types';

// 고객 마케팅 SMS 채널 수신자 추출 (email customer 미러).
// 동의 근거: marketing_consent=true(명시적 opt-in) OR 6개월 이내 거래고객(정통망법 §50 예외).
// 광고성 채널 — (광고) prefix·무료수신거부·야간 차단은 body/dispatch 레이어에서 적용.
export class CustomerSmsAudienceResolver implements SmsAudienceResolver {
  async resolve(): Promise<SmsRecipient[]> {
    const supabase = createSupabaseAdminClient();
    const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1) 명시적 동의자 — DB-level filter
    const { data: consentUsers } = await fetchAllInBatches<{
      id: string;
      phone: string | null;
      name: string | null;
    }>((from, to) =>
      supabase
        .from('profiles')
        .select('id, phone, name')
        .eq('role', 'user')
        .eq('marketing_consent', true)
        .not('phone', 'is', null)
        .range(from, to)
    ).catch((err) => {
      console.error('[customer-sms-audience] consent query error:', err);
      throw new Error(`동의자 목록 조회 실패: ${err?.message ?? err}`);
    });

    // 2) 6개월 거래고객 — DB-level filter (정통망법 §50 예외)
    const { data: recentBuyers } = await fetchAllInBatches<{
      buyer_phone: string | null;
      buyer_name: string | null;
    }>((from, to) =>
      supabase
        .from('orders')
        .select('buyer_phone, buyer_name')
        .in('status', ['paid', 'preparing', 'shipped', 'delivered'])
        .gte('created_at', sixMonthsAgo)
        .not('buyer_phone', 'is', null)
        .range(from, to)
    ).catch((err) => {
      console.error('[customer-sms-audience] buyer query error:', err);
      throw new Error(`거래고객 목록 조회 실패: ${err?.message ?? err}`);
    });

    // 3) 수신거부 해시 — customer·all 채널만
    const { data: suppressions } = await fetchAllInBatches<{ phone_hash: string }>((from, to) =>
      supabase
        .from('sms_suppressions')
        .select('phone_hash')
        .in('channel', ['customer', 'all'])
        .range(from, to)
    ).catch((err) => {
      console.error('[customer-sms-audience] suppressions query error:', err);
      throw new Error('수신거부 목록 조회 실패 — 발송을 중단합니다');
    });

    const suppressedHashes = new Set(
      (suppressions ?? []).map((s: { phone_hash: string }) => s.phone_hash)
    );

    // 4) 합집합 · 정규화 · 중복 제거
    const seen = new Set<string>();
    const recipients: SmsRecipient[] = [];

    const addIfValid = (rawPhone: string | null, name: string | null) => {
      const normalized = normalizeKoreanMobile(rawPhone);
      if (!normalized) return;
      if (seen.has(normalized)) return;
      seen.add(normalized);
      const h = hashPhone(normalized);
      if (suppressedHashes.has(h)) return;
      recipients.push({ phone: normalized, name, phoneHash: h });
    };

    for (const u of consentUsers ?? []) {
      addIfValid(u.phone as string | null, u.name as string | null);
    }
    for (const b of recentBuyers ?? []) {
      addIfValid(b.buyer_phone as string | null, b.buyer_name as string | null);
    }

    return recipients;
  }
}
```

- [ ] Run it (expected PASS):

```bash
npm test -- __tests__/lib/sms/audiences/customer.test.ts
```

- [ ] Commit:

```bash
git add lib/sms/audiences/customer.ts __tests__/lib/sms/audiences/customer.test.ts
git commit -m "feat(sms): add customer SMS audience resolver (consent ∪ recent buyers)

요약: 고객 마케팅 SMS 수신자 추출 (email customer 미러, 광고 대상)

- profiles(marketing_consent=true).phone ∪ orders.buyer_phone(최근 6개월 결제)
- normalizeKoreanMobile 정규화·중복제거, sms_suppressions(customer/all) 차감

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 10 — `lib/sms/audiences/individual.ts`

Email had no `individual.ts` resolver; the direct-input dedup/suppression lived inline in `admin-broadcast.ts` L513–529. We extract the SMS equivalent into a pure helper `resolveIndividualSmsRecipients(contacts, isAdvertisement, supabase)` so the action stays thin and the dedup/suppression logic is unit-tested. Suppression channels follow email L516: ads also subtract `customer`; non-ads only `individual`+`all`. Non-010 inputs are dropped (email dropped empty/invalid emails).

**Files:**

- Create: `lib/sms/audiences/individual.ts`
- Create: `__tests__/lib/sms/audiences/individual.test.ts`

Steps:

- [ ] Write the failing test:

```ts
/** @jest-environment node */
import { resolveIndividualSmsRecipients } from '@/lib/sms/audiences/individual';
import { hashPhone } from '@/lib/sms/phone-hash';

function supabaseStub(suppressed: string[]) {
  return {
    from: () => ({
      select: () => ({
        in: () =>
          Promise.resolve({
            data: suppressed.map((p) => ({ phone_hash: hashPhone(p) })),
            error: null,
          }),
      }),
    }),
  } as unknown as Parameters<typeof resolveIndividualSmsRecipients>[2];
}

describe('resolveIndividualSmsRecipients', () => {
  it('정규화·중복제거하고 비-010은 제외', async () => {
    const rows = await resolveIndividualSmsRecipients(
      [
        { phone: '010-1234-5678', name: 'A' },
        { phone: '01012345678', name: 'A-dup' }, // 동일 번호 중복
        { phone: '02-123-4567', name: 'B' }, // 비-010
      ],
      false,
      supabaseStub([])
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ phone: '01012345678', name: 'A', status: 'pending' });
  });

  it('광고면 customer 채널 수신거부도 차감', async () => {
    const rows = await resolveIndividualSmsRecipients(
      [{ phone: '01011112222', name: 'X' }],
      true,
      supabaseStub(['01011112222'])
    );
    expect(rows).toHaveLength(0);
  });
});
```

- [ ] Run it (expected FAIL):

```bash
npm test -- __tests__/lib/sms/audiences/individual.test.ts
```

- [ ] Implement `lib/sms/audiences/individual.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';

import { normalizeKoreanMobile } from '@/lib/sms/phone';
import { hashPhone } from '@/lib/sms/phone-hash';

export interface SmsContact {
  phone: string;
  name: string | null;
}

export interface IndividualSmsRow {
  phone: string;
  name: string | null;
  status: 'pending';
}

// 직접 지정(individual) SMS 수신자를 정규화·중복제거·수신거부 차감한다.
// email admin-broadcast.ts L513-529의 인라인 로직을 SMS용 순수 헬퍼로 추출.
// isAdvertisement면 customer 채널 수신거부도 차감(개별 광고 발송 시 광고 거부 존중).
export async function resolveIndividualSmsRecipients(
  contacts: SmsContact[],
  isAdvertisement: boolean,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>
): Promise<IndividualSmsRow[]> {
  const channels = isAdvertisement ? ['individual', 'customer', 'all'] : ['individual', 'all'];
  const { data: suppressions } = await supabase
    .from('sms_suppressions')
    .select('phone_hash')
    .in('channel', channels);
  const suppressed = new Set((suppressions ?? []).map((s: { phone_hash: string }) => s.phone_hash));

  const seen = new Set<string>();
  const rows: IndividualSmsRow[] = [];
  for (const c of contacts) {
    const normalized = normalizeKoreanMobile(c.phone);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    if (suppressed.has(hashPhone(normalized))) continue;
    rows.push({ phone: normalized, name: c.name, status: 'pending' });
  }
  return rows;
}
```

> Note: the `eslint-disable` for `SupabaseClient<any,...>` matches how `requireAdminClient()`'s return type is structurally widened elsewhere; the caller (Task 14) passes the real admin client. If the repo's `SupabaseClient` import path differs, use the same import the action file uses.

- [ ] Run it (expected PASS):

```bash
npm test -- __tests__/lib/sms/audiences/individual.test.ts
```

- [ ] Commit:

```bash
git add lib/sms/audiences/individual.ts __tests__/lib/sms/audiences/individual.test.ts
git commit -m "feat(sms): add individual SMS recipient resolver (dedup+suppression)

요약: 직접 지정 SMS 수신자 정규화·중복제거·수신거부 차감 헬퍼

- normalizeKoreanMobile 정규화, 비-010 제외
- 광고 시 customer 채널 수신거부도 차감(email L513-529 미러)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 11 — `lib/sms/broadcast-segment.ts`

Mirrors `lib/email/broadcast-segment.ts` L23–246 but trimmed to SMS: drops `petition` and `artwork-buyer` kinds; content is `bodyText` only (no subject/html/cta). Keeps `MAX_DIRECT_RECIPIENTS = 500`, `deriveIsAdvertisement` (customer=always, direct=toggle, member=never), `segmentBlockReason`, `isDirectSegment`, `buildGroupInput`.

**Files:**

- Create: `lib/sms/broadcast-segment.ts`
- Create: `__tests__/lib/sms/broadcast-segment.test.ts`

Steps:

- [ ] Write the failing test:

```ts
/** @jest-environment node */
import {
  MAX_DIRECT_RECIPIENTS,
  deriveIsAdvertisement,
  segmentBlockReason,
  isDirectSegment,
  buildGroupInput,
  defaultSegment,
  type SmsRecipientSegment,
} from '@/lib/sms/broadcast-segment';

const content = { bodyText: '안녕하세요' };

describe('SMS broadcast-segment', () => {
  it('MAX_DIRECT_RECIPIENTS === 500', () => {
    expect(MAX_DIRECT_RECIPIENTS).toBe(500);
  });

  it('deriveIsAdvertisement: customer=true, member=false, direct=토글', () => {
    expect(deriveIsAdvertisement({ kind: 'customer' })).toBe(true);
    expect(deriveIsAdvertisement({ kind: 'member', subset: 'all' })).toBe(false);
    expect(deriveIsAdvertisement({ kind: 'direct', contacts: [], advertising: true })).toBe(true);
    expect(deriveIsAdvertisement({ kind: 'direct', contacts: [], advertising: false })).toBe(false);
  });

  it('buildGroupInput: customer는 광고 강제 + 채널 매핑', () => {
    const out = buildGroupInput({ kind: 'customer' }, content);
    expect(out).toMatchObject({
      channel: 'customer',
      isAdvertisement: true,
      bodyText: '안녕하세요',
    });
  });

  it('buildGroupInput: member subset 전달', () => {
    const out = buildGroupInput({ kind: 'member', subset: 'artist' }, content);
    expect(out).toMatchObject({ channel: 'member', audienceFilter: { subset: 'artist' } });
  });

  it('segmentBlockReason: direct 0명/초과/대기', () => {
    expect(segmentBlockReason({ kind: 'direct', contacts: [], advertising: false }, false)).toMatch(
      /1명 이상/
    );
    expect(
      segmentBlockReason(
        { kind: 'direct', contacts: [{ phone: '01011112222', name: null }], advertising: false },
        true
      )
    ).toMatch(/추가/);
    const over: SmsRecipientSegment = {
      kind: 'direct',
      contacts: Array.from({ length: 501 }, (_, i) => ({
        phone: `0101111${1000 + i}`,
        name: null,
      })),
      advertising: false,
    };
    expect(segmentBlockReason(over, false)).toMatch(/최대 500/);
  });

  it('isDirectSegment 타입 가드', () => {
    expect(isDirectSegment({ kind: 'direct', contacts: [], advertising: false })).toBe(true);
    expect(isDirectSegment({ kind: 'customer' })).toBe(false);
  });

  it('defaultSegment는 깨끗한 기본값', () => {
    expect(defaultSegment('member')).toEqual({ kind: 'member', subset: 'all' });
    expect(defaultSegment('direct')).toEqual({ kind: 'direct', contacts: [], advertising: false });
  });
});
```

- [ ] Run it (expected FAIL):

```bash
npm test -- __tests__/lib/sms/broadcast-segment.test.ts
```

- [ ] Implement `lib/sms/broadcast-segment.ts`:

```ts
// 관리자 SMS 발송의 "받는 사람"을 discriminated union으로 표현하는 클라이언트 모델.
// email broadcast-segment.ts의 SMS 축소판: petition·artwork-buyer 제거, body_text 단일.
// 순수 함수 모듈 — supabase 등 서버 모듈을 import하지 않아 클라이언트 번들에 안전.

import type { SmsBroadcastChannel } from '@/lib/sms/audiences/types';

export interface SmsSelectedContact {
  phone: string;
  name: string | null;
}

// 직접 지정(direct) 1회 발송 상한 — 임의 대량 발송 방어. 서버·UI 공통 강제.
export const MAX_DIRECT_RECIPIENTS = 500;

export type SmsMemberSubset = 'all' | 'artist' | 'exhibitor';

export type SmsRecipientSegment =
  | { kind: 'member'; subset: SmsMemberSubset }
  | { kind: 'customer' }
  | { kind: 'direct'; contacts: SmsSelectedContact[]; advertising: boolean };

export type SmsRecipientKind = SmsRecipientSegment['kind'];

export const SMS_RECIPIENT_KINDS: SmsRecipientKind[] = ['member', 'customer', 'direct'];

export function defaultSegment(kind: SmsRecipientKind): SmsRecipientSegment {
  switch (kind) {
    case 'member':
      return { kind: 'member', subset: 'all' };
    case 'customer':
      return { kind: 'customer' };
    case 'direct':
      return { kind: 'direct', contacts: [], advertising: false };
  }
}

export interface SmsRecipientKindMeta {
  kind: SmsRecipientKind;
  label: string;
  description: string;
  advertising: 'always' | 'optional' | 'never';
}

export const SMS_RECIPIENT_KIND_META: Record<SmsRecipientKind, SmsRecipientKindMeta> = {
  member: {
    kind: 'member',
    label: '작가·출품자',
    description: '참여 작가와 출품자에게 업무·전시 안내 (정보성)',
    advertising: 'never',
  },
  customer: {
    kind: 'customer',
    label: '고객 마케팅',
    description: '마케팅 동의·최근 거래 고객에게 신작·전시 홍보 (광고)',
    advertising: 'always',
  },
  direct: {
    kind: 'direct',
    label: '직접 지정',
    description: '전화번호를 직접 입력 (개별 안내·답변, 기본 정보성)',
    advertising: 'optional',
  },
};

// 광고 여부의 단일 출처. 서버(admin-sms-broadcast.ts)가 결정 권한을 가지며 이 값은 그 규칙을 미러.
export function deriveIsAdvertisement(seg: SmsRecipientSegment): boolean {
  switch (seg.kind) {
    case 'customer':
      return true;
    case 'direct':
      return seg.advertising;
    case 'member':
      return false;
  }
}

// 발송 전 차단 사유. manualPending: direct 모드에서 입력 중인 번호가 아직 "추가" 안 됨.
export function segmentBlockReason(
  seg: SmsRecipientSegment,
  manualPending: boolean
): string | null {
  switch (seg.kind) {
    case 'direct':
      if (manualPending) {
        return '입력 중인 번호가 아직 추가되지 않았습니다. "입력한 번호 추가" 버튼을 눌러주세요.';
      }
      if (seg.contacts.length === 0) return '받는 사람을 1명 이상 추가해주세요.';
      if (seg.contacts.length > MAX_DIRECT_RECIPIENTS) {
        return `직접 지정은 한 번에 최대 ${MAX_DIRECT_RECIPIENTS.toLocaleString('ko-KR')}명까지 보낼 수 있습니다. 그룹 발송을 이용하세요.`;
      }
      return null;
    case 'member':
    case 'customer':
      return null;
  }
}

export function isDirectSegment(
  seg: SmsRecipientSegment
): seg is Extract<SmsRecipientSegment, { kind: 'direct' }> {
  return seg.kind === 'direct';
}

export interface SmsBroadcastContent {
  bodyText: string;
}

export interface SmsGroupBroadcastInput {
  channel: SmsBroadcastChannel;
  bodyText: string;
  audienceFilter: Record<string, unknown>;
  isAdvertisement: boolean;
}

export function buildGroupInput(
  seg: Exclude<SmsRecipientSegment, { kind: 'direct' }>,
  content: SmsBroadcastContent
): SmsGroupBroadcastInput {
  const isAdvertisement = deriveIsAdvertisement(seg);
  const base = { bodyText: content.bodyText, isAdvertisement };
  switch (seg.kind) {
    case 'member':
      return { ...base, channel: 'member', audienceFilter: { subset: seg.subset } };
    case 'customer':
      return { ...base, channel: 'customer', audienceFilter: {} };
  }
}
```

- [ ] Run it (expected PASS):

```bash
npm test -- __tests__/lib/sms/broadcast-segment.test.ts
```

- [ ] Commit:

```bash
git add lib/sms/broadcast-segment.ts __tests__/lib/sms/broadcast-segment.test.ts
git commit -m "feat(sms): add SMS broadcast segment union + ad derivation

요약: SMS 받는사람 discriminated union (email 미러, petition/artwork 제거)

- member/customer/direct, deriveIsAdvertisement 단일 출처
- MAX_DIRECT_RECIPIENTS=500, segmentBlockReason, buildGroupInput

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 12 — `lib/sms/broadcast-body.ts` (compliance core)

This is the 정보통신망법 §50 enforcement layer. It (a) personalizes `{{name}}`, (b) for ads validates/enforces the exact `(광고)` prefix + brand name + free 080 opt-out line, (c) exposes the night-window check, (d) reports SMS/LMS segment by byte length. Pure functions — unit-tested exhaustively. The dispatch route (Task 15) and enqueue action (Task 14) both consume these so the rules have one source.

Key constants:

- `AD_NIGHT_WINDOW = { startHour: 21, endHour: 8 }` — block when KST hour ∈ [21, 24) ∪ [0, 8).
- `AD_PREFIX = '(광고)'`, validated by `/^\(광고\)/`.
- `BRAND_TAG = '[씨앗페]'` (matches buyer-sms prefix).
- `OPT_OUT_LINE = '무료수신거부 080-XXX-XXXX'` — read from `process.env.SMS_OPT_OUT_080` with that literal as fallback so a missing env never silently ships an invalid ad (the dispatch route additionally refuses to send ads when the env is unset — see Task 15).
- SMS↔LMS boundary: 90 bytes (EUC-KR-ish; Korean char = 2 bytes, ASCII = 1). Use a `smsByteLength(text)` that counts `<128` codepoints as 1 byte else 2 (sufficient approximation; Solapi makes the final call).

**Files:**

- Create: `lib/sms/broadcast-body.ts`
- Create: `__tests__/lib/sms/broadcast-body.test.ts`

Steps:

- [ ] Write the failing test:

```ts
/** @jest-environment node */
import {
  personalizeSmsText,
  smsByteLength,
  smsSegment,
  isNightInKst,
  validateAdvertisementText,
  buildAdvertisementText,
  AD_PREFIX,
} from '@/lib/sms/broadcast-body';

describe('personalizeSmsText', () => {
  it('{{name}}을 이름으로, 없으면 "회원"으로 치환', () => {
    expect(personalizeSmsText('{{name}}님 안녕하세요', '홍길동')).toBe('홍길동님 안녕하세요');
    expect(personalizeSmsText('{{name}}님 안녕하세요', null)).toBe('회원님 안녕하세요');
  });
});

describe('smsByteLength / smsSegment', () => {
  it('한글 2바이트·ASCII 1바이트', () => {
    expect(smsByteLength('ab')).toBe(2);
    expect(smsByteLength('가나')).toBe(4);
  });
  it('90바이트 이하 SMS, 초과 LMS', () => {
    expect(smsSegment('가'.repeat(45))).toBe('SMS'); // 90 bytes
    expect(smsSegment('가'.repeat(46))).toBe('LMS'); // 92 bytes
  });
});

describe('isNightInKst (광고 야간 차단 21:00–08:00)', () => {
  it('21:30 KST는 야간', () => {
    // 2026-06-10T12:30:00Z = 21:30 KST
    expect(isNightInKst(new Date('2026-06-10T12:30:00Z'))).toBe(true);
  });
  it('07:59 KST는 야간', () => {
    // 22:59Z = 07:59 KST(+9)
    expect(isNightInKst(new Date('2026-06-09T22:59:00Z'))).toBe(true);
  });
  it('08:00 KST는 허용', () => {
    // 23:00Z = 08:00 KST
    expect(isNightInKst(new Date('2026-06-09T23:00:00Z'))).toBe(false);
  });
  it('14:00 KST는 허용', () => {
    expect(isNightInKst(new Date('2026-06-10T05:00:00Z'))).toBe(false);
  });
});

describe('validateAdvertisementText', () => {
  it('정확히 (광고)로 시작 + 브랜드 + 무료수신거부 포함 시 ok', () => {
    const ok = '(광고)[씨앗페] 신작 안내\n무료수신거부 080-123-4567';
    expect(validateAdvertisementText(ok)).toEqual({ ok: true });
  });
  it('(광고) 누락 시 거부', () => {
    expect(validateAdvertisementText('[씨앗페] 신작\n무료수신거부 080-123-4567').ok).toBe(false);
  });
  it('변칙 표기 (광 고)/[광고] 거부', () => {
    expect(validateAdvertisementText('(광 고)[씨앗페] x\n무료수신거부 080-1').ok).toBe(false);
    expect(validateAdvertisementText('[광고][씨앗페] x\n무료수신거부 080-1').ok).toBe(false);
  });
  it('무료수신거부 누락 시 거부', () => {
    expect(validateAdvertisementText('(광고)[씨앗페] 신작').ok).toBe(false);
  });
});

describe('buildAdvertisementText (자동 보정)', () => {
  it('prefix·브랜드·무료거부를 자동 부착하고 검증 통과', () => {
    const out = buildAdvertisementText('신작이 도착했습니다', '080-123-4567');
    expect(out.startsWith(AD_PREFIX)).toBe(true);
    expect(out).toContain('[씨앗페]');
    expect(out).toContain('무료수신거부 080-123-4567');
    expect(validateAdvertisementText(out)).toEqual({ ok: true });
  });
  it('이미 (광고)가 있으면 중복 부착하지 않음', () => {
    const out = buildAdvertisementText('(광고)[씨앗페] 기존본문', '080-123-4567');
    expect(out.match(/\(광고\)/g)).toHaveLength(1);
  });
});
```

- [ ] Run it (expected FAIL):

```bash
npm test -- __tests__/lib/sms/broadcast-body.test.ts
```

- [ ] Implement `lib/sms/broadcast-body.ts`:

```ts
// 정보통신망법 §50 SMS 광고 본문 가드 + 개인화 + SMS/LMS 세그먼트 판정.
// 광고성(is_advertisement) 발송에만 prefix/무료수신거부/야간 가드 적용. 정보성(member/individual 비광고)은 비대상.
// dispatch route와 enqueue action이 모두 이 모듈을 소비 — 규칙 단일 출처.

export const AD_PREFIX = '(광고)';
export const BRAND_TAG = '[씨앗페]';
// 광고 야간 차단 창: KST 21:00(포함)~08:00(미포함). 도달 시각 기준.
export const AD_NIGHT_WINDOW = { startHour: 21, endHour: 8 };
// SMS↔LMS 경계(바이트). 90바이트 이하 SMS.
const SMS_BYTE_LIMIT = 90;

const FREE_OPT_OUT_RE = /무료\s*수신\s*거부|무료\s*거부|수신거부\s*무료/;
const AD_PREFIX_RE = /^\(광고\)/;

// 운영 080 무료수신거부 번호. 미설정 시 placeholder — dispatch route가 ad 발송을 거부(Task 15).
export function optOutNumber(): string {
  return process.env.SMS_OPT_OUT_080 ?? '080-000-0000';
}

export function personalizeSmsText(text: string, name: string | null): string {
  return text.replace(/\{\{\s*name\s*\}\}/g, name && name.trim() ? name.trim() : '회원');
}

// EUC-KR 근사: ASCII(<128) 1바이트, 그 외(한글 등) 2바이트. Solapi가 최종 판정하나 UI/검증 근사용.
export function smsByteLength(text: string): number {
  let bytes = 0;
  for (const ch of text) {
    bytes += ch.codePointAt(0)! < 128 ? 1 : 2;
  }
  return bytes;
}

export function smsSegment(text: string): 'SMS' | 'LMS' {
  return smsByteLength(text) <= SMS_BYTE_LIMIT ? 'SMS' : 'LMS';
}

// 도달 시각이 KST 21:00~08:00 야간이면 true(광고 발송 차단).
export function isNightInKst(now: Date = new Date()): boolean {
  // KST = UTC+9, DST 없음.
  const kstHour = (now.getUTCHours() + 9) % 24;
  const { startHour, endHour } = AD_NIGHT_WINDOW;
  return kstHour >= startHour || kstHour < endHour;
}

export interface AdValidation {
  ok: boolean;
  reason?: string;
}

// 광고 본문이 (광고) 정확 표기 + 브랜드명 + 무료수신거부를 모두 포함하는지 검증.
export function validateAdvertisementText(text: string): AdValidation {
  if (!AD_PREFIX_RE.test(text)) {
    return { ok: false, reason: '광고 문자는 정확히 "(광고)"로 시작해야 합니다.' };
  }
  if (!text.includes(BRAND_TAG)) {
    return { ok: false, reason: '발신 브랜드명([씨앗페])이 본문에 포함되어야 합니다.' };
  }
  if (!FREE_OPT_OUT_RE.test(text)) {
    return { ok: false, reason: '무료 수신거부 안내가 본문에 포함되어야 합니다.' };
  }
  return { ok: true };
}

// 광고 본문 자동 보정: (광고) prefix + 브랜드 + 무료수신거부 080 라인을 멱등적으로 부착.
export function buildAdvertisementText(body: string, optOut: string = optOutNumber()): string {
  let out = body.trim();
  if (!out.includes(BRAND_TAG)) out = `${BRAND_TAG} ${out}`;
  if (!AD_PREFIX_RE.test(out)) out = `${AD_PREFIX}${out}`;
  if (!FREE_OPT_OUT_RE.test(out)) out = `${out}\n무료수신거부 ${optOut}`;
  return out;
}
```

- [ ] Run it (expected PASS):

```bash
npm test -- __tests__/lib/sms/broadcast-body.test.ts
```

- [ ] Commit:

```bash
git add lib/sms/broadcast-body.ts __tests__/lib/sms/broadcast-body.test.ts
git commit -m "feat(sms): add broadcast body compliance guards (정보통신망법 §50)

요약: SMS 광고 본문 가드 (광고 표기·무료수신거부·야간 차단·SMS/LMS 판정)

- validateAdvertisementText: ^(광고) + 브랜드 + 무료수신거부 강제, 변칙 표기 차단
- buildAdvertisementText: 멱등 자동 보정 (중복 prefix 방지)
- isNightInKst: KST 21:00~08:00 광고 차단, personalizeSmsText({{name}})

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 13 — `lib/sms/solapi-batch.ts`

Mirrors `lib/email/resend-batch.ts` L42–104 in spirit, but Solapi has no Idempotency-Key header (per spec §4.4 — duplicate protection rests on lease lock + commit-before-refetch). So `sendSolapiBatch` fans out per-recipient `sendSolapiSms` calls under a concurrency cap and returns a **per-item result array in input order** (`{ messageId?, segment?, error? }[]`) so the dispatch route can map result[i] → pendingRows[i] exactly like email's `result.ids[i]`. `buildBatchIdempotencyKey` is kept (logging only) for parity. Never throws.

**Files:**

- Create: `lib/sms/solapi-batch.ts`
- Create: `__tests__/lib/sms/solapi-batch.test.ts`

Steps:

- [ ] Write the failing test:

```ts
/** @jest-environment node */
import { sendSolapiBatch } from '@/lib/sms/solapi-batch';
import { sendSolapiSms } from '@/lib/sms/solapi';

jest.mock('@/lib/sms/solapi', () => ({ sendSolapiSms: jest.fn() }));
const mockSend = sendSolapiSms as jest.MockedFunction<typeof sendSolapiSms>;

describe('sendSolapiBatch', () => {
  beforeEach(() => jest.clearAllMocks());

  it('입력 순서대로 per-item 결과를 반환(성공/실패 혼재)', async () => {
    mockSend
      .mockResolvedValueOnce({ ok: true, messageId: 'M1', segment: 'SMS' })
      .mockResolvedValueOnce({ ok: false, error: 'http_400' })
      .mockResolvedValueOnce({ ok: true, messageId: 'M3', segment: 'LMS' });

    const out = await sendSolapiBatch([
      { to: '01011110001', text: 'a' },
      { to: '01011110002', text: 'b' },
      { to: '01011110003', text: 'c' },
    ]);

    expect(out).toEqual([
      { ok: true, messageId: 'M1', segment: 'SMS' },
      { ok: false, error: 'http_400' },
      { ok: true, messageId: 'M3', segment: 'LMS' },
    ]);
    expect(mockSend).toHaveBeenCalledTimes(3);
  });

  it('빈 배열은 빈 결과', async () => {
    expect(await sendSolapiBatch([])).toEqual([]);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('개별 발송이 throw해도 전체는 throw하지 않고 error 항목으로 반환', async () => {
    mockSend.mockRejectedValueOnce(new Error('boom'));
    const out = await sendSolapiBatch([{ to: '01011110001', text: 'a' }]);
    expect(out[0].ok).toBe(false);
    expect(out[0].error).toContain('boom');
  });
});
```

- [ ] Run it (expected FAIL):

```bash
npm test -- __tests__/lib/sms/solapi-batch.test.ts
```

- [ ] Implement `lib/sms/solapi-batch.ts`:

```ts
import crypto from 'crypto';

import { sendSolapiSms, type SolapiResult } from '@/lib/sms/solapi';

export interface BatchSmsItem {
  to: string;
  text: string;
}

const CONCURRENCY = 10;

// 청크 재발송 로깅용(멱등 헤더 없음 — Solapi 미지원). row id 정렬 해시.
export function buildBatchIdempotencyKey(broadcastId: string, recipientIds: string[]): string {
  const digest = crypto
    .createHash('sha256')
    .update([...recipientIds].sort().join(','))
    .digest('hex');
  return `sms_bcast_${broadcastId}_${digest.slice(0, 40)}`;
}

// 다건 SMS를 동시성 캡으로 발송하고 입력 순서대로 per-item 결과를 반환한다.
// Solapi는 Resend의 Idempotency-Key가 없으므로 배치 자체에 중복 방지가 없다 —
// 중복 발송 차단은 호출 측(dispatch)의 lease lock + pending→sent 커밋 순서에 의존.
// 절대 throw하지 않는다(개별 실패는 ok:false 항목으로 반환).
export async function sendSolapiBatch(items: BatchSmsItem[]): Promise<SolapiResult[]> {
  const results: SolapiResult[] = new Array(items.length);
  for (let start = 0; start < items.length; start += CONCURRENCY) {
    const slice = items.slice(start, start + CONCURRENCY);
    const settled = await Promise.all(
      slice.map(async (item, i) => {
        try {
          return { idx: start + i, res: await sendSolapiSms(item) };
        } catch (err) {
          return {
            idx: start + i,
            res: { ok: false, error: String(err) } as SolapiResult,
          };
        }
      })
    );
    for (const { idx, res } of settled) results[idx] = res;
  }
  return results;
}
```

- [ ] Run it (expected PASS):

```bash
npm test -- __tests__/lib/sms/solapi-batch.test.ts
```

- [ ] Commit:

```bash
git add lib/sms/solapi-batch.ts __tests__/lib/sms/solapi-batch.test.ts
git commit -m "feat(sms): add sendSolapiBatch (concurrency-capped per-item results)

요약: 다건 SMS 발송 헬퍼 (입력 순서 결과 배열, 동시성 캡 10, never throw)

- Solapi엔 Idempotency-Key 없음 — 중복 방지는 dispatch lease lock에 의존
- buildBatchIdempotencyKey는 로깅용 유지(email 미러)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 14 — `app/actions/admin-sms-broadcast.ts`

Mirrors `app/actions/admin-broadcast.ts`: `enqueueSmsBroadcast` (5-min dedup L130–156, ad derivation L91–110, status flow), `enqueueIndividualSmsBroadcast` (500 cap L497–502 + dedup L533–553), `getSmsBroadcasts` (pagination shape L240–276), `previewSmsAudience`, `sendTestSms`. Admin portal = permanently Korean (correct). Dedup key = `created_by + channel + body_text` (body replaces email's subject). Ad enqueue **runs the compliance gate before insert**: validates `(광고)` text and refuses night sends.

**Files:**

- Create: `app/actions/admin-sms-broadcast.ts`
- Create: `__tests__/app/actions/admin-sms-broadcast.test.ts`

Steps:

- [ ] Write the failing test (mock guards + resolvers + body helpers; assert 5-min dedup, 500 cap, ad night block, ad text validation):

```ts
/** @jest-environment node */
import {
  enqueueSmsBroadcast,
  enqueueIndividualSmsBroadcast,
} from '@/app/actions/admin-sms-broadcast';

jest.mock('@/lib/auth/guards', () => ({
  requireAdmin: jest.fn(async () => ({ id: 'admin-1' })),
  requireAdminClient: jest.fn(),
}));
jest.mock('@/app/actions/activity-log-writer', () => ({ logAdminAction: jest.fn() }));
jest.mock('@/lib/sms/audiences/member', () => ({
  MemberSmsAudienceResolver: jest.fn().mockImplementation(() => ({
    resolve: async () => [{ phone: '01011112222', name: 'A', phoneHash: 'h1' }],
  })),
}));
jest.mock('@/lib/sms/audiences/customer', () => ({
  CustomerSmsAudienceResolver: jest.fn().mockImplementation(() => ({
    resolve: async () => [{ phone: '01033334444', name: 'B', phoneHash: 'h2' }],
  })),
}));
// 야간 차단 테스트: isNightInKst를 제어
jest.mock('@/lib/sms/broadcast-body', () => {
  const actual = jest.requireActual('@/lib/sms/broadcast-body');
  return { ...actual, isNightInKst: jest.fn(() => false) };
});

import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import { isNightInKst } from '@/lib/sms/broadcast-body';

const mockClient = requireAdminClient as jest.MockedFunction<typeof requireAdminClient>;
const mockNight = isNightInKst as jest.MockedFunction<typeof isNightInKst>;

// chainable supabase stub. existingBroadcast로 dedup 분기 제어.
function makeSupabase(opts: { existingId?: string | null } = {}) {
  const inserted: Record<string, unknown> = {};
  const builder = {
    select: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    in: jest.fn(() => builder),
    gt: jest.fn(() => builder),
    gte: jest.fn(() => builder),
    order: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    maybeSingle: jest.fn(async () => ({
      data: opts.existingId ? { id: opts.existingId } : null,
      error: null,
    })),
    insert: jest.fn((row: Record<string, unknown>) => {
      Object.assign(inserted, row);
      return {
        select: () => ({ single: async () => ({ data: { id: 'bcast-1' }, error: null }) }),
      };
    }),
    update: jest.fn(() => ({ eq: jest.fn(async () => ({ error: null })) })),
  };
  return { client: { from: jest.fn(() => builder) }, inserted, builder };
}

describe('enqueueSmsBroadcast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNight.mockReturnValue(false);
  });

  it('member 채널: 정보성으로 큐 등록, is_advertisement=false', async () => {
    const { client, inserted } = makeSupabase();
    mockClient.mockResolvedValue(client as never);
    const r = await enqueueSmsBroadcast({
      channel: 'member',
      bodyText: '작가님 안내드립니다',
      audienceFilter: { subset: 'all' },
    });
    expect(r.error).toBeFalsy();
    expect(r.broadcastId).toBe('bcast-1');
    expect(inserted.is_advertisement).toBe(false);
  });

  it('customer 채널 광고: 야간이면 차단', async () => {
    mockNight.mockReturnValue(true);
    const { client } = makeSupabase();
    mockClient.mockResolvedValue(client as never);
    const r = await enqueueSmsBroadcast({
      channel: 'customer',
      bodyText: '신작 안내\n무료수신거부 080-1',
      audienceFilter: {},
    });
    expect(r.error).toBe(true);
    expect(r.message).toMatch(/야간/);
  });

  it('customer 채널 광고: (광고) 누락이면 자동 보정 후 등록', async () => {
    const { client, inserted } = makeSupabase();
    mockClient.mockResolvedValue(client as never);
    const r = await enqueueSmsBroadcast({
      channel: 'customer',
      bodyText: '신작이 도착했습니다',
      audienceFilter: {},
    });
    expect(r.error).toBeFalsy();
    expect((inserted.body_text as string).startsWith('(광고)')).toBe(true);
    expect(inserted.body_text).toContain('무료수신거부');
  });

  it('5분 내 같은 channel+body면 dedup', async () => {
    const { client } = makeSupabase({ existingId: 'old-1' });
    mockClient.mockResolvedValue(client as never);
    const r = await enqueueSmsBroadcast({
      channel: 'member',
      bodyText: '같은 본문',
      audienceFilter: { subset: 'all' },
    });
    expect(r.deduped).toBe(true);
    expect(r.broadcastId).toBe('old-1');
  });
});

describe('enqueueIndividualSmsBroadcast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNight.mockReturnValue(false);
  });

  it('500명 초과는 차단', async () => {
    const { client } = makeSupabase();
    mockClient.mockResolvedValue(client as never);
    const contacts = Array.from({ length: 501 }, (_, i) => ({
      phone: `0101111${(1000 + i).toString()}`,
      name: null,
    }));
    const r = await enqueueIndividualSmsBroadcast({
      contacts,
      bodyText: '안내',
      isAdvertisement: false,
    });
    expect(r.error).toBe(true);
    expect(r.message).toMatch(/최대 500/);
  });
});
```

- [ ] Run it (expected FAIL):

```bash
npm test -- __tests__/app/actions/admin-sms-broadcast.test.ts
```

- [ ] Implement `app/actions/admin-sms-broadcast.ts`:

```ts
'use server';

import { logAdminAction } from '@/app/actions/activity-log-writer';
import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import { PETITION_SALT } from '@/lib/email/email-hash';
import { CustomerSmsAudienceResolver } from '@/lib/sms/audiences/customer';
import { MemberSmsAudienceResolver } from '@/lib/sms/audiences/member';
import { resolveIndividualSmsRecipients } from '@/lib/sms/audiences/individual';
import type { SmsBroadcastChannel, SmsRecipient } from '@/lib/sms/audiences/types';
import { MAX_DIRECT_RECIPIENTS } from '@/lib/sms/broadcast-segment';
import {
  buildAdvertisementText,
  isNightInKst,
  optOutNumber,
  validateAdvertisementText,
} from '@/lib/sms/broadcast-body';
import { sendSolapiSms } from '@/lib/sms/solapi';
import { normalizeKoreanMobile } from '@/lib/sms/phone';
import type { ActionState } from '@/types';
import type { Json } from '@/types/supabase';

export interface EnqueueSmsBroadcastInput {
  channel: SmsBroadcastChannel; // 'member' | 'customer'
  bodyText: string;
  audienceFilter?: Record<string, unknown>;
}

// 광고 본문을 §50 가드로 보정·검증. 야간이면 차단. ok면 정규화된 본문 반환.
function gateAdvertisementBody(
  bodyText: string
): { ok: true; body: string } | { ok: false; message: string } {
  if (isNightInKst()) {
    return {
      ok: false,
      message: '광고 문자는 야간(21:00~08:00)에 발송할 수 없습니다. 주간에 다시 시도해주세요.',
    };
  }
  const corrected = buildAdvertisementText(bodyText, optOutNumber());
  const validation = validateAdvertisementText(corrected);
  if (!validation.ok) {
    return { ok: false, message: validation.reason ?? '광고 본문 검증에 실패했습니다.' };
  }
  return { ok: true, body: corrected };
}

export async function enqueueSmsBroadcast(
  input: EnqueueSmsBroadcastInput
): Promise<ActionState & { broadcastId?: string; deduped?: boolean }> {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const { channel } = input;
  const audienceFilter = input.audienceFilter ?? {};

  if (!input.bodyText.trim()) return { message: '본문은 필수입니다.', error: true };

  let resolver;
  let isAdvertisement = false;
  if (channel === 'member') {
    resolver = new MemberSmsAudienceResolver();
  } else if (channel === 'customer') {
    isAdvertisement = true; // 광범위 고객 마케팅 = 항상 광고(법적)
    resolver = new CustomerSmsAudienceResolver();
  } else {
    return { message: `채널 '${channel}'은 그룹 발송을 지원하지 않습니다.`, error: true };
  }

  // 광고면 §50 가드(야간·표기·무료거부)를 INSERT 전에 통과시킨다.
  let bodyText = input.bodyText.trim();
  if (isAdvertisement) {
    const gate = gateAdvertisementBody(bodyText);
    if (!gate.ok) return { message: gate.message, error: true };
    bodyText = gate.body;
  }

  let recipients: SmsRecipient[];
  try {
    recipients = await resolver.resolve(audienceFilter);
  } catch (err) {
    console.error('[enqueue-sms-broadcast] resolver error:', err);
    const message = err instanceof Error ? err.message : '수신자 추출 중 오류가 발생했습니다.';
    return { message, error: true };
  }
  if (recipients.length === 0) {
    return { message: '발송 대상 수신자가 없습니다. (전원 수신거부 또는 번호 없음)', error: true };
  }

  // 멱등 가드: 같은 admin·channel·body로 최근 5분 내 큐/발송 중 캠페인이 있으면 기존 ID 반환.
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: existing } = await supabase
    .from('sms_broadcasts')
    .select('id')
    .eq('created_by', admin.id)
    .eq('channel', channel)
    .eq('body_text', bodyText)
    .in('status', ['queued', 'sending'])
    .gt('recipient_count', 0)
    .gte('created_at', fiveMinAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return {
      message:
        '같은 채널·본문의 캠페인이 최근 5분 내에 이미 등록돼 발송 중입니다. 새로 발송되지 않았습니다.',
      broadcastId: existing.id,
      deduped: true,
    };
  }

  const { data: broadcast, error: broadcastError } = await supabase
    .from('sms_broadcasts')
    .insert({
      channel,
      body_text: bodyText,
      audience_filter: audienceFilter as Json,
      is_advertisement: isAdvertisement,
      status: 'queued',
      recipient_count: recipients.length,
      created_by: admin.id,
      queued_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (broadcastError || !broadcast) {
    console.error('[enqueue-sms-broadcast] insert broadcast error:', broadcastError);
    return { message: '캠페인 생성에 실패했습니다.', error: true };
  }

  const rows = recipients.map((r) => ({
    broadcast_id: broadcast.id,
    phone: r.phone,
    name: r.name,
    status: 'pending',
  }));
  const { error: recipientsError } = await supabase.from('sms_broadcast_recipients').insert(rows);
  if (recipientsError) {
    await supabase.from('sms_broadcasts').update({ status: 'failed' }).eq('id', broadcast.id);
    console.error('[enqueue-sms-broadcast] insert recipients error:', recipientsError);
    return { message: '수신자 큐 등록에 실패했습니다.', error: true };
  }

  await logAdminAction('sms_broadcast_enqueued', 'sms_broadcast', broadcast.id, {
    channel,
    recipient_count: recipients.length,
    is_advertisement: isAdvertisement,
  });

  return { message: `${recipients.length}명에게 발송을 시작했습니다.`, broadcastId: broadcast.id };
}

export async function enqueueIndividualSmsBroadcast(input: {
  contacts: Array<{ phone: string; name: string | null }>;
  bodyText: string;
  isAdvertisement: boolean;
}): Promise<ActionState & { broadcastId?: string; deduped?: boolean }> {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const { contacts, isAdvertisement } = input;

  if (!input.bodyText.trim()) return { message: '본문은 필수입니다.', error: true };
  if (contacts.length === 0) return { message: '수신자를 1명 이상 선택하세요.', error: true };
  if (contacts.length > MAX_DIRECT_RECIPIENTS) {
    return {
      message: `직접 지정은 한 번에 최대 ${MAX_DIRECT_RECIPIENTS.toLocaleString('ko-KR')}명까지 보낼 수 있습니다. (${contacts.length.toLocaleString('ko-KR')}명 선택됨)`,
      error: true,
    };
  }

  let bodyText = input.bodyText.trim();
  if (isAdvertisement) {
    const gate = gateAdvertisementBody(bodyText);
    if (!gate.ok) return { message: gate.message, error: true };
    bodyText = gate.body;
  }

  const rows = await resolveIndividualSmsRecipients(contacts, isAdvertisement, supabase);
  if (rows.length === 0) {
    return { message: '발송 가능한 수신자가 없습니다. (전원 수신거부 또는 비-010)', error: true };
  }

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: existingBroadcast } = await supabase
    .from('sms_broadcasts')
    .select('id')
    .eq('created_by', admin.id)
    .eq('channel', 'individual')
    .eq('body_text', bodyText)
    .in('status', ['queued', 'sending'])
    .gt('recipient_count', 0)
    .gte('created_at', fiveMinAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingBroadcast?.id) {
    return {
      message:
        '같은 본문의 개별 발송이 최근 5분 내에 이미 등록돼 발송 중입니다. 새로 발송되지 않았습니다.',
      broadcastId: existingBroadcast.id,
      deduped: true,
    };
  }

  const { data: broadcast, error: bErr } = await supabase
    .from('sms_broadcasts')
    .insert({
      channel: 'individual',
      body_text: bodyText,
      audience_filter: { mode: 'direct' } as Json,
      is_advertisement: isAdvertisement,
      status: 'queued',
      recipient_count: rows.length,
      created_by: admin.id,
      queued_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (bErr || !broadcast) {
    console.error('[enqueue-individual-sms] insert broadcast error:', bErr);
    return { message: '캠페인 생성에 실패했습니다.', error: true };
  }

  const { error: rErr } = await supabase
    .from('sms_broadcast_recipients')
    .insert(rows.map((r) => ({ ...r, broadcast_id: broadcast.id })));
  if (rErr) {
    await supabase.from('sms_broadcasts').update({ status: 'failed' }).eq('id', broadcast.id);
    return { message: '수신자 큐 등록에 실패했습니다.', error: true };
  }

  await logAdminAction('sms_broadcast_enqueued', 'sms_broadcast', broadcast.id, {
    channel: 'individual',
    recipient_count: rows.length,
    is_advertisement: isAdvertisement,
  });
  return { message: `${rows.length}명에게 발송을 시작했습니다.`, broadcastId: broadcast.id };
}

export type SmsPageQuery = { page?: number; pageSize?: number };

export type SmsBroadcastRow = {
  id: string;
  channel: string;
  body_text: string;
  status: string;
  is_advertisement: boolean | null;
  recipient_count: number | null;
  sent_count: number | null;
  failed_count: number | null;
  created_at: string | null;
  queued_at: string | null;
  sent_at: string | null;
};

export type SmsPaginatedResult<T> = { rows: T[]; total: number; page: number; pageSize: number };

const DEFAULT_SMS_PAGE_SIZE = 25;
const MAX_SMS_PAGE_SIZE = 100;

function normalizeSmsPageQuery(query: SmsPageQuery = {}) {
  const page = Math.max(1, Math.floor(Number(query.page) || 1));
  const requested = Math.floor(Number(query.pageSize) || DEFAULT_SMS_PAGE_SIZE);
  const pageSize = Math.min(MAX_SMS_PAGE_SIZE, Math.max(1, requested));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { page, pageSize, from, to };
}

export async function getSmsBroadcasts(
  query: SmsPageQuery = {}
): Promise<SmsPaginatedResult<SmsBroadcastRow>> {
  await requireAdmin();
  const supabase = await requireAdminClient();
  const { page, pageSize, from, to } = normalizeSmsPageQuery(query);

  const { data, error, count } = await supabase
    .from('sms_broadcasts')
    .select(
      'id, channel, body_text, status, is_advertisement, recipient_count, sent_count, failed_count, created_at, queued_at, sent_at',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('[get-sms-broadcasts] error:', error);
    return { rows: [], total: 0, page, pageSize };
  }
  return {
    rows: (data ?? []) as SmsBroadcastRow[],
    total: typeof count === 'number' ? count : (data?.length ?? 0),
    page,
    pageSize,
  };
}

export async function previewSmsAudience(
  channel: SmsBroadcastChannel,
  filter?: { subset?: 'all' | 'artist' | 'exhibitor' }
): Promise<{ total: number; breakdown: Record<string, number> }> {
  await requireAdmin();
  // SMS는 email의 count_*_audience RPC가 없으므로 resolver로 직접 계산.
  // (PETITION_SALT 재사용 — 향후 RPC 도입 시 인자 전달용으로 남겨둠)
  void PETITION_SALT;
  if (channel === 'member') {
    const subset = filter?.subset ?? 'all';
    const total = (await new MemberSmsAudienceResolver().resolve({ subset })).length;
    const label = subset === 'artist' ? '작가' : subset === 'exhibitor' ? '출품자' : '작가·출품자';
    return { total, breakdown: { [label]: total } };
  }
  if (channel === 'customer') {
    const total = (await new CustomerSmsAudienceResolver().resolve()).length;
    return { total, breakdown: { '동의자·거래고객': total } };
  }
  return { total: 0, breakdown: {} };
}

// 작성 중인 본문으로 관리자 본인 번호에 테스트 1통 즉시 발송(큐 우회).
export async function sendTestSms(input: {
  bodyText: string;
  isAdvertisement: boolean;
}): Promise<ActionState> {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  if (!input.bodyText.trim()) return { message: '본문은 필수입니다.', error: true };

  const { data: profile } = await supabase
    .from('profiles')
    .select('phone, name')
    .eq('id', admin.id)
    .single();
  const to = normalizeKoreanMobile(profile?.phone as string | null);
  if (!to) {
    return { message: '관리자 전화번호(010)가 마이페이지에 등록되어 있지 않습니다.', error: true };
  }

  let bodyText = input.bodyText.trim();
  if (input.isAdvertisement) {
    const gate = gateAdvertisementBody(bodyText);
    if (!gate.ok) return { message: gate.message, error: true };
    bodyText = `[테스트] ${gate.body}`;
  } else {
    bodyText = `[테스트] ${bodyText}`;
  }

  const result = await sendSolapiSms({ to, text: bodyText });
  if (!result.ok) {
    return { message: `테스트 발송 실패: ${result.error ?? '알 수 없는 오류'}`, error: true };
  }
  return { message: `테스트 SMS를 ${to}로 보냈습니다.` };
}
```

- [ ] Run it (expected PASS):

```bash
npm test -- __tests__/app/actions/admin-sms-broadcast.test.ts
```

- [ ] Type-check (the action consumes the regenerated types + ActionState):

```bash
npm run type-check
```

Expected: PASS.

- [ ] Commit:

```bash
git add app/actions/admin-sms-broadcast.ts __tests__/app/actions/admin-sms-broadcast.test.ts
git commit -m "feat(sms): add SMS broadcast server actions (enqueue/individual/preview/test)

요약: SMS 브로드캐스트 서버 액션 (큐 등록·개별·미리보기·테스트)

- 5분 dedup(channel+body), 500 cap, customer 광고 강제
- 광고 INSERT 전 §50 가드(야간 차단·(광고) 표기·무료수신거부 보정)
- getSmsBroadcasts 페이지네이션 반환형(email 미러)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 15 — `app/api/internal/sms-broadcast-dispatch/route.ts` + cron

The lease-lock dispatch loop, mirroring `broadcast-dispatch/route.ts` L23–352 **exactly** in structure, with these substitutions:

- RPCs `claim_broadcast_dispatch`/`renew_broadcast_dispatch` → `claim_sms_broadcast_dispatch`/`renew_sms_broadcast_dispatch`.
- Tables `email_broadcasts`/`email_broadcast_recipients` → `sms_broadcasts`/`sms_broadcast_recipients`.
- The email-render path → `sendSolapiBatch`; `result.ids[i]` → `result[i].ok`/`messageId`/`segment`.
- The `EMAIL_UNSUB_SECRET` sanity gate (L70–96) → an **ad opt-out gate**: when `broadcast.is_advertisement` and `SMS_OPT_OUT_080` is unset, mark the broadcast `failed` (same lock-gated update) and skip — never ship an ad without a real free opt-out number. Non-ad broadcasts skip this gate.
- Per-recipient text: `personalizeSmsText(broadcast.body_text, r.name)`; the `(광고)`/opt-out content is already baked into `body_text` at enqueue (Task 14), so dispatch only personalizes — it does NOT re-prefix (idempotent guarantee).
- **Crucial idempotency ordering (spec §4.4)**: keep email's "always re-fetch the leading pending chunk" pattern (L116–125) and commit each `pending→sent` (with `provider_message_id`/`segment`) **before** the next chunk re-fetch. The lock token gates all `sms_broadcasts` count/finalize updates.

**Files:**

- Create: `app/api/internal/sms-broadcast-dispatch/route.ts`
- Modify: `vercel.json` (functions L8–14 add maxDuration; crons L15–32 add schedule)
- Create: `__tests__/app/api/sms-broadcast-dispatch.test.ts`

Steps:

- [ ] Write the failing test (auth gate + happy path: claim→renew→one chunk→sent committed before finalize; assert sendSolapiBatch called and recipient marked sent with provider_message_id):

```ts
/** @jest-environment node */
import { GET } from '@/app/api/internal/sms-broadcast-dispatch/route';

jest.mock('@/lib/security/internal-cron-auth', () => ({
  validateInternalCronRequest: jest.fn(() => null),
}));
jest.mock('@/lib/sms/solapi-batch', () => ({
  sendSolapiBatch: jest.fn(async (items: unknown[]) =>
    (items as unknown[]).map((_, i) => ({ ok: true, messageId: `M${i}`, segment: 'SMS' }))
  ),
  buildBatchIdempotencyKey: jest.fn(() => 'k'),
}));

// supabase 어드민 스텁: 1개 broadcast, 1개 pending → 1청크 처리 후 finalize.
const updates: Array<{ table: string; patch: Record<string, unknown> }> = [];
jest.mock('@/lib/auth/server', () => {
  let pendingDrained = false;
  const makeChain = (table: string) => {
    const chain: Record<string, unknown> = {};
    const methods = ['select', 'eq', 'in', 'gt', 'order', 'limit'];
    for (const m of methods) chain[m] = jest.fn(() => chain);
    chain.update = jest.fn((patch: Record<string, unknown>) => {
      updates.push({ table, patch });
      const u: Record<string, unknown> = {};
      u.eq = jest.fn(() => u);
      u.in = jest.fn(async () => ({ error: null }));
      // 마지막 eq는 thenable
      u.eq = jest.fn(() => ({ eq: jest.fn(async () => ({ error: null })) }));
      return u;
    });
    // 리졸브 형태
    chain.then = undefined;
    chain.maybeSingle = jest.fn(async () => ({ data: null, error: null }));
    chain.range = jest.fn(async () => ({ data: [], error: null, count: 0 }));
    // 셀렉트 종단 호출들
    chain.limit = jest.fn(() => {
      if (table === 'sms_broadcasts') {
        return Promise.resolve({
          data: [
            {
              id: 'b1',
              channel: 'member',
              body_text: '{{name}}님 안내',
              status: 'queued',
              is_advertisement: false,
            },
          ],
          error: null,
        });
      }
      if (table === 'sms_broadcast_recipients') {
        if (!pendingDrained) {
          pendingDrained = true;
          return Promise.resolve({
            data: [{ id: 'r1', phone: '01011112222', name: 'A' }],
            error: null,
          });
        }
        return Promise.resolve({ data: [], error: null });
      }
      return Promise.resolve({ data: [], error: null });
    });
    return chain;
  };
  return {
    createSupabaseAdminClient: () => ({
      from: (t: string) => makeChain(t),
      rpc: jest.fn(async (fn: string) => {
        if (fn === 'claim_sms_broadcast_dispatch') return { data: 'token-1', error: null };
        if (fn === 'renew_sms_broadcast_dispatch') return { data: true, error: null };
        return { data: null, error: null };
      }),
    }),
  };
});

import { sendSolapiBatch } from '@/lib/sms/solapi-batch';

function req() {
  return { headers: { get: () => 'Bearer x' } } as never;
}

describe('sms-broadcast-dispatch GET', () => {
  it('claim→발송→sent 커밋 후 dispatched 반환', async () => {
    const res = await GET(req());
    const json = await res.json();
    expect(sendSolapiBatch).toHaveBeenCalled();
    expect(json.dispatched).toBeGreaterThanOrEqual(1);
    // recipient가 sent로 갱신됐는지
    expect(
      updates.some((u) => u.table === 'sms_broadcast_recipients' && u.patch.status === 'sent')
    ).toBe(true);
  });
});
```

> Note: the supabase chain stub above is intentionally permissive. If `npm run build`/type-check on the real route surfaces method shapes the stub misses (e.g. `.select(..., {count, head})`), extend the stub's terminal resolvers rather than weakening the route. The route's logic is what matters; keep the stub faithful to the call sites the route actually uses.

- [ ] Run it (expected FAIL — route not found):

```bash
npm test -- __tests__/app/api/sms-broadcast-dispatch.test.ts
```

- [ ] Implement `app/api/internal/sms-broadcast-dispatch/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseAdminClient } from '@/lib/auth/server';
import { validateInternalCronRequest } from '@/lib/security/internal-cron-auth';
import { sendSolapiBatch, buildBatchIdempotencyKey } from '@/lib/sms/solapi-batch';
import { personalizeSmsText } from '@/lib/sms/broadcast-body';

export const runtime = 'nodejs';
export const maxDuration = 300;

const CHUNK_SIZE = 100;
const THROTTLE_MS = 500;
const LEASE_SECONDS = 120; // 청크당 시간보다 충분히 커서 발송 중 만료 없음; run 사망 시 2분 후 resume

export async function GET(request: NextRequest) {
  const authError = validateInternalCronRequest(request);
  if (authError) return authError;

  let supabase;
  try {
    supabase = createSupabaseAdminClient();
  } catch (err) {
    console.error('[sms-broadcast-dispatch] admin client init failed:', err);
    return NextResponse.json({ error: 'supabase credentials missing' }, { status: 500 });
  }

  // recipient_count > 0 가드: recipients INSERT 전 crash한 orphan broadcast를 자동 제외.
  const { data: broadcasts } = await supabase
    .from('sms_broadcasts')
    .select('id, channel, body_text, status, is_advertisement')
    .in('status', ['queued', 'sending'])
    .gt('recipient_count', 0)
    .order('queued_at', { ascending: true })
    .limit(5);

  if (!broadcasts || broadcasts.length === 0) {
    return NextResponse.json({ dispatched: 0 });
  }

  let totalDispatched = 0;

  for (const broadcast of broadcasts) {
    // 리스 락 획득. 다른 동시 run이 유효 락을 쥐고 있으면 token=null → 건너뜀(중복 발송 차단).
    const { data: lockToken, error: claimError } = await supabase.rpc(
      'claim_sms_broadcast_dispatch',
      { p_broadcast_id: broadcast.id, p_lease_seconds: LEASE_SECONDS }
    );
    if (claimError) {
      console.error(
        `[sms-broadcast-dispatch] claim RPC error for ${broadcast.id}:`,
        claimError.message
      );
      continue;
    }
    if (!lockToken) continue;

    // 광고 안전 가드: SMS_OPT_OUT_080 미설정 시 무료수신거부 번호가 placeholder라
    // 정통망법 위반 발송이 된다. 광고 broadcast는 락 보유 상태에서 failed로 마킹하고 중단.
    const isAd = (broadcast.is_advertisement ?? false) as boolean;
    if (isAd && !process.env.SMS_OPT_OUT_080) {
      console.error(
        `[sms-broadcast-dispatch] SMS_OPT_OUT_080 missing — refusing ad ${broadcast.id}`
      );
      const { error: failMarkError } = await supabase
        .from('sms_broadcasts')
        .update({ status: 'failed', dispatch_locked_until: null, dispatch_lock_token: null })
        .eq('id', broadcast.id)
        .eq('dispatch_lock_token', lockToken);
      if (failMarkError) {
        console.error(
          `[sms-broadcast-dispatch] failed to mark ${broadcast.id} failed:`,
          failMarkError.message
        );
      }
      continue;
    }

    let hasMore = true;

    while (hasMore) {
      // 청크마다 리스 갱신. 빼앗겼으면(token 불일치) 즉시 중단(중복 방지).
      const { data: renewed, error: renewError } = await supabase.rpc(
        'renew_sms_broadcast_dispatch',
        { p_broadcast_id: broadcast.id, p_token: lockToken, p_lease_seconds: LEASE_SECONDS }
      );
      if (renewError) {
        console.error(
          `[sms-broadcast-dispatch] renew RPC error for ${broadcast.id}:`,
          renewError.message
        );
        break;
      }
      if (!renewed) break;

      // 처리된 행은 sent/failed로 빠지므로 항상 pending 선두 청크만 가져온다(offset 누적 금지).
      const { data: pending } = await supabase
        .from('sms_broadcast_recipients')
        .select('id, phone, name')
        .eq('broadcast_id', broadcast.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .order('id', { ascending: true }) // 동순위 시 청크 경계 결정론화
        .limit(CHUNK_SIZE);

      if (!pending || pending.length === 0) {
        hasMore = false;
        break;
      }

      const pendingRows = pending as Array<{ id: string; phone: string; name: string | null }>;

      const batchItems = pendingRows.map((r) => ({
        to: r.phone,
        text: personalizeSmsText(broadcast.body_text as string, r.name),
      }));

      // Solapi엔 Idempotency-Key 없음 — 키는 로깅용. 중복 방지는 lease lock + 아래 pending→sent
      // 커밋을 다음 청크 재조회 전에 끝내는 순서로 보장(이미 sent면 다음 run이 선택하지 않음).
      void buildBatchIdempotencyKey(
        broadcast.id as string,
        pendingRows.map((r) => r.id)
      );
      const results = await sendSolapiBatch(batchItems);

      const sentAt = new Date().toISOString();

      // results[i] = batchItems[i] = pendingRows[i] (입력 순서 보존). 성공/실패 분리.
      const updateResults = await Promise.all(
        pendingRows.map(async (row, i) => {
          const res = results[i];
          if (res?.ok) {
            const { error } = await supabase
              .from('sms_broadcast_recipients')
              .update({
                status: 'sent',
                sent_at: sentAt,
                provider_message_id: res.messageId ?? null,
                segment: res.segment ?? null,
              })
              .eq('id', row.id);
            return { id: row.id, sent: true, error };
          }
          const { error } = await supabase
            .from('sms_broadcast_recipients')
            .update({ status: 'failed', error: res?.error ?? 'send failed' })
            .eq('id', row.id);
          return { id: row.id, sent: false, error };
        })
      );

      // status update 자체가 실패한 sent row: Solapi는 이미 발송했으므로 'sent' 재시도.
      // (supabase-js는 RLS/네트워크 에러 시 reject 않고 {error}로 resolve — 무시하면 pending 잔존→재발송.)
      const sentUpdateFailedIds = updateResults
        .filter((r) => r.sent && r.error)
        .map((r) => {
          console.error(
            `[sms-broadcast-dispatch] sent-update failed for ${r.id}:`,
            r.error?.message
          );
          return r.id;
        });
      if (sentUpdateFailedIds.length > 0) {
        const retry = await Promise.all(
          sentUpdateFailedIds.map(async (id) => {
            const { error } = await supabase
              .from('sms_broadcast_recipients')
              .update({ status: 'sent', sent_at: sentAt })
              .eq('id', id);
            return { id, error };
          })
        );
        const stillFailed = retry.filter((r) => r.error).map((r) => r.id);
        if (stillFailed.length > 0) {
          console.error(
            `[sms-broadcast-dispatch] sent-update permanently failed for ${stillFailed.length} rows ` +
              `(already sent via Solapi; marking 'failed' to break re-dispatch loop):`,
            stillFailed
          );
          await supabase
            .from('sms_broadcast_recipients')
            .update({ status: 'failed', error: 'sent via Solapi but status update failed' })
            .in('id', stillFailed);
        }
      }

      // 청크마다 진행 카운트 재집계(running 합산 아님 — 락 인계·재개에도 정확). 락 보유 시에만.
      const { count: sentSoFar } = await supabase
        .from('sms_broadcast_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('broadcast_id', broadcast.id)
        .eq('status', 'sent');
      const { count: failedSoFar } = await supabase
        .from('sms_broadcast_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('broadcast_id', broadcast.id)
        .eq('status', 'failed');
      await supabase
        .from('sms_broadcasts')
        .update({ status: 'sending', sent_count: sentSoFar ?? 0, failed_count: failedSoFar ?? 0 })
        .eq('id', broadcast.id)
        .eq('dispatch_lock_token', lockToken);

      totalDispatched += pendingRows.length;

      if (pending.length < CHUNK_SIZE) {
        hasMore = false;
      } else {
        await new Promise((r) => setTimeout(r, THROTTLE_MS));
      }
    }

    // 전량 처리 후 finalize. select 에러를 무시하면 false finalize → orphan pending.
    const { data: remainingPending, error: remainingError } = await supabase
      .from('sms_broadcast_recipients')
      .select('id')
      .eq('broadcast_id', broadcast.id)
      .eq('status', 'pending')
      .limit(1);

    if (remainingError) {
      console.error(
        `[sms-broadcast-dispatch] remainingPending query failed for ${broadcast.id}:`,
        remainingError.message
      );
      continue; // 락 만료(120s) 후 다음 cron이 재시도
    }

    if (remainingPending.length === 0) {
      const { count: sentCount } = await supabase
        .from('sms_broadcast_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('broadcast_id', broadcast.id)
        .eq('status', 'sent');
      const { count: failedCount } = await supabase
        .from('sms_broadcast_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('broadcast_id', broadcast.id)
        .eq('status', 'failed');

      await supabase
        .from('sms_broadcasts')
        .update({
          status: 'sent',
          sent_count: sentCount ?? 0,
          failed_count: failedCount ?? 0,
          sent_at: new Date().toISOString(),
          dispatch_locked_until: null,
          dispatch_lock_token: null,
        })
        .eq('id', broadcast.id)
        .eq('dispatch_lock_token', lockToken); // 여전히 락 보유 중일 때만 finalize
    }
  }

  return NextResponse.json({ dispatched: totalDispatched });
}
```

- [ ] Run it (expected PASS):

```bash
npm test -- __tests__/app/api/sms-broadcast-dispatch.test.ts
```

- [ ] Edit `vercel.json` — add the function maxDuration. Replace:

```json
    "app/api/internal/broadcast-dispatch/route.ts": { "maxDuration": 300 },
```

with:

```json
    "app/api/internal/broadcast-dispatch/route.ts": { "maxDuration": 300 },
    "app/api/internal/sms-broadcast-dispatch/route.ts": { "maxDuration": 300 },
```

- [ ] Edit `vercel.json` — add the cron. Replace:

```json
{
  "path": "/api/internal/broadcast-dispatch",
  "schedule": "* * * * *"
}
```

with:

```json
    {
      "path": "/api/internal/broadcast-dispatch",
      "schedule": "* * * * *"
    },
    {
      "path": "/api/internal/sms-broadcast-dispatch",
      "schedule": "* * * * *"
    }
```

- [ ] Validate JSON parses:

```bash
node -e "JSON.parse(require('fs').readFileSync('/Users/hwang-gyeongha/saf-2026/vercel.json','utf8')); console.log('ok')"
```

Expected: `ok`.

- [ ] Commit:

```bash
git add app/api/internal/sms-broadcast-dispatch/route.ts vercel.json __tests__/app/api/sms-broadcast-dispatch.test.ts
git commit -m "feat(sms): add SMS broadcast dispatch cron with lease lock

요약: SMS 브로드캐스트 디스패치 크론 추가 (lease lock + per-recipient 멱등)

- claim/renew_sms_broadcast_dispatch 락, 100건 청크, pending 선두 재조회
- pending→sent를 재조회 전 커밋(Solapi 멱등 헤더 부재 보완)
- 광고+SMS_OPT_OUT_080 미설정 시 발송 거부(failed 마킹)
- vercel.json maxDuration=300 + 매분 cron 등록

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 16 — `SmsBroadcastComposer` component

Mirrors `BroadcastComposer.tsx` but trimmed: no subject/CTA/rich-editor; an `AdminTextarea` with a live byte counter + SMS/LMS indicator (`smsByteLength`/`smsSegment`); the recipient picker reuses the SMS segment union (Task 11). For ads it shows the auto-prefix + night-block notice. Admin portal = Korean. Reuses `getSmsBroadcasts`-adjacent actions from Task 14.

**Files:**

- Create: `app/(portal)/admin/sms/_components/SmsBroadcastComposer.tsx`

Steps:

- [ ] Implement (no Jest test — UI logic is in the tested `lib/sms/broadcast-segment.ts` + `broadcast-body.ts`; this is a thin shell). Full component:

```tsx
'use client';

import { useCallback, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  enqueueSmsBroadcast,
  enqueueIndividualSmsBroadcast,
  sendTestSms,
} from '@/app/actions/admin-sms-broadcast';
import {
  buildGroupInput,
  defaultSegment,
  deriveIsAdvertisement,
  isDirectSegment,
  segmentBlockReason,
  SMS_RECIPIENT_KIND_META,
  SMS_RECIPIENT_KINDS,
  type SmsRecipientSegment,
} from '@/lib/sms/broadcast-segment';
import { smsByteLength, smsSegment } from '@/lib/sms/broadcast-body';
import { AdminTextarea } from '@/app/(portal)/admin/_components/admin-ui';

export function SmsBroadcastComposer() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isTestPending, startTestTransition] = useTransition();

  const [segment, setSegment] = useState<SmsRecipientSegment>(defaultSegment('member'));
  const [bodyText, setBodyText] = useState('');
  const [directInput, setDirectInput] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isAdvertisement = deriveIsAdvertisement(segment);
  const manualPending = isDirectSegment(segment) && directInput.trim().length > 0;
  const blockReason = segmentBlockReason(segment, manualPending);
  const bytes = smsByteLength(bodyText);
  const seg = smsSegment(bodyText);

  const handleKindChange = (kind: (typeof SMS_RECIPIENT_KINDS)[number]) => {
    setSegment(defaultSegment(kind));
    setConfirmed(false);
  };

  const addDirectNumber = () => {
    if (!isDirectSegment(segment)) return;
    const phone = directInput.trim();
    if (!phone) return;
    setSegment({
      ...segment,
      contacts: [...segment.contacts, { phone, name: null }],
    });
    setDirectInput('');
  };

  const resetForm = () => {
    setBodyText('');
    setDirectInput('');
    setConfirmed(false);
    setSegment(defaultSegment('member'));
  };

  const handleSend = () => {
    if (blockReason) {
      setError(blockReason);
      return;
    }
    if (!confirmed) {
      setError('발송 확인 체크박스를 선택해주세요.');
      return;
    }
    setError(null);
    setNotice(null);
    setSuccess(null);
    startTransition(async () => {
      const result = isDirectSegment(segment)
        ? await enqueueIndividualSmsBroadcast({
            contacts: segment.contacts,
            bodyText,
            isAdvertisement,
          })
        : await enqueueSmsBroadcast(buildGroupInput(segment, { bodyText }));

      if (result.error) {
        setError(result.message);
      } else if (result.deduped) {
        setNotice(result.message);
        router.refresh();
      } else {
        setSuccess(result.message);
        resetForm();
        router.refresh();
      }
    });
  };

  const handleTest = useCallback(() => {
    setError(null);
    setNotice(null);
    setSuccess(null);
    startTestTransition(async () => {
      const r = await sendTestSms({ bodyText, isAdvertisement });
      if (r.error) setError(r.message);
      else setSuccess(r.message);
    });
  }, [bodyText, isAdvertisement]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-charcoal-deep">1. 받는 사람</h3>
          <div className="flex flex-wrap gap-2">
            {SMS_RECIPIENT_KINDS.map((kind) => {
              const meta = SMS_RECIPIENT_KIND_META[kind];
              const active = segment.kind === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => handleKindChange(kind)}
                  className={
                    active
                      ? 'rounded-lg bg-primary-strong px-3 py-2 text-sm font-semibold text-white'
                      : 'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-charcoal-deep hover:bg-gray-50'
                  }
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-charcoal-muted">
            {SMS_RECIPIENT_KIND_META[segment.kind].description}
          </p>

          {segment.kind === 'member' && (
            <select
              value={segment.subset}
              onChange={(e) =>
                setSegment({
                  kind: 'member',
                  subset: e.target.value as 'all' | 'artist' | 'exhibitor',
                })
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="all">작가·출품자 전체</option>
              <option value="artist">작가만</option>
              <option value="exhibitor">출품자만</option>
            </select>
          )}

          {isDirectSegment(segment) && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={directInput}
                  onChange={(e) => setDirectInput(e.target.value)}
                  placeholder="010-0000-0000"
                  className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={addDirectNumber}
                  className="shrink-0 rounded-lg bg-primary-strong px-3 py-2 text-sm font-semibold text-white"
                >
                  입력한 번호 추가
                </button>
              </div>
              <p className="text-xs text-charcoal-muted">
                추가됨: {segment.contacts.length.toLocaleString('ko-KR')}명 (최대 500)
              </p>
              <label className="flex items-center gap-2 text-xs text-charcoal">
                <input
                  type="checkbox"
                  checked={segment.advertising}
                  onChange={(e) => setSegment({ ...segment, advertising: e.target.checked })}
                />
                광고성 문자 (체크 시 (광고) 표기·무료수신거부·야간 차단 적용)
              </label>
            </div>
          )}
        </section>

        <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-charcoal-deep">
            2. 문자 내용
            {isAdvertisement && (
              <span className="ml-1 font-normal text-charcoal-muted">
                (발송 시 &quot;(광고)&quot; 표기·무료수신거부·야간 차단 자동 적용)
              </span>
            )}
          </h3>
          <AdminTextarea
            value={bodyText}
            onChange={(e) => {
              setBodyText(e.target.value);
              setConfirmed(false);
            }}
            rows={5}
            placeholder="문자 본문 ({{name}}은 수신자 이름으로 치환, 없으면 회원)"
          />
          <p className="text-xs tabular-nums text-charcoal-muted">
            {bytes}바이트 · {seg}
            {seg === 'LMS' && ' (90바이트 초과 → 장문)'}
          </p>
        </section>
      </div>

      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-semibold text-charcoal-deep">발송</h3>
          {blockReason && <p className="text-xs text-danger-a11y">{blockReason}</p>}
          <label className="flex items-center gap-2 text-sm text-charcoal">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            내용을 확인했고 발송에 동의합니다
          </label>
          {error && <p className="text-xs text-danger-a11y">{error}</p>}
          {notice && <p className="text-xs text-charcoal-muted">{notice}</p>}
          {success && <p className="text-xs text-success-a11y">{success}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTestPending || !bodyText.trim()}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-charcoal-deep hover:bg-gray-50 disabled:opacity-40"
            >
              {isTestPending ? '발송 중...' : '내게 테스트'}
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={isPending || !bodyText.trim()}
              className="rounded-lg bg-primary-strong px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {isPending ? '발송 중...' : '발송'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
```

- [ ] Type-check:

```bash
npm run type-check
```

Expected: PASS. (If `AdminTextarea`'s prop names differ from `value`/`onChange`/`rows`/`placeholder`, adjust to its real signature in `app/(portal)/admin/_components/admin-ui.tsx`.)

- [ ] Commit:

```bash
git add "app/(portal)/admin/sms/_components/SmsBroadcastComposer.tsx"
git commit -m "feat(sms): add SmsBroadcastComposer (textarea + byte counter + ad notice)

요약: SMS 브로드캐스트 작성 컴포넌트 (받는사람·본문·바이트/세그먼트·테스트)

- BroadcastComposer 미러(제목·CTA·리치에디터 제거)
- {{name}} 치환 안내, 광고 시 (광고)·무료수신거부·야간 차단 고지
- direct 번호 직접 입력 + 광고 토글

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 17 — `SmsBroadcastHistory` component

Mirrors `BroadcastHistory.tsx` exactly: same polling model (`POLL_INTERVAL_MS`, `ACTIVE_STATUSES`, `loadPage`/`poll`), same `STATUS_META`, `EmailPagination` reuse, but consumes `getSmsBroadcasts` and shows `body_text` (truncated) instead of subject, plus an `(광고)` badge from `is_advertisement`.

**Files:**

- Create: `app/(portal)/admin/sms/_components/SmsBroadcastHistory.tsx`

Steps:

- [ ] Implement (thin shell over `getSmsBroadcasts`; reuses `EmailPagination` + `AdminBadge`):

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { AdminBadge } from '@/app/(portal)/admin/_components/admin-ui';
import { getSmsBroadcasts } from '@/app/actions/admin-sms-broadcast';
import { EmailPagination } from '@/app/(portal)/admin/email/_components/EmailPagination';

type BroadcastList = Awaited<ReturnType<typeof getSmsBroadcasts>>;
type Broadcast = BroadcastList['rows'][number];
type BadgeTone = 'default' | 'info' | 'success' | 'warning' | 'danger';

const STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  draft: { label: '임시저장', tone: 'default' },
  queued: { label: '발송 준비 중', tone: 'info' },
  sending: { label: '발송 중', tone: 'info' },
  sent: { label: '발송 완료', tone: 'success' },
  failed: { label: '발송 실패', tone: 'danger' },
  cancelled: { label: '취소됨', tone: 'default' },
};

const CHANNEL_LABELS: Record<string, string> = {
  customer: '고객 마케팅',
  member: '작가·출품자',
  individual: '직접 지정',
};

const ACTIVE_STATUSES = new Set(['queued', 'sending']);
const POLL_INTERVAL_MS = 8000;

function formatKst(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

export function SmsBroadcastHistory({ initial }: { initial: BroadcastList }) {
  const [rows, setRows] = useState<Broadcast[]>(initial.rows);
  const [total, setTotal] = useState(initial.total);
  const [page, setPage] = useState(initial.page);
  const [pageSize, setPageSize] = useState(initial.pageSize);
  const [loadState, setLoadState] = useState<'done' | 'loading' | 'error'>('done');
  const fetchingRef = useRef(false);

  useEffect(() => {
    setTotal(initial.total);
    setRows((prev) => {
      if (prev.length === 0) return initial.rows;
      const prevById = new Map(prev.map((r) => [r.id, r]));
      return initial.rows.map((r) => {
        const old = prevById.get(r.id);
        return old && (old.sent_count ?? 0) > (r.sent_count ?? 0) ? old : r;
      });
    });
  }, [initial]);

  const hasActive = rows.some((b) => ACTIVE_STATUSES.has(b.status));

  const poll = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const fresh = await getSmsBroadcasts({ page, pageSize });
      setRows(fresh.rows);
      setTotal(fresh.total);
    } catch {
      // 폴링 실패는 조용히 무시
    } finally {
      fetchingRef.current = false;
    }
  }, [page, pageSize]);

  const loadPage = useCallback(async (nextPage: number, nextPageSize: number) => {
    setLoadState('loading');
    try {
      const fresh = await getSmsBroadcasts({ page: nextPage, pageSize: nextPageSize });
      setRows(fresh.rows);
      setTotal(fresh.total);
      setPage(fresh.page);
      setPageSize(fresh.pageSize);
      setLoadState('done');
    } catch {
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    if (!hasActive) return;
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [hasActive, poll]);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-charcoal-muted">
        발송 이력이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {loadState === 'loading' && (
        <p className="text-xs text-charcoal-muted">발송 이력을 불러오는 중입니다...</p>
      )}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="bg-canvas-strong text-left text-xs text-charcoal-muted">
              <th className="px-4 py-3 font-medium">채널</th>
              <th className="px-4 py-3 font-medium">본문</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 text-right font-medium">진행 (발송/대상)</th>
              <th className="px-4 py-3 text-right font-medium">실패</th>
              <th className="px-4 py-3 font-medium">완료/예약 시각</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gallery-divider">
            {rows.map((b) => {
              const meta = STATUS_META[b.status] ?? {
                label: b.status,
                tone: 'default' as BadgeTone,
              };
              const recipients = b.recipient_count ?? 0;
              const sent = b.sent_count ?? 0;
              const failed = b.failed_count ?? 0;
              return (
                <tr key={b.id} className="bg-white">
                  <td className="whitespace-nowrap px-4 py-3 text-charcoal-muted">
                    {CHANNEL_LABELS[b.channel] ?? b.channel}
                    {b.is_advertisement && (
                      <span className="ml-1 text-xs text-charcoal-soft">(광고)</span>
                    )}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-charcoal" title={b.body_text}>
                    {b.body_text}
                  </td>
                  <td className="px-4 py-3">
                    <AdminBadge tone={meta.tone}>{meta.label}</AdminBadge>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-charcoal">
                    {sent.toLocaleString('ko-KR')}/{recipients.toLocaleString('ko-KR')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {failed > 0 ? (
                      <span className="text-danger-a11y">{failed.toLocaleString('ko-KR')}</span>
                    ) : (
                      <span className="text-charcoal-soft">0</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-charcoal-muted">
                    {b.status === 'sent' ? formatKst(b.sent_at) : formatKst(b.queued_at)}
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
        onPageChange={(next) => void loadPage(next, pageSize)}
        onPageSizeChange={(next) => void loadPage(1, next)}
      />
    </div>
  );
}
```

- [ ] Type-check:

```bash
npm run type-check
```

Expected: PASS.

- [ ] Commit:

```bash
git add "app/(portal)/admin/sms/_components/SmsBroadcastHistory.tsx"
git commit -m "feat(sms): add SmsBroadcastHistory (polling + EmailPagination reuse)

요약: SMS 브로드캐스트 발송 이력 컴포넌트 (BroadcastHistory 미러)

- 동일 폴링·STATUS_META, EmailPagination 재사용
- body_text 트렁케이트 표시 + (광고) 배지

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 18 — Wire Composer + History into the `/admin/sms` page (from PR-1)

PR-1 created `app/(portal)/admin/sms/page.tsx` with the log viewer (`SmsLogList`). Add the broadcast Composer + History as sections, mirroring how `email/page.tsx` (L13–40) composes Composer + History + Inbound. Fetch `getSmsBroadcasts()` server-side and pass as `initial`.

**Files:**

- Modify: `app/(portal)/admin/sms/page.tsx` (add two sections + the `getSmsBroadcasts` fetch)

Steps:

- [ ] Read the current PR-1 page first (it must already exist — PR-3 depends on PR-1):

```bash
cat "/Users/hwang-gyeongha/saf-2026/app/(portal)/admin/sms/page.tsx"
```

If this file does NOT exist, STOP — PR-1 has not been merged and PR-3 cannot proceed. Surface this as a blocker.

- [ ] Add the imports at the top of the page (alongside PR-1's existing imports):

```tsx
import { getSmsBroadcasts } from '@/app/actions/admin-sms-broadcast';
import { SmsBroadcastComposer } from './_components/SmsBroadcastComposer';
import { SmsBroadcastHistory } from './_components/SmsBroadcastHistory';
```

- [ ] In the page's async body, fetch broadcasts alongside the existing PR-1 log fetch. If PR-1 fetches logs via `getSmsLogs(...)`, add `getSmsBroadcasts()` to the same `Promise.all`. Example (adapt to PR-1's actual variable names):

```tsx
const [logs, broadcasts] = await Promise.all([getSmsLogs(/* PR-1 args */), getSmsBroadcasts()]);
```

- [ ] Add two sections to the page JSX, above or below the PR-1 log section as desired (mirror `email/page.tsx` ordering — composer first, then history):

```tsx
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-charcoal-deep">단체 문자 발송</h2>
        <SmsBroadcastComposer />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-charcoal-deep">단체 발송 이력</h2>
        <SmsBroadcastHistory initial={broadcasts} />
      </section>
```

- [ ] Type-check + build (build catches SSG/route issues the unit tests miss):

```bash
npm run type-check && npm run build
```

Expected: both PASS.

- [ ] Commit:

```bash
git add "app/(portal)/admin/sms/page.tsx"
git commit -m "feat(sms): add broadcast composer + history sections to /admin/sms

요약: /admin/sms 페이지에 단체 문자 작성·발송 이력 섹션 추가 (PR-1 로그 뷰어와 통합)

- email/page.tsx 구조 미러 (composer → history)
- getSmsBroadcasts 서버 페치 후 initial 전달

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 19 — `profiles.phone` collection in signup + mypage

So `member`/`customer` audiences actually have phone numbers. Add phone to the mypage profile update (existing `updateMyProfile` in `app/actions/mypage.ts` L67–90 currently takes only `name`) and surface a phone input in the ProfileTab. Signup capture: add an optional phone field to the signup flow if the repo's signup writes a profile row; otherwise rely on mypage (existing users are phone-null and naturally excluded, per spec §6.2).

**Files:**

- Modify: `app/actions/mypage.ts` (`updateMyProfile` — accept optional `phone`)
- Modify: `app/[locale]/mypage/_components/ProfileTab.tsx` (add phone input)
- Create: `__tests__/app/actions/mypage-phone.test.ts`

Steps:

- [ ] Write the failing test for the `updateMyProfile` phone path:

```ts
/** @jest-environment node */
import { updateMyProfile } from '@/app/actions/mypage';

const profileUpdate = jest.fn(() => ({ eq: jest.fn(async () => ({ error: null })) }));
jest.mock('@/lib/auth/server', () => ({
  createSupabaseServerClient: jest.fn(async () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }),
      updateUser: async () => ({ error: null }),
    },
    from: () => ({ update: profileUpdate }),
  })),
  createSupabaseAdminClient: jest.fn(),
}));

describe('updateMyProfile phone', () => {
  beforeEach(() => jest.clearAllMocks());

  it('정상 010 번호를 정규화해 저장', async () => {
    const r = await updateMyProfile('홍길동', '010-1234-5678');
    expect(r.error).toBeUndefined();
    expect(profileUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ name: '홍길동', phone: '01012345678' })
    );
  });

  it('비-010 번호는 거부', async () => {
    const r = await updateMyProfile('홍길동', '02-123-4567');
    expect(r.error).toBe('invalid_phone');
  });

  it('phone 미지정 시 name만 갱신(phone 키 없음)', async () => {
    await updateMyProfile('홍길동');
    const arg = profileUpdate.mock.calls[0][0] as Record<string, unknown>;
    expect(arg).not.toHaveProperty('phone');
  });
});
```

- [ ] Run it (expected FAIL — `updateMyProfile` doesn't accept phone yet):

```bash
npm test -- __tests__/app/actions/mypage-phone.test.ts
```

- [ ] Edit `app/actions/mypage.ts` `updateMyProfile` (L67–90). Add the `normalizeKoreanMobile` import at top and extend the signature + update payload. Replace the function signature and body up to the profile update:

```ts
export async function updateMyProfile(
  name: string,
  phone?: string
): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return { error: 'unauthenticated' };

  const trimmed = name.trim();
  if (!trimmed) return { error: 'name_required' };
  if (trimmed.length > 100) return { error: 'name_too_long' };

  // phone은 선택 — 입력 시 010 휴대폰만 허용(SMS 브로드캐스트 대상).
  let normalizedPhone: string | undefined;
  if (phone !== undefined && phone.trim() !== '') {
    const np = normalizeKoreanMobile(phone);
    if (!np) return { error: 'invalid_phone' };
    normalizedPhone = np;
  }

  const { error: authError } = await supabase.auth.updateUser({
    data: { full_name: trimmed, name: trimmed },
  });
  if (authError) return { error: authError.message };

  const { error: profileError } = await supabase
    .from('profiles')
    .update(normalizedPhone ? { name: trimmed, phone: normalizedPhone } : { name: trimmed })
    .eq('id', user.id);
```

And add the import near the top of `app/actions/mypage.ts`:

```ts
import { normalizeKoreanMobile } from '@/lib/sms/phone';
```

- [ ] Run it (expected PASS):

```bash
npm test -- __tests__/app/actions/mypage-phone.test.ts
```

- [ ] Add a phone input to `ProfileTab.tsx`. Read it first to match its form pattern:

```bash
cat "/Users/hwang-gyeongha/saf-2026/app/[locale]/mypage/_components/ProfileTab.tsx"
```

Add a controlled phone field next to the name field, seeded from the user's current `profiles.phone`, and pass it as the 2nd arg to `updateMyProfile(name, phone)`. Use existing i18n message keys (this is a public route — `app/[locale]/**` — so add `messages/ko.json` + `messages/en.json` keys for the label/placeholder/error, e.g. `mypage.phoneLabel`, `mypage.phonePlaceholder`, `mypage.invalidPhone`, and consume via `useTranslations`). Keep the field optional.

- [ ] (Signup) Inspect the signup write path:

```bash
grep -rn "profiles" "/Users/hwang-gyeongha/saf-2026/app/[locale]/signup/" 2>/dev/null; grep -rln "signUp" "/Users/hwang-gyeongha/saf-2026/app/" 2>/dev/null | head
```

If signup inserts/updates a `profiles` row directly, add an optional phone field there mirroring the mypage validation (`normalizeKoreanMobile`, reject non-010, i18n label). If signup relies on a DB trigger that only seeds `id`/`email`, leave signup as-is and document that phone is collected post-signup via mypage (spec §6.2: existing/new users without phone are naturally excluded from member/customer audiences; `orders.buyer_phone` still feeds customer).

- [ ] Type-check + build:

```bash
npm run type-check && npm run build
```

Expected: both PASS.

- [ ] Run the full SMS test suite to confirm no regressions:

```bash
npm test -- __tests__/lib/sms __tests__/app/actions/admin-sms-broadcast.test.ts __tests__/app/actions/mypage-phone.test.ts __tests__/app/api/sms-broadcast-dispatch.test.ts
```

Expected: all PASS.

- [ ] Commit:

```bash
git add app/actions/mypage.ts "app/[locale]/mypage/_components/ProfileTab.tsx" __tests__/app/actions/mypage-phone.test.ts messages/ko.json messages/en.json
git commit -m "feat(sms): collect profiles.phone in mypage (and signup if applicable)

요약: 마이페이지 프로필에 전화번호 수집 추가 (SMS 브로드캐스트 대상 확보)

- updateMyProfile에 optional phone 인자, normalizeKoreanMobile 정규화·비-010 거부
- ProfileTab 전화번호 입력 필드(i18n), 기존 회원은 phone null로 자연 제외

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-review checklist (spec requirement → task)

| Spec §4 / §6 requirement                                                                                                                           | Task                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Migration A — `profiles.phone`                                                                                                                     | Task 1                                                                                        |
| Migration B — `sms_suppressions` (channel/reason check, UNIQUE)                                                                                    | Task 2                                                                                        |
| Migration C — `sms_broadcasts` (`body_text`, channel/status, lease-lock cols, ad flag, FK SET NULL)                                                | Task 3                                                                                        |
| Migration D — `sms_broadcast_recipients` (partial pending index + broadcast_id index)                                                              | Task 4                                                                                        |
| Migration E — `claim/renew_sms_broadcast_dispatch` RPCs (verbatim copy, renamed) + type regen                                                      | Task 5                                                                                        |
| Email RLS convention (inline EXISTS role='admin' + service_role(true) + GRANTs)                                                                    | Tasks 2–5                                                                                     |
| MCP `apply_migration` single-migration + timestamps AFTER 20260610090000                                                                           | Tasks 1–5                                                                                     |
| `hashPhone` reusing PETITION_SALT scheme                                                                                                           | Task 6                                                                                        |
| `SmsRecipient { phone, name, phoneHash }` + resolver interface                                                                                     | Task 7                                                                                        |
| member channel = informational, no consent/night/prefix gate                                                                                       | Tasks 8, 11, 12                                                                               |
| customer phone source = `profiles.phone` (consent) ∪ `orders.buyer_phone` (paid/preparing/shipped/delivered last 6mo), deduped, minus suppressions | Task 9                                                                                        |
| individual direct-input dedup + suppression (ads also subtract customer)                                                                           | Task 10                                                                                       |
| discriminated union + `deriveIsAdvertisement` + `buildGroupInput` + `MAX_DIRECT_RECIPIENTS=500`                                                    | Task 11                                                                                       |
| Guard: ad body must start exactly `(광고)` (`^\(광고\)`), reject variants                                                                          | Task 12 (`validateAdvertisementText`), enforced Task 14/15                                    |
| Guard: brand name + free 080 opt-out line                                                                                                          | Task 12 (`buildAdvertisementText`/validate), Task 15 (refuse ad when `SMS_OPT_OUT_080` unset) |
| Guard: night block KST [21:00, 08:00), `AD_NIGHT_WINDOW`                                                                                           | Task 12 (`isNightInKst`), enforced Task 14                                                    |
| Guard: ad audience = `marketing_consent=true` only; `sms_suppressions` always blocks                                                               | Task 9 (consent filter) + Tasks 8/9/10 (suppression)                                          |
| plain-text body builder + `(광고)` prefix + opt-out + byte length / SMS-LMS                                                                        | Task 12                                                                                       |
| `sendSolapiBatch` (per-item ordered results, concurrency cap)                                                                                      | Task 13                                                                                       |
| enqueue lifecycle: 5-min dedup, 500 cap, status flow, `isAdvertisement` derivation                                                                 | Task 14                                                                                       |
| dispatch route + cron + `maxDuration=300`, lease-lock loop, commit-before-refetch idempotency (no Solapi idempotency header)                       | Task 15                                                                                       |
| `internal-cron-auth` Bearer gate                                                                                                                   | Task 15                                                                                       |
| `SmsBroadcastComposer` (AdminTextarea + byte counter, no subject/CTA)                                                                              | Task 16                                                                                       |
| `SmsBroadcastHistory` (polling + EmailPagination reuse, `(광고)` badge)                                                                            | Task 17                                                                                       |
| Sections added to PR-1 `/admin/sms` page                                                                                                           | Task 18 (depends on PR-1)                                                                     |
| `profiles.phone` collection in signup/mypage                                                                                                       | Task 19                                                                                       |

**Open risks carried from spec §6:** (1) `SMS_OPT_OUT_080` real 080 number must be procured before any ad send — until set, Task 15 hard-refuses ad broadcasts (safe default). (2) `marketing_consent` legal sufficiency for SMS ads is shared with email; `marketing_consent_source` already records origin for future SMS/email split without schema change. (3) Solapi has no idempotency header — duplicate protection rests entirely on the lease lock + per-recipient `pending→sent` commit-before-refetch (Task 15); a crash between Solapi send and the status UPDATE can, in the worst case, re-send that one recipient on the next cron (the email path was protected here by Resend's Idempotency-Key — SMS is not). This residual is documented and bounded to a single chunk's in-flight rows.
