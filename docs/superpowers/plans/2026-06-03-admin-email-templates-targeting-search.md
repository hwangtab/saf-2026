# 관리자 이메일 — 템플릿·타겟팅·검색 발송 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 이미 라이브 중인 대량 이메일 시스템(`/admin/email`)에 ① 코드 프리셋 템플릿 라이브러리, ② 채널 내 세부 타겟팅(작가/출품자 분리·청원 드롭다운·작품 구매자), ③ 보유 연락처 검색 발송(운영/광고)을 추가한다.

**Architecture:** 기존 `email_broadcasts/email_broadcast_recipients → broadcast-dispatch 크론 → broadcast.tsx` 단일 파이프라인을 확장한다. 광고 분기를 채널에서 분리(`is_advertisement` 컬럼)하고, 검색 발송용 `individual` 채널을 추가한다. 세그먼트는 resolver로, 검색 발송은 명시 리스트로 같은 큐에 들어가 같은 크론이 발송한다. 검증된 suppression·수신거부·웹훅·잠금을 그대로 재사용한다.

**Tech Stack:** Next.js 16(App Router, Server Actions), TypeScript strict, Supabase(Postgres, RLS, service-role 클라이언트), Resend(batch API), @react-email, Jest + Testing Library. 마이그레이션은 Supabase MCP `apply_migration`.

**선행 스펙:** [docs/superpowers/specs/2026-06-02-admin-email-templates-targeting-search-design.md](../specs/2026-06-02-admin-email-templates-targeting-search-design.md)

---

## 공유 계약 (모든 태스크가 이 시그니처를 사용)

later 태스크가 earlier 태스크의 심볼을 참조한다. 이름이 어긋나면 버그다.

```ts
// lib/email/audiences/types.ts (Task 2에서 확장)
export type BroadcastChannel = 'customer' | 'member' | 'petition' | 'individual';
export interface Recipient {
  email: string;
  name: string | null;
  locale: 'ko' | 'en';
  emailHash: string;
}
export interface AudienceResolver {
  resolve(filter?: Record<string, unknown>): Promise<Recipient[]>;
}

// lib/email/broadcast-body.ts (Task 3)
export function splitAndPersonalize(bodyMd: string, name: string | null): string[];

// lib/email/audiences/member.ts (Task 5) — subset 필터
type MemberSubset = 'all' | 'artist' | 'exhibitor';
// resolve(filter?: { subset?: MemberSubset })

// lib/email/audiences/artwork-buyer.ts (Task 6)
export class ArtworkBuyerAudienceResolver implements AudienceResolver {
  constructor(artworkId: string, opts?: { advertising?: boolean });
  resolve(): Promise<Recipient[]>;
}

// app/actions/admin-broadcast.ts (Task 7) — 청원 목록 + 미리보기 확장
export async function getActivePetitions(): Promise<Array<{ slug: string; title: string }>>;
export async function previewAudience(
  channel: BroadcastChannel,
  filter?: {
    subset?: MemberSubset;
    petitionSlug?: string;
    artworkId?: string;
    advertising?: boolean;
  }
): Promise<{ total: number; breakdown: Record<string, number> }>;

// app/actions/admin-contact-search.ts (Task 8)
export interface ContactSearchResult {
  email: string;
  name: string | null;
  sources: string[];
  suppressed: boolean;
}
export async function searchContacts(
  query: string
): Promise<{ results: ContactSearchResult[]; truncated: boolean }>;

// app/actions/admin-broadcast.ts (Task 9)
export interface EnqueueBroadcastInput {
  channel: BroadcastChannel;
  subject: string;
  bodyMd: string;
  ctaLabel?: string;
  ctaUrl?: string;
  petitionSlug?: string;
  audienceFilter?: Record<string, unknown>; // { subset?, artworkId?, mode? }
  isAdvertisement?: boolean; // 작품 구매자/검색에서만 의미; customer 세그먼트는 강제 true
}
export async function enqueueIndividualBroadcast(input: {
  recipients: Array<{ email: string; name: string | null }>;
  subject: string;
  bodyMd: string;
  ctaLabel?: string;
  ctaUrl?: string;
  isAdvertisement: boolean;
}): Promise<import('@/types').ActionState & { broadcastId?: string }>;
export async function sendTestEmail(input: {
  subject: string;
  bodyMd: string;
  ctaLabel?: string;
  ctaUrl?: string;
  isAdvertisement: boolean;
}): Promise<import('@/types').ActionState>;

// lib/email/templates.ts (Task 10)
export interface BroadcastTemplate {
  id: string;
  label: string;
  description: string;
  channel: BroadcastChannel;
  isAdvertisement: boolean;
  subject: string;
  bodyMd: string;
  ctaLabel?: string;
  ctaUrl?: string;
}
export const BROADCAST_TEMPLATES: BroadcastTemplate[];
```

---

## 파일 구조

**신규**

- `supabase/migrations/20260603120000_email_broadcasts_individual_and_ad_flag.sql` — 스키마
- `lib/email/broadcast-body.ts` — 본문 분리 + `{{name}}` 치환 (순수 함수)
- `lib/email/audiences/artwork-buyer.ts` — 작품 구매자 resolver
- `lib/email/templates.ts` — 코드 프리셋 템플릿
- `app/actions/admin-contact-search.ts` — 통합 연락처 검색
- `app/(portal)/admin/email/_components/TemplatePicker.tsx` — 템플릿 선택 드롭다운
- `app/(portal)/admin/email/_components/AudienceSelector.tsx` — 세그먼트 채널 + 세부 필터
- `app/(portal)/admin/email/_components/ContactSearch.tsx` — 검색 발송 UI
- 테스트: `__tests__/lib/email/broadcast-body.test.ts`, `__tests__/lib/email/audiences/artwork-buyer.test.ts`, `__tests__/emails/broadcast.test.tsx`, `__tests__/lib/email/templates.test.ts`, `__tests__/lib/email/audiences/member-subset.test.ts`

**수정**

- `lib/email/audiences/types.ts` — `BroadcastChannel`에 `'individual'`
- `lib/email/unsubscribe-token.ts` — verify 화이트리스트에 `'individual'`
- `app/api/email/unsubscribe/route.ts` — `labels`에 `individual`
- `emails/broadcast.tsx` — `isAdvertisement` prop
- `app/api/internal/broadcast-dispatch/route.ts` — `is_advertisement` select·전달 + `splitAndPersonalize`
- `lib/email/audiences/member.ts` — `subset` 필터
- `app/actions/admin-broadcast.ts` — `getActivePetitions`, `previewAudience` 확장, `enqueueBroadcast` 확장, `enqueueIndividualBroadcast`, `sendTestEmail`
- `app/(portal)/admin/email/_components/BroadcastForm.tsx` — 발송 모드 + 하위 컴포넌트 조립 + 테스트 발송
- `app/(portal)/admin/email/_components/AudiencePreview.tsx` — filter 인자 전달
- `types/supabase.ts` — 마이그레이션 후 재생성

---

## Task 1: 마이그레이션 — `is_advertisement` + `individual` 채널

**Files:**

- Create: `supabase/migrations/20260603120000_email_broadcasts_individual_and_ad_flag.sql`
- Modify: `types/supabase.ts` (재생성)

> 인프라 태스크 — TDD 대신 적용·검증. 마이그레이션은 production DB에 직접 영향: MCP `apply_migration` 1건, **실행 전 사용자 컨펌 필수** (CLAUDE.md 정책).

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- supabase/migrations/20260603120000_email_broadcasts_individual_and_ad_flag.sql
-- 광고 여부를 채널에서 분리(현재 channel='customer' 하드코딩) + 검색 발송용 individual 채널 추가.

-- 1) is_advertisement 플래그
ALTER TABLE public.email_broadcasts
  ADD COLUMN IF NOT EXISTS is_advertisement boolean NOT NULL DEFAULT false;

-- 기존 동작 보존: customer 채널은 광고였음
UPDATE public.email_broadcasts SET is_advertisement = true WHERE channel = 'customer';

-- 2) individual 채널값 (email_broadcasts)
ALTER TABLE public.email_broadcasts DROP CONSTRAINT IF EXISTS email_broadcasts_channel_check;
ALTER TABLE public.email_broadcasts ADD CONSTRAINT email_broadcasts_channel_check
  CHECK (channel IN ('customer', 'member', 'petition', 'individual'));

-- 3) individual 채널값 (email_suppressions)
ALTER TABLE public.email_suppressions DROP CONSTRAINT IF EXISTS email_suppressions_channel_check;
ALTER TABLE public.email_suppressions ADD CONSTRAINT email_suppressions_channel_check
  CHECK (channel IN ('customer', 'member', 'petition', 'individual', 'all'));
```

- [ ] **Step 2: 적용 전 현재 마이그레이션 목록 확인 (blast radius)**

MCP `mcp__claude_ai_Supabase__list_migrations` (project_id `khtunrybrzntlnowlahb`) 호출 → 위 파일이 아직 미적용인지 확인.

- [ ] **Step 3: 사용자 컨펌 후 마이그레이션 적용**

MCP `mcp__claude_ai_Supabase__apply_migration` (project_id `khtunrybrzntlnowlahb`, name `email_broadcasts_individual_and_ad_flag`, query = Step 1 본문). **위험 작업 — 사용자 컨펌 필수.**

- [ ] **Step 4: 적용 검증**

MCP `mcp__claude_ai_Supabase__execute_sql`:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'email_broadcasts' AND column_name = 'is_advertisement';
SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'email_broadcasts_channel_check';
```

Expected: `is_advertisement` 1행, CHECK 정의에 `'individual'` 포함.

- [ ] **Step 5: 타입 재생성**

MCP `mcp__claude_ai_Supabase__generate_typescript_types` (project_id `khtunrybrzntlnowlahb`) → 출력으로 `types/supabase.ts` 덮어쓰기. `email_broadcasts` Row에 `is_advertisement: boolean` 존재 확인.

- [ ] **Step 6: 타입 체크 + 커밋**

Run: `npm run type-check`
Expected: 통과

```bash
git add supabase/migrations/20260603120000_email_broadcasts_individual_and_ad_flag.sql types/supabase.ts
git commit -m "feat(email): is_advertisement 컬럼 + individual 채널 마이그레이션

요약: 광고 분기를 채널에서 분리하고 검색 발송용 individual 채널 추가"
```

---

## Task 2: `BroadcastChannel` 타입 + 수신거부 `individual` 처리

**Files:**

- Modify: `lib/email/audiences/types.ts:1`
- Modify: `lib/email/unsubscribe-token.ts:47`
- Modify: `app/api/email/unsubscribe/route.ts:68-72`
- Test: `__tests__/lib/email/unsubscribe-token.test.ts`

- [ ] **Step 1: 실패하는 테스트 추가**

`__tests__/lib/email/unsubscribe-token.test.ts`의 `describe('verifyUnsubscribeToken', ...)` 안에 추가:

```ts
it('individual 채널 토큰을 검증한다', () => {
  process.env.EMAIL_UNSUB_SECRET = SECRET;
  const emailHash = 'abcd1234'.repeat(8);
  const token = generateUnsubscribeToken(emailHash, 'individual')!;
  expect(verifyUnsubscribeToken(token)).toEqual({ emailHash, channel: 'individual' });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest __tests__/lib/email/unsubscribe-token.test.ts -t individual`
Expected: FAIL — verify가 `'individual'`을 화이트리스트에서 거부해 `null` 반환.

- [ ] **Step 3: 타입 + 화이트리스트 수정**

`lib/email/audiences/types.ts:1`:

```ts
export type BroadcastChannel = 'customer' | 'member' | 'petition' | 'individual';
```

`lib/email/unsubscribe-token.ts:47` (verify 내부 화이트리스트):

```ts
if (
  !(['customer', 'member', 'petition', 'individual'] as const).includes(raw as BroadcastChannel)
) {
  return null;
}
```

- [ ] **Step 4: 수신거부 라우트 라벨 추가**

`app/api/email/unsubscribe/route.ts` `confirmFormResponse`의 `labels`:

```ts
const labels: Record<string, string> = {
  customer: '광고/마케팅',
  member: '작가·출품자 업무',
  petition: '청원 캠페인 알림',
  individual: '개별 발송',
};
```

- [ ] **Step 5: 통과 확인 + 전체 회귀**

Run: `npx jest __tests__/lib/email/unsubscribe-token.test.ts && npm run type-check`
Expected: PASS, 타입 통과.

- [ ] **Step 6: 커밋**

```bash
git add lib/email/audiences/types.ts lib/email/unsubscribe-token.ts app/api/email/unsubscribe/route.ts __tests__/lib/email/unsubscribe-token.test.ts
git commit -m "feat(email): BroadcastChannel에 individual 추가 + 수신거부 처리

요약: 검색 발송 채널 individual의 수신거부 토큰·확인 페이지 지원"
```

---

## Task 3: 본문 분리 + `{{name}}` 치환 헬퍼

**Files:**

- Create: `lib/email/broadcast-body.ts`
- Test: `__tests__/lib/email/broadcast-body.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// __tests__/lib/email/broadcast-body.test.ts
import { splitAndPersonalize } from '@/lib/email/broadcast-body';

describe('splitAndPersonalize', () => {
  it('빈 줄 기준으로 문단을 나눈다', () => {
    expect(splitAndPersonalize('첫 문단\n\n둘째 문단', '홍길동')).toEqual(['첫 문단', '둘째 문단']);
  });

  it('{{name}} 토큰을 수신자 이름으로 치환한다', () => {
    expect(splitAndPersonalize('{{name}}님 안녕하세요', '홍길동')).toEqual(['홍길동님 안녕하세요']);
  });

  it('이름이 null이면 "회원"으로 치환한다', () => {
    expect(splitAndPersonalize('{{name}}님께', null)).toEqual(['회원님께']);
  });

  it('공백 포함 {{ name }}도 치환하고 3줄 이상 공백도 1문단 경계로 처리한다', () => {
    expect(splitAndPersonalize('A\n\n\n{{ name }}', '김')).toEqual(['A', '김']);
  });

  it('빈 문단을 제거한다', () => {
    expect(splitAndPersonalize('A\n\n   \n\nB', '김')).toEqual(['A', 'B']);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest __tests__/lib/email/broadcast-body.test.ts`
Expected: FAIL — `Cannot find module '@/lib/email/broadcast-body'`.

- [ ] **Step 3: 구현**

```ts
// lib/email/broadcast-body.ts
// 브로드캐스트 본문(body_md)을 문단 배열로 변환하면서 {{name}} 토큰을 수신자 이름으로 치환.
// dispatch가 수신자별로 호출하므로 순수 함수로 분리 — 단위 테스트 가능.
export function splitAndPersonalize(bodyMd: string, name: string | null): string[] {
  const display = name ?? '회원';
  return bodyMd
    .split(/\n\n+/)
    .map((p) => p.trim().replace(/\{\{\s*name\s*\}\}/g, display))
    .filter(Boolean);
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx jest __tests__/lib/email/broadcast-body.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: 커밋**

```bash
git add lib/email/broadcast-body.ts __tests__/lib/email/broadcast-body.test.ts
git commit -m "feat(email): 본문 문단 분리 + {{name}} 치환 헬퍼

요약: 브로드캐스트 본문 개인화용 순수 함수 splitAndPersonalize 추가"
```

---

## Task 4: `broadcast.tsx` + dispatch — `is_advertisement` 분리 & 개인화 적용

**Files:**

- Modify: `emails/broadcast.tsx:8-47,162-165` (props + isAd)
- Modify: `app/api/internal/broadcast-dispatch/route.ts:36-42,127-167`
- Test: `__tests__/emails/broadcast.test.tsx`

- [ ] **Step 1: 실패하는 렌더 테스트 작성**

```tsx
// __tests__/emails/broadcast.test.tsx
import { render } from '@react-email/render';
import * as React from 'react';
import BroadcastEmail from '@/emails/broadcast';

const base = {
  recipientName: '홍길동',
  subject: '신작 안내',
  bodyParagraphs: ['본문'],
  unsubscribeUrl: 'https://www.saf2026.com/api/email/unsubscribe?t=x',
  locale: 'ko' as const,
};

describe('BroadcastEmail isAdvertisement', () => {
  it('isAdvertisement=true면 헤더에 (광고) 접두어와 발송사 정보를 넣는다', async () => {
    const html = await render(
      React.createElement(BroadcastEmail, { ...base, channel: 'individual', isAdvertisement: true })
    );
    expect(html).toContain('(광고) 신작 안내');
    expect(html).toContain('발송사 정보');
  });

  it('isAdvertisement=false면 (광고) 접두어와 발송사 정보가 없다', async () => {
    const html = await render(
      React.createElement(BroadcastEmail, {
        ...base,
        channel: 'individual',
        isAdvertisement: false,
      })
    );
    expect(html).not.toContain('(광고)');
    expect(html).not.toContain('발송사 정보');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest __tests__/emails/broadcast.test.tsx`
Expected: FAIL — `BroadcastEmail`이 `isAdvertisement` prop을 받지 않고 `channel==='customer'`로만 판정.

- [ ] **Step 3: `broadcast.tsx` 수정**

`BroadcastEmailProps`(8행)에 추가하고 `isAd`(38행)를 prop 기반으로:

```tsx
export interface BroadcastEmailProps {
  channel: 'customer' | 'member' | 'petition' | 'individual';
  isAdvertisement: boolean;
  recipientName: string | null;
  subject: string;
  bodyParagraphs: string[];
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  unsubscribeUrl: string;
  locale?: EmailLocale;
}
```

함수 시그니처에 `isAdvertisement` 구조분해 추가하고 38행을 교체:

```tsx
const isAd = isAdvertisement;
```

(나머지 `isAd` 사용처는 그대로 — 헤더 접두어·발송사 footer·헤더색이 자동으로 prop을 따른다.)

- [ ] **Step 4: dispatch 수정 — select + 전달 + 개인화**

`app/api/internal/broadcast-dispatch/route.ts`:

(a) 36-42행 select에 `is_advertisement` 추가:

```ts
    .select('id, channel, subject, body_md, cta_label, cta_url, is_advertisement, status')
```

(b) 파일 상단 import 추가:

```ts
import { splitAndPersonalize } from '@/lib/email/broadcast-body';
```

(c) 127-130행 `bodyParagraphs` 블록 제거 후, map 내부(140행~)에서 수신자별로 생성하도록 변경. `batchItems`의 `.map(async (r) => {` 본문 시작에:

```ts
const bodyParagraphs = splitAndPersonalize(broadcast.body_md as string, r.name);
```

그리고 `React.createElement(BroadcastEmail, {...})`에 prop 추가:

```ts
const emailEl = React.createElement(BroadcastEmail, {
  channel: broadcast.channel as 'customer' | 'member' | 'petition' | 'individual',
  isAdvertisement: broadcast.is_advertisement as boolean,
  recipientName: r.name,
  subject: broadcast.subject as string,
  bodyParagraphs,
  ctaLabel: broadcast.cta_label as string | null,
  ctaUrl: broadcast.cta_url as string | null,
  unsubscribeUrl,
  locale: r.locale === 'en' ? 'en' : 'ko',
});
```

(d) 162-165행 subject 접두어를 `is_advertisement` 기반으로:

```ts
const isAd = broadcast.is_advertisement as boolean;
const subject = isAd ? `(광고) ${broadcast.subject as string}` : (broadcast.subject as string);
```

- [ ] **Step 5: 통과 + 회귀 확인**

Run: `npx jest __tests__/emails/broadcast.test.tsx && npm run type-check`
Expected: PASS, 타입 통과. (broadcast.tsx를 import하는 다른 코드가 새 필수 prop을 안 넘기면 타입 에러 → dispatch만 사용처이므로 Step 4로 해소됨.)

- [ ] **Step 6: 커밋**

```bash
git add emails/broadcast.tsx app/api/internal/broadcast-dispatch/route.ts __tests__/emails/broadcast.test.tsx
git commit -m "feat(email): 광고 분기를 is_advertisement prop으로 분리 + 본문 개인화

요약: (광고) 표기·발송사 footer를 채널이 아닌 is_advertisement 플래그로 결정하고 {{name}} 치환 적용"
```

---

## Task 5: `MemberAudienceResolver` — 작가/출품자 subset 필터

**Files:**

- Modify: `lib/email/audiences/member.ts:10`
- Test: `__tests__/lib/email/audiences/member-subset.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// __tests__/lib/email/audiences/member-subset.test.ts
import { MemberAudienceResolver } from '@/lib/email/audiences/member';
import { createSupabaseQueryMock } from '@/lib/test-utils/email-audience-mock';

const mockFrom = jest.fn();
jest.mock('@/lib/auth/server', () => ({
  createSupabaseAdminClient: jest.fn(() => ({ from: mockFrom })),
}));

describe('MemberAudienceResolver subset 필터', () => {
  beforeEach(() => jest.clearAllMocks());

  it("subset='artist'면 작가만 반환하고 출품자 쿼리를 하지 않는다", async () => {
    mockFrom
      .mockReturnValueOnce(
        createSupabaseQueryMock({
          data: [{ contact_email: 'a@x.com', name_ko: '작가', name_en: null }],
          error: null,
        })
      ) // artists
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null })); // suppressions (출품자 쿼리 없음)

    const recipients = await new MemberAudienceResolver().resolve({ subset: 'artist' });

    expect(recipients).toHaveLength(1);
    expect(recipients[0].email).toBe('a@x.com');
    expect(mockFrom).toHaveBeenCalledTimes(2); // artists + suppressions만
  });

  it("subset='exhibitor'면 출품자만 반환하고 작가 쿼리를 하지 않는다", async () => {
    mockFrom
      .mockReturnValueOnce(
        createSupabaseQueryMock({ data: [{ email: 'e@x.com', name: '출품자' }], error: null })
      ) // exhibitors
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null })); // suppressions

    const recipients = await new MemberAudienceResolver().resolve({ subset: 'exhibitor' });

    expect(recipients).toHaveLength(1);
    expect(recipients[0].email).toBe('e@x.com');
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });

  it('subset 미지정이면 작가+출품자+suppressions 3쿼리(기존 동작)', async () => {
    mockFrom
      .mockReturnValueOnce(
        createSupabaseQueryMock({
          data: [{ contact_email: 'a@x.com', name_ko: '작가', name_en: null }],
          error: null,
        })
      )
      .mockReturnValueOnce(
        createSupabaseQueryMock({ data: [{ email: 'e@x.com', name: '출품자' }], error: null })
      )
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null }));

    const recipients = await new MemberAudienceResolver().resolve();

    expect(recipients).toHaveLength(2);
    expect(mockFrom).toHaveBeenCalledTimes(3);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest __tests__/lib/email/audiences/member-subset.test.ts`
Expected: FAIL — `resolve`가 subset을 무시하고 항상 3쿼리.

- [ ] **Step 3: `member.ts` 수정**

`resolve()` 시그니처와 본문을 수정한다. 핵심: `filter.subset`에 따라 작가/출품자 쿼리를 조건부 실행. (suppression·dedup 로직은 그대로.)

```ts
  async resolve(filter?: Record<string, unknown>): Promise<Recipient[]> {
    const supabase = createSupabaseAdminClient();
    const subset = filter?.subset === 'artist' || filter?.subset === 'exhibitor' ? filter.subset : 'all';

    let artists: Array<{ contact_email: string | null; name_ko: string | null; name_en: string | null }> = [];
    if (subset !== 'exhibitor') {
      const { data: res } = await fetchAllInBatches<{ contact_email: string | null; name_ko: string | null; name_en: string | null }>(
        (from, to) =>
          supabase.from('artists').select('contact_email, name_ko, name_en').order('created_at', { ascending: true }).range(from, to)
      ).catch((err) => {
        console.error('[member-audience] artists query error:', err);
        throw new Error(`작가 명단 조회 실패: ${err?.message ?? err}`);
      });
      artists = res ?? [];
    }

    let exhibitors: Array<{ email: string | null; name: string | null }> = [];
    if (subset !== 'artist') {
      const { data: res } = await fetchAllInBatches<{ email: string | null; name: string | null }>((from, to) =>
        supabase.from('profiles').select('email, name').eq('role', 'exhibitor').not('email', 'is', null).range(from, to)
      ).catch((err) => {
        console.error('[member-audience] exhibitors query error:', err);
        throw new Error(`출품자 명단 조회 실패: ${err?.message ?? err}`);
      });
      exhibitors = res ?? [];
    }

    const { data: suppressions } = await fetchAllInBatches<{ email_hash: string }>((from, to) =>
      supabase.from('email_suppressions').select('email_hash').in('channel', ['member', 'all']).range(from, to)
    ).catch((err) => {
      console.error('[member-audience] suppressions query error:', err);
      throw new Error('수신거부 목록 조회 실패 — 발송을 중단합니다');
    });

    const suppressedHashes = new Set((suppressions ?? []).map((s: { email_hash: string }) => s.email_hash));
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

    for (const a of artists) addIfValid(a.contact_email, a.name_ko ?? a.name_en);
    for (const e of exhibitors) addIfValid(e.email, e.name);
    return recipients;
  }
```

> 확인됨: `fetchAllInBatches`는 `Promise<{ data: T[]; count }>`를 resolve하고 에러 시 throw한다. 그래서 `const { data: res } = await fetchAllInBatches(...).catch(...)` 형태가 맞다(위 코드 반영됨).

- [ ] **Step 4: 통과 + 기존 member 테스트 회귀 확인**

Run: `npx jest __tests__/lib/email/audiences/member`
Expected: PASS — `member.test.ts`(기존 3쿼리)와 `member-subset.test.ts` 모두 통과.

- [ ] **Step 5: 커밋**

```bash
git add lib/email/audiences/member.ts __tests__/lib/email/audiences/member-subset.test.ts
git commit -m "feat(email): member 채널 작가/출품자 subset 필터

요약: MemberAudienceResolver가 filter.subset으로 작가만/출품자만 추출 지원"
```

---

## Task 6: `ArtworkBuyerAudienceResolver` 신규

**Files:**

- Create: `lib/email/audiences/artwork-buyer.ts`
- Test: `__tests__/lib/email/audiences/artwork-buyer.test.ts`

> 참고: 6개월/payable 필터는 DB 쿼리 레벨이라 proxy mock으로는 검증 불가 — 테스트는 dedup·suppression·정규화(반환 행 처리)와 생성자 보관을 검증한다(기존 customer 테스트와 동일 범위). test-buyer 제외는 supabase-js select에서 SQL 함수 호출이 어려워 본 사이클에선 제외(추후 RPC/뷰로 보강).

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// __tests__/lib/email/audiences/artwork-buyer.test.ts
import { ArtworkBuyerAudienceResolver } from '@/lib/email/audiences/artwork-buyer';
import { createSupabaseQueryMock } from '@/lib/test-utils/email-audience-mock';

const mockFrom = jest.fn();
jest.mock('@/lib/auth/server', () => ({
  createSupabaseAdminClient: jest.fn(() => ({ from: mockFrom })),
}));

describe('ArtworkBuyerAudienceResolver', () => {
  beforeEach(() => jest.clearAllMocks());

  it('해당 작품 구매자 이메일을 정규화·중복제거해 반환한다', async () => {
    mockFrom
      .mockReturnValueOnce(
        createSupabaseQueryMock({
          data: [
            { buyer_email: 'Buyer@X.com', buyer_name: '구매자' },
            { buyer_email: 'buyer@x.com', buyer_name: '중복' }, // 대소문자 중복
          ],
          error: null,
        })
      ) // orders
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null })); // suppressions

    const recipients = await new ArtworkBuyerAudienceResolver('artwork-uuid').resolve();

    expect(recipients).toHaveLength(1);
    expect(recipients[0].email).toBe('buyer@x.com');
    expect(recipients[0].name).toBe('구매자');
  });

  it('customer+all suppression 이메일을 제외한다', async () => {
    const { hashEmail } = jest.requireActual('@/lib/email/email-hash') as {
      hashEmail: (e: string) => string;
    };
    mockFrom
      .mockReturnValueOnce(
        createSupabaseQueryMock({
          data: [
            { buyer_email: 'blocked@x.com', buyer_name: '차단' },
            { buyer_email: 'ok@x.com', buyer_name: '정상' },
          ],
          error: null,
        })
      )
      .mockReturnValueOnce(
        createSupabaseQueryMock({ data: [{ email_hash: hashEmail('blocked@x.com') }], error: null })
      );

    const recipients = await new ArtworkBuyerAudienceResolver('artwork-uuid').resolve();
    expect(recipients.map((r) => r.email)).toEqual(['ok@x.com']);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest __tests__/lib/email/audiences/artwork-buyer.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현**

```ts
// lib/email/audiences/artwork-buyer.ts
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { hashEmail } from '@/lib/email/email-hash';
import { fetchAllInBatches } from '@/lib/utils/supabase-batch';
import type { AudienceResolver, Recipient } from './types';

// 특정 작품 구매자 채널. orders.artwork_id 일치 + payable 상태.
// advertising=true면 정통망법 §50 거래고객 예외 유지를 위해 6개월 이내 구매로 제한.
// customer+all suppression 차감 (구매자는 고객 관계).
export class ArtworkBuyerAudienceResolver implements AudienceResolver {
  constructor(
    private readonly artworkId: string,
    private readonly opts: { advertising?: boolean } = {}
  ) {}

  async resolve(): Promise<Recipient[]> {
    const supabase = createSupabaseAdminClient();
    const sixMonthsAgo = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: buyers } = await fetchAllInBatches<{
      buyer_email: string | null;
      buyer_name: string | null;
    }>((from, to) => {
      let q = supabase
        .from('orders')
        .select('buyer_email, buyer_name')
        .eq('artwork_id', this.artworkId)
        .in('status', ['paid', 'preparing', 'shipped', 'delivered'])
        .not('buyer_email', 'is', null);
      if (this.opts.advertising) q = q.gte('created_at', sixMonthsAgo);
      return q.range(from, to);
    }).catch((err) => {
      console.error('[artwork-buyer-audience] orders query error:', err);
      throw new Error(`작품 구매자 조회 실패: ${err?.message ?? err}`);
    });

    const { data: suppressions } = await fetchAllInBatches<{ email_hash: string }>((from, to) =>
      supabase
        .from('email_suppressions')
        .select('email_hash')
        .in('channel', ['customer', 'all'])
        .range(from, to)
    ).catch((err) => {
      console.error('[artwork-buyer-audience] suppressions query error:', err);
      throw new Error('수신거부 목록 조회 실패 — 발송을 중단합니다');
    });

    const suppressedHashes = new Set(
      (suppressions ?? []).map((s: { email_hash: string }) => s.email_hash)
    );
    const seen = new Set<string>();
    const recipients: Recipient[] = [];
    for (const b of buyers ?? []) {
      const email = b.buyer_email as string | null;
      if (!email) continue;
      const normalized = email.toLowerCase().trim();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      const h = hashEmail(normalized);
      if (suppressedHashes.has(h)) continue;
      recipients.push({
        email: normalized,
        name: (b.buyer_name as string | null) ?? null,
        locale: 'ko',
        emailHash: h,
      });
    }
    return recipients;
  }
}
```

> 확인됨: `fetchAllInBatches`는 `{ data, count }`를 resolve(customer.ts와 동일) — 위 `const { data: buyers } = ...`가 맞다.

- [ ] **Step 4: 통과 확인**

Run: `npx jest __tests__/lib/email/audiences/artwork-buyer.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: 커밋**

```bash
git add lib/email/audiences/artwork-buyer.ts __tests__/lib/email/audiences/artwork-buyer.test.ts
git commit -m "feat(email): 특정 작품 구매자 audience resolver

요약: orders.artwork_id 기준 구매자 추출, 광고 모드 시 6개월 제한"
```

---

## Task 7: 청원 목록 + 미리보기 확장

**Files:**

- Modify: `app/actions/admin-broadcast.ts:192-219` (previewAudience) + 신규 `getActivePetitions`
- Modify: `app/(portal)/admin/email/_components/AudiencePreview.tsx`

> 서버 액션 — 단위 테스트는 guards/supabase mock 부담이 커 본 태스크는 통합(수동) 검증 위주. 핵심 로직(resolver)은 Task 5·6에서 이미 TDD됨.

- [ ] **Step 1: `getActivePetitions` 추가**

`app/actions/admin-broadcast.ts` 끝에 추가:

```ts
export async function getActivePetitions(): Promise<Array<{ slug: string; title: string }>> {
  await requireAdmin();
  const supabase = await requireAdminClient();
  const { data, error } = await supabase
    .from('petitions')
    .select('slug, title, is_active')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[get-active-petitions] error:', error);
    return [];
  }
  return (data ?? []).map((p) => ({ slug: p.slug as string, title: p.title as string }));
}
```

- [ ] **Step 2: `previewAudience` 확장**

import에 추가:

```ts
import { ArtworkBuyerAudienceResolver } from '@/lib/email/audiences/artwork-buyer';
```

`previewAudience` 시그니처·본문 교체:

```ts
export async function previewAudience(
  channel: BroadcastChannel,
  filter?: {
    subset?: 'all' | 'artist' | 'exhibitor';
    petitionSlug?: string;
    artworkId?: string;
    advertising?: boolean;
  }
): Promise<{ total: number; breakdown: Record<string, number> }> {
  await requireAdmin();

  if (channel === 'member') {
    const recipients = await new MemberAudienceResolver().resolve({
      subset: filter?.subset ?? 'all',
    });
    const label =
      filter?.subset === 'artist'
        ? '작가'
        : filter?.subset === 'exhibitor'
          ? '출품자'
          : '작가·출품자';
    return { total: recipients.length, breakdown: { [label]: recipients.length } };
  }

  if (channel === 'customer') {
    if (filter?.artworkId) {
      const recipients = await new ArtworkBuyerAudienceResolver(filter.artworkId, {
        advertising: filter.advertising ?? false,
      }).resolve();
      return { total: recipients.length, breakdown: { 작품구매자: recipients.length } };
    }
    const recipients = await new CustomerAudienceResolver().resolve();
    return { total: recipients.length, breakdown: { '동의자·거래고객': recipients.length } };
  }

  if (channel === 'petition') {
    if (!filter?.petitionSlug) return { total: 0, breakdown: { '(청원 선택 필요)': 0 } };
    const recipients = await new PetitionAudienceResolver(filter.petitionSlug).resolve();
    return { total: recipients.length, breakdown: { 서명자: recipients.length } };
  }

  return { total: 0, breakdown: {} };
}
```

- [ ] **Step 3: `AudiencePreview.tsx`에 filter 전달**

`Props`와 호출을 filter 받도록 변경:

```tsx
interface Props {
  channel: BroadcastChannel;
  filter?: {
    subset?: 'all' | 'artist' | 'exhibitor';
    petitionSlug?: string;
    artworkId?: string;
    advertising?: boolean;
  };
}
export function AudiencePreview({ channel, filter }: Props) {
  // ...
  const r = await previewAudience(channel, filter);
  // ...
}
```

- [ ] **Step 4: 타입 체크 + 커밋**

Run: `npm run type-check`
Expected: 통과.

```bash
git add app/actions/admin-broadcast.ts "app/(portal)/admin/email/_components/AudiencePreview.tsx"
git commit -m "feat(email): 청원 목록 조회 + 미리보기 세부필터(작가/출품자·청원·작품구매자)

요약: getActivePetitions 추가, previewAudience가 subset/petitionSlug/artworkId 반영"
```

---

## Task 8: 통합 연락처 검색 서버 액션

**Files:**

- Create: `app/actions/admin-contact-search.ts`
- Test: `__tests__/app/actions/admin-contact-search.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// __tests__/app/actions/admin-contact-search.test.ts
import { searchContacts } from '@/app/actions/admin-contact-search';
import { createSupabaseQueryMock } from '@/lib/test-utils/email-audience-mock';

const mockFrom = jest.fn();
jest.mock('@/lib/auth/guards', () => ({
  requireAdmin: jest.fn(async () => ({ id: 'admin-1' })),
  requireAdminClient: jest.fn(async () => ({ from: mockFrom })),
}));

describe('searchContacts', () => {
  beforeEach(() => jest.clearAllMocks());

  it('여러 출처를 합치고 이메일로 중복제거하며 출처 라벨을 병합한다', async () => {
    mockFrom
      .mockReturnValueOnce(
        createSupabaseQueryMock({
          data: [{ buyer_email: 'a@x.com', buyer_name: '구매자A' }],
          error: null,
        })
      ) // orders
      .mockReturnValueOnce(
        createSupabaseQueryMock({ data: [{ email: 'a@x.com', full_name: '서명A' }], error: null })
      ) // petition_signatures
      .mockReturnValueOnce(
        createSupabaseQueryMock({
          data: [{ contact_email: 'b@x.com', name_ko: '작가B', name_en: null }],
          error: null,
        })
      ) // artists
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null })) // profiles
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null })); // suppressions

    const { results } = await searchContacts('x');
    const a = results.find((r) => r.email === 'a@x.com')!;
    expect(a.sources.sort()).toEqual(['구매자', '서명자']);
    expect(results.map((r) => r.email).sort()).toEqual(['a@x.com', 'b@x.com']);
  });

  it('suppression된 연락처에 suppressed=true 플래그를 단다', async () => {
    const { hashEmail } = jest.requireActual('@/lib/email/email-hash') as {
      hashEmail: (e: string) => string;
    };
    mockFrom
      .mockReturnValueOnce(
        createSupabaseQueryMock({
          data: [{ buyer_email: 'block@x.com', buyer_name: '차단' }],
          error: null,
        })
      )
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null }))
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null }))
      .mockReturnValueOnce(createSupabaseQueryMock({ data: [], error: null }))
      .mockReturnValueOnce(
        createSupabaseQueryMock({ data: [{ email_hash: hashEmail('block@x.com') }], error: null })
      );

    const { results } = await searchContacts('block');
    expect(results[0]).toMatchObject({ email: 'block@x.com', suppressed: true });
  });

  it('빈 쿼리는 빈 결과를 반환한다', async () => {
    const { results } = await searchContacts('   ');
    expect(results).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest __tests__/app/actions/admin-contact-search.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현**

```ts
// app/actions/admin-contact-search.ts
'use server';

import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import { hashEmail } from '@/lib/email/email-hash';

export interface ContactSearchResult {
  email: string;
  name: string | null;
  sources: string[];
  suppressed: boolean;
}

const LIMIT = 50;

// 보유 연락처(구매자·서명자·작가·출품자/회원)를 이름·이메일로 검색.
// 외부 임의 주소 추가 아님 — 이미 보유한 연락처만. suppression(individual+all)은 플래그로 표시.
export async function searchContacts(
  query: string
): Promise<{ results: ContactSearchResult[]; truncated: boolean }> {
  await requireAdmin();
  const q = query.trim();
  if (!q) return { results: [], truncated: false };

  const supabase = await requireAdminClient();
  const like = `%${q.replace(/[%_]/g, (m) => `\\${m}`)}%`;

  const merged = new Map<string, { name: string | null; sources: Set<string> }>();
  const add = (
    email: string | null | undefined,
    name: string | null | undefined,
    source: string
  ) => {
    if (!email) return;
    const norm = email.toLowerCase().trim();
    if (!norm) return;
    const cur = merged.get(norm) ?? { name: null, sources: new Set<string>() };
    if (!cur.name && name) cur.name = name;
    cur.sources.add(source);
    merged.set(norm, cur);
  };

  // 1) 구매자
  const { data: orders } = await supabase
    .from('orders')
    .select('buyer_email, buyer_name')
    .or(`buyer_name.ilike.${like},buyer_email.ilike.${like}`)
    .limit(LIMIT);
  for (const o of orders ?? []) add(o.buyer_email as string, o.buyer_name as string, '구매자');

  // 2) 서명자 (마스킹 제외)
  const { data: signers } = await supabase
    .from('petition_signatures')
    .select('email, full_name')
    .eq('is_masked', false)
    .or(`full_name.ilike.${like},email.ilike.${like}`)
    .limit(LIMIT);
  for (const s of signers ?? []) add(s.email as string, s.full_name as string, '서명자');

  // 3) 작가
  const { data: artists } = await supabase
    .from('artists')
    .select('contact_email, name_ko, name_en')
    .or(`name_ko.ilike.${like},name_en.ilike.${like},contact_email.ilike.${like}`)
    .limit(LIMIT);
  for (const a of artists ?? [])
    add(a.contact_email as string, (a.name_ko as string) ?? (a.name_en as string), '작가');

  // 4) 회원(작가·출품자 프로필)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('email, name, role')
    .in('role', ['artist', 'exhibitor'])
    .not('email', 'is', null)
    .or(`name.ilike.${like},email.ilike.${like}`)
    .limit(LIMIT);
  for (const p of profiles ?? [])
    add(p.email as string, p.name as string, p.role === 'exhibitor' ? '출품자' : '회원');

  // suppression(individual+all) 플래그
  const { data: suppressions } = await supabase
    .from('email_suppressions')
    .select('email_hash')
    .in('channel', ['individual', 'all']);
  const suppressed = new Set((suppressions ?? []).map((s) => s.email_hash as string));

  const all = [...merged.entries()].map(([email, v]) => ({
    email,
    name: v.name,
    sources: [...v.sources],
    suppressed: suppressed.has(hashEmail(email)),
  }));

  return { results: all.slice(0, LIMIT), truncated: all.length > LIMIT };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx jest __tests__/app/actions/admin-contact-search.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: 커밋**

```bash
git add app/actions/admin-contact-search.ts __tests__/app/actions/admin-contact-search.test.ts
git commit -m "feat(email): 통합 연락처 검색(구매자·서명자·작가·출품자)

요약: 이름·이메일로 보유 연락처 검색, 출처 라벨 병합·suppression 플래그·dedup"
```

---

## Task 9: `enqueueBroadcast` 확장 + `enqueueIndividualBroadcast` + `sendTestEmail`

**Files:**

- Modify: `app/actions/admin-broadcast.ts` (EnqueueBroadcastInput, enqueueBroadcast, 신규 함수)
- Test: `__tests__/app/actions/admin-broadcast-enqueue.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성 (개별 발송 suppression)**

```ts
// __tests__/app/actions/admin-broadcast-enqueue.test.ts
import { enqueueIndividualBroadcast } from '@/app/actions/admin-broadcast';
import { createSupabaseQueryMock } from '@/lib/test-utils/email-audience-mock';

const mockFrom = jest.fn();
const insertedRecipients: unknown[] = [];

jest.mock('@/lib/auth/guards', () => ({
  requireAdmin: jest.fn(async () => ({ id: 'admin-1' })),
  requireAdminClient: jest.fn(async () => ({ from: mockFrom })),
}));
jest.mock('@/app/actions/activity-log-writer', () => ({ logAdminAction: jest.fn(async () => {}) }));

describe('enqueueIndividualBroadcast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    insertedRecipients.length = 0;
  });

  it('individual+all suppression 수신자를 제외하고 큐에 등록한다', async () => {
    const { hashEmail } = jest.requireActual('@/lib/email/email-hash') as {
      hashEmail: (e: string) => string;
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'email_suppressions')
        return createSupabaseQueryMock({
          data: [{ email_hash: hashEmail('block@x.com') }],
          error: null,
        });
      if (table === 'email_broadcasts')
        return createSupabaseQueryMock({ data: { id: 'bc-1' }, error: null }) as never; // .insert().select().single()
      if (table === 'email_broadcast_recipients') {
        return {
          insert: (rows: unknown[]) => {
            insertedRecipients.push(...rows);
            return Promise.resolve({ error: null });
          },
        } as never;
      }
      return createSupabaseQueryMock({ data: [], error: null });
    });

    const result = await enqueueIndividualBroadcast({
      recipients: [
        { email: 'block@x.com', name: '차단' },
        { email: 'ok@x.com', name: '정상' },
      ],
      subject: '안내',
      bodyMd: '본문',
      isAdvertisement: false,
    });

    expect(result.error).toBeFalsy();
    expect(insertedRecipients).toHaveLength(1);
    expect((insertedRecipients[0] as { email: string }).email).toBe('ok@x.com');
  });
});
```

> 주: `email_broadcasts`의 `.insert().select().single()` 체인은 proxy mock이 `{ data: { id }, ... }`를 await 시 resolve하도록 구성. 구현이 `const { data: broadcast } = await supabase.from('email_broadcasts').insert({...}).select('id').single()` 형태면 proxy가 그대로 동작한다.

- [ ] **Step 2: 실패 확인**

Run: `npx jest __tests__/app/actions/admin-broadcast-enqueue.test.ts`
Expected: FAIL — `enqueueIndividualBroadcast` 없음.

- [ ] **Step 3: `EnqueueBroadcastInput` + `enqueueBroadcast` 확장**

import 추가:

```ts
import { ArtworkBuyerAudienceResolver } from '@/lib/email/audiences/artwork-buyer';
import { hashEmail } from '@/lib/email/email-hash';
import { sendBatch } from '@/lib/email/resend-batch';
import { render } from '@react-email/render';
import * as React from 'react';
import BroadcastEmail from '@/emails/broadcast';
import { generateUnsubscribeToken } from '@/lib/email/unsubscribe-token';
import { splitAndPersonalize } from '@/lib/email/broadcast-body';
```

`EnqueueBroadcastInput`에 `isAdvertisement?: boolean` 추가(공유 계약 참고).

`enqueueBroadcast`의 resolver 선택부(52-64행)를 교체 — member subset, artwork-buyer 분기 + is_advertisement 결정:

```ts
const audienceFilter = input.audienceFilter ?? {};
let resolver;
let isAdvertisement = false;
if (channel === 'member') {
  resolver = new MemberAudienceResolver();
  // resolve에 subset 전달 위해 아래 resolve 호출을 resolver.resolve(audienceFilter)로
} else if (channel === 'customer') {
  if (typeof audienceFilter.artworkId === 'string') {
    isAdvertisement = input.isAdvertisement ?? false;
    resolver = new ArtworkBuyerAudienceResolver(audienceFilter.artworkId, {
      advertising: isAdvertisement,
    });
  } else {
    isAdvertisement = true; // 광범위 고객 마케팅 세그먼트 = 항상 광고(법적)
    resolver = new CustomerAudienceResolver();
  }
} else if (channel === 'petition') {
  if (!input.petitionSlug)
    return { message: '청원 채널은 petitionSlug가 필요합니다.', error: true };
  resolver = new PetitionAudienceResolver(input.petitionSlug);
} else {
  return { message: `채널 '${channel}'은 세그먼트 발송을 지원하지 않습니다.`, error: true };
}
```

resolve 호출(68행)을 `recipients = await resolver.resolve(audienceFilter);`로 변경(다른 resolver는 인자를 무시).
INSERT(110-124행)에 `is_advertisement: isAdvertisement,` 추가, `audience_filter: (audienceFilter ?? {}) as Json` 유지.

- [ ] **Step 4: `enqueueIndividualBroadcast` + `sendTestEmail` 추가**

`app/actions/admin-broadcast.ts` 끝에:

```ts
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.saf2026.com';
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? '씨앗페 <noreply@saf2026.com>';

export async function enqueueIndividualBroadcast(input: {
  recipients: Array<{ email: string; name: string | null }>;
  subject: string;
  bodyMd: string;
  ctaLabel?: string;
  ctaUrl?: string;
  isAdvertisement: boolean;
}): Promise<ActionState & { broadcastId?: string }> {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  const { recipients, subject, bodyMd, ctaLabel, ctaUrl, isAdvertisement } = input;

  if (!subject.trim() || !bodyMd.trim())
    return { message: '제목과 본문은 필수입니다.', error: true };
  if (recipients.length === 0) return { message: '수신자를 1명 이상 선택하세요.', error: true };

  let validatedCtaUrl: string | null;
  let validatedCtaLabel: string | null;
  try {
    validatedCtaUrl = ctaUrl ? validateUrl(ctaUrl, 'CTA URL') : null;
    validatedCtaLabel = ctaLabel ? validateTextLength(ctaLabel, 200, 'CTA 라벨') : null;
  } catch (err) {
    return { message: err instanceof Error ? err.message : 'CTA 입력 검증 실패', error: true };
  }

  // individual+all suppression 차감 + 정규화 dedup
  const { data: suppressions } = await supabase
    .from('email_suppressions')
    .select('email_hash')
    .in('channel', ['individual', 'all']);
  const suppressed = new Set((suppressions ?? []).map((s) => s.email_hash as string));

  const seen = new Set<string>();
  const rows: Array<{
    broadcast_id?: string;
    email: string;
    name: string | null;
    locale: string;
    status: string;
  }> = [];
  for (const r of recipients) {
    const email = r.email.toLowerCase().trim();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    if (suppressed.has(hashEmail(email))) continue;
    rows.push({ email, name: r.name, locale: 'ko', status: 'pending' });
  }
  if (rows.length === 0)
    return { message: '발송 가능한 수신자가 없습니다. (전원 수신거부)', error: true };

  const { data: broadcast, error: bErr } = await supabase
    .from('email_broadcasts')
    .insert({
      channel: 'individual',
      subject,
      body_md: bodyMd,
      cta_label: validatedCtaLabel,
      cta_url: validatedCtaUrl,
      audience_filter: { mode: 'search' } as Json,
      is_advertisement: isAdvertisement,
      status: 'queued',
      recipient_count: rows.length,
      created_by: admin.id,
      queued_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (bErr || !broadcast) {
    console.error('[enqueue-individual] insert broadcast error:', bErr);
    return { message: '캠페인 생성에 실패했습니다.', error: true };
  }

  const { error: rErr } = await supabase
    .from('email_broadcast_recipients')
    .insert(rows.map((r) => ({ ...r, broadcast_id: broadcast.id })));
  if (rErr) {
    await supabase.from('email_broadcasts').update({ status: 'failed' }).eq('id', broadcast.id);
    return { message: '수신자 큐 등록에 실패했습니다.', error: true };
  }

  await logAdminAction('broadcast_enqueued', 'email_broadcast', broadcast.id, {
    channel: 'individual',
    recipient_count: rows.length,
    is_advertisement: isAdvertisement,
    subject,
  });
  return { message: `${rows.length}명에게 발송 예약되었습니다.`, broadcastId: broadcast.id };
}

// 작성 중인 내용으로 관리자 본인에게 테스트 1통 즉시 발송(큐 우회). 실전 0건 리스크 완화.
export async function sendTestEmail(input: {
  subject: string;
  bodyMd: string;
  ctaLabel?: string;
  ctaUrl?: string;
  isAdvertisement: boolean;
}): Promise<ActionState> {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();
  if (!input.subject.trim() || !input.bodyMd.trim())
    return { message: '제목과 본문은 필수입니다.', error: true };

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, name')
    .eq('id', admin.id)
    .single();
  const to = profile?.email as string | undefined;
  if (!to) return { message: '관리자 이메일을 찾을 수 없습니다.', error: true };

  let validatedCtaUrl: string | null;
  let validatedCtaLabel: string | null;
  try {
    validatedCtaUrl = input.ctaUrl ? validateUrl(input.ctaUrl, 'CTA URL') : null;
    validatedCtaLabel = input.ctaLabel ? validateTextLength(input.ctaLabel, 200, 'CTA 라벨') : null;
  } catch (err) {
    return { message: err instanceof Error ? err.message : 'CTA 입력 검증 실패', error: true };
  }

  const emailHash = hashEmail(to.toLowerCase().trim());
  const unsubToken = generateUnsubscribeToken(emailHash, 'individual');
  const unsubscribeUrl = unsubToken
    ? `${SITE_URL}/api/email/unsubscribe?t=${unsubToken}`
    : `${SITE_URL}/api/email/unsubscribe?invalid=1`;

  const html = await render(
    React.createElement(BroadcastEmail, {
      channel: 'individual',
      isAdvertisement: input.isAdvertisement,
      recipientName: (profile?.name as string | null) ?? null,
      subject: input.subject,
      bodyParagraphs: splitAndPersonalize(input.bodyMd, (profile?.name as string | null) ?? null),
      ctaLabel: validatedCtaLabel,
      ctaUrl: validatedCtaUrl,
      unsubscribeUrl,
      locale: 'ko',
    })
  );
  const subject = input.isAdvertisement
    ? `(광고) [테스트] ${input.subject}`
    : `[테스트] ${input.subject}`;
  const result = await sendBatch([{ from: FROM_EMAIL, to, subject, html }]);
  if (result.error || result.ids.length === 0) {
    return { message: `테스트 발송 실패: ${result.error ?? '알 수 없는 오류'}`, error: true };
  }
  return { message: `테스트 이메일을 ${to}로 보냈습니다.` };
}
```

- [ ] **Step 5: 통과 + 타입 체크**

Run: `npx jest __tests__/app/actions/admin-broadcast-enqueue.test.ts && npm run type-check`
Expected: PASS, 타입 통과.

- [ ] **Step 6: 커밋**

```bash
git add app/actions/admin-broadcast.ts __tests__/app/actions/admin-broadcast-enqueue.test.ts
git commit -m "feat(email): enqueue 광고플래그·작품구매자·subset + 개별발송/테스트발송

요약: customer 세그먼트 광고 강제, 작품구매자/작가출품자 분기, 검색 개별발송과 본인 테스트발송 추가"
```

---

## Task 10: 코드 프리셋 템플릿 라이브러리

**Files:**

- Create: `lib/email/templates.ts`
- Test: `__tests__/lib/email/templates.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// __tests__/lib/email/templates.test.ts
import { BROADCAST_TEMPLATES } from '@/lib/email/templates';

describe('BROADCAST_TEMPLATES', () => {
  it('id가 고유하다', () => {
    const ids = BROADCAST_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('모든 템플릿이 필수 필드(subject·bodyMd·label)를 가진다', () => {
    for (const t of BROADCAST_TEMPLATES) {
      expect(t.subject.trim().length).toBeGreaterThan(0);
      expect(t.bodyMd.trim().length).toBeGreaterThan(0);
      expect(t.label.trim().length).toBeGreaterThan(0);
    }
  });

  it('customer 채널 템플릿은 isAdvertisement=true다(법적)', () => {
    for (const t of BROADCAST_TEMPLATES.filter((t) => t.channel === 'customer')) {
      expect(t.isAdvertisement).toBe(true);
    }
  });

  it('각 채널(member·customer·petition·individual)에 최소 1개씩 있다', () => {
    for (const ch of ['member', 'customer', 'petition', 'individual'] as const) {
      expect(BROADCAST_TEMPLATES.some((t) => t.channel === ch)).toBe(true);
    }
  });

  it('CTA URL이 있으면 http(s)다', () => {
    for (const t of BROADCAST_TEMPLATES.filter((t) => t.ctaUrl)) {
      expect(t.ctaUrl).toMatch(/^https?:\/\//);
    }
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest __tests__/lib/email/templates.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현 (시드 템플릿)**

```ts
// lib/email/templates.ts
import type { BroadcastChannel } from '@/lib/email/audiences/types';

export interface BroadcastTemplate {
  id: string;
  label: string;
  description: string;
  channel: BroadcastChannel;
  isAdvertisement: boolean;
  subject: string;
  bodyMd: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

// 브랜드 톤: 출품 작가는 "동료 예술인을 돕는 연대자"이지 불우한 대상이 아님.
// 본문은 빈 줄로 문단 구분, {{name}}은 수신자 이름으로 치환됨.
export const BROADCAST_TEMPLATES: BroadcastTemplate[] = [
  // ── 작가·출품자 (member) ──
  {
    id: 'member-exhibition-schedule',
    label: '전시 일정·준비 안내',
    description: '참여 작가에게 전시 일정과 준비 사항 공지',
    channel: 'member',
    isAdvertisement: false,
    subject: '씨앗페 2026 전시 일정 및 준비 안내',
    bodyMd:
      '{{name}}님, 함께해 주셔서 감사합니다.\n\n씨앗페 2026 전시 일정과 준비 사항을 안내드립니다. 아래 일정을 확인해 주세요.\n\n문의 사항은 회신해 주시면 빠르게 도와드리겠습니다.',
    ctaLabel: '전시 안내 보기',
    ctaUrl: 'https://www.saf2026.com',
  },
  {
    id: 'member-settlement',
    label: '출품·정산 안내',
    description: '작품 판매·정산 관련 안내',
    channel: 'member',
    isAdvertisement: false,
    subject: '작품 판매 및 정산 안내',
    bodyMd:
      '{{name}}님께 작품 판매 및 정산 관련 내용을 안내드립니다.\n\n자세한 내역은 아래에서 확인하실 수 있습니다. 확인 후 궁금하신 점은 언제든 회신 주세요.',
  },
  {
    id: 'member-thanks',
    label: '참여 작가 감사',
    description: '연대에 함께해 준 작가에게 감사 인사',
    channel: 'member',
    isAdvertisement: false,
    subject: '함께해 주셔서 감사합니다',
    bodyMd:
      '{{name}}님, 동료 예술인을 위해 작품을 내어주신 그 마음에 깊이 감사드립니다.\n\n여러분의 연대가 금융 차별을 겪는 예술인에게 실질적인 회복의 길을 열고 있습니다.',
  },
  // ── 고객 마케팅 (customer, 광고) ──
  {
    id: 'customer-new-artwork',
    label: '신작 입고 안내',
    description: '새로 등록된 작품 소개 (광고)',
    channel: 'customer',
    isAdvertisement: true,
    subject: '새로운 작품이 도착했습니다',
    bodyMd:
      '{{name}}님, 씨앗페에 새로운 작품이 등록되었습니다.\n\n작품을 구매하시면 그 수익이 동료 예술인을 위한 상호부조 기금이 되어, 금융 차별을 겪는 예술인에게 저금리 대출로 이어집니다.',
    ctaLabel: '신작 보러 가기',
    ctaUrl: 'https://www.saf2026.com/artworks',
  },
  {
    id: 'customer-exhibition-invite',
    label: '전시 초대',
    description: '전시·행사 초대 (광고)',
    channel: 'customer',
    isAdvertisement: true,
    subject: '씨앗페 2026 전시에 초대합니다',
    bodyMd:
      '{{name}}님을 씨앗페 2026 전시에 초대합니다.\n\n예술가들의 연대로 만들어진 이번 전시에서, 작품과 그 뒤의 이야기를 만나보세요.',
    ctaLabel: '전시 자세히 보기',
    ctaUrl: 'https://www.saf2026.com',
  },
  {
    id: 'customer-collection',
    label: '컬렉션·기획전 추천',
    description: '큐레이션 컬렉션 소개 (광고)',
    channel: 'customer',
    isAdvertisement: true,
    subject: '이런 작품은 어떠세요 — 큐레이션 추천',
    bodyMd:
      '{{name}}님께 씨앗페가 엄선한 컬렉션을 소개합니다.\n\n공간과 취향에 어울리는 작품을 모았습니다. 한 점의 구매가 한 예술인의 회복으로 이어집니다.',
    ctaLabel: '컬렉션 보기',
    ctaUrl: 'https://www.saf2026.com/collections',
  },
  // ── 청원 (petition) ──
  {
    id: 'petition-progress',
    label: '진행 상황 업데이트',
    description: '서명자에게 청원 진행 상황 공유',
    channel: 'petition',
    isAdvertisement: false,
    subject: '청원 진행 상황을 알려드립니다',
    bodyMd:
      '{{name}}님, 함께 서명해 주셔서 감사합니다.\n\n청원 진행 상황을 공유드립니다. 여러분의 목소리가 변화를 만들고 있습니다.',
    ctaLabel: '청원 페이지 보기',
    ctaUrl: 'https://www.saf2026.com',
  },
  {
    id: 'petition-deadline',
    label: '목표·마감 임박 안내',
    description: '서명 목표·마감 임박 독려',
    channel: 'petition',
    isAdvertisement: false,
    subject: '마감이 다가옵니다 — 함께 마지막까지',
    bodyMd:
      '{{name}}님, 청원 마감이 다가오고 있습니다.\n\n조금만 더 힘을 모으면 목표에 닿을 수 있습니다. 주변에도 알려주시면 큰 힘이 됩니다.',
    ctaLabel: '함께 알리기',
    ctaUrl: 'https://www.saf2026.com',
  },
  {
    id: 'petition-result',
    label: '결과 보고·감사',
    description: '청원 결과 보고 및 감사',
    channel: 'petition',
    isAdvertisement: false,
    subject: '청원 결과를 보고드립니다',
    bodyMd:
      '{{name}}님, 함께해 주신 모든 분께 결과를 보고드립니다.\n\n여러분의 연대가 만든 변화를 전합니다. 진심으로 감사합니다.',
  },
  // ── 개별 발송 (individual) ──
  {
    id: 'individual-inquiry-reply',
    label: '문의 답변',
    description: '개별 문의에 대한 답변 (운영)',
    channel: 'individual',
    isAdvertisement: false,
    subject: '문의 주신 내용에 답변드립니다',
    bodyMd:
      '{{name}}님, 문의해 주셔서 감사합니다.\n\n문의하신 내용에 대해 아래와 같이 답변드립니다.',
  },
  {
    id: 'individual-purchase-guide',
    label: '구매 관련 개별 안내',
    description: '특정 구매자에게 개별 안내 (운영)',
    channel: 'individual',
    isAdvertisement: false,
    subject: '구매하신 작품 관련 안내',
    bodyMd:
      '{{name}}님, 구매하신 작품과 관련하여 안내드릴 내용이 있어 연락드립니다.\n\n자세한 내용은 아래를 확인해 주세요.',
  },
];
```

- [ ] **Step 4: 통과 확인**

Run: `npx jest __tests__/lib/email/templates.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: 커밋**

```bash
git add lib/email/templates.ts __tests__/lib/email/templates.test.ts
git commit -m "feat(email): 코드 프리셋 템플릿 라이브러리

요약: 채널별 스타터 템플릿(전시·신작·청원·개별 등) 정의, 브랜드 톤 적용"
```

---

## Task 11: BroadcastForm — 발송 모드 + 템플릿 + 세그먼트 세부필터

> UI 태스크 — RTL로 핵심 동작(템플릿 선택→필드 채움, 모드 토글)을 검증하고, 비주얼은 수동 확인. 기존 `BroadcastForm.tsx`가 커지므로 하위 컴포넌트로 분리한다.

**Files:**

- Create: `app/(portal)/admin/email/_components/TemplatePicker.tsx`
- Create: `app/(portal)/admin/email/_components/AudienceSelector.tsx`
- Modify: `app/(portal)/admin/email/_components/BroadcastForm.tsx`
- Test: `__tests__/app/admin/email/BroadcastForm.test.tsx`

- [ ] **Step 1: 실패하는 RTL 테스트 작성 (템플릿 선택 → 필드 채움)**

```tsx
// __tests__/app/admin/email/BroadcastForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { BroadcastForm } from '@/app/(portal)/admin/email/_components/BroadcastForm';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }),
}));
jest.mock('@/app/actions/admin-broadcast', () => ({
  enqueueBroadcast: jest.fn(),
  enqueueIndividualBroadcast: jest.fn(),
  sendTestEmail: jest.fn(),
  previewAudience: jest.fn(async () => ({ total: 0, breakdown: {} })),
  getActivePetitions: jest.fn(async () => [{ slug: 'oh-yoon', title: '오윤 청원' }]),
}));
jest.mock('@/app/actions/admin-contact-search', () => ({
  searchContacts: jest.fn(async () => ({ results: [], truncated: false })),
}));

describe('BroadcastForm 템플릿', () => {
  it('템플릿을 선택하면 제목·본문이 채워진다', async () => {
    render(<BroadcastForm />);
    const select = screen.getByLabelText('템플릿 선택');
    fireEvent.change(select, { target: { value: 'customer-new-artwork' } });
    const subject = screen.getByLabelText(/제목/) as HTMLInputElement;
    expect(subject.value).toContain('새로운 작품');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest __tests__/app/admin/email/BroadcastForm.test.tsx`
Expected: FAIL — `템플릿 선택` 라벨 없음.

- [ ] **Step 3: `TemplatePicker.tsx` 작성**

```tsx
// app/(portal)/admin/email/_components/TemplatePicker.tsx
'use client';

import { BROADCAST_TEMPLATES, type BroadcastTemplate } from '@/lib/email/templates';

interface Props {
  onSelect: (template: BroadcastTemplate) => void;
}

export function TemplatePicker({ onSelect }: Props) {
  return (
    <div>
      <label htmlFor="broadcast-template" className="mb-1 block text-sm font-medium text-charcoal">
        템플릿 선택
      </label>
      <select
        id="broadcast-template"
        defaultValue=""
        onChange={(e) => {
          const t = BROADCAST_TEMPLATES.find((x) => x.id === e.target.value);
          if (t) onSelect(t);
        }}
        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      >
        <option value="">직접 작성 (빈 양식)</option>
        {BROADCAST_TEMPLATES.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label} — {t.description}
          </option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 4: `AudienceSelector.tsx` 작성 (세그먼트 채널 + 세부필터)**

```tsx
// app/(portal)/admin/email/_components/AudienceSelector.tsx
'use client';

import { useEffect, useState } from 'react';
import { getActivePetitions } from '@/app/actions/admin-broadcast';
import { AudiencePreview } from './AudiencePreview';
import type { BroadcastChannel } from '@/lib/email/audiences/types';

export interface SegmentSelection {
  channel: BroadcastChannel; // 'member' | 'customer' | 'petition'
  subset: 'all' | 'artist' | 'exhibitor';
  petitionSlug: string;
  artworkId: string;
  isArtworkBuyer: boolean;
  advertising: boolean;
}

interface Props {
  value: SegmentSelection;
  onChange: (v: SegmentSelection) => void;
}

export function AudienceSelector({ value, onChange }: Props) {
  const [petitions, setPetitions] = useState<Array<{ slug: string; title: string }>>([]);
  useEffect(() => {
    getActivePetitions().then(setPetitions);
  }, []);
  const set = (patch: Partial<SegmentSelection>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="seg-channel" className="mb-1 block text-sm font-medium text-charcoal">
          수신자 그룹
        </label>
        <select
          id="seg-channel"
          value={value.isArtworkBuyer ? 'artwork-buyer' : value.channel}
          onChange={(e) => {
            const v = e.target.value;
            if (v === 'artwork-buyer') set({ channel: 'customer', isArtworkBuyer: true });
            else set({ channel: v as BroadcastChannel, isArtworkBuyer: false });
          }}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="member">작가·출품자 업무</option>
          <option value="customer">고객 마케팅 (광고)</option>
          <option value="petition">청원 캠페인 알림</option>
          <option value="artwork-buyer">특정 작품 구매자</option>
        </select>
      </div>

      {value.channel === 'member' && !value.isArtworkBuyer && (
        <select
          aria-label="작가 출품자 구분"
          value={value.subset}
          onChange={(e) => set({ subset: e.target.value as SegmentSelection['subset'] })}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">전체 (작가+출품자)</option>
          <option value="artist">작가만</option>
          <option value="exhibitor">출품자만</option>
        </select>
      )}

      {value.channel === 'petition' && (
        <select
          aria-label="청원 선택"
          value={value.petitionSlug}
          onChange={(e) => set({ petitionSlug: e.target.value })}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">청원을 선택하세요</option>
          {petitions.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.title}
            </option>
          ))}
        </select>
      )}

      {value.isArtworkBuyer && (
        <input
          aria-label="작품 ID"
          type="text"
          value={value.artworkId}
          onChange={(e) => set({ artworkId: e.target.value })}
          placeholder="작품 ID(UUID)"
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      )}

      <AudiencePreview
        channel={value.channel}
        filter={{
          subset: value.subset,
          petitionSlug: value.petitionSlug || undefined,
          artworkId: value.isArtworkBuyer ? value.artworkId || undefined : undefined,
          advertising: value.advertising,
        }}
      />
    </div>
  );
}
```

> 작품 선택은 본 사이클에선 UUID 직접 입력으로 시작(YAGNI). 추후 작품 검색 select로 보강 가능.

- [ ] **Step 5: `BroadcastForm.tsx` 재구성 — 모드 토글 + 템플릿 + 세그먼트 조립**

기존 폼을 모드(`segment`)에서 `TemplatePicker` + `AudienceSelector` + 공통 필드(제목/본문/CTA)로 재구성한다. 템플릿 선택 시 상태를 채우는 핸들러:

```tsx
const applyTemplate = (t: BroadcastTemplate) => {
  setSubject(t.subject);
  setBodyMd(t.bodyMd);
  setCtaLabel(t.ctaLabel ?? '');
  setCtaUrl(t.ctaUrl ?? '');
  if (t.channel === 'customer')
    setSegment((s) => ({ ...s, channel: 'customer', isArtworkBuyer: false }));
  else if (t.channel === 'member' || t.channel === 'petition')
    setSegment((s) => ({ ...s, channel: t.channel as BroadcastChannel, isArtworkBuyer: false }));
};
```

제출 시 세그먼트면 `enqueueBroadcast({ channel, subject, bodyMd, ctaLabel, ctaUrl, petitionSlug, audienceFilter: { subset, artworkId, mode: isArtworkBuyer ? 'artwork-buyer' : undefined }, isAdvertisement: advertising })`. (구체 폼 마크업은 기존 BroadcastForm 패턴 복제 + 위 컴포넌트 삽입.)

- [ ] **Step 6: 통과 + 타입 + 회귀**

Run: `npx jest __tests__/app/admin/email/BroadcastForm.test.tsx && npm run type-check`
Expected: PASS, 타입 통과.

- [ ] **Step 7: 커밋**

```bash
git add "app/(portal)/admin/email/_components/TemplatePicker.tsx" "app/(portal)/admin/email/_components/AudienceSelector.tsx" "app/(portal)/admin/email/_components/BroadcastForm.tsx" __tests__/app/admin/email/BroadcastForm.test.tsx
git commit -m "feat(email): 발송 폼에 템플릿 선택 + 세그먼트 세부필터

요약: TemplatePicker·AudienceSelector 분리, 작가/출품자·청원·작품구매자 선택 UI"
```

---

## Task 12: BroadcastForm — 검색 발송 모드 + 테스트 발송

**Files:**

- Create: `app/(portal)/admin/email/_components/ContactSearch.tsx`
- Modify: `app/(portal)/admin/email/_components/BroadcastForm.tsx`
- Test: `__tests__/app/admin/email/ContactSearch.test.tsx`

- [ ] **Step 1: 실패하는 RTL 테스트 작성**

```tsx
// __tests__/app/admin/email/ContactSearch.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ContactSearch } from '@/app/(portal)/admin/email/_components/ContactSearch';
import { searchContacts } from '@/app/actions/admin-contact-search';

jest.mock('@/app/actions/admin-contact-search', () => ({ searchContacts: jest.fn() }));

describe('ContactSearch', () => {
  it('검색 결과를 담으면 선택 목록에 추가된다', async () => {
    (searchContacts as jest.Mock).mockResolvedValue({
      results: [{ email: 'a@x.com', name: '구매자A', sources: ['구매자'], suppressed: false }],
      truncated: false,
    });
    const onChange = jest.fn();
    render(<ContactSearch selected={[]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('연락처 검색'), { target: { value: '구매자' } });
    fireEvent.click(screen.getByText('검색'));
    await waitFor(() => screen.getByText(/a@x.com/));
    fireEvent.click(screen.getByRole('button', { name: '담기' }));
    expect(onChange).toHaveBeenCalledWith([{ email: 'a@x.com', name: '구매자A' }]);
  });

  it('suppression된 결과는 담기 버튼이 비활성화된다', async () => {
    (searchContacts as jest.Mock).mockResolvedValue({
      results: [{ email: 'b@x.com', name: '차단', sources: ['서명자'], suppressed: true }],
      truncated: false,
    });
    render(<ContactSearch selected={[]} onChange={jest.fn()} />);
    fireEvent.change(screen.getByLabelText('연락처 검색'), { target: { value: '차단' } });
    fireEvent.click(screen.getByText('검색'));
    await waitFor(() => screen.getByText(/b@x.com/));
    expect(screen.getByRole('button', { name: '수신거부됨' })).toBeDisabled();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx jest __tests__/app/admin/email/ContactSearch.test.tsx`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: `ContactSearch.tsx` 구현**

```tsx
// app/(portal)/admin/email/_components/ContactSearch.tsx
'use client';

import { useState, useTransition } from 'react';
import { searchContacts, type ContactSearchResult } from '@/app/actions/admin-contact-search';

export interface SelectedContact {
  email: string;
  name: string | null;
}

interface Props {
  selected: SelectedContact[];
  onChange: (next: SelectedContact[]) => void;
}

export function ContactSearch({ selected, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ContactSearchResult[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [isPending, startTransition] = useTransition();

  const runSearch = () => {
    startTransition(async () => {
      const r = await searchContacts(query);
      setResults(r.results);
      setTruncated(r.truncated);
    });
  };

  const add = (c: ContactSearchResult) => {
    if (selected.some((s) => s.email === c.email)) return;
    onChange([...selected, { email: c.email, name: c.name }]);
  };
  const remove = (email: string) => onChange(selected.filter((s) => s.email !== email));

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          aria-label="연락처 검색"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), runSearch())}
          placeholder="이름 또는 이메일"
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={runSearch}
          disabled={isPending}
          className="shrink-0 rounded-lg bg-primary-strong px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? '검색 중…' : '검색'}
        </button>
      </div>

      {results.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {results.map((c) => (
            <li key={c.email} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="truncate">
                <strong className="text-charcoal-deep">{c.name ?? '(이름없음)'}</strong>{' '}
                <span className="text-charcoal-muted">{c.email}</span>{' '}
                <span className="text-xs text-charcoal-soft">[{c.sources.join('·')}]</span>
              </span>
              <button
                type="button"
                disabled={c.suppressed || selected.some((s) => s.email === c.email)}
                onClick={() => add(c)}
                className="shrink-0 rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-40"
              >
                {c.suppressed
                  ? '수신거부됨'
                  : selected.some((s) => s.email === c.email)
                    ? '담김'
                    : '담기'}
              </button>
            </li>
          ))}
        </ul>
      )}
      {truncated && (
        <p className="text-xs text-charcoal-soft">
          결과가 많아 일부만 표시합니다. 검색어를 좁혀주세요.
        </p>
      )}

      {selected.length > 0 && (
        <div className="rounded-lg bg-canvas-strong p-3">
          <p className="mb-2 text-sm font-medium text-charcoal">담긴 수신자 {selected.length}명</p>
          <ul className="flex flex-wrap gap-2">
            {selected.map((s) => (
              <li
                key={s.email}
                className="flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs"
              >
                {s.name ?? s.email}
                <button
                  type="button"
                  onClick={() => remove(s.email)}
                  aria-label={`${s.email} 제거`}
                  className="text-danger-a11y"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: `BroadcastForm.tsx`에 모드 토글 + 검색 발송 + 테스트 발송 버튼 연결**

모드 라디오(`세그먼트`/`검색 발송`) 추가. 검색 모드면 `ContactSearch` + 운영/광고 토글 표시. 제출 시:

```tsx
if (mode === 'search') {
  const result = await enqueueIndividualBroadcast({
    recipients: selectedContacts,
    subject,
    bodyMd,
    ctaLabel: ctaLabel || undefined,
    ctaUrl: ctaUrl || undefined,
    isAdvertisement: advertising,
  });
  // ... 기존 success/error 처리 동일
}
```

"나에게 테스트 발송" 버튼:

```tsx
<button
  type="button"
  onClick={() =>
    startTransition(async () => {
      const r = await sendTestEmail({
        subject,
        bodyMd,
        ctaLabel: ctaLabel || undefined,
        ctaUrl: ctaUrl || undefined,
        isAdvertisement: advertising,
      });
      r.error ? setError(r.message) : setSuccess(r.message);
    })
  }
  className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
>
  나에게 테스트 발송
</button>
```

- [ ] **Step 5: 통과 + 타입 + 전체 회귀**

Run: `npx jest __tests__/app/admin/email && npm run type-check`
Expected: PASS, 타입 통과.

- [ ] **Step 6: 커밋**

```bash
git add "app/(portal)/admin/email/_components/ContactSearch.tsx" "app/(portal)/admin/email/_components/BroadcastForm.tsx" __tests__/app/admin/email/ContactSearch.test.tsx
git commit -m "feat(email): 검색 발송 모드 + 나에게 테스트 발송

요약: 연락처 검색→선택 발송(individual), 운영/광고 토글, 본인 테스트 발송 버튼"
```

---

## Task 13: 통합 검증 + 수동 확인

**Files:** 없음 (검증만)

- [ ] **Step 1: 전체 테스트 + 타입 + 린트 + 빌드**

Run:

```bash
npm test -- --watchAll=false && npm run type-check && npm run lint && npm run build
```

Expected: 전부 통과. (기존 743 + 신규 테스트.)

- [ ] **Step 2: 수동 확인 (dev 서버)**

`npm run dev` → admin 로그인 → `/admin/email`에서:

- 템플릿 선택 시 제목·본문 채워지는지
- 세그먼트: 작가만/출품자만/청원 선택/작품 구매자 → 수신자 수 미리보기
- 검색 발송: 이름·이메일 검색 → 담기 → 운영/광고 토글
- **"나에게 테스트 발송"으로 관리자 본인 수신함에 1통 확인** (광고 토글 시 (광고) 표기·발송사 footer 확인)

> 실발송은 SOLAPI/RESEND env가 설정된 환경에서만 동작. 로컬에서 RESEND_API_KEY 없으면 테스트 발송은 no-op(스킵) — 그 경우 Vercel preview/production에서 확인.

- [ ] **Step 3: 최종 커밋 (필요 시 문서 갱신)**

스펙·플랜 외 변경 없으면 생략. 있으면:

```bash
git add -A && git commit -m "chore(email): 통합 검증 마무리"
```

---

## Self-Review (작성자 체크)

- **스펙 커버리지**: 템플릿 라이브러리(Task 10·11) ✓ / 작가·출품자 분리(Task 5·11) ✓ / 청원 드롭다운(Task 7·11) ✓ / 작품 구매자(Task 6·7·9·11) ✓ / 검색 발송(Task 8·12) ✓ / is_advertisement 분리(Task 1·4·9) ✓ / individual 채널·수신거부(Task 1·2) ✓ / 테스트 발송(Task 9·12) ✓ / {{name}} 개인화(Task 3·4) ✓.
- **알려진 단순화(스펙 대비)**: ① 작품 구매자 test-buyer 제외는 supabase-js select에서 SQL 함수 호출 곤란 → 본 사이클 제외(Task 6 주석). ② 작품 선택 UI는 UUID 직접 입력으로 시작(Task 11) — 추후 검색 select. ③ RFC 8058 List-Unsubscribe 헤더는 선행 스펙의 별도 갭으로 본 플랜 범위 밖.
- **타입 일관성**: `BroadcastChannel`(4값)·`splitAndPersonalize`·`ArtworkBuyerAudienceResolver`·`SegmentSelection`·`ContactSearchResult`·`enqueueIndividualBroadcast`/`sendTestEmail` 시그니처가 공유 계약과 태스크 전반에서 일치.
- **검증 완료**: `lib/utils/supabase-batch.ts`의 `fetchAllInBatches`는 `Promise<{ data: T[]; count }>` resolve + 에러 throw 확인 — Task 5·6 코드에 반영됨.
